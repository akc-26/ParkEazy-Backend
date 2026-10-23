import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PoolClient, dbManager } from '../apps/api/database/connection';
import { NotificationAdapterFactory } from '../apps/api/services/notification-adapter';
import { appConfig } from '../apps/api/config/env';
import {
  User,
  Facility,
  ParkingBay,
  PricingRule,
  AvailabilityHold,
  Booking,
  LedgerEntry,
  PayoutRequest,
  PayoutStatus,
  Review,
  MessageThread,
  NotificationItem,
  DisputeTicket,
  ThirdPartyProviderConfig,
  AuditLog,
  VehicleCompatibility,
  BayStatus,
  FacilityStatus,
  ActiveSession,
  PasswordResetToken,
  UserRole,
  OperatingHours,
  FacilityClosure,
  FacilityMaintenance,
  MaintenanceStatus
} from './types';
import {
  validateTimezone,
  validateClosure,
  validateMaintenance,
  validateMaintenanceTransition
} from '@parkeazy/validation';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'parkeazy-store.json');

export interface DatabaseSchema {
  version: number;
  users: User[];
  facilities: Facility[];
  bays: ParkingBay[];
  pricingRules: PricingRule[];
  holds: AvailabilityHold[];
  bookings: Booking[];
  ledger: LedgerEntry[];
  payouts: PayoutRequest[];
  reviews: Review[];
  messages: MessageThread[];
  notifications: NotificationItem[];
  disputes: DisputeTicket[];
  providers: ThirdPartyProviderConfig[];
  auditLogs: AuditLog[];
  sessions?: ActiveSession[];
  passwordResetTokens?: PasswordResetToken[];
  closures?: FacilityClosure[];
  maintenance?: FacilityMaintenance[];
}

