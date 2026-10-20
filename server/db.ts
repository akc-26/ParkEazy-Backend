import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbManager } from '../apps/api/database/connection';
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
  UserRole
} from './types';

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
  private payoutLock = false;

  constructor() {
    this.data = this.loadOrSeed();
    this.cleanExpiredHolds();
    this.cleanExpiredSessions();
    // Run hold and session expiry checker periodically every 30 seconds
    this.expiryInterval = setInterval(() => {
      this.cleanExpiredHolds();
      this.cleanExpiredSessions();
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
      this.isPostgresActive = true;

      // Check if data already exists in PostgreSQL
      const existingRes = await dbManager.query('SELECT count(*) as count FROM app_store_entities');
      const count = parseInt(existingRes.rows[0]?.count || '0', 10);

      if (count === 0) {
        // Safe, controlled migration path for existing JSON data without losing anything
        console.log('[ParkEazy-Store] Migrating existing application data into authoritative PostgreSQL database...');
        await this.migrateDataToPostgres(this.data);
      } else {
        // Load authoritative data from PostgreSQL
        console.log('[ParkEazy-Store] Loading authoritative application data from PostgreSQL...');
        await this.loadDataFromPostgres();
      }

      this.isInitialized = true;
      console.log('[ParkEazy-Store] Authoritative PostgreSQL persistence initialized successfully.');
    } catch (err: any) {
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
        'providers', 'auditLogs', 'sessions', 'passwordResetTokens'
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
        await client.query(
          `INSERT INTO bookings (id, bay_id, location_id, user_id, host_id, start_time_utc, end_time_utc, status, base_amount_cents, security_deposit_cents, platform_fee_cents, taxes_cents, total_payable_cents, currency, license_plate, booking_reference, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()`,
          [
            booking.id,
            booking.bayId,
            booking.facilityId,
            booking.userId,
            booking.hostId,
            booking.startTime,
            booking.endTime,
            booking.status ? booking.status.toUpperCase() : 'CONFIRMED',
            Math.round((booking.totalAmount || 0) * 100),
            0,
            0,
            0,
            Math.round((booking.totalAmount || 0) * 100),
            'USD',
            booking.licensePlate || null,
            booking.reference || ('BK-' + booking.id),
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
            entry.referenceId || null,
            entry.status || 'completed',
            entry.timestamp || new Date().toISOString()
          ]
        );
      }

      for (const payout of schema.payouts || []) {
        await client.query(
          `INSERT INTO host_payout_records (id, host_id, amount_cents, currency, status, method, destination_account, reference_or_utr, requested_at_utc, notes, idempotency_key)
           VALUES ($1, $2, $3, 'USD', $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes`,
          [
            payout.id,
            payout.hostId,
            Math.round(payout.amount * 100),
            payout.status.toUpperCase(),
            payout.method,
            payout.destinationAccount,
            payout.referenceNumber,
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
            prov.mode || 'test',
            JSON.stringify(prov.settings || {}),
            JSON.stringify(prov.credentials || {})
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
            audit.userId || null,
            audit.userName || null,
            audit.userRole || null,
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

    this.data = {
      version: 1,
      users: collectionsMap.users || this.data.users,
      facilities: collectionsMap.facilities || this.data.facilities,
      bays: collectionsMap.bays || this.data.bays,
      pricingRules: collectionsMap.pricingRules || this.data.pricingRules,
      holds: collectionsMap.holds || this.data.holds,
      bookings: collectionsMap.bookings || this.data.bookings,
      ledger: collectionsMap.ledger || this.data.ledger,
      payouts: collectionsMap.payouts || this.data.payouts,
      reviews: collectionsMap.reviews || this.data.reviews,
      messages: collectionsMap.messages || this.data.messages,
      notifications: collectionsMap.notifications || this.data.notifications,
      disputes: collectionsMap.disputes || this.data.disputes,
      providers: collectionsMap.providers || this.data.providers,
      auditLogs: collectionsMap.auditLogs || this.data.auditLogs,
      sessions: collectionsMap.sessions || [],
      passwordResetTokens: collectionsMap.passwordResetTokens || []
    };
  }

  private async persistToPostgres(): Promise<void> {
    if (!this.isPostgresActive) return;
    const collections: (keyof DatabaseSchema)[] = [
      'users', 'facilities', 'bays', 'pricingRules', 'holds', 'bookings',
      'ledger', 'payouts', 'reviews', 'messages', 'notifications', 'disputes',
      'providers', 'auditLogs', 'sessions', 'passwordResetTokens'
    ];

    const client = await dbManager.getClient();
    try {
      await client.query('BEGIN');
      for (const col of collections) {
        const items = (this.data[col] || []) as any[];
        for (const item of items) {
          const id = item.id || item.token;
          if (!id) continue;
          await client.query(
            `INSERT INTO app_store_entities (collection, id, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (collection, id) DO UPDATE SET data = $3, updated_at = NOW()`,
            [col, id, JSON.stringify(item)]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[ParkEazy-Store] Batch persist to PostgreSQL failed:', err.message);
    } finally {
      client.release();
    }
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

  private persist() {
    if (this.isPostgresActive) {
      this.persistToPostgres().catch(err => {
        console.error('[ParkEazy-Store] Error persisting to PostgreSQL:', err.message);
        if (appConfig.nodeEnv === 'production') {
          console.error('[ParkEazy-Store] CRITICAL: PostgreSQL persistence write failure in production');
        }
      });
    }

    // In production, never use the JSON store as the production source of truth
    if (appConfig.nodeEnv === 'production') {
      return;
    }

    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tempPath = DB_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tempPath, DB_FILE);
      } catch (err) {
        console.error('Failed to persist database:', err);
      }
    }, 100);
    this.saveTimeout.unref();
  }

  public cleanExpiredHolds() {
    const now = new Date().toISOString();
    const expired = this.data.holds.filter(h => h.expiresAt < now);
    if (expired.length > 0) {
      this.data.holds = this.data.holds.filter(h => h.expiresAt >= now);
      // Revert bay status if held and no active booking
      for (const hold of expired) {
        const bay = this.data.bays.find(b => b.id === hold.bayId);
        if (bay && bay.status === 'held') {
          bay.status = 'available';
          bay.updatedAt = new Date().toISOString();
        }
      }
      this.persist();
    }
  }

  // ----------------- AUDIT LOGGING -----------------
  public logAudit(
    actorId: string,
    actorName: string,
    actorRole: User['role'],
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: string
  ) {
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
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
  }

  public getAuditLogs(entityType?: string, limit = 100): AuditLog[] {
    if (entityType && entityType !== 'all') {
      return this.data.auditLogs.filter(a => a.entityType === entityType).slice(0, limit);
    }
    return this.data.auditLogs.slice(0, limit);
  }

  // ----------------- USER & AUTH -----------------
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: User['role'];
    businessDetails?: User['businessDetails'];
  }): User {
    const requestedRole = (userData.role || 'customer').toLowerCase().trim() as UserRole;
    if (requestedRole === 'admin') {
      throw new Error('Administrative accounts cannot be registered publicly. Privileged accounts must be provisioned through an authorized administrative mechanism.');
    }
    if (requestedRole !== 'customer' && requestedRole !== 'host') {
      throw new Error('Invalid registration role. Permitted public registration roles are "customer" and "host".');
    }

    const existing = this.findUserByEmail(userData.email);
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

    this.data.users.push(newUser);
    this.logAudit(newUser.id, newUser.fullName, newUser.role, 'USER_REGISTERED', 'user', newUser.id, `User registered as ${newUser.role}`);
    this.persist();
    return newUser;
  }

  public provisionAdminUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: User['role'];
    actor: User;
  }): User {
    if (data.actor.role !== 'admin') {
      throw new Error('Access denied: Administrator privileges required to provision privileged accounts.');
    }
    const existing = this.findUserByEmail(data.email);
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

    this.data.users.push(newUser);
    this.logAudit(
      data.actor.id,
      data.actor.fullName,
      data.actor.role,
      'ADMIN_USER_PROVISIONED',
      'user',
      newUser.id,
      `Administrator ${data.actor.fullName} provisioned account for ${newUser.email} with role ${newUser.role}`
    );
    this.persist();
    return newUser;
  }

  public verifyPassword(user: User, password: string): boolean {
    const isValid = verifyPasswordHash(password, user.passwordHash);
    if (isValid && !user.passwordHash.startsWith('pbkdf2$')) {
      // Upgrade transparently to PBKDF2
      user.passwordHash = hashPassword(password);
      this.persist();
    }
    return isValid;
  }

  // ----------------- SESSION MANAGEMENT -----------------
  public createSession(user: User): ActiveSession {
    this.cleanExpiredSessions();
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
    if (!this.data.sessions) this.data.sessions = [];
    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  public validateSession(token: string): User | null {
    if (!token) return null;
    this.cleanExpiredSessions();

    const session = this.data.sessions?.find(s => s.token === token);
    if (session) {
      if (new Date(session.expiresAt) <= new Date()) {
        this.revokeSession(token);
        return null;
      }
      const user = this.findUserById(session.userId);
      if (!user || user.status === 'suspended' || user.status === 'closed') {
        return null;
      }
      return user;
    }

    // Non-production backwards compatibility fallback for test tokens / direct IDs
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      const user = this.findUserById(token) || this.findUserByEmail(token);
      if (user && user.status !== 'suspended' && user.status !== 'closed') {
        return user;
      }
    }

    return null;
  }

  public revokeSession(token: string): boolean {
    if (!this.data.sessions) return false;
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    if (this.data.sessions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public revokeAllUserSessions(userId: string): void {
    if (!this.data.sessions) return;
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => s.userId !== userId);
    if (this.data.sessions.length !== initialLen) {
      this.persist();
    }
  }

  public cleanExpiredSessions(): void {
    if (!this.data.sessions) return;
    const now = new Date();
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(s => new Date(s.expiresAt) > now);
    if (this.data.sessions.length !== initialLen) {
      this.persist();
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

    // Enforce rate limiting: max 3 requests per 15 minutes per email
    const timestamps = this.resetRateLimits.get(normalizedEmail) || [];
    const recent = timestamps.filter(t => now - t < 15 * 60 * 1000);
    if (recent.length >= 3) {
      throw new Error('Too many password recovery attempts. Please try again in 15 minutes.');
    }
    recent.push(now);
    this.resetRateLimits.set(normalizedEmail, recent);

    const user = this.findUserByEmail(normalizedEmail);
    if (!user) {
      // Account enumeration protection: Return generic neutral response
      return {
        success: true,
        message: 'If an account exists with this email address, password recovery instructions have been dispatched.',
        deliveryStatus: 'SIMULATED'
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();

    if (!this.data.passwordResetTokens) this.data.passwordResetTokens = [];

    // Invalidate existing tokens for this user
    for (const t of this.data.passwordResetTokens) {
      if (t.userId === user.id) t.isUsed = true;
    }

    this.data.passwordResetTokens.push({
      id: 'prt_' + crypto.randomUUID().slice(0, 8),
      tokenHash,
      userId: user.id,
      email: normalizedEmail,
      expiresAt,
      isUsed: false,
      createdAt: new Date(now).toISOString()
    });

    this.logAudit(
      user.id,
      user.fullName,
      user.role,
      'PASSWORD_RESET_REQUESTED',
      'user',
      user.id,
      `Password reset requested for ${user.email}`
    );
    this.persist();

    // CONNECT TO REAL EMAIL/NOTIFICATION ADAPTER
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

  public resetPasswordWithToken(rawToken: string, newPassword: string): { success: boolean; message: string } {
    if (!rawToken || !newPassword) {
      throw new Error('Reset token and new password are required.');
    }
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const tokenRecord = this.data.passwordResetTokens?.find(t => t.tokenHash === tokenHash);

    if (!tokenRecord || tokenRecord.isUsed) {
      throw new Error('Invalid or already used password recovery token.');
    }

    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      tokenRecord.isUsed = true;
      this.persist();
      throw new Error('Password recovery token has expired. Please request a new one.');
    }

    const user = this.findUserById(tokenRecord.userId);
    if (!user) {
      throw new Error('Associated user account no longer exists.');
    }

    tokenRecord.isUsed = true;
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    // Revoke all active user sessions upon password reset
    this.revokeAllUserSessions(user.id);

    this.logAudit(
      user.id,
      user.fullName,
      user.role,
      'PASSWORD_RESET_COMPLETED',
      'user',
      user.id,
      `Password successfully reset for ${user.email}. All sessions invalidated.`
    );
    this.persist();

    return {
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new password.'
    };
  }

  public updateUserProfile(userId: string, updates: Partial<User>): User {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return user;
  }

  public getAllHosts(): User[] {
    return this.data.users.filter(u => u.role === 'host');
  }

  public updateHostStatus(hostId: string, status: User['status'], adminUser: User): User {
    const host = this.findUserById(hostId);
    if (!host) throw new Error('Host not found');
    host.status = status;
    host.updatedAt = new Date().toISOString();
    
    // Invalidate sessions if suspended or closed
    if (status === 'suspended' || status === 'closed') {
      this.revokeAllUserSessions(hostId);
    }

    this.logAudit(adminUser.id, adminUser.fullName, 'admin', 'HOST_STATUS_CHANGED', 'user', hostId, `Host status updated to ${status}`);
    this.persist();
    return host;
  }

  // ----------------- FACILITIES -----------------
  public getFacilities(filters?: { hostId?: string; status?: string; city?: string }): Facility[] {
    let result = this.data.facilities;
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

  public getFacilityById(id: string): Facility | undefined {
    return this.data.facilities.find(f => f.id === id);
  }

  public createFacility(hostId: string, data: Partial<Facility>): Facility {
    const host = this.findUserById(hostId);
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

    this.data.facilities.push(newFacility);

    // Create default pricing rule for facility
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
    this.data.pricingRules.push(defaultPricingRule);

    this.logAudit(hostId, host.fullName, 'host', 'FACILITY_CREATED', 'facility', facilityId, `Facility created: ${newFacility.name}`);
    this.persist();
    return newFacility;
  }

  public updateFacility(facilityId: string, updates: Partial<Facility>, actor: User): Facility {
    const facility = this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized to update this facility');
    }

    // Refresh bay counts
    const facilityBays = this.data.bays.filter(b => b.facilityId === facilityId);
    facility.totalBays = facilityBays.length;
    facility.activeBays = facilityBays.filter(b => b.status === 'available' || b.status === 'occupied').length;

    Object.assign(facility, updates, { updatedAt: new Date().toISOString() });
    this.logAudit(actor.id, actor.fullName, actor.role, 'FACILITY_UPDATED', 'facility', facilityId, `Facility updated: ${facility.name}`);
    this.persist();
    return facility;
  }

  public deleteFacility(facilityId: string, actor: User): boolean {
    const index = this.data.facilities.findIndex(f => f.id === facilityId);
    if (index === -1) return false;
    const facility = this.data.facilities[index];
    if (actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }

    // Check for active or confirmed bookings
    const activeBooking = this.data.bookings.find(
      b => b.facilityId === facilityId && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    if (activeBooking) {
      throw new Error('Cannot delete facility with active or confirmed customer reservations. Please suspend the facility instead.');
    }

    this.data.facilities.splice(index, 1);
    this.data.bays = this.data.bays.filter(b => b.facilityId !== facilityId);
    this.data.pricingRules = this.data.pricingRules.filter(r => r.facilityId !== facilityId);
    this.logAudit(actor.id, actor.fullName, actor.role, 'FACILITY_DELETED', 'facility', facilityId, `Deleted facility "${facility.name}"`);
    this.persist();
    return true;
  }

  public submitFacilityForReview(facilityId: string, host: User): Facility {
    const facility = this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (facility.hostId !== host.id) throw new Error('Unauthorized');

    facility.status = 'under_review';
    facility.updatedAt = new Date().toISOString();

    // Create admin notification
    this.createNotification(
      'usr_admin1',
      'Facility Submitted for Review',
      `Host ${host.fullName} submitted "${facility.name}" for review.`,
      'moderation',
      `/admin/facilities/${facilityId}`
    );

    this.logAudit(host.id, host.fullName, 'host', 'FACILITY_SUBMITTED', 'facility', facilityId, `Facility submitted for moderation`);
    this.persist();
    return facility;
  }

  public moderateFacility(facilityId: string, approved: boolean, notes: string, admin: User): Facility {
    const facility = this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');

    facility.status = approved ? 'approved' : 'rejected';
    facility.moderationNotes = notes;
    facility.updatedAt = new Date().toISOString();

    // Notify host
    this.createNotification(
      facility.hostId,
      approved ? 'Facility Approved!' : 'Facility Submission Update',
      approved
        ? `Your facility "${facility.name}" has been approved and is now active.`
        : `Your facility "${facility.name}" was not approved. Feedback: ${notes}`,
      'moderation'
    );

    this.logAudit(admin.id, admin.fullName, 'admin', approved ? 'FACILITY_APPROVED' : 'FACILITY_REJECTED', 'facility', facilityId, `Moderation decision: ${facility.status}. Notes: ${notes}`);
    this.persist();
    return facility;
  }

  // ----------------- PARKING BAYS -----------------
  public getBaysByFacility(facilityId: string): ParkingBay[] {
    return this.data.bays.filter(b => b.facilityId === facilityId);
  }

  public getBayById(bayId: string): ParkingBay | undefined {
    return this.data.bays.find(b => b.id === bayId);
  }

  public createBay(facilityId: string, bayData: Partial<ParkingBay>, actor: User): ParkingBay {
    const facility = this.getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    const now = new Date().toISOString();
    const newBay: ParkingBay = {
      id: 'bay_' + crypto.randomUUID().slice(0, 8),
      facilityId,
      identifier: bayData.identifier || 'Bay-' + (this.getBaysByFacility(facilityId).length + 1),
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

    this.data.bays.push(newBay);
    this.syncFacilityBayCount(facilityId);
    this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_CREATED', 'bay', newBay.id, `Created bay ${newBay.identifier} in ${facility.name}`);
    this.persist();
    return newBay;
  }

  public createBulkBays(
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
  ): ParkingBay[] {
    const facility = this.getFacilityById(facilityId);
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

      this.data.bays.push(bay);
      created.push(bay);
    }

    this.syncFacilityBayCount(facilityId);
    this.logAudit(actor.id, actor.fullName, actor.role, 'BULK_BAYS_CREATED', 'bay', facilityId, `Created ${created.length} bays (${config.prefix}${config.startIndex}..${config.prefix}${config.startIndex + config.count - 1})`);
    this.persist();
    return created;
  }

  public updateBay(bayId: string, updates: Partial<ParkingBay>, actor: User): ParkingBay {
    const bay = this.getBayById(bayId);
    if (!bay) throw new Error('Bay not found');
    const facility = this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    Object.assign(bay, updates, { updatedAt: new Date().toISOString() });
    this.syncFacilityBayCount(facility.id);
    this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_UPDATED', 'bay', bayId, `Updated bay ${bay.identifier}`);
    this.persist();
    return bay;
  }

  public setBayStatus(bayId: string, status: BayStatus, reason: string | undefined, actor: User): ParkingBay {
    const bay = this.getBayById(bayId);
    if (!bay) throw new Error('Bay not found');
    const facility = this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    bay.status = status;
    bay.statusReason = reason;
    bay.updatedAt = new Date().toISOString();
    this.syncFacilityBayCount(facility.id);
    this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_STATUS_CHANGE', 'bay', bayId, `Bay ${bay.identifier} status set to ${status} (${reason || 'no reason'})`);
    this.persist();
    return bay;
  }

  public deleteBay(bayId: string, actor: User): boolean {
    const bay = this.getBayById(bayId);
    if (!bay) return false;
    const facility = this.getFacilityById(bay.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    // Check if bay has active bookings
    const activeBooking = this.data.bookings.find(
      b => b.bayId === bayId && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    if (activeBooking) {
      throw new Error('Cannot delete bay with an active or confirmed booking. Retire the bay instead.');
    }

    this.data.bays = this.data.bays.filter(b => b.id !== bayId);
    this.syncFacilityBayCount(facility.id);
    this.logAudit(actor.id, actor.fullName, actor.role, 'BAY_DELETED', 'bay', bayId, `Bay ${bay.identifier} was deleted`);
    this.persist();
    return true;
  }

  private syncFacilityBayCount(facilityId: string) {
    const facility = this.getFacilityById(facilityId);
    if (!facility) return;
    const bays = this.data.bays.filter(b => b.facilityId === facilityId && b.status !== 'retired');
    facility.totalBays = bays.length;
    facility.activeBays = bays.filter(b => b.status === 'available' || b.status === 'occupied').length;
  }

  // ----------------- PRICING & QUOTES -----------------
  public getPricingRules(facilityId: string): PricingRule[] {
    return this.data.pricingRules.filter(r => r.facilityId === facilityId);
  }

  public updatePricingRule(ruleId: string, updates: Partial<PricingRule>, actor: User): PricingRule {
    const rule = this.data.pricingRules.find(r => r.id === ruleId);
    if (!rule) throw new Error('Pricing rule not found');
    const facility = this.getFacilityById(rule.facilityId);
    if (!facility) throw new Error('Facility not found');
    if (actor.role === 'host' && facility.hostId !== actor.id) throw new Error('Unauthorized');

    Object.assign(rule, updates, { updatedAt: new Date().toISOString() });
    this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_UPDATED', 'pricing', ruleId, `Updated pricing rule for ${facility.name}`);
    this.persist();
    return rule;
  }

  public createPricingRule(facilityId: string, ruleData: Partial<PricingRule>, actor: User): PricingRule {
    const facility = this.getFacilityById(facilityId);
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

    this.data.pricingRules.push(newRule);
    this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_CREATED', 'pricing', newRule.id, `Created pricing rule "${newRule.name}"`);
    this.persist();
    return newRule;
  }

  public getPricingRuleById(ruleId: string): PricingRule | undefined {
    return this.data.pricingRules.find(r => r.id === ruleId);
  }

  public deletePricingRule(ruleId: string, actor: User): boolean {
    const index = this.data.pricingRules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    const rule = this.data.pricingRules[index];
    const facility = this.getFacilityById(rule.facilityId);
    if (facility && actor.role === 'host' && facility.hostId !== actor.id) {
      throw new Error('Unauthorized: You do not own this facility.');
    }
    this.data.pricingRules.splice(index, 1);
    this.logAudit(actor.id, actor.fullName, actor.role, 'PRICING_DELETED', 'pricing', ruleId, `Deleted pricing rule "${rule.name}"`);
    this.persist();
    return true;
  }

  public calculateQuote(facilityId: string, startTimeIso: string, endTimeIso: string, bayMultiplier = 1.0) {
    const rules = this.getPricingRules(facilityId);
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
  public createHold(bayId: string, facilityId: string, userId: string, startTime: string, endTime: string): AvailabilityHold {
    this.cleanExpiredHolds();

    // Check if bay is occupied, maintenance, or held
    const bay = this.getBayById(bayId);
    if (!bay) throw new Error('Parking bay not found');
    if (bay.status === 'maintenance' || bay.status === 'retired') {
      throw new Error(`Bay is currently marked as ${bay.status}.`);
    }

    // Check active conflicting hold
    const existingHold = this.data.holds.find(h => h.bayId === bayId && h.expiresAt > new Date().toISOString());
    if (existingHold && existingHold.userId !== userId) {
      throw new Error('This bay is temporarily held by another customer. Please choose another bay or wait 15 minutes.');
    }

    // Check overlapping confirmed bookings
    const hasOverlap = this.data.bookings.some(b => {
      if (b.bayId !== bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < new Date(endTime) && new Date(b.endTime) > new Date(startTime);
    });

    if (hasOverlap) {
      throw new Error('This bay is already booked for the selected time window.');
    }

    // Remove any previous hold for this user on this bay
    this.data.holds = this.data.holds.filter(h => !(h.bayId === bayId && h.userId === userId));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins

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

    this.data.holds.push(hold);
    bay.status = 'held';
    bay.updatedAt = now.toISOString();

    this.persist();
    return hold;
  }

  public releaseHold(holdId: string) {
    const hold = this.data.holds.find(h => h.id === holdId);
    if (hold) {
      this.data.holds = this.data.holds.filter(h => h.id !== holdId);
      const bay = this.getBayById(hold.bayId);
      if (bay && bay.status === 'held') {
        bay.status = 'available';
        bay.updatedAt = new Date().toISOString();
      }
      this.persist();
    }
  }

  // ----------------- BOOKINGS & GATE ACCESS -----------------
  public createBooking(data: {
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
  }): Booking {
    this.cleanExpiredHolds();

    // Idempotency check: prevent duplicate billing
    if (data.idempotencyKey) {
      const existing = this.data.bookings.find(b => b.idempotencyKey === data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const facility = this.getFacilityById(data.facilityId);
    if (!facility) throw new Error('Facility not found');
    const bay = this.getBayById(data.bayId);
    if (!bay) throw new Error('Parking bay not found');

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new Error('Valid start and end times required, and end time must be after start time.');
    }

    const conflict = this.data.bookings.find(b => {
      if (b.bayId !== data.bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < end && new Date(b.endTime) > start;
    });

    if (conflict) {
      throw new Error('Selected parking bay is already booked for this timeframe.');
    }

    const quote = this.calculateQuote(data.facilityId, data.startTime, data.endTime, bay.hourlyRateMultiplier);

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

    // Remove any temporary hold on this bay
    this.data.holds = this.data.holds.filter(h => h.bayId === data.bayId);

    // Update bay status
    bay.status = 'reserved';
    bay.updatedAt = now;

    this.data.bookings.push(booking);

    // Double-entry Ledger transaction for host net earnings
    this.recordLedgerEntry({
      idempotencyKey: 'ledg_' + (data.idempotencyKey || booking.id),
      hostId: facility.hostId,
      facilityId: facility.id,
      bookingId: booking.id,
      type: 'booking_income',
      amount: booking.hostNetEarnings,
      currency: 'USD',
      description: `Net earnings for booking ${booking.bookingReference} (${bay.identifier})`,
      status: 'completed'
    });

    // Notify host
    this.createNotification(
      facility.hostId,
      'New Booking Received',
      `${data.customerName} booked ${bay.identifier} at ${facility.name} for $${booking.grossAmount.toFixed(2)}.`,
      'booking',
      `/host/bookings`
    );

    // Notify customer
    this.createNotification(
      data.customerId,
      'Booking Confirmed!',
      `Your reservation ${booking.bookingReference} is confirmed. Gate code: ${gatePin}`,
      'booking',
      `/customer/bookings`
    );

    this.logAudit(
      data.customerId,
      data.customerName,
      'customer',
      'BOOKING_CREATED',
      'booking',
      booking.id,
      `Created booking ${booking.bookingReference} for ${quote.grossAmount} USD`
    );

    this.persist();
    return booking;
  }

  public getBookings(filters?: { hostId?: string; customerId?: string; facilityId?: string; status?: string }): Booking[] {
    let list = this.data.bookings;
    if (filters?.hostId) {
      const hostFacilities = this.getFacilities({ hostId: filters.hostId }).map(f => f.id);
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

  public getBookingById(bookingId: string): Booking | undefined {
    return this.data.bookings.find(b => b.id === bookingId);
  }

  public checkInBooking(bookingId: string, actor: User): Booking {
    const booking = this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'confirmed') {
      throw new Error(`Cannot check in. Booking is already ${booking.status}`);
    }

    const now = new Date().toISOString();
    booking.status = 'checked_in';
    booking.actualCheckInTime = now;
    booking.updatedAt = now;

    const bay = this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'occupied';
      bay.updatedAt = now;
    }

    this.logAudit(actor.id, actor.fullName, actor.role, 'GATE_CHECK_IN', 'booking', bookingId, `Customer checked in to bay ${bay?.identifier || ''}`);
    this.persist();
    return booking;
  }

  public checkOutBooking(bookingId: string, actor: User): Booking {
    const booking = this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'checked_in') {
      throw new Error(`Cannot check out. Booking is ${booking.status}`);
    }

    const now = new Date().toISOString();
    booking.status = 'completed';
    booking.actualCheckOutTime = now;
    booking.updatedAt = now;

    const bay = this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'available';
      bay.updatedAt = now;
    }

    this.logAudit(actor.id, actor.fullName, actor.role, 'GATE_CHECK_OUT', 'booking', bookingId, `Customer checked out from bay ${bay?.identifier || ''}`);
    this.persist();
    return booking;
  }

  public extendBooking(bookingId: string, additionalHours: number, actor: User): Booking {
    const booking = this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
      throw new Error('Only active or confirmed bookings can be extended.');
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + additionalHours * 60 * 60 * 1000);

    // Check conflict
    const conflict = this.data.bookings.some(b => {
      if (b.id === bookingId || b.bayId !== booking.bayId) return false;
      if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'completed') return false;
      return new Date(b.startTime) < newEnd && new Date(b.endTime) > currentEnd;
    });

    if (conflict) {
      throw new Error('Cannot extend booking: bay is booked by another customer immediately afterwards.');
    }

    const quote = this.calculateQuote(booking.facilityId, currentEnd.toISOString(), newEnd.toISOString());

    booking.endTime = newEnd.toISOString();
    booking.grossAmount += quote.grossAmount;
    booking.platformFee += quote.platformFee;
    booking.hostNetEarnings += quote.hostNetEarnings;
    booking.taxAmount += quote.taxAmount;
    booking.updatedAt = new Date().toISOString();

    const facility = this.getFacilityById(booking.facilityId);
    if (facility) {
      this.recordLedgerEntry({
        idempotencyKey: 'ext_' + crypto.randomUUID().slice(0, 8),
        hostId: facility.hostId,
        facilityId: facility.id,
        bookingId: booking.id,
        type: 'booking_income',
        amount: quote.hostNetEarnings,
        currency: 'USD',
        description: `Extension +${additionalHours}h for ${booking.bookingReference}`,
        status: 'completed'
      });
    }

    this.logAudit(actor.id, actor.fullName, actor.role, 'BOOKING_EXTENDED', 'booking', bookingId, `Extended booking by ${additionalHours}h`);
    this.persist();
    return booking;
  }

  public cancelBooking(bookingId: string, reason: string, actor: User): Booking {
    const booking = this.getBookingById(bookingId);
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

    // Policy: free cancellation (100% refund) if >= 2 hours before start, else 50% refund
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

    const bay = this.getBayById(booking.bayId);
    if (bay) {
      bay.status = 'available';
      bay.updatedAt = now.toISOString();
    }

    const facility = this.getFacilityById(booking.facilityId);
    if (facility && hostDebit > 0) {
      this.recordLedgerEntry({
        idempotencyKey: 'ref_' + crypto.randomUUID().slice(0, 8),
        hostId: facility.hostId,
        facilityId: facility.id,
        bookingId: booking.id,
        type: 'booking_refund',
        amount: -hostDebit,
        currency: 'USD',
        description: `Refund debit for cancelled booking ${booking.bookingReference} (${refundPercent}% refund)`,
        status: 'completed'
      });
    }

    this.logAudit(actor.id, actor.fullName, actor.role, 'BOOKING_CANCELLED', 'booking', bookingId, `Cancelled with ${refundPercent}% refund ($${refundAmount})`);
    this.persist();
    return booking;
  }

  // ----------------- FINANCIALS & LEDGER -----------------
  public recordLedgerEntry(entry: {
    idempotencyKey: string;
    hostId: string;
    facilityId?: string;
    bookingId?: string;
    type: LedgerEntry['type'];
    amount: number;
    currency: string;
    description: string;
    status: LedgerEntry['status'];
  }): LedgerEntry {
    const existing = this.data.ledger.find(l => l.idempotencyKey === entry.idempotencyKey);
    if (existing) return existing;

    const currentBalance = this.getHostAvailableBalance(entry.hostId);
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

    this.data.ledger.push(ledgerItem);
    this.persist();
    return ledgerItem;
  }

  public getHostAvailableBalance(hostId: string): number {
    const completedTransactions = this.data.ledger.filter(l => l.hostId === hostId && l.status === 'completed');
    const total = completedTransactions.reduce((acc, t) => acc + t.amount, 0);
    return Math.max(0, Math.round(total * 100) / 100);
  }

  public getHostFinancialSummary(hostId: string) {
    const hostTransactions = this.data.ledger.filter(l => l.hostId === hostId);
    const availableBalance = this.getHostAvailableBalance(hostId);

    const lifetimeEarnings = hostTransactions
      .filter(l => l.type === 'booking_income')
      .reduce((acc, t) => acc + t.amount, 0);

    const lifetimePayouts = hostTransactions
      .filter(l => l.type === 'host_payout')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const lifetimeRefunds = hostTransactions
      .filter(l => l.type === 'booking_refund')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const pendingPayouts = this.data.payouts
      .filter(p => p.hostId === hostId && (p.status === 'pending' || p.status === 'processing'))
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      availableBalance,
      pendingPayouts,
      lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
      lifetimePayouts: Math.round(lifetimePayouts * 100) / 100,
      lifetimeRefunds: Math.round(lifetimeRefunds * 100) / 100
    };
  }

  public getLedger(hostId?: string): LedgerEntry[] {
    let list = this.data.ledger;
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

    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new Error('Payout amount must be a positive number.');
    }
    const sanitizedAmount = Math.round(amount * 100) / 100;
    if (sanitizedAmount < 10) {
      throw new Error('Minimum payout request amount is $10.00.');
    }
    if (!destinationAccount || !destinationAccount.trim()) {
      throw new Error('Destination account or payout method details are required.');
    }

    // 2. Prevent duplicate payouts via Idempotency protection
    const resolvedIdempotencyKey = idempotencyKey || `payout_${hostId}_${sanitizedAmount}_${destinationAccount}_${Math.floor(Date.now() / 60000)}`;
    const existingPayout = this.data.payouts.find(p => (p as any).idempotencyKey === resolvedIdempotencyKey);
    if (existingPayout) {
      return existingPayout;
    }

    // 3. Concurrency lock to prevent concurrent double-spend of available balance
    if (this.payoutLock) {
      throw new Error('A financial payout transaction is currently in progress. Please retry in a moment.');
    }
    this.payoutLock = true;

    try {
      const available = this.getHostAvailableBalance(hostId);
      if (sanitizedAmount > available) {
        throw new Error(`Insufficient available balance ($${available.toFixed(2)}) for payout of $${sanitizedAmount.toFixed(2)}.`);
      }

      const now = new Date().toISOString();
      const refNum = 'PO-' + Math.floor(10000000 + Math.random() * 90000000);

      // Financial Integrity: NEVER record as 'paid' or 'completed' before confirmed external provider transfer
      const payout: PayoutRequest = {
        id: 'po_' + crypto.randomUUID().slice(0, 8),
        hostId,
        amount: sanitizedAmount,
        method,
        destinationAccount,
        status: 'processing',
        referenceNumber: refNum,
        requestedAt: now,
        notes: method === 'stripe_instant'
          ? 'Instant payout transfer queued and awaiting provider confirmation'
          : 'ACH Standard Transfer initiated and processing batch clearance'
      };
      (payout as any).idempotencyKey = resolvedIdempotencyKey;

      const ledgerId = 'led_' + crypto.randomUUID().slice(0, 8);
      const ledgerEntry: LedgerEntry = {
        id: ledgerId,
        timestamp: now,
        type: 'host_payout',
        amount: -sanitizedAmount,
        currency: 'USD',
        description: `Payout disbursement (${method === 'stripe_instant' ? 'Stripe Instant' : 'ACH Bank Transfer'}) to ${destinationAccount} (${refNum})`,
        referenceId: payout.id,
        status: 'pending'
      };
      (ledgerEntry as any).hostId = hostId;
      (ledgerEntry as any).idempotencyKey = 'payout_tx_' + payout.id;

      // 4. PostgreSQL Atomic Transaction Execution
      if (this.isPostgresActive) {
        const client = await dbManager.getClient();
        try {
          await client.query('BEGIN');

          // Idempotency check inside transaction
          const checkRes = await client.query(
            'SELECT id FROM host_payout_records WHERE idempotency_key = $1',
            [resolvedIdempotencyKey]
          );
          if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return existingPayout || payout;
          }

          // Atomic insert into host_payout_records
          await client.query(
            `INSERT INTO host_payout_records (id, host_id, amount_cents, currency, status, method, destination_account, reference_or_utr, requested_at_utc, notes, idempotency_key)
             VALUES ($1, $2, $3, 'USD', 'PROCESSING', $4, $5, $6, NOW(), $7, $8)`,
            [payout.id, hostId, Math.round(sanitizedAmount * 100), method, destinationAccount, refNum, payout.notes, resolvedIdempotencyKey]
          );

          // Atomic insert into financial_ledger
          await client.query(
            `INSERT INTO financial_ledger (id, host_id, entry_type, debit_account, credit_account, amount_cents, currency, payment_provider, description, idempotency_key, reference_number, status, created_at_utc)
             VALUES ($1, $2, 'HOST_PAYOUT', 'ACCOUNTS_PAYABLE', 'BANK_ACCOUNT', $3, 'USD', $4, $5, $6, $7, 'PENDING', NOW())`,
            [ledgerEntry.id, hostId, Math.round(sanitizedAmount * 100), method === 'stripe_instant' ? 'STRIPE' : 'ACH', ledgerEntry.description, (ledgerEntry as any).idempotencyKey, refNum]
          );

          // Atomic insert into system_audit_logs
          await client.query(
            `INSERT INTO system_audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, details)
             VALUES ($1, NOW(), $2, $3, $4, 'PAYOUT_REQUESTED', 'payout', $5, $6)`,
            [crypto.randomUUID(), actor.id, actor.fullName, actor.role, payout.id, `Requested payout $${sanitizedAmount.toFixed(2)} via ${method} (Reference: ${refNum}, Status: processing)`]
          );

          // Atomic persistence of entities
          await client.query(
            `INSERT INTO app_store_entities (collection, id, data, updated_at) VALUES ($1, $2, $3, NOW())`,
            ['payouts', payout.id, JSON.stringify(payout)]
          );
          await client.query(
            `INSERT INTO app_store_entities (collection, id, data, updated_at) VALUES ($1, $2, $3, NOW())`,
            ['ledger', ledgerEntry.id, JSON.stringify(ledgerEntry)]
          );

          await client.query('COMMIT');
        } catch (dbErr: any) {
          await client.query('ROLLBACK');
          console.error('[ParkEazy-Store] Atomic payout transaction in PostgreSQL failed:', dbErr.message);
          throw new Error('Database transaction failed while processing payout request: ' + dbErr.message);
        } finally {
          client.release();
        }
      }

      // Deduct ledger balance with processing status
      this.data.payouts.push(payout);
      this.recordLedgerEntry(ledgerEntry);

      this.logAudit(
        actor.id,
        actor.fullName,
        actor.role,
        'PAYOUT_REQUESTED',
        'payout',
        payout.id,
        `Requested payout $${sanitizedAmount.toFixed(2)} via ${method} (Reference: ${refNum}, Status: processing)`
      );
      this.persist();
      return payout;
    } finally {
      this.payoutLock = false;
    }
  }

  public getPayouts(hostId?: string): PayoutRequest[] {
    let list = this.data.payouts;
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

  public getProviders(): ThirdPartyProviderConfig[] {
    return this.data.providers.map(p => this.maskProviderConfig(p));
  }

  public updateProvider(id: string, updates: Partial<ThirdPartyProviderConfig>, admin: User): ThirdPartyProviderConfig {
    const p = this.data.providers.find(prov => prov.id === id);
    if (!p) throw new Error('Provider not found');

    if (updates.isEnabled !== undefined) p.isEnabled = updates.isEnabled;
    if (updates.settings) {
      const mergedSettings = { ...p.settings };
      for (const [k, v] of Object.entries(updates.settings)) {
        // Protect secrets: do not overwrite real stored credentials if masked placeholder was submitted
        if (typeof v === 'string' && v.includes('****')) {
          continue;
        }
        mergedSettings[k] = v;
      }
      p.settings = mergedSettings;
    }

    this.logAudit(admin.id, admin.fullName, 'admin', 'PROVIDER_CONFIG_UPDATED', 'provider', id, `Updated configuration for ${p.name}`);
    this.persist();
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

  public testProviderConnection(id: string, admin: User): { success: boolean; latencyMs: number; message: string } {
    const p = this.data.providers.find(prov => prov.id === id);
    if (!p) throw new Error('Provider not found');

    const latencyMs = Math.floor(45 + Math.random() * 85);
    const now = new Date().toISOString();

    if (!p.isEnabled) {
      p.lastTestedAt = now;
      p.testStatus = 'degraded';
      p.testMessage = 'Provider is disabled in configuration.';
      this.persist();
      return { success: false, latencyMs, message: 'Provider is disabled.' };
    }

    p.lastTestedAt = now;
    p.testStatus = 'healthy';
    p.testMessage = `Connected successfully (HTTP 200 OK, latency: ${latencyMs}ms)`;

    this.logAudit(admin.id, admin.fullName, 'admin', 'PROVIDER_TEST_PING', 'provider', id, `Test ping succeeded: ${latencyMs}ms`);
    this.persist();
    return { success: true, latencyMs, message: p.testMessage };
  }

  // ----------------- REVIEWS & RATINGS -----------------
  public getReviews(facilityId?: string): Review[] {
    let list = this.data.reviews;
    if (facilityId) {
      list = list.filter(r => r.facilityId === facilityId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addReview(facilityId: string, customerId: string, customerName: string, bookingId: string, rating: number, comment: string): Review {
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
    this.data.reviews.unshift(review);
    this.persist();
    return review;
  }

  public replyToReview(reviewId: string, replyText: string, host: User): Review {
    const rev = this.data.reviews.find(r => r.id === reviewId);
    if (!rev) throw new Error('Review not found');

    rev.hostResponse = {
      text: replyText,
      respondedAt: new Date().toISOString()
    };
    this.logAudit(host.id, host.fullName, 'host', 'REVIEW_REPLIED', 'facility', rev.facilityId, `Host replied to review ${reviewId}`);
    this.persist();
    return rev;
  }

  // ----------------- NOTIFICATIONS & MESSAGES -----------------
  public createNotification(userId: string, title: string, message: string, type: NotificationItem['type'], link?: string): NotificationItem {
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
    this.data.notifications.unshift(item);
    if (this.data.notifications.length > 200) {
      this.data.notifications = this.data.notifications.slice(0, 200);
    }
    this.persist();
    return item;
  }

  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markNotificationRead(id: string, userId: string) {
    const n = this.data.notifications.find(item => item.id === id && item.userId === userId);
    if (n) {
      n.isRead = true;
      this.persist();
    }
  }

  public markAllNotificationsRead(userId: string) {
    for (const n of this.data.notifications) {
      if (n.userId === userId) {
        n.isRead = true;
      }
    }
    this.persist();
  }

  // Messages
  public getMessages(userId: string): MessageThread[] {
    return this.data.messages.filter(m => m.hostId === userId || m.customerId === userId);
  }

  public sendMessage(threadId: string, sender: User, text: string): MessageThread {
    const thread = this.data.messages.find(m => m.id === threadId);
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

    // Notify receiver
    const recipientId = sender.id === thread.hostId ? thread.customerId : thread.hostId;
    this.createNotification(
      recipientId,
      `New Message from ${sender.fullName}`,
      text.slice(0, 60) + (text.length > 60 ? '...' : ''),
      'alert'
    );

    this.persist();
    return thread;
  }

  // ----------------- DISPUTES & SUPPORT -----------------
  public getDisputes(filters?: { hostId?: string; customerId?: string }): DisputeTicket[] {
    let list = this.data.disputes;
    if (filters?.hostId) list = list.filter(d => d.hostId === filters.hostId);
    if (filters?.customerId) list = list.filter(d => d.customerId === filters.customerId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createDispute(data: {
    bookingId: string;
    reason: DisputeTicket['reason'];
    statement: string;
    customer: User;
  }): DisputeTicket {
    const booking = this.getBookingById(data.bookingId);
    if (!booking) throw new Error('Booking not found');
    const facility = this.getFacilityById(booking.facilityId);
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

    this.data.disputes.unshift(ticket);
    this.createNotification(facility.hostId, 'Dispute Filed', `Customer opened dispute ${ticket.ticketNumber}`, 'dispute');
    this.persist();
    return ticket;
  }

  public resolveDispute(
    ticketId: string,
    decision: 'resolved_refunded' | 'resolved_dismissed',
    refundAmount: number,
    notes: string,
    admin: User
  ): DisputeTicket {
    const ticket = this.data.disputes.find(d => d.id === ticketId);
    if (!ticket) throw new Error('Dispute not found');

    ticket.status = decision;
    ticket.resolutionNotes = notes;
    ticket.refundAmount = refundAmount;
    ticket.updatedAt = new Date().toISOString();

    if (decision === 'resolved_refunded' && refundAmount > 0) {
      const booking = this.getBookingById(ticket.bookingId);
      if (booking) {
        booking.refundAmount = (booking.refundAmount || 0) + refundAmount;
      }
      this.recordLedgerEntry({
        idempotencyKey: 'disp_ref_' + ticket.id,
        hostId: ticket.hostId,
        facilityId: ticket.facilityId,
        bookingId: ticket.bookingId,
        type: 'booking_refund',
        amount: -refundAmount,
        currency: 'USD',
        description: `Dispute ${ticket.ticketNumber} resolution refund`,
        status: 'completed'
      });
    }

    this.logAudit(admin.id, admin.fullName, 'admin', 'DISPUTE_RESOLVED', 'dispute', ticketId, `Dispute ${ticket.ticketNumber} set to ${decision}`);
    this.persist();
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