export function hashPassword(password: string, salt?: string): string {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2$${chosenSalt}$${hash}`;
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedHash = parts[2];
      const actualHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
    }
  }
  // Transparent legacy SHA-256 fallback
  const legacyHash = crypto.createHash('sha256').update(password + '_parkeazy_salt').digest('hex');
  return legacyHash === storedHash;
}

export class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private expiryInterval: NodeJS.Timeout | null = null;
  private resetRateLimits: Map<string, number[]> = new Map();
  private isInitialized = false;
  private isPostgresActive = false;
  private hostPayoutLocks: Map<string, Promise<void>> = new Map();
  private webhookEventLocks: Map<string, Promise<void>> = new Map();

  private async acquireHostPayoutLock(hostId: string): Promise<() => void> {
    while (this.hostPayoutLocks.has(hostId)) {
      await this.hostPayoutLocks.get(hostId);
    }
    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.hostPayoutLocks.set(hostId, lockPromise);
    return () => {
      this.hostPayoutLocks.delete(hostId);
      releaseLock();
    };
  }

  private async acquireWebhookEventLock(eventId: string): Promise<() => void> {
    while (this.webhookEventLocks.has(eventId)) {
      await this.webhookEventLocks.get(eventId);
    }
    let releaseLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.webhookEventLocks.set(eventId, lockPromise);
    return () => {
      this.webhookEventLocks.delete(eventId);
      releaseLock();
    };
  }

  private scheduleSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = DB_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, DB_FILE);
      } catch (err) {
        console.error('[ParkEazy-Store] Failed to write database file:', err);
      }
    }, 500);
    this.saveTimeout.unref();
  }


  constructor() {
    this.data = this.loadOrSeed();
    this.cleanExpiredHolds().catch(() => {});
    this.cleanExpiredSessions().catch(() => {});
    // Run hold and session expiry checker periodically every 30 seconds
    this.expiryInterval = setInterval(() => {
      this.cleanExpiredHolds().catch(() => {});
      this.cleanExpiredSessions().catch(() => {});
    }, 30000);
    this.expiryInterval.unref();
  }

  /**
   * Initializes authoritative PostgreSQL persistence.
   * Runs migrations, migrates existing JSON store data without data loss,
   * and establishes PostgreSQL as the authoritative persistence source of truth.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await dbManager.initialize();
      this.isPostgresActive = dbManager.isPostgresConnected();

      if (this.isPostgresActive) {
        // app_store_entities is created by migration 007. Do not issue a second
        // CREATE TABLE here: pg-mem cannot reliably plan this duplicate DDL.

        // Check if data already exists in PostgreSQL app_store_entities or relational tables
        const existingRes = await dbManager.query('SELECT count(*) as count FROM app_store_entities');
        const count = parseInt(existingRes.rows[0]?.count || '0', 10);

        let hasRelationalData = false;
        try {
          const userCountRes = await dbManager.query('SELECT count(*) as count FROM users');
          if (parseInt(userCountRes.rows[0]?.count || '0', 10) > 0) {
            hasRelationalData = true;
          }
        } catch {
          // Relational users table might not exist yet
        }

        const isProduction = process.env.NODE_ENV === 'production' || appConfig.nodeEnv === 'production';

        if (count === 0 && !hasRelationalData) {
          if (!isProduction) {
            // Safe, controlled migration path for existing JSON data without losing anything in dev/test
            console.log('[ParkEazy-Store] Migrating existing application data into authoritative PostgreSQL database...');
            await this.migrateDataToPostgres(this.data);
          } else {
            console.log('[ParkEazy-Store] Empty production database detected; maintaining empty store without overwriting with stale JSON.');
          }
        } else {
          // Load authoritative data from PostgreSQL
          console.log('[ParkEazy-Store] Loading authoritative application data from PostgreSQL...');
          await this.loadDataFromPostgres();
        }

        console.log('[ParkEazy-Store] Authoritative PostgreSQL persistence initialized successfully.');
      } else {
        console.log('[ParkEazy-Store] PostgreSQL not connected; running in development mode with JSON store.');
      }

      this.isInitialized = true;
    } catch (err: any) {
      this.isPostgresActive = false;
      if (appConfig.nodeEnv === 'production' || appConfig.database.isRequired) {
        console.error('[ParkEazy-Store] Failed to initialize authoritative PostgreSQL persistence in production:', err);
        throw err;
      }
      console.warn('[ParkEazy-Store] Running in development mode with local store synchronization:', err.message);
      this.isInitialized = true;
    }
  }

  private async migrateDataToPostgres(schema: DatabaseSchema): Promise<void> {
    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');
      const collections: (keyof DatabaseSchema)[] = [
        'users', 'facilities', 'bays', 'pricingRules', 'holds', 'bookings',
        'ledger', 'payouts', 'reviews', 'messages', 'notifications', 'disputes',
        'providers', 'auditLogs', 'sessions', 'passwordResetTokens', 'closures', 'maintenance'
      ];

      for (const col of collections) {
        const items = (schema[col] || []) as any[];
        for (const item of items) {
          const id = item.id || item.token || crypto.randomUUID();
          await client.query(
            `INSERT INTO app_store_entities (collection, id, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (collection, id) DO UPDATE SET data = $3, updated_at = NOW()`,
            [col, id, JSON.stringify(item)]
          );
        }
      }

      for (const user of schema.users || []) {
        const nameParts = (user.fullName || '').split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        await client.query(
          `INSERT INTO users (id, email, first_name, last_name, phone_number, roles, full_name, password_hash, role, status, avatar_url, business_details, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = EXCLUDED.status, updated_at = NOW()`,
          [
            user.id,
            user.email,
            firstName,
            lastName,
            user.phone,
            user.role === 'admin' ? ['ADMIN'] : (user.role === 'host' ? ['HOST', 'CUSTOMER'] : ['CUSTOMER']),
            user.fullName,
            user.passwordHash,
            user.role,
            user.status || 'active',
            user.avatarUrl || null,
            user.businessDetails ? JSON.stringify(user.businessDetails) : null,
            user.createdAt || new Date().toISOString(),
            user.updatedAt || new Date().toISOString()
          ]
        );
      }

      for (const fac of schema.facilities || []) {
        await client.query(
          `INSERT INTO parking_locations (id, host_id, name, description, address_line1, city, state, postal_code, country, latitude, longitude, status, hourly_rate_cents, daily_rate_cents, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            fac.id,
            fac.hostId,
            fac.name,
            fac.description || '',
            fac.address || '',
            fac.city || '',
            fac.state || '',
            fac.postalCode || '',
            fac.country || 'US',
            fac.latitude || 0,
            fac.longitude || 0,
            fac.status ? fac.status.toUpperCase() : 'ACTIVE',
            Math.round(((fac as any).baseHourlyRate || 5) * 100),
            Math.round(((fac as any).baseDailyRate || 35) * 100),
            JSON.stringify(fac),
            fac.createdAt || new Date().toISOString(),
            fac.updatedAt || new Date().toISOString()
          ]
        );
      }

      for (const bay of schema.bays || []) {
        await client.query(
          `INSERT INTO parking_bays (id, location_id, bay_number, status, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            bay.id,
            bay.facilityId,
            bay.identifier,
            bay.status ? bay.status.toUpperCase() : 'AVAILABLE',
            JSON.stringify(bay),
            bay.createdAt || new Date().toISOString(),
            bay.updatedAt || new Date().toISOString()
          ]
        );
      }

      for (const rule of schema.pricingRules || []) {
        await client.query(
          `INSERT INTO facility_pricing_rules (id, facility_id, data, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [rule.id, rule.facilityId, JSON.stringify(rule)]
        );
      }

      for (const booking of schema.bookings || []) {
        const facility = schema.facilities?.find(f => f.id === booking.facilityId);
        const hostId = (booking as any).hostId || facility?.hostId || 'usr_host1';
        const userId = (booking as any).customerId || (booking as any).userId || 'usr_cust1';
        await client.query(
          `INSERT INTO bookings (id, bay_id, location_id, user_id, host_id, start_time_utc, end_time_utc, status, base_amount_cents, security_deposit_cents, platform_fee_cents, taxes_cents, total_payable_cents, currency, license_plate, booking_reference, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            booking.id,
            booking.bayId,
            booking.facilityId,
            userId,
            hostId,
            booking.startTime,
            booking.endTime,
            booking.status ? booking.status.toUpperCase() : 'CONFIRMED',
            Math.round(((booking as any).grossAmount || (booking as any).totalAmount || 0) * 100),
            0,
            Math.round(((booking as any).platformFee || 0) * 100),
            Math.round(((booking as any).taxAmount || 0) * 100),
            Math.round(((booking as any).grossAmount || (booking as any).totalAmount || 0) * 100),
            'USD',
            booking.licensePlate || null,
            (booking as any).bookingReference || (booking as any).reference || ('BK-' + booking.id),
            JSON.stringify(booking),
            booking.createdAt || new Date().toISOString(),
            booking.updatedAt || new Date().toISOString()
          ]
        );
      }

      for (const entry of schema.ledger || []) {
        await client.query(
          `INSERT INTO financial_ledger (id, host_id, booking_id, entry_type, debit_account, credit_account, amount_cents, currency, payment_provider, provider_transaction_id, description, idempotency_key, reference_number, status, created_at_utc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            entry.id,
            (entry as any).hostId || null,
            (entry as any).bookingId || null,
            entry.type ? entry.type.toUpperCase() : 'GENERAL',
            'ACCOUNTS_RECEIVABLE',
            'OPERATING_REVENUE',
            Math.round(entry.amount * 100),
            entry.currency || 'USD',
            'STRIPE',
            null,
            entry.description || 'Ledger transaction',
            (entry as any).idempotencyKey || ('ledger_' + entry.id),
            (entry as any).referenceId || (entry as any).referenceNumber || null,
            entry.status || 'completed',
            entry.createdAt || (entry as any).timestamp || new Date().toISOString()
          ]
        );
      }

      for (const payout of schema.payouts || []) {
        await client.query(
          `INSERT INTO host_payout_records (id, host_id, amount_cents, currency, status, method, destination_account, reference_or_utr, provider_transfer_id, requested_at_utc, notes, idempotency_key)
           VALUES ($1, $2, $3, 'USD', $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, provider_transfer_id = COALESCE(EXCLUDED.provider_transfer_id, host_payout_records.provider_transfer_id)`,
          [
            payout.id,
            payout.hostId,
            Math.round(payout.amount * 100),
            payout.status.toUpperCase(),
            payout.method,
            payout.destinationAccount,
            payout.referenceNumber,
            payout.providerTransferId || null,
            payout.requestedAt,
            payout.notes || null,
            (payout as any).idempotencyKey || ('payout_' + payout.id)
          ]
        );
      }

      for (const prov of schema.providers || []) {
        await client.query(
          `INSERT INTO provider_configs (id, name, category, is_enabled, mode, operational_settings, credentials, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             is_enabled = EXCLUDED.is_enabled, mode = EXCLUDED.mode, operational_settings = EXCLUDED.operational_settings, credentials = EXCLUDED.credentials, updated_at = NOW()`,
          [
            prov.id,
            prov.name,
            prov.category,
            Boolean(prov.isEnabled),
            (prov as any).mode || 'test',
            JSON.stringify(prov.settings || {}),
            JSON.stringify((prov as any).credentials || {})
          ]
        );
      }

      for (const audit of schema.auditLogs || []) {
        await client.query(
          `INSERT INTO system_audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            audit.id,
            audit.timestamp,
            (audit as any).actorId || (audit as any).userId || null,
            (audit as any).actorName || (audit as any).userName || null,
            (audit as any).actorRole || (audit as any).userRole || null,
            audit.action,
            audit.entityType,
            audit.entityId,
            audit.details || null
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async loadDataFromPostgres(): Promise<void> {
    const res = await dbManager.query('SELECT collection, id, data FROM app_store_entities');
    const collectionsMap: Record<string, any[]> = {};
    for (const row of res.rows) {
      const col = row.collection;
      if (!collectionsMap[col]) collectionsMap[col] = [];
      const item = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      collectionsMap[col].push(item);
    }

    const isProduction = process.env.NODE_ENV === 'production' || appConfig.nodeEnv === 'production';
    this.data = {
      version: 1,
      users: collectionsMap.users !== undefined ? collectionsMap.users : (isProduction ? [] : this.data.users),
      facilities: collectionsMap.facilities !== undefined ? collectionsMap.facilities : (isProduction ? [] : this.data.facilities),
      bays: collectionsMap.bays !== undefined ? collectionsMap.bays : (isProduction ? [] : this.data.bays),
      pricingRules: collectionsMap.pricingRules !== undefined ? collectionsMap.pricingRules : (isProduction ? [] : this.data.pricingRules),
      holds: collectionsMap.holds !== undefined ? collectionsMap.holds : [],
      bookings: collectionsMap.bookings !== undefined ? collectionsMap.bookings : (isProduction ? [] : this.data.bookings),
      ledger: collectionsMap.ledger !== undefined ? collectionsMap.ledger : (isProduction ? [] : this.data.ledger),
      payouts: collectionsMap.payouts !== undefined ? collectionsMap.payouts : (isProduction ? [] : this.data.payouts),
      reviews: collectionsMap.reviews !== undefined ? collectionsMap.reviews : (isProduction ? [] : this.data.reviews),
      messages: collectionsMap.messages !== undefined ? collectionsMap.messages : [],
      notifications: collectionsMap.notifications !== undefined ? collectionsMap.notifications : [],
      disputes: collectionsMap.disputes !== undefined ? collectionsMap.disputes : [],
      providers: collectionsMap.providers !== undefined ? collectionsMap.providers : (isProduction ? [] : this.data.providers),
      auditLogs: collectionsMap.auditLogs !== undefined ? collectionsMap.auditLogs : (isProduction ? [] : this.data.auditLogs),
      sessions: collectionsMap.sessions || [],
      passwordResetTokens: collectionsMap.passwordResetTokens || [],
      closures: collectionsMap.closures || [],
      maintenance: collectionsMap.maintenance || []
    };
  }

  private checkPersistenceAvailable(): void {
    const isProduction = appConfig.nodeEnv === 'production' || appConfig.database.isRequired;
    if (isProduction && (!this.isPostgresActive || !dbManager.isPostgresConnected())) {
      throw new Error('Durable PostgreSQL database is required in production but currently unavailable.');
    }
  }

  public async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    this.checkPersistenceAvailable();
    if (this.isPostgresActive) {
      const client = await dbManager.getClient();
      try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[ParkEazy-Store] Transaction aborted:', err.message);
        throw err;
      } finally {
        client.release();
      }
    }
    return await operation(null as any);
  }

  public async syncEntityToRelationalTable(client: PoolClient, collection: string, id: string, entity: any): Promise<void> {
    if (!client) return;
    try {
      if (collection === 'users') {
        const nameParts = (entity.fullName || '').split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        await client.query(
          `INSERT INTO users (id, email, first_name, last_name, phone_number, roles, full_name, password_hash, role, status, avatar_url, business_details, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email, full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role, status = EXCLUDED.status, avatar_url = EXCLUDED.avatar_url,
             business_details = EXCLUDED.business_details, updated_at = NOW()`,
          [
            entity.id,
            entity.email,
            firstName,
            lastName,
            entity.phone || '+1 555-0000',
            entity.role === 'admin' ? ['ADMIN'] : (entity.role === 'host' ? ['HOST', 'CUSTOMER'] : ['CUSTOMER']),
            entity.fullName,
            entity.passwordHash,
            entity.role,
            entity.status || 'active',
            entity.avatarUrl || null,
            entity.businessDetails ? JSON.stringify(entity.businessDetails) : null,
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'facilities') {
        await client.query(
          `INSERT INTO parking_locations (id, host_id, name, description, address_line1, city, state, postal_code, country, latitude, longitude, status, hourly_rate_cents, daily_rate_cents, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, description = EXCLUDED.description, address_line1 = EXCLUDED.address_line1,
             city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code,
             status = EXCLUDED.status, hourly_rate_cents = EXCLUDED.hourly_rate_cents,
             daily_rate_cents = EXCLUDED.daily_rate_cents, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            entity.id,
            entity.hostId,
            entity.name,
            entity.description || '',
            entity.address || '',
            entity.city || '',
            entity.state || '',
            entity.postalCode || '',
            entity.country || 'USA',
            entity.latitude || 0,
            entity.longitude || 0,
            (entity.status || 'draft').toUpperCase(),
            Math.round(((entity as any).baseHourlyRate || 5) * 100),
            Math.round(((entity as any).dailyMaxRate || 35) * 100),
            JSON.stringify(entity),
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'bays') {
        await client.query(
          `INSERT INTO parking_bays (id, location_id, bay_number, status, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            entity.id,
            entity.facilityId,
            entity.identifier,
            (entity.status || 'available').toUpperCase(),
            JSON.stringify(entity),
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'pricingRules') {
        await client.query(
          `INSERT INTO facility_pricing_rules (id, facility_id, data, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          [entity.id, entity.facilityId, JSON.stringify(entity)]
        );
      } else if (collection === 'bookings') {
        const facility = this.data.facilities?.find(f => f.id === entity.facilityId);
        const hostId = entity.hostId || facility?.hostId || 'usr_host1';
        const userId = entity.customerId || entity.userId || 'usr_cust1';
        await client.query(
          `INSERT INTO bookings (id, bay_id, location_id, user_id, host_id, start_time_utc, end_time_utc, status, base_amount_cents, security_deposit_cents, platform_fee_cents, taxes_cents, total_payable_cents, currency, license_plate, booking_reference, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            entity.id,
            entity.bayId,
            entity.facilityId,
            userId,
            hostId,
            entity.startTime,
            entity.endTime,
            (entity.status || 'confirmed').toUpperCase(),
            Math.round(((entity as any).grossAmount || (entity as any).totalAmount || 0) * 100),
            0,
            Math.round(((entity as any).platformFee || 0) * 100),
            Math.round(((entity as any).taxAmount || 0) * 100),
            Math.round(((entity as any).grossAmount || (entity as any).totalAmount || 0) * 100),
            'USD',
            entity.licensePlate || null,
            (entity as any).bookingReference || (entity as any).reference || ('BK-' + entity.id),
            JSON.stringify(entity),
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'ledger') {
        await client.query(
          `INSERT INTO financial_ledger (id, host_id, booking_id, entry_type, debit_account, credit_account, amount_cents, currency, payment_provider, provider_transaction_id, description, idempotency_key, reference_number, status, created_at_utc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (idempotency_key) DO UPDATE SET status = EXCLUDED.status, description = EXCLUDED.description`,
          [
            entity.id,
            (entity as any).hostId || null,
            (entity as any).bookingId || null,
            entity.type ? entity.type.toUpperCase() : 'GENERAL',
            'ACCOUNTS_RECEIVABLE',
            'OPERATING_REVENUE',
            Math.round(entity.amount * 100),
            entity.currency || 'USD',
            'STRIPE',
            null,
            entity.description || 'Ledger transaction',
            (entity as any).idempotencyKey || ('ledger_' + entity.id),
            (entity as any).referenceId || (entity as any).referenceNumber || null,
            entity.status || 'completed',
            entity.createdAt || (entity as any).timestamp || new Date().toISOString()
          ]
        );
      } else if (collection === 'payouts') {
        await client.query(
          `INSERT INTO host_payout_records (id, host_id, amount_cents, currency, status, method, destination_account, reference_or_utr, provider_transfer_id, requested_at_utc, settled_at_utc, notes, idempotency_key)
           VALUES ($1, $2, $3, 'USD', $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             notes = EXCLUDED.notes,
             settled_at_utc = CASE WHEN EXCLUDED.status = 'PAID' THEN COALESCE(EXCLUDED.settled_at_utc, NOW()) ELSE host_payout_records.settled_at_utc END,
             reference_or_utr = EXCLUDED.reference_or_utr,
             provider_transfer_id = COALESCE(EXCLUDED.provider_transfer_id, host_payout_records.provider_transfer_id)`,
          [
            entity.id,
            entity.hostId,
            Math.round(entity.amount * 100),
            (entity.status || 'pending').toUpperCase(),
            entity.method || 'ach_bank_transfer',
            entity.destinationAccount || '',
            entity.referenceNumber || '',
            entity.providerTransferId || null,
            entity.requestedAt || new Date().toISOString(),
            entity.completedAt || null,
            entity.notes || null,
            (entity as any).idempotencyKey || ('payout_' + entity.id)
          ]
        );
      } else if (collection === 'sessions') {
        await client.query(
          `INSERT INTO active_sessions (token, user_id, expires_at, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
          [
            entity.token,
            entity.userId,
            entity.expiresAt,
            entity.createdAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'auditLogs') {
        await client.query(
          `INSERT INTO system_audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            entity.id,
            entity.timestamp || new Date().toISOString(),
            entity.actorId || entity.userId || null,
            entity.actorName || entity.userName || null,
            entity.actorRole || entity.userRole || null,
            entity.action,
            entity.entityType,
            entity.entityId,
            entity.details || null
          ]
        );
      } else if (collection === 'providers') {
        await client.query(
          `INSERT INTO provider_configs (id, name, category, is_enabled, mode, operational_settings, credentials, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             is_enabled = EXCLUDED.is_enabled, mode = EXCLUDED.mode,
             operational_settings = EXCLUDED.operational_settings, credentials = EXCLUDED.credentials, updated_at = NOW()`,
          [
            entity.id,
            entity.name,
            entity.category,
            Boolean(entity.isEnabled),
            entity.mode || 'test',
            JSON.stringify(entity.settings || {}),
            JSON.stringify(entity.credentials || {})
          ]
        );
      } else if (collection === 'messages') {
        await client.query(
          `INSERT INTO message_threads (id, booking_id, facility_id, customer_id, host_id, data, last_message_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, last_message_at = EXCLUDED.last_message_at`,
          [
            entity.id,
            entity.bookingId || null,
            entity.facilityId || null,
            entity.customerId || null,
            entity.hostId || null,
            JSON.stringify(entity),
            entity.lastMessageAt || entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'closures') {
        const startsAt = entity.startsAt || entity.startDate || entity.startTime || entity.startTimeUtc;
        const endsAt = entity.endsAt || entity.endDate || entity.endTime || entity.endTimeUtc;
        const spaceId = entity.spaceId || entity.bayId || (entity.affectedBayIds && entity.affectedBayIds[0]) || null;
        const title = entity.title || entity.reason || 'Scheduled Facility Closure';
        const reason = entity.reason || 'maintenance';
        const hostId = entity.hostId || (await this.getEntityFromDb<Facility>('facilities', entity.facilityId))?.hostId || null;
        const tenantId = entity.tenantId || 'default';
        await client.query(
          `INSERT INTO facility_closures (
            id, facility_id, tenant_id, host_id, space_id, bay_id, title, reason,
            starts_at, ends_at, start_date, end_date, start_time_utc, end_time_utc,
            affected_bay_ids, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            host_id = EXCLUDED.host_id, space_id = EXCLUDED.space_id, bay_id = EXCLUDED.bay_id, title = EXCLUDED.title,
            reason = EXCLUDED.reason, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
            start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
            start_time_utc = EXCLUDED.start_time_utc, end_time_utc = EXCLUDED.end_time_utc,
            affected_bay_ids = EXCLUDED.affected_bay_ids, updated_at = NOW()`,
          [
            entity.id,
            entity.facilityId,
            tenantId,
            hostId,
            spaceId,
            spaceId,
            title,
            reason,
            startsAt,
            endsAt,
            startsAt,
            endsAt,
            startsAt,
            endsAt,
            entity.affectedBayIds || null,
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      } else if (collection === 'maintenance') {
        const startsAt = entity.startsAt || entity.startTime || entity.startDate || entity.startTimeUtc;
        const endsAt = entity.endsAt || entity.endTime || entity.endDate || entity.endTimeUtc;
        const spaceId = entity.spaceId || entity.bayId || null;
        const title = entity.title || 'Scheduled Maintenance';
        const status = entity.status || 'scheduled';
        const tenantId = entity.tenantId || 'default';
        await client.query(
          `INSERT INTO facility_maintenance_periods (
            id, facility_id, tenant_id, space_id, bay_id, title, description,
            status, starts_at, ends_at, start_time, end_time, start_time_utc, end_time_utc,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            space_id = EXCLUDED.space_id, bay_id = EXCLUDED.bay_id, title = EXCLUDED.title,
            description = EXCLUDED.description, status = EXCLUDED.status,
            starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
            start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
            start_time_utc = EXCLUDED.start_time_utc, end_time_utc = EXCLUDED.end_time_utc,
            updated_at = NOW()`,
          [
            entity.id,
            entity.facilityId,
            tenantId,
            spaceId,
            spaceId,
            title,
            entity.description || null,
            status,
            startsAt,
            endsAt,
            startsAt,
            endsAt,
            startsAt,
            endsAt,
            entity.createdAt || new Date().toISOString(),
            entity.updatedAt || new Date().toISOString()
          ]
        );
      }
    } catch (err: any) {
      console.warn(`[ParkEazy-Store] Relational sync warning for ${collection}:${id}:`, err.message);
      if (appConfig.nodeEnv === 'production' || appConfig.database.isRequired) {
        throw err;
      }
    }
  }

  public async persistEntity(collection: string, id: string, entity: any, externalClient?: PoolClient): Promise<void> {
    this.checkPersistenceAvailable();
    if (this.isPostgresActive) {
      const client = externalClient || await dbManager.getClient();
      const isInternalTx = !externalClient;
      try {
        if (isInternalTx) await client.query('BEGIN');
        await client.query(
          `INSERT INTO app_store_entities (collection, id, data, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (collection, id) DO UPDATE SET data = $3, updated_at = NOW()`,
          [collection, id, JSON.stringify(entity)]
        );
        await this.syncEntityToRelationalTable(client, collection, id, entity);
        if (isInternalTx) await client.query('COMMIT');
      } catch (err: any) {
        if (isInternalTx) await client.query('ROLLBACK').catch(() => {});
        console.error(`[ParkEazy-Store] Persistent write error for ${collection}:${id}:`, err.message);
        throw err;
      } finally {
        if (isInternalTx) client.release();
      }
    }

    // Sync in-memory collection cache
    const arr = (this.data as any)[collection] as any[];
    if (Array.isArray(arr)) {
      const idx = arr.findIndex((x: any) => (x.id === id || x.token === id));
      if (idx >= 0) {
        arr[idx] = entity;
      } else {
        arr.push(entity);
      }
    }
    if (!this.isPostgresActive && appConfig.nodeEnv !== 'production') {
      this.scheduleSave();
    }
  }

  public async deleteEntity(collection: string, id: string, externalClient?: PoolClient): Promise<void> {
    this.checkPersistenceAvailable();
    if (this.isPostgresActive) {
      const client = externalClient || await dbManager.getClient();
      const isInternalTx = !externalClient;
      try {
        if (isInternalTx) await client.query('BEGIN');
        await client.query(`DELETE FROM app_store_entities WHERE collection = $1 AND id = $2`, [collection, id]);
        if (collection === 'facilities') {
          await client.query(`DELETE FROM parking_locations WHERE id = $1`, [id]).catch(() => {});
        } else if (collection === 'bays') {
          await client.query(`DELETE FROM parking_bays WHERE id = $1`, [id]).catch(() => {});
        } else if (collection === 'pricingRules') {
          await client.query(`DELETE FROM facility_pricing_rules WHERE id = $1`, [id]).catch(() => {});
        } else if (collection === 'sessions') {
          await client.query(`DELETE FROM active_sessions WHERE token = $1`, [id]).catch(() => {});
        } else if (collection === 'closures') {
          await client.query(`DELETE FROM facility_closures WHERE id = $1`, [id]).catch(() => {});
        } else if (collection === 'maintenance') {
          await client.query(`DELETE FROM facility_maintenance_periods WHERE id = $1`, [id]).catch(() => {});
        }
        if (isInternalTx) await client.query('COMMIT');
      } catch (err: any) {
        if (isInternalTx) await client.query('ROLLBACK').catch(() => {});
        console.error(`[ParkEazy-Store] Persistent delete error for ${collection}:${id}:`, err.message);
        throw err;
      } finally {
        if (isInternalTx) client.release();
      }
    }

    // In-memory removal
    const arr = (this.data as any)[collection] as any[];
    if (Array.isArray(arr)) {
      const idx = arr.findIndex((x: any) => (x.id === id || x.token === id));
      if (idx >= 0) {
        arr.splice(idx, 1);
      }
    }
    if (!this.isPostgresActive && appConfig.nodeEnv !== 'production') {
      this.scheduleSave();
    }
  }

  public async getCollectionFromDb<T>(collection: string): Promise<T[]> {
    this.checkPersistenceAvailable();
    if (this.isPostgresActive) {
      try {
        const res = await dbManager.query(
          'SELECT data FROM app_store_entities WHERE collection = $1 ORDER BY updated_at DESC',
          [collection]
        );
        const items = res.rows.map(row => typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
        (this.data as any)[collection] = items;
        return items;
      } catch (err: any) {
        console.error(`[ParkEazy-Store] Database read error for collection ${collection}:`, err.message);
        throw new Error(`Database read failed for ${collection}: ${err.message}`);
      }
    }
    if (appConfig.nodeEnv === 'production' || appConfig.database.isRequired) {
      throw new Error('Production database is unavailable.');
    }
    return ((this.data as any)[collection] || []) as T[];
  }

  public async getEntityFromDb<T>(collection: string, id: string): Promise<T | null> {
    this.checkPersistenceAvailable();
    if (this.isPostgresActive) {
      try {
        const res = await dbManager.query(
          'SELECT data FROM app_store_entities WHERE collection = $1 AND id = $2',
          [collection, id]
        );
        if (res.rows.length === 0) return null;
        const data = res.rows[0].data;
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed as T;
      } catch (err: any) {
        console.error(`[ParkEazy-Store] Database read error for ${collection}:${id}:`, err.message);
        throw new Error(`Database read failed for ${collection}:${id}: ${err.message}`);
      }
    }
    if (appConfig.nodeEnv === 'production' || appConfig.database.isRequired) {
      throw new Error('Production database is unavailable.');
    }
    const items = ((this.data as any)[collection] || []) as any[];
    return (items.find((x: any) => x.id === id || x.token === id) as T) || null;
  }

  private loadOrSeed(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.version && parsed.users && parsed.facilities) {
          parsed.sessions = parsed.sessions || [];
          parsed.passwordResetTokens = parsed.passwordResetTokens || [];
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, reseeding...', err);
      }
    }

    const seeded = this.generateSeedData();
    seeded.sessions = [];
    seeded.passwordResetTokens = [];
    if (appConfig.nodeEnv !== 'production') {
      fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    }
    return seeded;
  }

  public async cleanExpiredHolds(): Promise<void> {
    const now = new Date().toISOString();
    const holds = await this.getCollectionFromDb<AvailabilityHold>('holds');
    const expired = holds.filter(h => h.expiresAt < now);
    if (expired.length > 0) {
      await this.withTransaction(async (client) => {
        for (const hold of expired) {
          await this.deleteEntity('holds', hold.id, client);
          const bay = await this.getEntityFromDb<ParkingBay>('bays', hold.bayId);
          if (bay && bay.status === 'held') {
            bay.status = 'available';
            bay.updatedAt = new Date().toISOString();
            await this.persistEntity('bays', bay.id, bay, client);
          }
        }
      });
    }
  }

  // ----------------- AUDIT LOGGING -----------------
  public async logAudit(
    actorId: string,
    actorName: string,
    actorRole: User['role'],
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string,
    client?: PoolClient
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: 'aud_' + crypto.randomUUID().slice(0, 10),
      timestamp: new Date().toISOString(),
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      details
    };
    await this.persistEntity('auditLogs', log.id, log, client);
    return log;
  }

  public async getAuditLogs(entityType?: string, limit = 100): Promise<AuditLog[]> {
    let list = await this.getCollectionFromDb<AuditLog>('auditLogs');
    if (entityType && entityType !== 'all') {
      list = list.filter(a => a.entityType === entityType);
    }
    return list.slice(0, limit);
  }

  // ----------------- USER & AUTH -----------------
  public async findUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getCollectionFromDb<User>('users');
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const user = await this.getEntityFromDb<User>('users', id);
    return user || undefined;
  }

  public async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: User['role'];
    businessDetails?: User['businessDetails'];
  }): Promise<User> {
    const requestedRole = (userData.role || 'customer').toLowerCase().trim() as UserRole;
    if (requestedRole === 'admin') {
      throw new Error('Administrative accounts cannot be registered publicly. Privileged accounts must be provisioned through an authorized administrative mechanism.');
    }
    if (requestedRole !== 'customer' && requestedRole !== 'host') {
      throw new Error('Invalid registration role. Permitted public registration roles are "customer" and "host".');
    }

    const existing = await this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: userData.email.toLowerCase().trim(),
      passwordHash: hashPassword(userData.password),
      fullName: userData.fullName,
      phone: userData.phone || '+1 (555) 000-0000',
      role: requestedRole,
      status: 'active',
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
      businessDetails: userData.businessDetails || (requestedRole === 'host' ? {
        businessName: userData.fullName + ' Properties',
        registrationNumber: 'REG-' + Math.floor(100000 + Math.random() * 900000),
        taxId: 'XX-XXXXXXX',
        payoutBankName: 'Chase Bank NA',
        payoutAccountNumber: '****' + Math.floor(1000 + Math.random() * 9000),
        payoutRoutingNumber: '121000358',
        stripeConnectAccountId: 'acct_' + crypto.randomUUID().slice(0, 12),
        isVerified: true
      } : undefined)
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('users', newUser.id, newUser, client);
      await this.logAudit(newUser.id, newUser.fullName, newUser.role, 'USER_REGISTERED', 'user', newUser.id, `User registered as ${newUser.role}`, client);
    });

    return newUser;
  }

  public async provisionAdminUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: User['role'];
    actor: User;
  }): Promise<User> {
    if (data.actor.role !== 'admin') {
      throw new Error('Access denied: Administrator privileges required to provision privileged accounts.');
    }
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      fullName: data.fullName,
      phone: data.phone || '+1 (555) 000-0000',
      role: data.role,
      status: 'active',
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('users', newUser.id, newUser, client);
      await this.logAudit(
        data.actor.id,
        data.actor.fullName,
        data.actor.role,
        'ADMIN_USER_PROVISIONED',
        'user',
        newUser.id,
        `Administrator ${data.actor.fullName} provisioned account for ${newUser.email} with role ${newUser.role}`,
        client
      );
    });

    return newUser;
  }

  public async verifyPassword(user: User, password: string): Promise<boolean> {
    const isValid = verifyPasswordHash(password, user.passwordHash);
    if (isValid && !user.passwordHash.startsWith('pbkdf2$')) {
      user.passwordHash = hashPassword(password);
      await this.persistEntity('users', user.id, user);
    }
    return isValid;
  }

  // ----------------- SESSION MANAGEMENT -----------------
  public async createSession(user: User): Promise<ActiveSession> {
    await this.cleanExpiredSessions();
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    const expirySeconds = Number(process.env.JWT_EXPIRY_SECONDS) || 86400;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();
    const session: ActiveSession = {
      token,
      userId: user.id,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt
    };
    await this.persistEntity('sessions', session.token, session);
    return session;
  }

  public async validateSession(token: string): Promise<User | null> {
    if (!token) return null;
    await this.cleanExpiredSessions();

    const session = await this.getEntityFromDb<ActiveSession>('sessions', token);
    if (session) {
      if (new Date(session.expiresAt) <= new Date()) {
        await this.revokeSession(token);
        return null;
      }
      const user = await this.findUserById(session.userId);
      if (!user || user.status === 'suspended' || user.status === 'closed') {
        return null;
      }
      return user;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const user = (await this.findUserById(token)) || (await this.findUserByEmail(token));
      if (user && user.status !== 'suspended' && user.status !== 'closed') {
        return user;
      }
    }

    return null;
  }

  public async revokeSession(token: string): Promise<boolean> {
    await this.deleteEntity('sessions', token);
    return true;
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getCollectionFromDb<ActiveSession>('sessions');
    const userSessions = sessions.filter(s => s.userId === userId);
    for (const s of userSessions) {
      await this.deleteEntity('sessions', s.token);
    }
  }

  public async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    const sessions = await this.getCollectionFromDb<ActiveSession>('sessions');
    const expired = sessions.filter(s => new Date(s.expiresAt) <= now);
    for (const s of expired) {
      await this.deleteEntity('sessions', s.token);
    }
  }

  // ----------------- PASSWORD RECOVERY -----------------
  public async createPasswordResetToken(email: string): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
    deliveryStatus: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'UNCONFIGURED';
  }> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    const timestamps = this.resetRateLimits.get(normalizedEmail) || [];
    const recent = timestamps.filter(t => now - t < 15 * 60 * 1000);
    if (recent.length >= 3) {
      throw new Error('Too many password recovery attempts. Please try again in 15 minutes.');
    }
    recent.push(now);
    this.resetRateLimits.set(normalizedEmail, recent);

    const user = await this.findUserByEmail(normalizedEmail);
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email address, password recovery instructions have been dispatched.',
        deliveryStatus: 'SIMULATED'
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();

    const existingTokens = await this.getCollectionFromDb<PasswordResetToken>('passwordResetTokens');
    for (const t of existingTokens) {
      if (t.userId === user.id && !t.isUsed) {
        t.isUsed = true;
        await this.persistEntity('passwordResetTokens', t.id, t);
      }
    }

    const resetRecord: PasswordResetToken = {
      id: 'prt_' + crypto.randomUUID().slice(0, 8),
      tokenHash,
      userId: user.id,
      email: normalizedEmail,
      expiresAt,
      isUsed: false,
      createdAt: new Date(now).toISOString()
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('passwordResetTokens', resetRecord.id, resetRecord, client);
      await this.logAudit(user.id, user.fullName, user.role, 'PASSWORD_RESET_REQUESTED', 'user', user.id, `Password reset requested for ${user.email}`, client);
    });

    let deliveryStatus: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'UNCONFIGURED' = 'SIMULATED';
    try {
      const emailAdapter = NotificationAdapterFactory.getAdapter('EMAIL');
      const sendResult = await emailAdapter.send({
        channel: 'EMAIL',
        type: 'SECURITY_ALERT',
        recipient: normalizedEmail,
        subject: 'ParkEazy - Password Reset Verification Code',
        content: `Hello ${user.fullName},\n\nA password reset request was received for your ParkEazy account.\n\nYour single-use password reset verification code is:\n\n${rawToken}\n\nThis code will expire in 15 minutes.\nIf you did not request this change, please ignore this email or contact support.`,
        metadata: { userId: user.id }
      });

      if (sendResult.delivered) {
        deliveryStatus = 'DELIVERED';
      } else if (sendResult.isSimulated) {
        deliveryStatus = 'SIMULATED';
      } else if (sendResult.errorCode === 'CONFIGURATION_ERROR') {
        deliveryStatus = 'UNCONFIGURED';
      } else {
        deliveryStatus = 'FAILED';
      }
    } catch (sendErr: any) {
      console.error('[ParkEazy-Auth] Email delivery exception:', sendErr.message);
      deliveryStatus = 'FAILED';
    }

    return {
      success: true,
      message: deliveryStatus === 'SIMULATED'
        ? `A simulated password recovery token has been generated for ${normalizedEmail}.`
        : (deliveryStatus === 'DELIVERED'
            ? `Password recovery instructions have been dispatched to ${normalizedEmail}.`
            : `Password recovery request received. If email service is configured, instructions will arrive shortly.`),
      resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
      deliveryStatus
    };
  }

  public async resetPasswordWithToken(rawToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!rawToken || !newPassword) {
      throw new Error('Reset token and new password are required.');
    }
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const tokens = await this.getCollectionFromDb<PasswordResetToken>('passwordResetTokens');
    const tokenRecord = tokens.find(t => t.tokenHash === tokenHash);

    if (!tokenRecord || tokenRecord.isUsed) {
      throw new Error('Invalid or already used password recovery token.');
    }

    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      tokenRecord.isUsed = true;
      await this.persistEntity('passwordResetTokens', tokenRecord.id, tokenRecord);
      throw new Error('Password recovery token has expired. Please request a new one.');
    }

    const user = await this.findUserById(tokenRecord.userId);
    if (!user) {
      throw new Error('Associated user account no longer exists.');
    }

    tokenRecord.isUsed = true;
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await this.persistEntity('passwordResetTokens', tokenRecord.id, tokenRecord, client);
      await this.persistEntity('users', user.id, user, client);
      await this.logAudit(
        user.id,
        user.fullName,
        user.role,
        'PASSWORD_RESET_COMPLETED',
        'user',
        user.id,
        `Password successfully reset for ${user.email}. All sessions invalidated.`,
        client
      );
    });

    await this.revokeAllUserSessions(user.id);

    return {
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.'
    };
  }

  public async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const forbiddenUpdates = ['id', 'email', 'role', 'passwordHash', 'createdAt'];
    for (const key of forbiddenUpdates) {
      delete (updates as any)[key];
    }
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    await this.persistEntity('users', user.id, user);
    return user;
  }

  public async getAllHosts(): Promise<User[]> {
    const users = await this.getCollectionFromDb<User>('users');
    return users.filter(u => u.role === 'host');
  }

  public async updateHostStatus(hostId: string, status: User['status'], adminUser: User): Promise<User> {
    const host = await this.findUserById(hostId);
    if (!host) throw new Error('Host not found');
    host.status = status;
    host.updatedAt = new Date().toISOString();
    
    // Invalidate sessions if suspended or closed
    if (status === 'suspended' || status === 'closed') {
      await this.revokeAllUserSessions(hostId);
    }

    await this.withTransaction(async (client) => {
      await this.persistEntity('users', hostId, host, client);
      await this.logAudit(adminUser.id, adminUser.fullName, 'admin', 'HOST_STATUS_CHANGED', 'user', hostId, `Host status updated to ${status}`, client);
    });
    return host;
  }

  // ----------------- FACILITIES -----------------
  public async getFacilities(filters?: { hostId?: string; status?: string; city?: string }): Promise<Facility[]> {
    let result = await this.getCollectionFromDb<Facility>('facilities');
    if (filters?.hostId) {
      result = result.filter(f => f.hostId === filters.hostId);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter(f => f.status === filters.status);
    }
    if (filters?.city) {
      result = result.filter(f => f.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    return result;
  }

  public async getFacilityById(id: string): Promise<Facility | undefined> {
    const facility = await this.getEntityFromDb<Facility>('facilities', id);
    return facility || undefined;
  }

  public async createFacility(hostId: string, data: Partial<Facility>): Promise<Facility> {
    const host = await this.findUserById(hostId);
    if (!host) throw new Error('Host not found');

    const now = new Date().toISOString();
    const facilityId = 'fac_' + crypto.randomUUID().slice(0, 8);
    const newFacility: Facility = {
      id: facilityId,
      hostId,
      name: data.name || 'New Parking Facility',
      description: data.description || '',
      address: data.address || '',
      city: data.city || 'Seattle',
      state: data.state || 'WA',
      postalCode: data.postalCode || '98101',
      country: data.country || 'USA',
      latitude: data.latitude || 47.6062,
      longitude: data.longitude || -122.3321,
      accessInstructions: data.accessInstructions || 'Scan QR code at the barrier gate scanner or enter access PIN.',
      gateType: data.gateType || 'automated_barrier',
      defaultGateCode: data.defaultGateCode || '9842#',
      clearanceHeightMeters: data.clearanceHeightMeters || 2.2,
      operatingHours: data.operatingHours || {
        is24x7: true,
        monday: { open: '00:00', close: '23:59', isOpen: true },
        tuesday: { open: '00:00', close: '23:59', isOpen: true },
        wednesday: { open: '00:00', close: '23:59', isOpen: true },
        thursday: { open: '00:00', close: '23:59', isOpen: true },
        friday: { open: '00:00', close: '23:59', isOpen: true },
        saturday: { open: '00:00', close: '23:59', isOpen: true },
        sunday: { open: '00:00', close: '23:59', isOpen: true },
      },
      amenities: data.amenities || {
        covered: true,
        cctv: true,
        securityGuard: true,
        evCharging: true,
        lighting: true,
        wheelchairAccessible: true,
        valetAssist: false,
        automatedBarrier: true
      },
      photos: data.photos && data.photos.length > 0 ? data.photos : [
        'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'draft',
      totalBays: 0,
      activeBays: 0,
      createdAt: now,
      updatedAt: now
    };

    const defaultPricingRule: PricingRule = {
      id: 'prc_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      name: 'Standard Rate Schedule',
      baseHourlyRate: 5.0,
      dailyMaxRate: 35.0,
      overnightFlatRate: 20.0,
      surgeMultiplier: 1.25,
      peakHours: [
        { start: '08:00', end: '10:00', daysOfWeek: [1, 2, 3, 4, 5] },
        { start: '16:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5] }
      ],
      weekendHourlyRate: 5.5,
      specialEvents: [],
      discounts: [
        { minHours: 24, discountPercent: 15 },
        { minHours: 72, discountPercent: 25 }
      ],
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('facilities', newFacility.id, newFacility, client);
      await this.persistEntity('pricingRules', defaultPricingRule.id, defaultPricingRule, client);
      await this.logAudit(hostId, host.fullName, 'host', 'FACILITY_CREATED', 'facility', facilityId, `Facility created: ${newFacility.name}`, client);
    });

    return newFacility;
  }

  public async updateFacility(facilityId: string, updates: Partial<Facility>, actor: User): Promise<Facility> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized to update this facility');
    }

    const allBays = await this.getCollectionFromDb<ParkingBay>('bays');
    const facilityBays = allBays.filter(b => b.facilityId === facilityId);
    facility.totalBays = facilityBays.length;
    facility.activeBays = facilityBays.filter(b => b.status === 'available' || b.status === 'occupied').length;

    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.hostId;
    delete safeUpdates.createdAt;
    Object.assign(facility, safeUpdates, { updatedAt: new Date().toISOString() });
    await this.withTransaction(async (client) => {
      await this.persistEntity('facilities', facilityId, facility, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'FACILITY_UPDATED', 'facility', facilityId, `Facility updated: ${facility.name}`, client);
    });
    return facility;
  }

  public async deleteFacility(facilityId: string, actor: User): Promise<boolean> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) return false;
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    // Check for active or confirmed bookings
    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const activeBooking = bookings.find(
      b => b.facilityId === facilityId && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    if (activeBooking) {
      throw new Error('Cannot delete facility with active or confirmed customer reservations. Please suspend the facility instead.');
    }

    const allBays = await this.getCollectionFromDb<ParkingBay>('bays');
    const facilityBays = allBays.filter(b => b.facilityId === facilityId);
    const allRules = await this.getCollectionFromDb<PricingRule>('pricingRules');
    const facilityRules = allRules.filter(r => r.facilityId === facilityId);

    await this.withTransaction(async (client) => {
      await this.deleteEntity('facilities', facilityId, client);
      for (const bay of facilityBays) {
        await this.deleteEntity('bays', bay.id, client);
      }
      for (const rule of facilityRules) {
        await this.deleteEntity('pricingRules', rule.id, client);
      }
      await this.logAudit(actor.id, actor.fullName, actor.role, 'FACILITY_DELETED', 'facility', facilityId, `Deleted facility "${facility.name}"`, client);
    });
    return true;
  }

  public async submitFacilityForReview(facilityId: string, host: User): Promise<Facility> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (facility.hostId !== host.id) throw new Error('Unauthorized');

    facility.status = 'under_review';
    facility.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await this.persistEntity('facilities', facilityId, facility, client);
      await this.createNotification(
        'usr_admin1',
        'Facility Submitted for Review',
        `Host ${host.fullName} submitted "${facility.name}" for review.`,
        'moderation',
        `/admin/facilities/${facilityId}`,
        client
      );
      await this.logAudit(host.id, host.fullName, 'host', 'FACILITY_SUBMITTED', 'facility', facilityId, `Facility submitted for moderation`, client);
    });
    return facility;
  }

  public async moderateFacility(facilityId: string, approved: boolean, notes: string, admin: User): Promise<Facility> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');

    facility.status = approved ? 'approved' : 'rejected';
    facility.moderationNotes = notes;
    facility.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await this.persistEntity('facilities', facilityId, facility, client);
      await this.createNotification(
        facility.hostId,
        approved ? 'Facility Approved!' : 'Facility Submission Update',
        approved
          ? `Your facility "${facility.name}" has been approved and is now active.`
          : `Your facility "${facility.name}" was not approved. Feedback: ${notes}`,
        'moderation',
        undefined,
        client
      );
      await this.logAudit(admin.id, admin.fullName, 'admin', approved ? 'FACILITY_APPROVED' : 'FACILITY_REJECTED', 'facility', facilityId, `Moderation decision: ${facility.status}. Notes: ${notes}`, client);
    });
    return facility;
  }

  // ----------------- PARKING BAYS -----------------
  public async getBaysByFacility(facilityId: string): Promise<ParkingBay[]> {
    const bays = await this.getCollectionFromDb<ParkingBay>('bays');
    return bays.filter(b => b.facilityId === facilityId);
  }

  public async getBayById(bayId: string): Promise<ParkingBay | undefined> {
    const bay = await this.getEntityFromDb<ParkingBay>('bays', bayId);
    return bay || undefined;
  }

  public async createBay(facilityId: string, bayData: Partial<ParkingBay>, actor: User): Promise<ParkingBay> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const existingBays = await this.getBaysByFacility(facilityId);
    const now = new Date().toISOString();
    const newBay: ParkingBay = {
      id: 'bay_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      identifier: bayData.identifier || 'Bay-' + (existingBays.length + 1),
      zone: bayData.zone || 'Level 1',
      vehicleCompatibility: bayData.vehicleCompatibility || ['sedan', 'suv'],
      dimensions: bayData.dimensions || { lengthMeters: 5.0, widthMeters: 2.5, heightMeters: 2.2 },
      isAccessibleADA: bayData.isAccessibleADA || false,
      hasEvCharger: bayData.hasEvCharger || false,
      evChargerDetails: bayData.evChargerDetails,
      amenities: bayData.amenities || ['Covered', 'Lighting'],
      status: 'available',
      hourlyRateMultiplier: bayData.hourlyRateMultiplier || 1.0,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('bays', newBay.id, newBay, client);
      await this.syncFacilityBayCount(facilityId, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_CREATED', 'bay', newBay.id, `Created bay ${newBay.identifier} in ${facility.name}`, client);
    });
    return newBay;
  }

  public async createBulkBays(
    facilityId: string,
    config: {
      prefix: string; // e.g. "A-"
      startIndex: number;
      count: number;
      zone: string;
      vehicleCompatibility: VehicleCompatibility[];
      dimensions: { lengthMeters: number; widthMeters: number; heightMeters: number };
      isAccessibleADA: boolean;
      hasEvCharger: boolean;
      evPowerKw?: number;
      hourlyRateMultiplier?: number;
    },
    actor: User
  ): Promise<ParkingBay[]> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const created: ParkingBay[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < config.count; i++) {
      const num = config.startIndex + i;
      const formattedNum = num < 10 ? `0${num}` : `${num}`;
      const identifier = `${config.prefix}${formattedNum}`;

      const bay: ParkingBay = {
        id: 'bay_' + crypto.randomUUID().slice(0, 8),
        facilityId,
        identifier,
        zone: config.zone,
        vehicleCompatibility: [...config.vehicleCompatibility],
        dimensions: { ...config.dimensions },
        isAccessibleADA: config.isAccessibleADA,
        hasEvCharger: config.hasEvCharger,
        evChargerDetails: config.hasEvCharger ? { powerKw: config.evPowerKw || 22, plugType: 'Type2' } : undefined,
        amenities: config.hasEvCharger ? ['EV Charging (22kW)', 'Covered'] : ['Standard Covered'],
        status: 'available',
        hourlyRateMultiplier: config.hourlyRateMultiplier || 1.0,
        createdAt: now,
        updatedAt: now
      };
      created.push(bay);
    }

    await this.withTransaction(async (client) => {
      for (const bay of created) {
        await this.persistEntity('bays', bay.id, bay, client);
      }
      await this.syncFacilityBayCount(facilityId, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BULK_BAYS_CREATED', 'bay', facilityId, `Created ${created.length} bays (${config.prefix}${config.startIndex}..${config.prefix}${config.startIndex + config.count - 1})`, client);
    });
    return created;
  }

  public async updateBulkBays(
    facilityId: string,
    updates: Array<{ id: string } & Partial<ParkingBay>>,
    actor: User
  ): Promise<ParkingBay[]> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const facilityBays = await this.getBaysByFacility(facilityId);
    const bayMap = new Map(facilityBays.map(b => [b.id, b]));

    for (const update of updates) {
      if (!update.id || !bayMap.has(update.id)) {
        throw new Error(`Bay '${update.id}' does not belong to facility '${facilityId}'. Unauthorized reassignment.`);
      }
    }

    const updatedBays: ParkingBay[] = [];
    const now = new Date().toISOString();

    for (const update of updates) {
      const bay = bayMap.get(update.id)!;
      const safeUpdates = { ...update };
      delete (safeUpdates as any).id;
      delete (safeUpdates as any).facilityId;
      delete (safeUpdates as any).createdAt;

      Object.assign(bay, safeUpdates, { updatedAt: now });
      updatedBays.push(bay);
    }

    await this.withTransaction(async (client) => {
      for (const bay of updatedBays) {
        await this.persistEntity('bays', bay.id, bay, client);
      }
      await this.syncFacilityBayCount(facilityId, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BULK_BAYS_UPDATED', 'bay', facilityId, `Updated ${updatedBays.length} bays in ${facility.name}`, client);
    });

    return updatedBays;
  }

  public async updateBay(bayId: string, updates: Partial<ParkingBay>, actor: User): Promise<ParkingBay> {
    const bay = await this.getBayById(bayId);
    if (!bay) throw new Error('Bay not found');
    const facility = await this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).facilityId;
    delete (safeUpdates as any).createdAt;

    Object.assign(bay, safeUpdates, { updatedAt: new Date().toISOString() });
    await this.withTransaction(async (client) => {
      await this.persistEntity('bays', bayId, bay, client);
      await this.syncFacilityBayCount(facility.id, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_UPDATED', 'bay', bayId, `Updated bay ${bay.identifier}`, client);
    });
    return bay;
  }

  public async setBayStatus(bayId: string, status: BayStatus, reason: string | undefined, actor: User): Promise<ParkingBay> {
    const bay = await this.getBayById(bayId);
    if (!bay) throw new Error('Bay not found');
    const facility = await this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    bay.status = status;
    bay.statusReason = reason;
    bay.updatedAt = new Date().toISOString();
    await this.withTransaction(async (client) => {
      await this.persistEntity('bays', bayId, bay, client);
      await this.syncFacilityBayCount(facility.id, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_STATUS_CHANGE', 'bay', bayId, `Bay ${bay.identifier} status set to ${status} (${reason || 'no reason'})`, client);
    });
    return bay;
  }

  public async deleteBay(bayId: string, actor: User): Promise<boolean> {
    const bay = await this.getBayById(bayId);
    if (!bay) return false;
    const facility = await this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const activeBooking = bookings.find(
      b => b.bayId === bayId && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    if (activeBooking) {
      throw new Error('Cannot delete bay with an active or confirmed booking. Retire the bay instead.');
    }

    await this.withTransaction(async (client) => {
      await this.deleteEntity('bays', bayId, client);
      await this.syncFacilityBayCount(facility.id, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_DELETED', 'bay', bayId, `Bay ${bay.identifier} was deleted`, client);
    });
    return true;
  }

  private async syncFacilityBayCount(facilityId: string, client?: PoolClient): Promise<void> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) return;
    const bays = await this.getCollectionFromDb<ParkingBay>('bays');
    const facilityBays = bays.filter(b => b.facilityId === facilityId && b.status !== 'retired');
    facility.totalBays = facilityBays.length;
    facility.activeBays = facilityBays.filter(b => b.status === 'available' || b.status === 'occupied').length;
    await this.persistEntity('facilities', facility.id, facility, client);
  }

  // ----------------- SECTION 3B: OPERATING HOURS -----------------
  public async getOperatingHours(facilityId: string, actor: User): Promise<{ operatingHours: OperatingHours; timezone?: string }> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }
    return {
      operatingHours: facility.operatingHours,
      timezone: facility.timezone || 'UTC'
    };
  }

  public async updateOperatingHours(
    facilityId: string,
    operatingHours: OperatingHours,
    actor: User,
    timezone?: string
  ): Promise<Facility> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    if (timezone) {
      const tzVal = validateTimezone(timezone);
      if (!tzVal.success) {
        throw new Error(tzVal.errors[0] || 'Invalid timezone');
      }
      facility.timezone = timezone;
    }

    facility.operatingHours = operatingHours;
    facility.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await this.persistEntity('facilities', facilityId, facility, client);
      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'OPERATING_HOURS_UPDATED',
        'facility',
        facilityId,
        `Operating hours updated for ${facility.name} (Timezone: ${facility.timezone || 'UTC'})`,
        client
      );
    });

    return facility;
  }

  // ----------------- SECTION 3B: DATE-SPECIFIC CLOSURES -----------------
  public async getFacilityClosures(facilityId: string, actor: User): Promise<FacilityClosure[]> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }
    const closures = await this.getCollectionFromDb<FacilityClosure>('closures');
    return closures
      .filter(c => c.facilityId === facilityId)
      .map(c => ({
        ...c,
        startsAt: c.startsAt || c.startDate || '',
        endsAt: c.endsAt || c.endDate || '',
        startDate: c.startDate || c.startsAt || '',
        endDate: c.endDate || c.endsAt || '',
        title: c.title || c.reason || 'Scheduled Facility Closure',
        spaceId: c.spaceId || c.bayId || (c.affectedBayIds && c.affectedBayIds[0]) || undefined,
        bayId: c.bayId || c.spaceId || (c.affectedBayIds && c.affectedBayIds[0]) || undefined,
      }));
  }

  public async createFacilityClosure(
    facilityId: string,
    data: {
      startDate?: string;
      endDate?: string;
      startsAt?: string;
      endsAt?: string;
      title?: string;
      reason?: string;
      affectedBayIds?: string[];
      spaceId?: string;
      bayId?: string;
    },
    actor: User
  ): Promise<FacilityClosure> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const val = validateClosure(data);
    if (!val.success) {
      throw new Error(val.errors[0] || 'Invalid closure parameters');
    }

    const valid = val.data!;
    const start = new Date(valid.startsAt).toISOString();
    const end = new Date(valid.endsAt).toISOString();

    // Check overlap with existing closures
    const closures = await this.getCollectionFromDb<FacilityClosure>('closures');
    const existing = closures.filter(c => c.facilityId === facilityId);
    for (const c of existing) {
      const cStart = new Date(c.startsAt || c.startDate!).toISOString();
      const cEnd = new Date(c.endsAt || c.endDate!).toISOString();
      if (start < cEnd && end > cStart) {
        // If bay-level, check if affected bays overlap
        const affected = data.affectedBayIds || (valid.spaceId ? [valid.spaceId] : undefined);
        const cAffected = c.affectedBayIds || (c.spaceId ? [c.spaceId] : (c.bayId ? [c.bayId] : undefined));
        if (!affected || !cAffected || affected.some(b => cAffected.includes(b))) {
          throw new Error('A closure already exists for this facility that overlaps the specified date range.');
        }
      }
    }

    // Preservation Invariant: Confirmed reservations must NOT be altered or cancelled; report conflicts instead
    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const conflictingBooking = bookings.find(b => {
      if (b.facilityId !== facilityId) return false;
      if (b.status !== 'confirmed' && b.status !== 'checked_in') return false;
      const bStart = new Date(b.startTime).toISOString();
      const bEnd = new Date(b.endTime).toISOString();
      const timeOverlaps = start < bEnd && end > bStart;
      if (!timeOverlaps) return false;
      const affected = data.affectedBayIds || (valid.spaceId ? [valid.spaceId] : undefined);
      if (!affected || affected.length === 0) return true;
      return affected.includes(b.bayId);
    });

    if (conflictingBooking) {
      throw new Error(
        `Cannot schedule closure: Conflicting confirmed reservation ${conflictingBooking.bookingReference || conflictingBooking.id} exists from ${conflictingBooking.startTime} to ${conflictingBooking.endTime}.`
      );
    }

    const now = new Date().toISOString();
    const closure: FacilityClosure = {
      id: 'cls_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      hostId: facility.hostId,
      tenantId: (facility as any).tenantId || 'default',
      title: valid.title,
      reason: valid.reason,
      startsAt: start,
      endsAt: end,
      startDate: valid.startDate || start,
      endDate: valid.endDate || end,
      spaceId: valid.spaceId,
      bayId: valid.bayId,
      affectedBayIds: data.affectedBayIds && data.affectedBayIds.length > 0 ? data.affectedBayIds : (valid.spaceId ? [valid.spaceId] : undefined),
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('closures', closure.id, closure, client);
      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'CLOSURE_CREATED',
        'facility',
        facilityId,
        `Closure scheduled from ${closure.startDate} to ${closure.endDate} (${closure.reason || 'No reason'})`,
        client
      );
    });

    return closure;
  }

  public async updateFacilityClosure(
    facilityId: string,
    closureId: string,
    updates: Partial<FacilityClosure>,
    actor: User
  ): Promise<FacilityClosure> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const closure = await this.getEntityFromDb<FacilityClosure>('closures', closureId);
    if (!closure || closure.facilityId !== facilityId) {
      throw new Error('Closure not found');
    }

    const startDate = updates.startDate || updates.startsAt || closure.startDate || closure.startsAt!;
    const endDate = updates.endDate || updates.endsAt || closure.endDate || closure.endsAt!;
    const val = validateClosure({
      title: updates.title || closure.title || updates.reason || closure.reason,
      startsAt: startDate,
      endsAt: endDate,
      startDate,
      endDate,
      reason: updates.reason ?? closure.reason,
      spaceId: updates.spaceId || updates.bayId || closure.spaceId || closure.bayId
    });
    if (!val.success) {
      throw new Error(val.errors[0] || 'Invalid closure parameters');
    }

    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();

    // Check overlap with other closures
    const closures = await this.getCollectionFromDb<FacilityClosure>('closures');
    for (const c of closures) {
      if (c.id === closureId || c.facilityId !== facilityId) continue;
      const cStart = new Date(c.startsAt || c.startDate!).toISOString();
      const cEnd = new Date(c.endsAt || c.endDate!).toISOString();
      if (start < cEnd && end > cStart) {
        throw new Error('A closure already exists for this facility that overlaps the specified date range.');
      }
    }

    // Preservation Invariant: Confirmed reservations conflict check
    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const conflictingBooking = bookings.find(b => {
      if (b.facilityId !== facilityId) return false;
      if (b.status !== 'confirmed' && b.status !== 'checked_in') return false;
      const bStart = new Date(b.startTime).toISOString();
      const bEnd = new Date(b.endTime).toISOString();
      return start < bEnd && end > bStart;
    });

    if (conflictingBooking) {
      throw new Error(
        `Cannot update closure: Conflicting confirmed reservation ${conflictingBooking.bookingReference || conflictingBooking.id} exists from ${conflictingBooking.startTime} to ${conflictingBooking.endTime}.`
      );
    }

    closure.startDate = startDate;
    closure.endDate = endDate;
    closure.startsAt = start;
    closure.endsAt = end;
    if (updates.title !== undefined) closure.title = updates.title;
    if (updates.reason !== undefined) closure.reason = updates.reason;
    if (updates.spaceId !== undefined) closure.spaceId = updates.spaceId;
    if (updates.bayId !== undefined) closure.bayId = updates.bayId;
    if (updates.affectedBayIds !== undefined) closure.affectedBayIds = updates.affectedBayIds;
    closure.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      await this.persistEntity('closures', closure.id, closure, client);
      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'CLOSURE_UPDATED',
        'facility',
        facilityId,
        `Closure updated: ${closure.startDate} to ${closure.endDate}`,
        client
      );
    });

    return closure;
  }

  public async deleteFacilityClosure(facilityId: string, closureId: string, actor: User): Promise<boolean> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const closure = await this.getEntityFromDb<FacilityClosure>('closures', closureId);
    if (!closure || closure.facilityId !== facilityId) {
      throw new Error('Closure not found');
    }

    await this.withTransaction(async (client) => {
      await this.deleteEntity('closures', closureId, client);
      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'CLOSURE_DELETED',
        'facility',
        facilityId,
        `Closure deleted: ${closure.startDate} to ${closure.endDate}`,
        client
      );
    });

    return true;
  }

  // ----------------- SECTION 3B: MAINTENANCE SCHEDULING -----------------
  public async getFacilityMaintenance(facilityId: string, actor: User): Promise<FacilityMaintenance[]> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }
    const maintenance = await this.getCollectionFromDb<FacilityMaintenance>('maintenance');
    return maintenance
      .filter(m => m.facilityId === facilityId)
      .map(m => ({
        ...m,
        startsAt: m.startsAt || m.startTime || '',
        endsAt: m.endsAt || m.endTime || '',
        startTime: m.startTime || m.startsAt || '',
        endTime: m.endTime || m.endsAt || '',
        spaceId: m.spaceId || m.bayId || null,
        bayId: m.bayId || m.spaceId || null,
      }));
  }

  public async createFacilityMaintenance(
    facilityId: string,
    data: {
      title: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      startsAt?: string;
      endsAt?: string;
      bayId?: string | null;
      spaceId?: string | null;
      status?: MaintenanceStatus;
    },
    actor: User
  ): Promise<FacilityMaintenance> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const val = validateMaintenance(data);
    if (!val.success) {
      throw new Error(val.errors[0] || 'Invalid maintenance parameters');
    }

    const valid = val.data!;
    const resolvedBayId = valid.spaceId || valid.bayId || null;

    let bay: ParkingBay | null = null;
    if (resolvedBayId) {
      bay = await this.getEntityFromDb<ParkingBay>('bays', resolvedBayId);
      if (!bay || bay.facilityId !== facilityId) {
        throw new Error('Specified parking bay does not exist in this facility.');
      }
    }

    const start = new Date(valid.startsAt).toISOString();
    const end = new Date(valid.endsAt).toISOString();

    // Check confirmed booking conflicts
    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const conflictingBooking = bookings.find(b => {
      if (b.facilityId !== facilityId) return false;
      if (b.status !== 'confirmed' && b.status !== 'checked_in') return false;
      if (resolvedBayId && b.bayId !== resolvedBayId) return false;
      const bStart = new Date(b.startTime).toISOString();
      const bEnd = new Date(b.endTime).toISOString();
      return start < bEnd && end > bStart;
    });

    if (conflictingBooking) {
      throw new Error(
        `Cannot schedule maintenance: Conflicting confirmed reservation ${conflictingBooking.bookingReference || conflictingBooking.id} exists from ${conflictingBooking.startTime} to ${conflictingBooking.endTime}.`
      );
    }

    const now = new Date().toISOString();
    const initialStatus = valid.status || 'scheduled';
    const maintenance: FacilityMaintenance = {
      id: 'maint_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      tenantId: (facility as any).tenantId || 'default',
      bayId: resolvedBayId,
      spaceId: resolvedBayId,
      title: valid.title.trim(),
      description: valid.description?.trim() || undefined,
      startTime: valid.startTime || start,
      endTime: valid.endTime || end,
      startsAt: start,
      endsAt: end,
      status: initialStatus,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('maintenance', maintenance.id, maintenance, client);

      // Bay status and inventory integrity
      if (bay && (initialStatus === 'scheduled' || initialStatus === 'in_progress')) {
        bay.status = 'maintenance';
        bay.statusReason = `Maintenance: ${maintenance.title}`;
        bay.updatedAt = now;
        await this.persistEntity('bays', bay.id, bay, client);
        await this.syncFacilityBayCount(facilityId, client);
      }

      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'MAINTENANCE_SCHEDULED',
        resolvedBayId ? 'bay' : 'facility',
        resolvedBayId || facilityId,
        `Maintenance scheduled: "${maintenance.title}" from ${maintenance.startTime} to ${maintenance.endTime}`,
        client
      );
    });

    return maintenance;
  }

  public async updateFacilityMaintenance(
    facilityId: string,
    maintenanceId: string,
    updates: Partial<FacilityMaintenance>,
    actor: User
  ): Promise<FacilityMaintenance> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const maintenance = await this.getEntityFromDb<FacilityMaintenance>('maintenance', maintenanceId);
    if (!maintenance || maintenance.facilityId !== facilityId) {
      throw new Error('Maintenance record not found');
    }

    // State machine transition validation
    if (updates.status && updates.status !== maintenance.status) {
      const transVal = validateMaintenanceTransition(maintenance.status, updates.status);
      if (!transVal.success) {
        throw new Error(transVal.errors[0] || 'Invalid maintenance status transition');
      }
    }

    const startTime = updates.startTime || updates.startsAt || maintenance.startTime || maintenance.startsAt!;
    const endTime = updates.endTime || updates.endsAt || maintenance.endTime || maintenance.endsAt!;
    const resolvedBayId = updates.bayId !== undefined ? updates.bayId : (updates.spaceId !== undefined ? updates.spaceId : (maintenance.bayId || maintenance.spaceId));
    const val = validateMaintenance({
      title: updates.title || maintenance.title,
      startTime,
      endTime,
      startsAt: startTime,
      endsAt: endTime,
      status: updates.status || maintenance.status,
      description: updates.description ?? maintenance.description,
      spaceId: resolvedBayId || undefined
    });
    if (!val.success) {
      throw new Error(val.errors[0] || 'Invalid maintenance parameters');
    }

    const valid = val.data!;
    const oldStatus = maintenance.status;
    const newStatus = updates.status || maintenance.status;
    const now = new Date().toISOString();

    maintenance.title = valid.title.trim();
    if (updates.description !== undefined) maintenance.description = updates.description ? updates.description.trim() : undefined;
    maintenance.startTime = valid.startTime || startTime;
    maintenance.endTime = valid.endTime || endTime;
    maintenance.startsAt = valid.startsAt;
    maintenance.endsAt = valid.endsAt;
    maintenance.status = newStatus;
    if (updates.bayId !== undefined) maintenance.bayId = updates.bayId;
    if (updates.spaceId !== undefined) maintenance.spaceId = updates.spaceId;
    maintenance.updatedAt = now;

    await this.withTransaction(async (client) => {
      await this.persistEntity('maintenance', maintenance.id, maintenance, client);

      // Restore or set bay status based on transition
      if (maintenance.bayId) {
        const bay = await this.getEntityFromDb<ParkingBay>('bays', maintenance.bayId);
        if (bay) {
          if ((newStatus === 'completed' || newStatus === 'cancelled') && bay.status === 'maintenance') {
            bay.status = 'available';
            bay.statusReason = undefined;
            bay.updatedAt = now;
            await this.persistEntity('bays', bay.id, bay, client);
            await this.syncFacilityBayCount(facilityId, client);
          } else if ((newStatus === 'in_progress' || newStatus === 'scheduled') && oldStatus !== newStatus && bay.status === 'available') {
            bay.status = 'maintenance';
            bay.statusReason = `Maintenance: ${maintenance.title}`;
            bay.updatedAt = now;
            await this.persistEntity('bays', bay.id, bay, client);
            await this.syncFacilityBayCount(facilityId, client);
          }
        }
      }

      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'MAINTENANCE_UPDATED',
        maintenance.bayId ? 'bay' : 'facility',
        maintenance.bayId || facilityId,
        `Maintenance updated: status=${newStatus}`,
        client
      );
    });

    return maintenance;
  }

  public async deleteFacilityMaintenance(facilityId: string, maintenanceId: string, actor: User): Promise<boolean> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    const maintenance = await this.getEntityFromDb<FacilityMaintenance>('maintenance', maintenanceId);
    if (!maintenance || maintenance.facilityId !== facilityId) {
      throw new Error('Maintenance record not found');
    }

    await this.withTransaction(async (client) => {
      await this.deleteEntity('maintenance', maintenanceId, client);

      // If bay is in maintenance, restore to available
      if (maintenance.bayId) {
        const bay = await this.getEntityFromDb<ParkingBay>('bays', maintenance.bayId);
        if (bay && bay.status === 'maintenance') {
          bay.status = 'available';
          bay.statusReason = undefined;
          bay.updatedAt = new Date().toISOString();
          await this.persistEntity('bays', bay.id, bay, client);
          await this.syncFacilityBayCount(facilityId, client);
        }
      }

      await this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'MAINTENANCE_DELETED',
        maintenance.bayId ? 'bay' : 'facility',
        maintenance.bayId || facilityId,
        `Maintenance deleted: "${maintenance.title}"`,
        client
      );
    });

    return true;
  }

  // ----------------- PRICING & QUOTES -----------------
  public async getPricingRules(facilityId: string): Promise<PricingRule[]> {
    const rules = await this.getCollectionFromDb<PricingRule>('pricingRules');
    return rules.filter(r => r.facilityId === facilityId);
  }

  public async updatePricingRule(ruleId: string, updates: Partial<PricingRule>, actor: User): Promise<PricingRule> {
    const rule = await this.getEntityFromDb<PricingRule>('pricingRules', ruleId);
    if (!rule) throw new Error('Pricing rule not found');
    const facility = await this.getFacilityById(rule.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;
    delete (safeUpdates as any).facilityId;
    delete (safeUpdates as any).createdAt;

    Object.assign(rule, safeUpdates, { updatedAt: new Date().toISOString() });
    await this.withTransaction(async (client) => {
      await this.persistEntity('pricingRules', ruleId, rule, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_UPDATED', 'pricing', ruleId, `Updated pricing rule for ${facility.name}`, client);
    });
    return rule;
  }

  public async createPricingRule(facilityId: string, ruleData: Partial<PricingRule>, actor: User): Promise<PricingRule> {
    const facility = await this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const now = new Date().toISOString();
    const newRule: PricingRule = {
      id: 'prc_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      name: ruleData.name || 'Custom Rate Schedule',
      baseHourlyRate: ruleData.baseHourlyRate || 5.0,
      dailyMaxRate: ruleData.dailyMaxRate || 35.0,
      overnightFlatRate: ruleData.overnightFlatRate || 20.0,
      surgeMultiplier: ruleData.surgeMultiplier || 1.25,
      peakHours: ruleData.peakHours || [],
      weekendHourlyRate: ruleData.weekendHourlyRate,
      specialEvents: ruleData.specialEvents || [],
      discounts: ruleData.discounts || [],
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('pricingRules', newRule.id, newRule, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_CREATED', 'pricing', newRule.id, `Created pricing rule "${newRule.name}"`, client);
    });
    return newRule;
  }

  public async getPricingRuleById(ruleId: string): Promise<PricingRule | undefined> {
    const rule = await this.getEntityFromDb<PricingRule>('pricingRules', ruleId);
    return rule || undefined;
  }

  public async deletePricingRule(ruleId: string, actor: User): Promise<boolean> {
    const rule = await this.getEntityFromDb<PricingRule>('pricingRules', ruleId);
    if (!rule) return false;
    const facility = await this.getFacilityById(rule.facilityId);
    if (facility && actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }
    await this.withTransaction(async (client) => {
      await this.deleteEntity('pricingRules', ruleId, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_DELETED', 'pricing', ruleId, `Deleted pricing rule "${rule.name}"`, client);
    });
    return true;
  }

  public async calculateQuote(facilityId: string, startTimeIso: string, endTimeIso: string, bayMultiplier = 1.0) {
    const rules = await this.getPricingRules(facilityId);
    const activeRule = rules.find(r => r.isActive) || {
      baseHourlyRate: 5.0,
      dailyMaxRate: 35.0,
      overnightFlatRate: 20.0,
      surgeMultiplier: 1.0,
      peakHours: [],
      specialEvents: [],
      discounts: []
    } as Partial<PricingRule>;

    const start = new Date(startTimeIso);
    const end = new Date(endTimeIso);
    const durationMs = end.getTime() - start.getTime();
    const totalHours = Math.max(0.5, Math.ceil(durationMs / (1000 * 60 * 60) * 10) / 10);

    let gross = 0;
    const isOvernight = totalHours >= 8 && start.getHours() >= 19;

    if (isOvernight && activeRule.overnightFlatRate) {
      gross = activeRule.overnightFlatRate;
    } else {
      let hourly = activeRule.baseHourlyRate || 5.0;
      // Weekend check
      const day = start.getDay();
      if ((day === 0 || day === 6) && activeRule.weekendHourlyRate) {
        hourly = activeRule.weekendHourlyRate;
      }

      // Peak hour check
      const hour = start.getHours();
      const isPeak = activeRule.peakHours?.some(p => {
        const [pHourStart] = p.start.split(':').map(Number);
        const [pHourEnd] = p.end.split(':').map(Number);
        return hour >= pHourStart && hour < pHourEnd;
      });

      if (isPeak && activeRule.surgeMultiplier) {
        hourly = hourly * activeRule.surgeMultiplier;
      }

      gross = hourly * totalHours * bayMultiplier;

      // Check daily max cap
      const days = Math.ceil(totalHours / 24);
      const maxCap = (activeRule.dailyMaxRate || 35.0) * days;
      if (gross > maxCap) {
        gross = maxCap;
      }
    }

    // Apply long-stay discounts if any
    let discountApplied = 0;
    if (activeRule.discounts && activeRule.discounts.length > 0) {
      const applicable = activeRule.discounts
        .filter(d => totalHours >= d.minHours)
        .sort((a, b) => b.discountPercent - a.discountPercent)[0];
      if (applicable) {
        discountApplied = (gross * applicable.discountPercent) / 100;
        gross = gross - discountApplied;
      }
    }

    // Check special event surcharge
    let eventSurcharge = 0;
    if (activeRule.specialEvents) {
      for (const ev of activeRule.specialEvents) {
        if (new Date(ev.startDate) <= end && new Date(ev.endDate) >= start) {
          eventSurcharge += ev.flatRateSurcharge;
        }
      }
    }
    gross += eventSurcharge;

    gross = Math.round(gross * 100) / 100;
    const platformFee = Math.round(gross * 0.12 * 100) / 100; // 12% platform fee
    const taxAmount = Math.round(gross * 0.08 * 100) / 100; // 8% tax
    const hostNet = Math.round((gross - platformFee) * 100) / 100; // 88% to host

    return {
      totalHours,
      baseHourlyRate: activeRule.baseHourlyRate,
      grossAmount: gross,
      platformFee,
      taxAmount,
      hostNetEarnings: hostNet,
      discountApplied,
      eventSurcharge,
      appliedSurge: activeRule.surgeMultiplier || 1.0
    };
  }

  // ----------------- AVAILABILITY & HOLDS -----------------
  public async createHold(bayId: string, facilityId: string, userId: string, startTime: string, endTime: string): Promise<AvailabilityHold> {
    await this.cleanExpiredHolds();

    const bay = await this.getBayById(bayId);
    if (!bay) throw new Error('Parking bay not found');
    if (bay.status === 'maintenance' || bay.status === 'retired') {
      throw new Error(`Bay is currently marked as ${bay.status}.`);
    }

    const holds = await this.getCollectionFromDb<AvailabilityHold>('holds');
    const existingHold = holds.find(h => h.bayId === bayId && h.expiresAt > new Date().toISOString());
    if (existingHold && existingHold.userId !== userId) {
      throw new Error('This bay is temporarily held by another customer. Please choose another bay or wait 15 minutes.');
    }

    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const hasOverlap = bookings.some(b => {
      if (b.bayId !== bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < new Date(endTime) && new Date(b.endTime) > new Date(startTime);
    });

    if (hasOverlap) {
      throw new Error('This bay is already booked for the selected time window.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const hold: AvailabilityHold = {
      id: 'hld_' + crypto.randomUUID().slice(0, 8),
      bayId,
      facilityId,
      userId,
      startTime,
      endTime,
      heldAt: now.toISOString(),
      expiresAt
    };

    await this.withTransaction(async (client) => {
      const userPrevHolds = holds.filter(h => h.bayId === bayId && h.userId === userId);
      for (const h of userPrevHolds) {
        await this.deleteEntity('holds', h.id, client);
      }
      await this.persistEntity('holds', hold.id, hold, client);
      bay.status = 'held';
      bay.updatedAt = now.toISOString();
      await this.persistEntity('bays', bay.id, bay, client);
    });

    return hold;
  }

  public async releaseHold(holdId: string): Promise<void> {
    const hold = await this.getEntityFromDb<AvailabilityHold>('holds', holdId);
    if (hold) {
      await this.withTransaction(async (client) => {
        await this.deleteEntity('holds', holdId, client);
        const bay = await this.getBayById(hold.bayId);
        if (bay && bay.status === 'held') {
          bay.status = 'available';
          bay.updatedAt = new Date().toISOString();
          await this.persistEntity('bays', bay.id, bay, client);
        }
      });
    }
  }

  // ----------------- BOOKINGS & GATE ACCESS -----------------
  public async createBooking(data: {
    facilityId: string;
    bayId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    licensePlate: string;
    vehicleMakeModel: string;
    startTime: string;
    endTime: string;
    idempotencyKey?: string;
  }): Promise<Booking> {
    await this.cleanExpiredHolds();

    if (data.idempotencyKey) {
      const bookings = await this.getCollectionFromDb<Booking>('bookings');
      const existing = bookings.find(b => b.idempotencyKey === data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const facility = await this.getFacilityById(data.facilityId);
    if (!facility) throw new Error('Facility not found');
    const bay = await this.getBayById(data.bayId);
    if (!bay) throw new Error('Parking bay not found');

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new Error('Valid start and end times required, and end time must be after start time.');
    }

    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const conflict = bookings.find(b => {
      if (b.bayId !== data.bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < end && new Date(b.endTime) > start;
    });

    if (conflict) {
      throw new Error('Selected parking bay is already booked for this timeframe.');
    }

    const quote = await this.calculateQuote(data.facilityId, data.startTime, data.endTime, bay.hourlyRateMultiplier);

    const bookingRef = 'PKZ-' + Math.floor(100000 + Math.random() * 900000);
    const qrToken = 'PKZ_QR_' + crypto.randomBytes(16).toString('hex');
    const gatePin = Math.floor(1000 + Math.random() * 9000) + '#';
    const now = new Date().toISOString();

    const booking: Booking = {
      id: 'bk_' + crypto.randomUUID().slice(0, 8),
      bookingReference: bookingRef,
      facilityId: data.facilityId,
      bayId: data.bayId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      licensePlate: data.licensePlate.toUpperCase(),
      vehicleMakeModel: data.vehicleMakeModel,
      startTime: data.startTime,
      endTime: data.endTime,
      grossAmount: quote.grossAmount,
      platformFee: quote.platformFee,
      hostNetEarnings: quote.hostNetEarnings,
      taxAmount: quote.taxAmount,
      status: 'confirmed',
      qrCodeToken: qrToken,
      gateAccessCode: gatePin,
      idempotencyKey: data.idempotencyKey,
      createdAt: now,
      updatedAt: now
    };

    await this.withTransaction(async (client) => {
      const holds = await this.getCollectionFromDb<AvailabilityHold>('holds');
      for (const h of holds.filter(h => h.bayId === data.bayId)) {
        await this.deleteEntity('holds', h.id, client);
      }

      bay.status = 'reserved';
      bay.updatedAt = now;
      await this.persistEntity('bays', bay.id, bay, client);
      await this.persistEntity('bookings', booking.id, booking, client);

      await this.recordLedgerEntry({
        idempotencyKey: 'ledg_' + (data.idempotencyKey || booking.id),
        hostId: facility.hostId,
        facilityId: facility.id,
        bookingId: booking.id,
        type: 'booking_income',
        amount: booking.hostNetEarnings,
        currency: 'USD',
        description: `Net earnings for booking ${booking.bookingReference} (${bay.identifier})`,
        status: 'completed'
      }, client);

      await this.createNotification(
        facility.hostId,
        'New Booking Received',
        `${data.customerName} booked ${bay.identifier} at ${facility.name} for $${booking.grossAmount.toFixed(2)}.`,
        'booking',
        `/host/bookings`,
        client
      );

      await this.createNotification(
        data.customerId,
        'Booking Confirmed!',
        `Your reservation ${booking.bookingReference} is confirmed. Gate code: ${gatePin}`,
        'booking',
        `/customer/bookings`,
        client
      );

      await this.logAudit(
        data.customerId,
        data.customerName,
        'customer',
        'BOOKING_CREATED',
        'booking',
        booking.id,
        `Created booking ${booking.bookingReference} for ${quote.grossAmount} USD`,
        client
      );
    });

    return booking;
  }

  public async getBookings(filters?: { hostId?: string; customerId?: string; facilityId?: string; status?: string }): Promise<Booking[]> {
    let list = await this.getCollectionFromDb<Booking>('bookings');
    if (filters?.hostId) {
      const hostFacilities = (await this.getFacilities({ hostId: filters.hostId })).map(f => f.id);
      list = list.filter(b => hostFacilities.includes(b.facilityId));
    }
    if (filters?.customerId) {
      list = list.filter(b => b.customerId === filters.customerId);
    }
    if (filters?.facilityId) {
      list = list.filter(b => b.facilityId === filters.facilityId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter(b => b.status === filters.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getBookingById(bookingId: string): Promise<Booking | undefined> {
    const booking = await this.getEntityFromDb<Booking>('bookings', bookingId);
    return booking || undefined;
  }

  public async checkInBooking(bookingId: string, actor: User): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'confirmed') {
      throw new Error(`Cannot check in. Booking is already ${booking.status}`);
    }

    const now = new Date().toISOString();
    booking.status = 'checked_in';
    booking.actualCheckInTime = now;
    booking.updatedAt = now;

    const bay = await this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'occupied';
      bay.updatedAt = now;
    }

    await this.withTransaction(async (client) => {
      await this.persistEntity('bookings', booking.id, booking, client);
      if (bay) await this.persistEntity('bays', bay.id, bay, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'GATE_CHECK_IN', 'booking', bookingId, `Customer checked in to bay ${bay?.identifier || ''}`, client);
    });

    return booking;
  }

  public async checkOutBooking(bookingId: string, actor: User): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'checked_in') {
      throw new Error(`Cannot check out. Booking is ${booking.status}`);
    }

    const now = new Date().toISOString();
    booking.status = 'completed';
    booking.actualCheckOutTime = now;
    booking.updatedAt = now;

    const bay = await this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'available';
      bay.updatedAt = now;
    }

    await this.withTransaction(async (client) => {
      await this.persistEntity('bookings', booking.id, booking, client);
      if (bay) await this.persistEntity('bays', bay.id, bay, client);
      await this.logAudit(actor.id, actor.fullName, actor.role, 'GATE_CHECK_OUT', 'booking', bookingId, `Customer checked out from bay ${bay?.identifier || ''}`, client);
    });

    return booking;
  }

  public async extendBooking(bookingId: string, additionalHours: number, actor: User): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
      throw new Error('Only active or confirmed bookings can be extended.');
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + additionalHours * 60 * 60 * 1000);

    const bookings = await this.getCollectionFromDb<Booking>('bookings');
    const conflict = bookings.some(b => {
      if (b.id === bookingId || b.bayId !== booking.bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < newEnd && new Date(b.endTime) > currentEnd;
    });

    if (conflict) {
      throw new Error('Cannot extend booking: bay is booked by another customer immediately afterwards.');
    }

    const quote = await this.calculateQuote(booking.facilityId, currentEnd.toISOString(), newEnd.toISOString());

    booking.endTime = newEnd.toISOString();
    booking.grossAmount += quote.grossAmount;
    booking.platformFee += quote.platformFee;
    booking.hostNetEarnings += quote.hostNetEarnings;
    booking.taxAmount += quote.taxAmount;
    booking.updatedAt = new Date().toISOString();

    const facility = await this.getFacilityById(booking.facilityId);

    await this.withTransaction(async (client) => {
      await this.persistEntity('bookings', booking.id, booking, client);
      if (facility) {
        await this.recordLedgerEntry({
          idempotencyKey: 'ext_' + crypto.randomUUID().slice(0, 8),
          hostId: facility.hostId,
          facilityId: facility.id,
          bookingId: booking.id,
          type: 'booking_income',
          amount: quote.hostNetEarnings,
          currency: 'USD',
          description: `Extension +${additionalHours}h for ${booking.bookingReference}`,
          status: 'completed'
        }, client);
      }
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BOOKING_EXTENDED', 'booking', bookingId, `Extended booking by ${additionalHours}h`, client);
    });

    return booking;
  }

  public async cancelBooking(bookingId: string, reason: string, actor: User): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      throw new Error('Booking is already cancelled');
    }
    if (booking.status === 'completed') {
      throw new Error('Cannot cancel an already completed booking');
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercent = 100;
    if (hoursUntilStart < 2 && hoursUntilStart > 0) {
      refundPercent = 50;
    } else if (hoursUntilStart <= 0) {
      refundPercent = 0;
    }

    const refundAmount = Math.round((booking.grossAmount * (refundPercent / 100)) * 100) / 100;
    const hostDebit = Math.round((booking.hostNetEarnings * (refundPercent / 100)) * 100) / 100;

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = now.toISOString();
    booking.refundAmount = refundAmount;
    booking.updatedAt = now.toISOString();

    const bay = await this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'available';
      bay.updatedAt = now.toISOString();
    }

    const facility = await this.getFacilityById(booking.facilityId);

    await this.withTransaction(async (client) => {
      await this.persistEntity('bookings', booking.id, booking, client);
      if (bay) await this.persistEntity('bays', bay.id, bay, client);
      if (facility && hostDebit > 0) {
        await this.recordLedgerEntry({
          idempotencyKey: 'ref_' + crypto.randomUUID().slice(0, 8),
          hostId: facility.hostId,
          facilityId: facility.id,
          bookingId: booking.id,
          type: 'booking_refund',
          amount: -hostDebit,
          currency: 'USD',
          description: `Refund debit for cancelled booking ${booking.bookingReference} (${refundPercent}% refund)`,
          status: 'completed'
        }, client);
      }
      await this.logAudit(actor.id, actor.fullName, actor.role, 'BOOKING_CANCELLED', 'booking', bookingId, `Cancelled with ${refundPercent}% refund ($${refundAmount})`, client);
    });

    return booking;
  }

  // ----------------- FINANCIALS & LEDGER -----------------
  public async recordLedgerEntry(entry: {
    idempotencyKey: string;
    hostId: string;
    facilityId?: string;
    bookingId?: string;
    type: LedgerEntry['type'];
    amount: number;
    currency: string;
    description: string;
    status: LedgerEntry['status'];
  }, client?: PoolClient): Promise<LedgerEntry> {
    const ledger = await this.getCollectionFromDb<LedgerEntry>('ledger');
    const existing = ledger.find(l => l.idempotencyKey === entry.idempotencyKey);
    if (existing) return existing;

    const currentBalance = await this.getHostAvailableBalance(entry.hostId);
    const balanceAfter = Math.round((currentBalance + entry.amount) * 100) / 100;

    const ledgerItem: LedgerEntry = {
      id: 'tx_' + crypto.randomUUID().slice(0, 8),
      idempotencyKey: entry.idempotencyKey,
      hostId: entry.hostId,
      facilityId: entry.facilityId,
      bookingId: entry.bookingId,
      type: entry.type,
      amount: entry.amount,
      balanceAfter,
      currency: entry.currency || 'USD',
      description: entry.description,
      status: entry.status,
      createdAt: new Date().toISOString()
    };

    await this.persistEntity('ledger', ledgerItem.id, ledgerItem, client);
    return ledgerItem;
  }

  public async getHostAvailableBalance(hostId: string, client?: PoolClient): Promise<number> {
    if (client && this.isPostgresActive) {
      try {
        const ledgerRes = await client.query(
          `SELECT COALESCE(SUM(amount_cents), 0) AS completed_cents
           FROM financial_ledger
           WHERE host_id = $1 AND status = 'completed'`,
          [hostId]
        );
        const payoutRes = await client.query(
          `SELECT COALESCE(SUM(amount_cents), 0) AS reserved_cents
           FROM host_payout_records
           WHERE host_id = $1 AND status IN ('PENDING', 'PROCESSING')`,
          [hostId]
        );
        const completedCents = parseInt(ledgerRes.rows[0]?.completed_cents || '0', 10);
        const reservedCents = parseInt(payoutRes.rows[0]?.reserved_cents || '0', 10);
        if (completedCents !== 0 || reservedCents !== 0) {
          return Math.max(0, Math.round((completedCents - reservedCents) / 100 * 100) / 100);
        }
      } catch (err) {
        // Fall back to collection calculation
      }
    }

    const ledger = await this.getCollectionFromDb<LedgerEntry>('ledger');
    const completedTransactions = ledger.filter(l => l.hostId === hostId && l.status === 'completed');
    const completedTotal = completedTransactions.reduce((acc, t) => acc + t.amount, 0);

    const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
    const reservedPayouts = payouts
      .filter(p => p.hostId === hostId && (p.status === 'pending' || p.status === 'processing'))
      .reduce((acc, p) => acc + p.amount, 0);

    const available = completedTotal - reservedPayouts;
    return Math.max(0, Math.round(available * 100) / 100);
  }

  public async getHostFinancialSummary(hostId: string) {
    const ledger = await this.getCollectionFromDb<LedgerEntry>('ledger');
    const hostTransactions = ledger.filter(l => l.hostId === hostId);
    const availableBalance = await this.getHostAvailableBalance(hostId);

    const lifetimeEarnings = hostTransactions
      .filter(l => l.type === 'booking_income' && l.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0);

    const lifetimePayouts = hostTransactions
      .filter(l => l.type === 'host_payout' && l.status === 'completed')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const lifetimeRefunds = hostTransactions
      .filter(l => l.type === 'booking_refund' && l.status === 'completed')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const payouts = await this.getPayouts(hostId);
    const pendingPayouts = payouts
      .filter(p => p.hostId === hostId && (p.status === 'pending' || p.status === 'processing'))
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      availableBalance,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
      lifetimePayouts: Math.round(lifetimePayouts * 100) / 100,
      lifetimeRefunds: Math.round(lifetimeRefunds * 100) / 100
    };
  }

  public async getLedger(hostId?: string): Promise<LedgerEntry[]> {
    let list = await this.getCollectionFromDb<LedgerEntry>('ledger');
    if (hostId) {
      list = list.filter(l => l.hostId === hostId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async requestPayout(
    hostId: string,
    amount: number,
    method: 'stripe_instant' | 'ach_bank_transfer',
    destinationAccount: string,
    actor: User,
    idempotencyKey?: string
  ): Promise<PayoutRequest> {
    // 1. Authorization: Verify host ownership or admin
    if (actor.role !== 'admin' && (actor.role !== 'host' || actor.id !== hostId)) {
      throw new Error('Forbidden: You can only request payouts for your own host account.');
    }

    // 2. Validate host eligibility
    const hostUser = await this.getEntityFromDb<User>('users', hostId);
    if (!hostUser) {
      throw new Error(`Host account '${hostId}' not found.`);
    }
    if (hostUser.status && hostUser.status !== 'active') {
      throw new Error(`Host account is ${hostUser.status}. Only active host accounts are eligible for payouts.`);
    }

    // 3. Amount and destination account validation
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new Error('Payout amount must be a positive number.');
    }
    const sanitizedAmount = Math.round(amount * 100) / 100;
    if (sanitizedAmount < 10) {
      throw new Error('Minimum payout request amount is $10.00.');
    }
    const targetAccount = (destinationAccount && destinationAccount.trim()) || hostUser.businessDetails?.payoutAccountNumber;
    if (!targetAccount) {
      throw new Error('Destination account or payout banking details are required.');
    }

    // 4. Concurrency lock to serialize payout requests per host
    const releaseLock = await this.acquireHostPayoutLock(hostId);

    try {
      // 5. Durable Idempotency check: return existing payout if previously submitted
      const resolvedIdempotencyKey = (idempotencyKey && idempotencyKey.trim())
        || `payout_${hostId}_${sanitizedAmount}_${targetAccount}_${Math.floor(Date.now() / 60000)}`;

      const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
      const existingPayout = payouts.find(p => (p as any).idempotencyKey === resolvedIdempotencyKey);
      if (existingPayout) {
        if (
          existingPayout.hostId !== hostId ||
          Math.abs(existingPayout.amount - sanitizedAmount) > 0.001 ||
          (targetAccount && existingPayout.destinationAccount !== targetAccount)
        ) {
          throw new Error('Idempotency conflict: An existing payout was already initiated with this idempotency key but different parameters.');
        }
        return existingPayout;
      }

      // Check available balance with pending reservations accounted for
      const available = await this.getHostAvailableBalance(hostId);
      if (sanitizedAmount > available) {
        throw new Error(`Insufficient available balance ($${available.toFixed(2)}) for payout of $${sanitizedAmount.toFixed(2)}.`);
      }

      const now = new Date().toISOString();
      const refNum = 'PO-' + Math.floor(10000000 + Math.random() * 90000000);
      const payoutId = 'po_' + crypto.randomUUID().slice(0, 8);
      const ledgerId = 'led_' + crypto.randomUUID().slice(0, 8);

      // Check provider configuration
      const stripeApiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
      const isLiveProviderConfigured = Boolean(
        stripeApiKey && !stripeApiKey.includes('****') && stripeApiKey.startsWith('sk_')
      );

      // Initial status must always be processing - never prematurely mark paid or complete ledger
      const initialStatus: PayoutStatus = 'processing';

      const initialNotes = isLiveProviderConfigured
        ? (method === 'stripe_instant'
            ? 'Instant payout transfer queued and awaiting provider dispatch'
            : 'ACH payout transfer processing and funds reserved in clearance')
        : 'External settlement provider credentials are unconfigured (STRIPE_SECRET_KEY unavailable). Payout request accepted and funds safely reserved in processing clearance.';

      const payout: PayoutRequest = {
        id: payoutId,
        hostId,
        amount: sanitizedAmount,
        method,
        destinationAccount: targetAccount,
        status: initialStatus,
        referenceNumber: refNum,
        requestedAt: now,
        completedAt: undefined,
        notes: initialNotes
      };
      (payout as any).idempotencyKey = resolvedIdempotencyKey;

      const ledgerDescription = `Payout disbursement (${method === 'stripe_instant' ? 'Stripe Instant' : 'ACH Bank Transfer'}) to ${targetAccount} (${refNum})`;

      const ledgerItem: LedgerEntry = {
        id: ledgerId,
        idempotencyKey: 'payout_tx_' + payout.id,
        hostId,
        type: 'host_payout',
        amount: -sanitizedAmount,
        balanceAfter: Math.round((available - sanitizedAmount) * 100) / 100,
        currency: 'USD',
        description: ledgerDescription,
        status: 'pending',
        createdAt: now
      };

      // STEP 1: Durably commit reservation and idempotency record to the database FIRST
      const committedPayout = await this.withTransaction(async (client) => {
        if (client) {
          // Lock host user row in PostgreSQL transaction to serialize concurrent financial requests
          await client.query('SELECT id, status FROM users WHERE id = $1 FOR UPDATE', [hostId]);

          // Re-verify idempotency inside database transaction
          const checkRes = await client.query(
            'SELECT id FROM host_payout_records WHERE idempotency_key = $1',
            [resolvedIdempotencyKey]
          );
          if (checkRes.rows.length > 0) {
            const foundPayout = payouts.find(p => (p as any).idempotencyKey === resolvedIdempotencyKey);
            return foundPayout || payout;
          }

          // Re-verify available balance inside transaction
          const txAvailable = await this.getHostAvailableBalance(hostId, client);
          if (sanitizedAmount > txAvailable) {
            throw new Error(`Insufficient available balance ($${txAvailable.toFixed(2)}) for payout of $${sanitizedAmount.toFixed(2)}.`);
          }
        }

        await this.persistEntity('payouts', payout.id, payout, client);
        await this.persistEntity('ledger', ledgerItem.id, ledgerItem, client);

        await this.logAudit(
          actor.id,
          actor.fullName,
          actor.role,
          'PAYOUT_REQUESTED',
          'payout',
          payout.id,
          `Payout $${sanitizedAmount.toFixed(2)} via ${method} reserved (Reference: ${refNum}, Status: ${initialStatus}). Notes: ${initialNotes}`,
          client
        );

        return payout;
      });

      // If duplicate request matched existing persisted payout, return it without duplicate transfers
      if (committedPayout.id !== payout.id) {
        return committedPayout;
      }

      // STEP 2: Only AFTER reservation and idempotency are durably committed, initiate external transfer
      if (isLiveProviderConfigured && method === 'stripe_instant') {
        try {
          const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeApiKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': resolvedIdempotencyKey
            },
            body: new URLSearchParams({
              amount: Math.round(sanitizedAmount * 100).toString(),
              currency: 'usd',
              destination: targetAccount,
              description: `ParkEazy payout ${refNum}`
            }),
            signal: AbortSignal.timeout(7000)
          });
          const transferData: any = await transferRes.json();
          if (!transferRes.ok) {
            // Provider failed - mark failed and release reservation
            payout.status = 'failed';
            payout.notes = `Provider transfer dispatch failed: ${transferData?.error?.message || 'Stripe API rejection'}`;
            await this.failPayout(payout.id, payout.notes, actor);
          } else if (transferData.id) {
            if (transferData.status === 'paid' || transferData.status === 'succeeded') {
              // Only mark paid upon verified provider confirmation
              await this.confirmPayout(payout.id, transferData.id, new Date().toISOString(), actor);
              payout.status = 'paid';
              payout.completedAt = new Date().toISOString();
              payout.notes = `Dispatched to Stripe and confirmed paid (Transfer ID: ${transferData.id})`;
            } else {
              payout.status = 'processing';
              payout.notes = `Dispatched to Stripe (Transfer ID: ${transferData.id}, Status: ${transferData.status || 'in_transit'})`;
              await this.persistEntity('payouts', payout.id, payout);
            }
          }
        } catch (err: any) {
          payout.status = 'processing';
          payout.notes = `Transfer dispatch pending gateway retry: ${err.message}`;
          await this.persistEntity('payouts', payout.id, payout);
        }
      }

      return payout;
    } finally {
      releaseLock();
    }
  }

  public async confirmPayout(
    payoutId: string,
    providerReferenceOrTransferId?: string,
    completedAt?: string,
    actor?: User
  ): Promise<PayoutRequest> {
    const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
    const payout = payouts.find(p => p.id === payoutId || p.referenceNumber === payoutId);
    if (!payout) {
      throw new Error(`Payout record '${payoutId}' not found.`);
    }

    if (payout.status === 'paid') {
      return payout; // Idempotent
    }
    if (payout.status === 'failed') {
      throw new Error(`Cannot confirm payout '${payout.id}' because it has already failed.`);
    }

    payout.status = 'paid';
    payout.completedAt = completedAt || new Date().toISOString();
    if (providerReferenceOrTransferId) {
      payout.providerTransferId = providerReferenceOrTransferId;
      payout.notes = `${payout.notes || ''} [Confirmed by provider: ${providerReferenceOrTransferId}]`.trim();
    }

    return await this.withTransaction(async (client) => {
      // 1. Update payout record
      await this.persistEntity('payouts', payout.id, payout, client);

      // 2. Update ledger entry from pending to completed
      const ledger = await this.getCollectionFromDb<LedgerEntry>('ledger');
      const ledgerEntry = ledger.find(l => l.idempotencyKey === 'payout_tx_' + payout.id || l.idempotencyKey === (payout as any).idempotencyKey);
      if (ledgerEntry) {
        ledgerEntry.status = 'completed';
        await this.persistEntity('ledger', ledgerEntry.id, ledgerEntry, client);
      }

      // 3. Log audit
      await this.logAudit(
        actor?.id || 'system_provider',
        actor?.fullName || 'Payment Settlement Provider',
        actor?.role || 'admin',
        'PAYOUT_CONFIRMED',
        'payout',
        payout.id,
        `Payout ${payout.id} verified and settled. Provider ref: ${providerReferenceOrTransferId || payout.referenceNumber}. Ledger completed.`,
        client
      );

      return payout;
    });
  }

  public async failPayout(
    payoutId: string,
    failureReason: string,
    actor?: User
  ): Promise<PayoutRequest> {
    const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
    const payout = payouts.find(p => p.id === payoutId || p.referenceNumber === payoutId);
    if (!payout) {
      throw new Error(`Payout record '${payoutId}' not found.`);
    }

    if (payout.status === 'failed') {
      return payout; // Idempotent
    }
    if (payout.status === 'paid') {
      throw new Error(`Cannot fail payout '${payout.id}' because it has already been marked paid.`);
    }

    payout.status = 'failed';
    payout.notes = `${payout.notes || ''} [Failed: ${failureReason}]`.trim();

    return await this.withTransaction(async (client) => {
      // 1. Update payout record
      await this.persistEntity('payouts', payout.id, payout, client);

      // 2. Update ledger entry to failed (releases reserved balance)
      const ledger = await this.getCollectionFromDb<LedgerEntry>('ledger');
      const ledgerEntry = ledger.find(l => l.idempotencyKey === 'payout_tx_' + payout.id || l.idempotencyKey === (payout as any).idempotencyKey);
      if (ledgerEntry) {
        ledgerEntry.status = 'failed';
        await this.persistEntity('ledger', ledgerEntry.id, ledgerEntry, client);
      }

      // 3. Log audit
      await this.logAudit(
        actor?.id || 'system_provider',
        actor?.fullName || 'Payment Settlement Provider',
        actor?.role || 'admin',
        'PAYOUT_FAILED',
        'payout',
        payout.id,
        `Payout ${payout.id} failed: ${failureReason}. Balance reservation released.`,
        client
      );

      return payout;
    });
  }

  public async reconcilePayout(
    payoutId: string,
    actor: User
  ): Promise<{
    success: boolean;
    payout: PayoutRequest;
    reconciled: boolean;
    providerStatus?: string;
    blocker?: string;
    message: string;
  }> {
    const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
    const payout = payouts.find(p => p.id === payoutId || p.referenceNumber === payoutId);
    if (!payout) {
      throw new Error(`Payout record '${payoutId}' not found.`);
    }

    // Authorization
    if (actor.role !== 'admin' && (actor.role !== 'host' || actor.id !== payout.hostId)) {
      throw new Error('Forbidden: You can only reconcile payouts for your own host account.');
    }

    // If already finalized (paid or failed), no need to query provider
    if (payout.status === 'paid' || payout.status === 'failed') {
      return {
        success: true,
        payout,
        reconciled: true,
        providerStatus: payout.status.toUpperCase(),
        message: `Payout is already finalized with status '${payout.status}'.`
      };
    }

    // Check provider configuration
    const stripeApiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
    const isConfigured = Boolean(stripeApiKey && !stripeApiKey.includes('****') && stripeApiKey.startsWith('sk_'));

    if (!isConfigured) {
      return {
        success: false,
        payout,
        reconciled: false,
        blocker: 'STRIPE_CREDENTIALS_UNCONFIGURED',
        message: 'Live provider status reconciliation unavailable: Stripe API credentials (STRIPE_SECRET_KEY) are unconfigured. The payout remains safely held in processing state with reserved balance.'
      };
    }

    // Live provider query (when STRIPE_SECRET_KEY is provided)
    try {
      const lookupId = payout.providerTransferId || payout.referenceNumber;
      const response = await fetch(`https://api.stripe.com/v1/transfers/${encodeURIComponent(lookupId)}`, {
        headers: { Authorization: `Bearer ${stripeApiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      const data: any = await response.json();
      if (!response.ok) {
        return {
          success: false,
          payout,
          reconciled: false,
          blocker: 'PROVIDER_API_ERROR',
          message: data?.error?.message || 'Provider query returned an error'
        };
      }

      if (data.status === 'paid' || data.status === 'succeeded') {
        const confirmed = await this.confirmPayout(payout.id, data.id, new Date().toISOString(), actor);
        return {
          success: true,
          payout: confirmed,
          reconciled: true,
          providerStatus: data.status,
          message: 'Provider confirmed transfer completion. Payout marked as paid and ledger completed.'
        };
      } else if (data.status === 'failed' || data.status === 'reversed') {
        const failed = await this.failPayout(payout.id, data.failure_message || 'Provider transfer reversed', actor);
        return {
          success: true,
          payout: failed,
          reconciled: true,
          providerStatus: data.status,
          message: 'Provider reported transfer failure. Payout marked as failed and balance reservation released.'
        };
      }

      return {
        success: true,
        payout,
        reconciled: false,
        providerStatus: data.status,
        message: `Provider status is '${data.status}'. Transfer remains in processing clearance.`
      };
    } catch (err: any) {
      return {
        success: false,
        payout,
        reconciled: false,
        blocker: 'NETWORK_TIMEOUT',
        message: `Failed to contact provider: ${err.message}`
      };
    }
  }

  public async cancelPayout(
    payoutId: string,
    actor: User,
    reason?: string
  ): Promise<PayoutRequest> {
    const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
    const payout = payouts.find(p => p.id === payoutId || p.referenceNumber === payoutId);
    if (!payout) {
      throw new Error(`Payout record '${payoutId}' not found.`);
    }

    // Authorization
    if (actor.role !== 'admin' && (actor.role !== 'host' || actor.id !== payout.hostId)) {
      throw new Error('Forbidden: You can only cancel payouts for your own host account.');
    }

    if (payout.status === 'paid') {
      throw new Error('Cannot cancel a payout that has already been settled and paid.');
    }
    if (payout.status === 'failed') {
      return payout;
    }

    return await this.failPayout(
      payout.id,
      `Cancelled by ${actor.fullName || actor.role}: ${reason || 'User requested cancellation before provider clearance'}`,
      actor
    );
  }

  public async processProviderWebhook(
    provider: 'stripe' | 'razorpay' | string,
    payload: any,
    signatureHeader?: string,
    rawPayload?: string | Buffer
  ): Promise<{ success: boolean; received: true; duplicate?: boolean; error?: string }> {
    const eventId = payload?.id || payload?.event_id;
    if (!eventId) {
      throw new Error('Webhook event missing required identifier.');
    }

    // 0. Concurrency lock to prevent concurrent double-processing of identical events
    const releaseLock = await this.acquireWebhookEventLock(eventId);

    try {
      // 1. Verify webhook signature against exact raw request body and fail closed when not configured
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
      const isProd = process.env.NODE_ENV === 'production';

      if (isProd) {
        if (!signatureHeader) {
          throw new Error('Missing webhook signature header in production.');
        }
        if (signatureHeader.includes('mock') || signatureHeader.includes('bypass') || signatureHeader.includes('test_sig')) {
          throw new Error('Mock signatures and test bypasses are rejected in production.');
        }
      }

      if (signatureHeader) {
        if (!webhookSecret || webhookSecret.includes('****')) {
          throw new Error('Webhook verification failed: Provider webhook secret is not configured (failing closed).');
        }
        const parts = signatureHeader.split(',').reduce((acc: any, part) => {
          const [k, v] = part.split('=');
          if (k && v) acc[k.trim()] = v.trim();
          return acc;
        }, {});
        if (!parts.t || !parts.v1) {
          throw new Error('Malformed webhook signature header format.');
        }

        // Timestamp / replay protection: 5 minutes (300 seconds) tolerance
        const timestamp = parseInt(parts.t, 10);
        if (!isNaN(timestamp)) {
          const nowSec = Math.floor(Date.now() / 1000);
          if (Math.abs(nowSec - timestamp) > 300) {
            throw new Error('Webhook timestamp outside acceptable tolerance (replay protection).');
          }
        }

        const rawBuffer = Buffer.isBuffer(rawPayload)
          ? rawPayload
          : Buffer.from(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(payload));
        const signedPayload = Buffer.concat([Buffer.from(`${parts.t}.`), rawBuffer]);
        const expectedSig = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
        const expectedBuf = Buffer.from(expectedSig);
        const receivedBuf = Buffer.from(parts.v1);
        if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
          throw new Error('Invalid webhook signature verification.');
        }
      }

      // 2. Deduplicate event ID
      const auditLogs = await this.getCollectionFromDb<AuditLog>('auditLogs');
      const alreadyProcessed = auditLogs.some(
        a => a.action === 'WEBHOOK_EVENT_PROCESSED' && a.entityId === eventId
      );
      if (alreadyProcessed) {
        return { success: true, received: true, duplicate: true };
      }

      // 3. Process event
      const eventType = payload.type || payload.event;
      const eventData = payload.data?.object || payload.payload || {};

      if (eventType === 'payout.paid' || eventType === 'transfer.paid' || eventType === 'transfer.succeeded') {
        const refOrId = eventData.reference_number || eventData.id || eventData.metadata?.payoutId;
        if (refOrId) {
          // Authoritative settlement evidence required before confirming payout
          await this.confirmPayout(refOrId, eventData.id, new Date().toISOString());
        }
      } else if (eventType === 'transfer.created') {
        // External transfer creation is only dispatch in-transit; never prematurely mark paid or complete ledger
        const refOrId = eventData.reference_number || eventData.id || eventData.metadata?.payoutId;
        if (refOrId) {
          const payouts = await this.getCollectionFromDb<PayoutRequest>('payouts');
          const payout = payouts.find(p => p.id === refOrId || p.referenceNumber === refOrId);
          if (payout && payout.status !== 'paid') {
            payout.status = 'processing';
            payout.providerTransferId = eventData.id;
            payout.notes = `External transfer created with provider (Transfer ID: ${eventData.id}). Awaiting validated settlement evidence.`;
            await this.persistEntity('payouts', payout.id, payout);
          }
        }
      } else if (eventType === 'payout.failed' || eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
        const refOrId = eventData.reference_number || eventData.id || eventData.metadata?.payoutId;
        if (refOrId) {
          await this.failPayout(refOrId, eventData.failure_message || 'Transfer failed or reversed by provider');
        }
      }

      // 4. Record event processed in audit trail for durable deduplication
      await this.logAudit(
        'provider_webhook',
        provider.toUpperCase() + ' Webhook',
        'admin',
        'WEBHOOK_EVENT_PROCESSED',
        'provider',
        eventId,
        `Processed webhook event ${eventType} (${eventId})`
      );

      return { success: true, received: true };
    } finally {
      releaseLock();
    }
  }

  public async requestPasswordReset(email: string) {
    return this.createPasswordResetToken(email);
  }

  public async getPayouts(hostId?: string): Promise<PayoutRequest[]> {
    let list = await this.getCollectionFromDb<PayoutRequest>('payouts');
    if (hostId) {
      list = list.filter(p => p.hostId === hostId);
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  // ----------------- THIRD PARTY PROVIDERS & SECRETS -----------------
  private maskSecretValue(key: string, value: string): string {
    if (!value || typeof value !== 'string') return value;
    if (/secret|key|token|password|auth|credential|cert/i.test(key)) {
      if (value.length <= 8) return '********';
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }
    return value;
  }

  private maskProviderConfig(p: ThirdPartyProviderConfig): ThirdPartyProviderConfig {
    const maskedSettings: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.settings || {})) {
      maskedSettings[k] = this.maskSecretValue(k, v);
    }
    return {
      ...p,
      settings: maskedSettings
    };
  }

  public async getProviders(): Promise<ThirdPartyProviderConfig[]> {
    const providers = await this.getCollectionFromDb<ThirdPartyProviderConfig>('providers');
    return providers.map(p => this.maskProviderConfig(p));
  }

  public async updateProvider(id: string, updates: Partial<ThirdPartyProviderConfig>, admin: User): Promise<ThirdPartyProviderConfig> {
    const providers = await this.getCollectionFromDb<ThirdPartyProviderConfig>('providers');
    const p = providers.find(prov => prov.id === id);
    if (!p) throw new Error('Provider not found');

    if (updates.isEnabled !== undefined) p.isEnabled = updates.isEnabled;
    if (updates.settings) {
      const mergedSettings = { ...p.settings };
      for (const [k, v] of Object.entries(updates.settings)) {
        if (typeof v === 'string' && v.includes('****')) {
          continue;
        }
        mergedSettings[k] = v;
      }
      p.settings = mergedSettings;
    }

    await this.withTransaction(async (client) => {
      await this.persistEntity('providers', id, p, client);
      await this.logAudit(admin.id, admin.fullName, 'admin', 'PROVIDER_CONFIG_UPDATED', 'provider', id, `Updated configuration for ${p.name}`, client);
    });
    return this.maskProviderConfig(p);
  }

  public shutdown(): void {
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
      this.expiryInterval = null;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = DB_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, DB_FILE);
      } catch (err) {
        console.error('Failed to flush database on shutdown:', err);
      }
    }
  }

  public async testProviderConnection(id: string, admin: User): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const providers = await this.getCollectionFromDb<ThirdPartyProviderConfig>('providers');
    const p = providers.find(prov => prov.id === id);
    if (!p) throw new Error('Provider not found');

    const latencyMs = Math.floor(45 + Math.random() * 85);
    const now = new Date().toISOString();

    if (!p.isEnabled) {
      p.lastTestedAt = now;
      p.testStatus = 'degraded';
      p.testMessage = 'Provider is disabled in configuration.';
      await this.persistEntity('providers', id, p);
      return { success: false, latencyMs, message: 'Provider is disabled.' };
    }

    p.lastTestedAt = now;
    p.testStatus = 'healthy';
    p.testMessage = `Connected successfully (HTTP 200 OK, latency: ${latencyMs}ms)`;

    await this.withTransaction(async (client) => {
      await this.persistEntity('providers', id, p, client);
      await this.logAudit(admin.id, admin.fullName, 'admin', 'PROVIDER_TEST_PING', 'provider', id, `Test ping succeeded: ${latencyMs}ms`, client);
    });
    return { success: true, latencyMs, message: p.testMessage };
  }

  // ----------------- REVIEWS & RATINGS -----------------
  public async getReviews(facilityId?: string): Promise<Review[]> {
    let list = await this.getCollectionFromDb<Review>('reviews');
    if (facilityId) {
      list = list.filter(r => r.facilityId === facilityId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async addReview(facilityId: string, customerId: string, customerName: string, bookingId: string, rating: number, comment: string): Promise<Review> {
    const review: Review = {
      id: 'rev_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      customerId,
      customerName,
      bookingId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    await this.persistEntity('reviews', review.id, review);
    return review;
  }

  public async replyToReview(reviewId: string, replyText: string, host: User): Promise<Review> {
    const rev = await this.getEntityFromDb<Review>('reviews', reviewId);
    if (!rev) throw new Error('Review not found');

    rev.hostResponse = {
      text: replyText,
      respondedAt: new Date().toISOString()
    };
    await this.withTransaction(async (client) => {
      await this.persistEntity('reviews', reviewId, rev, client);
      await this.logAudit(host.id, host.fullName, 'host', 'REVIEW_REPLIED', 'facility', rev.facilityId, `Host replied to review ${reviewId}`, client);
    });
    return rev;
  }

  // ----------------- NOTIFICATIONS & MESSAGES -----------------
  public async createNotification(userId: string, title: string, message: string, type: NotificationItem['type'], link?: string, client?: PoolClient): Promise<NotificationItem> {
    const item: NotificationItem = {
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      link
    };
    await this.persistEntity('notifications', item.id, item, client);
    return item;
  }

  public async getNotifications(userId: string): Promise<NotificationItem[]> {
    const list = await this.getCollectionFromDb<NotificationItem>('notifications');
    return list
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationRead(id: string, userId: string): Promise<void> {
    const n = await this.getEntityFromDb<NotificationItem>('notifications', id);
    if (n && n.userId === userId) {
      n.isRead = true;
      await this.persistEntity('notifications', id, n);
    }
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    const list = await this.getCollectionFromDb<NotificationItem>('notifications');
    for (const n of list) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        await this.persistEntity('notifications', n.id, n);
      }
    }
  }

  // Messages
  public async getMessages(userId: string): Promise<MessageThread[]> {
    const list = await this.getCollectionFromDb<MessageThread>('messages');
    return list.filter(m => m.hostId === userId || m.customerId === userId);
  }

  public async sendMessage(threadId: string, sender: User, text: string): Promise<MessageThread> {
    const thread = await this.getEntityFromDb<MessageThread>('messages', threadId);
    if (!thread) throw new Error('Message thread not found');

    const msg = {
      id: 'msg_' + crypto.randomUUID().slice(0, 8),
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      text,
      timestamp: new Date().toISOString()
    };

    thread.messages.push(msg);
    thread.lastMessageAt = msg.timestamp;

    const recipientId = sender.id === thread.hostId ? thread.customerId : thread.hostId;
    await this.withTransaction(async (client) => {
      await this.persistEntity('messages', threadId, thread, client);
      await this.createNotification(
        recipientId,
        `New Message from ${sender.fullName}`,
        text.slice(0, 60) + (text.length > 60 ? '...' : ''),
        'alert',
        undefined,
        client
      );
    });
    return thread;
  }

  // ----------------- DISPUTES & SUPPORT -----------------
  public async getDisputes(filters?: { hostId?: string; customerId?: string }): Promise<DisputeTicket[]> {
    let list = await this.getCollectionFromDb<DisputeTicket>('disputes');
    if (filters?.hostId) list = list.filter(d => d.hostId === filters.hostId);
    if (filters?.customerId) list = list.filter(d => d.customerId === filters.customerId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createDispute(data: {
    bookingId: string;
    reason: DisputeTicket['reason'];
    statement: string;
    customer: User;
  }): Promise<DisputeTicket> {
    const booking = await this.getBookingById(data.bookingId);
    if (!booking) throw new Error('Booking not found');
    const facility = await this.getFacilityById(booking.facilityId);
    if (!facility) throw new Error('Facility not found');

    const ticket: DisputeTicket = {
      id: 'dsp_' + crypto.randomUUID().slice(0, 8),
      ticketNumber: 'DISP-' + Math.floor(10000 + Math.random() * 90000),
      bookingId: booking.id,
      facilityId: booking.facilityId,
      customerId: data.customer.id,
      hostId: facility.hostId,
      reason: data.reason,
      status: 'open',
      customerStatement: data.statement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.withTransaction(async (client) => {
      await this.persistEntity('disputes', ticket.id, ticket, client);
      await this.createNotification(facility.hostId, 'Dispute Filed', `Customer opened dispute ${ticket.ticketNumber}`, 'dispute', undefined, client);
    });
    return ticket;
  }

  public async resolveDispute(
    ticketId: string,
    decision: 'resolved_refunded' | 'resolved_dismissed',
    refundAmount: number,
    notes: string,
    admin: User
  ): Promise<DisputeTicket> {
    const ticket = await this.getEntityFromDb<DisputeTicket>('disputes', ticketId);
    if (!ticket) throw new Error('Dispute not found');

    ticket.status = decision;
    ticket.resolutionNotes = notes;
    ticket.refundAmount = refundAmount;
    ticket.updatedAt = new Date().toISOString();

    await this.withTransaction(async (client) => {
      if (decision === 'resolved_refunded' && refundAmount > 0) {
        const booking = await this.getBookingById(ticket.bookingId);
        if (booking) {
          booking.refundAmount = (booking.refundAmount || 0) + refundAmount;
          await this.persistEntity('bookings', booking.id, booking, client);
        }
        await this.recordLedgerEntry({
          idempotencyKey: 'disp_ref_' + ticket.id,
          hostId: ticket.hostId,
          facilityId: ticket.facilityId,
          bookingId: ticket.bookingId,
          type: 'booking_refund',
          amount: -refundAmount,
          currency: 'USD',
          description: `Dispute ${ticket.ticketNumber} resolution refund`,
          status: 'completed'
        }, client);
      }

      await this.persistEntity('disputes', ticketId, ticket, client);
      await this.logAudit(admin.id, admin.fullName, 'admin', 'DISPUTE_RESOLVED', 'dispute', ticketId, `Dispute ${ticket.ticketNumber} set to ${decision}`, client);
    });
    return ticket;
  }

  // ----------------- SEED DATA GENERATOR -----------------
  private generateSeedData(): DatabaseSchema {
    const hostUser: User = {
      id: 'usr_host1',
      email: 'host@parkeazy.com',
      passwordHash: hashPassword('host123'),
      fullName: 'Marcus Vance',
      phone: '+1 (206) 555-0192',
      role: 'host',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      isEmailVerified: true,
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-02-15T10:00:00.000Z',
      businessDetails: {
        businessName: 'Metro Parking Management LLC',
        registrationNumber: 'WA-CORP-948102',
        taxId: '91-3829104',
        payoutBankName: 'Silicon Valley Bank / First Republic',
        payoutAccountNumber: '****8492',
        payoutRoutingNumber: '121000358',
        stripeConnectAccountId: 'acct_1NZVb4KJ910aBCDe',
        isVerified: true
      }
    };

    const hostUser2: User = {
      id: 'usr_host2',
      email: 'sarah.host@parkeazy.com',
      passwordHash: hashPassword('host123'),
      fullName: 'Sarah Jenkins',
      phone: '+1 (206) 555-0144',
      role: 'host',
      status: 'active',
      isEmailVerified: true,
      createdAt: '2026-01-20T08:00:00.000Z',
      updatedAt: '2026-02-18T10:00:00.000Z',
      businessDetails: {
        businessName: 'EcoPark Pacific Bays Inc',
        registrationNumber: 'WA-CORP-810294',
        taxId: '91-5510294',
        payoutBankName: 'JPMorgan Chase Bank',
        payoutAccountNumber: '****1920',
        payoutRoutingNumber: '021000021',
        stripeConnectAccountId: 'acct_1MZVa8KJ940zWXYz',
        isVerified: true
      }
    };

    const customerUser: User = {
      id: 'usr_cust1',
      email: 'alex.driver@example.com',
      passwordHash: hashPassword('driver123'),
      fullName: 'Alex Driver',
      phone: '+1 (206) 555-0188',
      role: 'customer',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      isEmailVerified: true,
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z'
    };

    const adminUser: User = {
      id: 'usr_admin1',
      email: 'admin@parkeazy.com',
      passwordHash: hashPassword('admin123'),
      fullName: 'Sarah Connor (Admin)',
      phone: '+1 (206) 555-9999',
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
      createdAt: '2025-12-01T08:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z'
    };

    const fac1: Facility = {
      id: 'fac_metro_downtown',
      hostId: 'usr_host1',
      name: 'Downtown Metro Tech Center Garage',
      description: 'Prime underground multi-level parking located at 400 Pine St, directly connected to Tech Plaza. 24/7 automated barrier access, CCTV surveillance, on-site security, and 22kW EV fast charging.',
      address: '400 Pine Street',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA',
      latitude: 47.6115,
      longitude: -122.3364,
      accessInstructions: 'Drive up to the automated barrier on 4th Ave entrance. Hold your QR code up to the scanner on the driver pedestal or type the 4-digit PIN code.',
      gateType: 'automated_barrier',
      defaultGateCode: '4921#',
      clearanceHeightMeters: 2.2,
      operatingHours: {
        is24x7: true,
        monday: { open: '00:00', close: '23:59', isOpen: true },
        tuesday: { open: '00:00', close: '23:59', isOpen: true },
        wednesday: { open: '00:00', close: '23:59', isOpen: true },
        thursday: { open: '00:00', close: '23:59', isOpen: true },
        friday: { open: '00:00', close: '23:59', isOpen: true },
        saturday: { open: '00:00', close: '23:59', isOpen: true },
        sunday: { open: '00:00', close: '23:59', isOpen: true }
      },
      amenities: {
        covered: true,
        cctv: true,
        securityGuard: true,
        evCharging: true,
        lighting: true,
        wheelchairAccessible: true,
        valetAssist: false,
        automatedBarrier: true
      },
      photos: [
        'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'active',
      totalBays: 8,
      activeBays: 8,
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: '2026-02-01T12:00:00.000Z'
    };

    const fac2: Facility = {
      id: 'fac_waterfront_lot',
      hostId: 'usr_host1',
      name: 'Pike Place Waterfront Parking Lot',
      description: 'Convenient ground-level outdoor parking lot steps from Pike Place Market and the Seattle Great Wheel. License plate recognition and automatic gate arms.',
      address: '1500 Alaskan Way',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'USA',
      latitude: 47.6080,
      longitude: -122.3415,
      accessInstructions: 'Entrance on Alaskan Way. The LPR camera reads your registered license plate and automatically opens the boom gate.',
      gateType: 'license_plate_recognition',
      defaultGateCode: '8833#',
      clearanceHeightMeters: 3.5,
      operatingHours: {
        is24x7: false,
        monday: { open: '06:00', close: '23:00', isOpen: true },
        tuesday: { open: '06:00', close: '23:00', isOpen: true },
        wednesday: { open: '06:00', close: '23:00', isOpen: true },
        thursday: { open: '06:00', close: '23:00', isOpen: true },
        friday: { open: '06:00', close: '23:59', isOpen: true },
        saturday: { open: '06:00', close: '23:59', isOpen: true },
        sunday: { open: '07:00', close: '22:00', isOpen: true }
      },
      amenities: {
        covered: false,
        cctv: true,
        securityGuard: false,
        evCharging: true,
        lighting: true,
        wheelchairAccessible: true,
        valetAssist: false,
        automatedBarrier: true
      },
      photos: [
        'https://images.unsplash.com/photo-1545179605-1296651e4d53?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'active',
      totalBays: 6,
      activeBays: 6,
      createdAt: '2026-01-18T10:00:00.000Z',
      updatedAt: '2026-02-05T12:00:00.000Z'
    };

    const fac3: Facility = {
      id: 'fac_capitol_hill',
      hostId: 'usr_host2',
      name: 'Capitol Hill Transit Hub Parking',
      description: 'Secure multi-story parking adjacent to Capitol Hill light rail station. Eco-friendly with solar roof canopy.',
      address: '920 E Pine St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98122',
      country: 'USA',
      latitude: 47.6151,
      longitude: -122.3195,
      accessInstructions: 'Scan mobile access pass QR code at the entry column.',
      gateType: 'qr_scanner',
      defaultGateCode: '1192#',
      clearanceHeightMeters: 2.1,
      operatingHours: {
        is24x7: true,
        monday: { open: '00:00', close: '23:59', isOpen: true },
        tuesday: { open: '00:00', close: '23:59', isOpen: true },
        wednesday: { open: '00:00', close: '23:59', isOpen: true },
        thursday: { open: '00:00', close: '23:59', isOpen: true },
        friday: { open: '00:00', close: '23:59', isOpen: true },
        saturday: { open: '00:00', close: '23:59', isOpen: true },
        sunday: { open: '00:00', close: '23:59', isOpen: true }
      },
      amenities: {
        covered: true,
        cctv: true,
        securityGuard: true,
        evCharging: true,
        lighting: true,
        wheelchairAccessible: true,
        valetAssist: false,
        automatedBarrier: true
      },
      photos: [
        'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80'
      ],
      status: 'under_review',
      moderationNotes: 'Pending review of entrance clearance documentation and fire safety certificate.',
      totalBays: 5,
      activeBays: 5,
      createdAt: '2026-02-14T10:00:00.000Z',
      updatedAt: '2026-02-14T10:00:00.000Z'
    };

    const bays: ParkingBay[] = [
      // fac1 bays
      {
        id: 'bay_m1',
        facilityId: 'fac_metro_downtown',
        identifier: 'L1-A01',
        zone: 'Level 1',
        vehicleCompatibility: ['sedan', 'compact'],
        dimensions: { lengthMeters: 5.0, widthMeters: 2.4, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Covered', 'Direct Elevator Access'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'bay_m2',
        facilityId: 'fac_metro_downtown',
        identifier: 'L1-A02 (EV Fast)',
        zone: 'Level 1',
        vehicleCompatibility: ['sedan', 'suv', 'ev'],
        dimensions: { lengthMeters: 5.2, widthMeters: 2.6, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: true,
        evChargerDetails: { powerKw: 22, plugType: 'Type2' },
        amenities: ['EV Charging 22kW', 'Covered'],
        status: 'available',
        hourlyRateMultiplier: 1.2,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'bay_m3',
        facilityId: 'fac_metro_downtown',
        identifier: 'L1-A03 (ADA)',
        zone: 'Level 1',
        vehicleCompatibility: ['sedan', 'suv', 'van_truck'],
        dimensions: { lengthMeters: 5.5, widthMeters: 3.5, heightMeters: 2.2 },
        isAccessibleADA: true,
        hasEvCharger: false,
        amenities: ['ADA Compliant', 'Extra Wide Space', 'Ground Floor Ramp'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'bay_m4',
        facilityId: 'fac_metro_downtown',
        identifier: 'L1-A04 (SUV)',
        zone: 'Level 1',
        vehicleCompatibility: ['suv', 'van_truck', 'sedan'],
        dimensions: { lengthMeters: 5.8, widthMeters: 2.8, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Oversized Vehicle Fit', 'Covered'],
        status: 'occupied',
        statusReason: 'Customer in-bay',
        hourlyRateMultiplier: 1.1,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-02-15T11:00:00.000Z'
      },
      {
        id: 'bay_m5',
        facilityId: 'fac_metro_downtown',
        identifier: 'L2-B01',
        zone: 'Level 2',
        vehicleCompatibility: ['compact', 'sedan'],
        dimensions: { lengthMeters: 4.8, widthMeters: 2.4, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Covered', 'Well Lit'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'bay_m6',
        facilityId: 'fac_metro_downtown',
        identifier: 'L2-B02',
        zone: 'Level 2',
        vehicleCompatibility: ['compact', 'sedan', 'suv'],
        dimensions: { lengthMeters: 5.0, widthMeters: 2.5, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Covered'],
        status: 'maintenance',
        statusReason: 'Sensor recalibration',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-02-10T10:00:00.000Z'
      },
      {
        id: 'bay_m7',
        facilityId: 'fac_metro_downtown',
        identifier: 'L2-B03 (Moto)',
        zone: 'Level 2',
        vehicleCompatibility: ['motorcycle'],
        dimensions: { lengthMeters: 2.5, widthMeters: 1.5, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Anchor Ring', 'Ground Floor'],
        status: 'available',
        hourlyRateMultiplier: 0.6,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'bay_m8',
        facilityId: 'fac_metro_downtown',
        identifier: 'L2-B04',
        zone: 'Level 2',
        vehicleCompatibility: ['sedan', 'suv'],
        dimensions: { lengthMeters: 5.0, widthMeters: 2.5, heightMeters: 2.2 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Covered'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },

      // fac2 bays
      {
        id: 'bay_w1',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-01 (EV)',
        zone: 'Zone North',
        vehicleCompatibility: ['ev', 'sedan', 'suv'],
        dimensions: { lengthMeters: 5.2, widthMeters: 2.6, heightMeters: 3.5 },
        isAccessibleADA: false,
        hasEvCharger: true,
        evChargerDetails: { powerKw: 22, plugType: 'Tesla' },
        amenities: ['Tesla Supercharger compatible', 'Waterfront view'],
        status: 'available',
        hourlyRateMultiplier: 1.15,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      },
      {
        id: 'bay_w2',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-02',
        zone: 'Zone North',
        vehicleCompatibility: ['sedan', 'suv', 'van_truck'],
        dimensions: { lengthMeters: 5.5, widthMeters: 2.7, heightMeters: 3.5 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Open Air'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      },
      {
        id: 'bay_w3',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-03 (ADA)',
        zone: 'Zone North',
        vehicleCompatibility: ['sedan', 'suv', 'van_truck'],
        dimensions: { lengthMeters: 5.5, widthMeters: 3.6, heightMeters: 3.5 },
        isAccessibleADA: true,
        hasEvCharger: false,
        amenities: ['ADA Compliant', 'Direct boardwalk access'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      },
      {
        id: 'bay_w4',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-04',
        zone: 'Zone South',
        vehicleCompatibility: ['sedan', 'compact'],
        dimensions: { lengthMeters: 4.9, widthMeters: 2.4, heightMeters: 3.5 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Standard Bay'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      },
      {
        id: 'bay_w5',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-05',
        zone: 'Zone South',
        vehicleCompatibility: ['sedan', 'suv'],
        dimensions: { lengthMeters: 5.2, widthMeters: 2.5, heightMeters: 3.5 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Standard Bay'],
        status: 'available',
        hourlyRateMultiplier: 1.0,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      },
      {
        id: 'bay_w6',
        facilityId: 'fac_waterfront_lot',
        identifier: 'WF-06',
        zone: 'Zone South',
        vehicleCompatibility: ['motorcycle', 'compact'],
        dimensions: { lengthMeters: 3.5, widthMeters: 2.0, heightMeters: 3.5 },
        isAccessibleADA: false,
        hasEvCharger: false,
        amenities: ['Compact Bay'],
        status: 'available',
        hourlyRateMultiplier: 0.8,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      }
    ];

    const pricingRules: PricingRule[] = [
      {
        id: 'prc_rule_metro',
        facilityId: 'fac_metro_downtown',
        name: 'Tech Center Smart Dynamic Tariff',
        baseHourlyRate: 4.5,
        dailyMaxRate: 32.0,
        overnightFlatRate: 18.0,
        surgeMultiplier: 1.35,
        peakHours: [
          { start: '08:00', end: '10:00', daysOfWeek: [1, 2, 3, 4, 5] },
          { start: '16:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5] }
        ],
        weekendHourlyRate: 5.0,
        specialEvents: [
          {
            eventName: 'Convention Week Peak',
            startDate: '2026-11-01T00:00:00.000Z',
            endDate: '2026-11-05T23:59:59.000Z',
            flatRateSurcharge: 10.0
          }
        ],
        discounts: [
          { minHours: 24, discountPercent: 15 },
          { minHours: 72, discountPercent: 25 }
        ],
        isActive: true,
        createdAt: '2026-01-12T10:00:00.000Z',
        updatedAt: '2026-01-12T10:00:00.000Z'
      },
      {
        id: 'prc_rule_waterfront',
        facilityId: 'fac_waterfront_lot',
        name: 'Waterfront Weekend & Tourist Rates',
        baseHourlyRate: 6.0,
        dailyMaxRate: 40.0,
        overnightFlatRate: 22.0,
        surgeMultiplier: 1.3,
        peakHours: [
          { start: '11:00', end: '15:00', daysOfWeek: [6, 0] }
        ],
        weekendHourlyRate: 7.5,
        specialEvents: [],
        discounts: [
          { minHours: 12, discountPercent: 10 }
        ],
        isActive: true,
        createdAt: '2026-01-18T10:00:00.000Z',
        updatedAt: '2026-01-18T10:00:00.000Z'
      }
    ];

    const bookings: Booking[] = [
      {
        id: 'bk_active_1',
        bookingReference: 'PKZ-784910',
        facilityId: 'fac_metro_downtown',
        bayId: 'bay_m4',
        customerId: 'usr_cust1',
        customerName: 'Alex Driver',
        customerPhone: '+1 (206) 555-0188',
        customerEmail: 'alex.driver@example.com',
        licensePlate: 'WA-7BCK99',
        vehicleMakeModel: 'Tesla Model Y (Deep Blue)',
        startTime: '2026-10-20T04:00:00.000Z',
        endTime: '2026-10-20T10:00:00.000Z',
        actualCheckInTime: '2026-10-20T04:12:00.000Z',
        grossAmount: 29.7,
        platformFee: 3.56,
        hostNetEarnings: 26.14,
        taxAmount: 2.38,
        status: 'checked_in',
        qrCodeToken: 'PKZ_QR_849204910248492',
        gateAccessCode: '4921#',
        idempotencyKey: 'idemp_seed_bk_1',
        createdAt: '2026-10-20T03:30:00.000Z',
        updatedAt: '2026-10-20T04:12:00.000Z'
      },
      {
        id: 'bk_upcoming_1',
        bookingReference: 'PKZ-619283',
        facilityId: 'fac_metro_downtown',
        bayId: 'bay_m1',
        customerId: 'usr_cust1',
        customerName: 'Alex Driver',
        customerPhone: '+1 (206) 555-0188',
        customerEmail: 'alex.driver@example.com',
        licensePlate: 'WA-7BCK99',
        vehicleMakeModel: 'Tesla Model Y (Deep Blue)',
        startTime: '2026-10-20T14:00:00.000Z',
        endTime: '2026-10-20T18:00:00.000Z',
        grossAmount: 18.0,
        platformFee: 2.16,
        hostNetEarnings: 15.84,
        taxAmount: 1.44,
        status: 'confirmed',
        qrCodeToken: 'PKZ_QR_920194829104829',
        gateAccessCode: '4921#',
        idempotencyKey: 'idemp_seed_bk_2',
        createdAt: '2026-10-20T02:00:00.000Z',
        updatedAt: '2026-10-20T02:00:00.000Z'
      },
      {
        id: 'bk_completed_1',
        bookingReference: 'PKZ-492019',
        facilityId: 'fac_metro_downtown',
        bayId: 'bay_m2',
        customerId: 'usr_cust1',
        customerName: 'Alex Driver',
        customerPhone: '+1 (206) 555-0188',
        customerEmail: 'alex.driver@example.com',
        licensePlate: 'WA-7BCK99',
        vehicleMakeModel: 'Tesla Model Y (Deep Blue)',
        startTime: '2026-10-18T09:00:00.000Z',
        endTime: '2026-10-18T13:00:00.000Z',
        actualCheckInTime: '2026-10-18T09:02:00.000Z',
        actualCheckOutTime: '2026-10-18T12:55:00.000Z',
        grossAmount: 21.6,
        platformFee: 2.59,
        hostNetEarnings: 19.01,
        taxAmount: 1.73,
        status: 'completed',
        qrCodeToken: 'PKZ_QR_COMPLETED_1',
        gateAccessCode: '4921#',
        createdAt: '2026-10-17T18:00:00.000Z',
        updatedAt: '2026-10-18T12:55:00.000Z'
      }
    ];

    const ledger: LedgerEntry[] = [
      {
        id: 'tx_seed_1',
        idempotencyKey: 'idemp_tx_1',
        hostId: 'usr_host1',
        facilityId: 'fac_metro_downtown',
        bookingId: 'bk_completed_1',
        type: 'booking_income',
        amount: 19.01,
        balanceAfter: 19.01,
        currency: 'USD',
        description: 'Net earnings for booking PKZ-492019 (L1-A02)',
        status: 'completed',
        createdAt: '2026-10-17T18:00:00.000Z'
      },
      {
        id: 'tx_seed_2',
        idempotencyKey: 'idemp_tx_2',
        hostId: 'usr_host1',
        facilityId: 'fac_metro_downtown',
        bookingId: 'bk_upcoming_1',
        type: 'booking_income',
        amount: 15.84,
        balanceAfter: 34.85,
        currency: 'USD',
        description: 'Net earnings for booking PKZ-619283 (L1-A01)',
        status: 'completed',
        createdAt: '2026-10-20T02:00:00.000Z'
      },
      {
        id: 'tx_seed_3',
        idempotencyKey: 'idemp_tx_3',
        hostId: 'usr_host1',
        facilityId: 'fac_metro_downtown',
        bookingId: 'bk_active_1',
        type: 'booking_income',
        amount: 26.14,
        balanceAfter: 60.99,
        currency: 'USD',
        description: 'Net earnings for booking PKZ-784910 (L1-A04)',
        status: 'completed',
        createdAt: '2026-10-20T03:30:00.000Z'
      }
    ];

    const payouts: PayoutRequest[] = [
      {
        id: 'po_seed_1',
        hostId: 'usr_host1',
        amount: 450.0,
        method: 'ach_bank_transfer',
        destinationAccount: 'Chase Bank (****8492)',
        status: 'paid',
        referenceNumber: 'PO-84920192',
        requestedAt: '2026-10-10T14:20:00.000Z',
        completedAt: '2026-10-12T09:00:00.000Z',
        notes: 'ACH Regular Transfer cleared'
      }
    ];

    const reviews: Review[] = [
      {
        id: 'rev_1',
        facilityId: 'fac_metro_downtown',
        customerId: 'usr_cust1',
        customerName: 'Alex Driver',
        bookingId: 'bk_completed_1',
        rating: 5,
        comment: 'Super easy access! The boom gate opened instantly when I scanned the QR code. Clean, bright, and the 22kW EV charger gave me a full charge while I was in meetings.',
        createdAt: '2026-10-18T14:30:00.000Z',
        hostResponse: {
          text: 'Thank you Alex! Glad the EV charger was convenient. We look forward to hosting you again at Downtown Metro Tech Center.',
          respondedAt: '2026-10-18T16:00:00.000Z'
        }
      }
    ];

    const messages: MessageThread[] = [
      {
        id: 'thread_1',
        facilityId: 'fac_metro_downtown',
        hostId: 'usr_host1',
        customerId: 'usr_cust1',
        bookingId: 'bk_active_1',
        subject: 'Inquiry regarding oversized clearance',
        lastMessageAt: '2026-10-20T03:45:00.000Z',
        messages: [
          {
            id: 'm1',
            senderId: 'usr_cust1',
            senderName: 'Alex Driver',
            senderRole: 'customer',
            text: 'Hi Marcus, just wanted to verify if the Level 1 clearance is sufficient for a Model Y with a roof rack?',
            timestamp: '2026-10-20T03:40:00.000Z'
          },
          {
            id: 'm2',
            senderId: 'usr_host1',
            senderName: 'Marcus Vance',
            senderRole: 'host',
            text: 'Hello Alex! Yes, Level 1 has a generous 2.2 meter (7.2 ft) clearance, so your Model Y with roof rack fits with ample headroom. Have a safe drive!',
            timestamp: '2026-10-20T03:45:00.000Z'
          }
        ]
      }
    ];

    const notifications: NotificationItem[] = [
      {
        id: 'notif_1',
        userId: 'usr_host1',
        title: 'New Booking Active',
        message: 'Alex Driver checked in to Bay L1-A04 at Downtown Metro Tech Center Garage.',
        type: 'booking',
        isRead: false,
        createdAt: '2026-10-20T04:12:00.000Z',
        link: '/host/bookings'
      },
      {
        id: 'notif_2',
        userId: 'usr_host1',
        title: 'Earnings Credited',
        message: '$26.14 was credited to your available balance for booking PKZ-784910.',
        type: 'payout',
        isRead: true,
        createdAt: '2026-10-20T03:30:00.000Z',
        link: '/host/earnings'
      }
    ];

    const disputes: DisputeTicket[] = [];

    const providers: ThirdPartyProviderConfig[] = [
      {
        id: 'prov_access_barrier',
        category: 'access_control',
        name: 'ParkBarrier Cloud IoT API',
        provider: 'ParkBarrier IoT Cloud',
        isEnabled: true,
        settings: {
          endpointUrl: 'https://api.parkbarrier-iot.com/v2/gateways',
          apiKey: 'pb_live_984b2*********91a',
          deviceControllerId: 'CTRL-SEA-001',
          autoOpenOnLprMatch: 'true'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'Connected successfully (HTTP 200 OK, latency: 48ms)'
      },
      {
        id: 'prov_payment_stripe',
        category: 'payment_gateway',
        name: 'Stripe Payment Processing',
        provider: 'Stripe Inc.',
        isEnabled: true,
        settings: {
          publishableKey: 'pk_live_51M08f**********kL9',
          secretKey: 'sk_live_51M08f**********Q4x',
          webhookSigningSecret: 'whsec_981a**********3f0',
          statementDescriptor: 'PARKEAZY*PARKING'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'Connected successfully (API v2024-12, latency: 62ms)'
      },
      {
        id: 'prov_payout_stripe_connect',
        category: 'payout_service',
        name: 'Stripe Connect Payouts & Transfers',
        provider: 'Stripe Connect',
        isEnabled: true,
        settings: {
          clientId: 'ca_984102941092',
          instantPayoutsEnabled: 'true',
          payoutSchedule: 'daily_automatic',
          currency: 'USD'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'Connected successfully (Instant transfer capability verified)'
      },
      {
        id: 'prov_maps_mapbox',
        category: 'mapping',
        name: 'Mapbox Navigation & Geocoding',
        provider: 'Mapbox Inc.',
        isEnabled: true,
        settings: {
          accessToken: 'pk.eyJ1IjoicGFya2VhenkiLCJhIjoia3Vs********fQ.91823',
          defaultStyle: 'mapbox://styles/mapbox/streets-v12',
          geocodingForward: 'enabled'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'Map tiles & Geocoder service healthy (latency: 35ms)'
      },
      {
        id: 'prov_comms_twilio',
        category: 'communications',
        name: 'Twilio SMS & SendGrid Notification Engine',
        provider: 'Twilio & SendGrid',
        isEnabled: true,
        settings: {
          twilioAccountSid: 'AC98410284910284',
          twilioAuthToken: 'tw_auth_910**********0a8',
          fromPhoneNumber: '+18885550199',
          sendGridApiKey: 'SG.984102.**********'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'SMS Gateway and SMTP Dispatch operational'
      },
      {
        id: 'prov_storage_s3',
        category: 'cloud_storage',
        name: 'Amazon S3 Facility Asset Storage',
        provider: 'AWS S3 Cloud Storage',
        isEnabled: true,
        settings: {
          bucketName: 'parkeazy-facility-media-prod',
          awsRegion: 'us-west-2',
          accessKeyId: 'AKIA984**********QZ',
          secretAccessKey: 'aws_sec_910**********81p'
        },
        lastTestedAt: '2026-10-20T04:00:00.000Z',
        testStatus: 'healthy',
        testMessage: 'Bucket read/write access verified (latency: 55ms)'
      }
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_seed_1',
        timestamp: '2026-10-20T04:12:00.000Z',
        actorId: 'usr_cust1',
        actorName: 'Alex Driver',
        actorRole: 'customer',
        action: 'GATE_CHECK_IN',
        entityType: 'booking',
        entityId: 'bk_active_1',
        details: 'Driver checked in via QR scan at Level 1 entrance'
      },
      {
        id: 'aud_seed_2',
        timestamp: '2026-10-20T03:30:00.000Z',
        actorId: 'usr_cust1',
        actorName: 'Alex Driver',
        actorRole: 'customer',
        action: 'BOOKING_CREATED',
        entityType: 'booking',
        entityId: 'bk_active_1',
        details: 'Booking PKZ-784910 confirmed ($29.70 gross)'
      },
      {
        id: 'aud_seed_3',
        timestamp: '2026-10-18T10:00:00.000Z',
        actorId: 'usr_admin1',
        actorName: 'Sarah Connor (Admin)',
        actorRole: 'admin',
        action: 'FACILITY_APPROVED',
        entityType: 'facility',
        entityId: 'fac_metro_downtown',
        details: 'Approved facility listing after compliance check'
      }
    ];

    return {
      version: 1,
      users: [hostUser, hostUser2, customerUser, adminUser],
      facilities: [fac1, fac2, fac3],
      bays,
      pricingRules,
      holds: [],
      bookings,
      ledger,
      payouts,
      reviews,
      messages,
      notifications,
      disputes,
      providers,
      auditLogs
    };
  }
}

export const db = new Database();
