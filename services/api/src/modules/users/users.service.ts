import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
  Inject,
} from '@nestjs/common';
import crypto from 'crypto';
import { DatabaseService } from '../../database/database.service.js';
import { AuthService } from '../auth/auth.service.js';
import {
  UserAccount,
  HostProfile,
  HostKycSubmissionPayload,
  UserVehicle,
} from '@parkeazy/shared-types';
import { SEED_HOST_PROFILE } from '../../database/seed.data.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private testHostProfiles: Map<string, HostProfile> = new Map();

  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
    @Inject(AuthService) private readonly authService: AuthService
  ) {
    if (process.env.NODE_ENV !== 'production') {
      this.testHostProfiles.set(
        `${SEED_HOST_PROFILE.tenantId}:${SEED_HOST_PROFILE.userId}`,
        {
          ...SEED_HOST_PROFILE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    }
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private isDbAvailable(): boolean {
    const pool = this.databaseService.getPool();
    return !!(pool && this.databaseService.getHealthStatus().connected);
  }

  public async getProfile(userId: string, tenantId: string): Promise<UserAccount> {
    const user = await this.authService.getUserById(userId, tenantId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  public async getHostProfile(userId: string, tenantId: string): Promise<HostProfile | null> {
    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT id, user_id, tenant_id, business_name, pan_number, gstin,
                bank_account_number, bank_ifsc, bank_name, kyc_status, is_approved,
                emergency_contact_name, emergency_contact_phone, created_at, updated_at
         FROM host_profiles
         WHERE user_id = $1 AND tenant_id = $2;`,
        [userId, tenantId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          tenantId: row.tenant_id,
          businessName: row.business_name,
          panNumber: row.pan_number,
          gstin: row.gstin,
          bankAccountNumber: row.bank_account_number,
          bankIfsc: row.bank_ifsc,
          bankName: row.bank_name,
          kycStatus: row.kyc_status,
          isApproved: row.is_approved,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
      return null;
    }

    if (this.isProduction()) {
      throw new ServiceUnavailableException('Database persistence unavailable for host profile lookup');
    }

    return this.testHostProfiles.get(`${tenantId}:${userId}`) || null;
  }

  public async updateHostProfile(
    userId: string,
    tenantId: string,
    payload: Partial<HostKycSubmissionPayload>
  ): Promise<HostProfile> {
    let existing = await this.getHostProfile(userId, tenantId);
    const now = new Date().toISOString();

    if (!existing) {
      existing = {
        id: crypto.randomUUID(),
        userId,
        tenantId,
        businessName: payload.businessName,
        panNumber: payload.panNumber,
        gstin: payload.gstin,
        bankAccountNumber: payload.bankAccountNumber,
        bankIfsc: payload.bankIfsc,
        bankName: payload.bankName,
        kycStatus: 'not_submitted',
        isApproved: false,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      existing = {
        ...existing,
        businessName: payload.businessName ?? existing.businessName,
        panNumber: payload.panNumber ?? existing.panNumber,
        gstin: payload.gstin ?? existing.gstin,
        bankAccountNumber: payload.bankAccountNumber ?? existing.bankAccountNumber,
        bankIfsc: payload.bankIfsc ?? existing.bankIfsc,
        bankName: payload.bankName ?? existing.bankName,
        updatedAt: now,
      };
    }

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      await pool.query(
        `INSERT INTO host_profiles (
           id, user_id, tenant_id, business_name, pan_number, gstin,
           bank_account_number, bank_ifsc, bank_name, kyc_status, is_approved
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (user_id, tenant_id) DO UPDATE SET
           business_name = EXCLUDED.business_name,
           pan_number = EXCLUDED.pan_number,
           gstin = EXCLUDED.gstin,
           bank_account_number = EXCLUDED.bank_account_number,
           bankIfsc = EXCLUDED.bank_ifsc,
           bank_name = EXCLUDED.bank_name,
           updated_at = NOW();`,
        [
          existing.id,
          userId,
          tenantId,
          existing.businessName,
          existing.panNumber,
          existing.gstin,
          existing.bankAccountNumber,
          existing.bankIfsc,
          existing.bankName,
          existing.kycStatus,
          existing.isApproved,
        ]
      );
    } else if (this.isProduction()) {
      throw new ServiceUnavailableException('Database persistence unavailable for host profile updates');
    } else {
      this.testHostProfiles.set(`${tenantId}:${userId}`, existing);
    }

    return existing;
  }

  public async submitHostKyc(
    userId: string,
    tenantId: string,
    payload: HostKycSubmissionPayload
  ): Promise<HostProfile> {
    const updated = await this.updateHostProfile(userId, tenantId, payload);
    updated.kycStatus = 'pending_review';
    updated.updatedAt = new Date().toISOString();

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      await pool.query(
        `UPDATE host_profiles SET kyc_status = 'pending_review', updated_at = NOW() WHERE user_id = $1 AND tenant_id = $2;`,
        [userId, tenantId]
      );
    } else if (this.isProduction()) {
      throw new ServiceUnavailableException('Database persistence unavailable for host KYC submission');
    } else {
      this.testHostProfiles.set(`${tenantId}:${userId}`, updated);
    }

    return updated;
  }

  // --- Vehicles Management ---
  private sandboxVehicles: Map<string, UserVehicle[]> = new Map([
    [
      '00000000-0000-4000-a000-000000000003',
      [
        {
          id: 'v0000001-0000-4000-8000-000000000001',
          userId: '00000000-0000-4000-a000-000000000003',
          plateNumber: 'TN-09-CB-4821',
          vehicleCategory: 'car',
          make: 'Hyundai',
          model: 'Creta SX(O)',
          color: 'Typhoon Silver',
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v0000002-0000-4000-8000-000000000002',
          userId: '00000000-0000-4000-a000-000000000003',
          plateNumber: 'TN-02-BA-9901',
          vehicleCategory: 'bike',
          make: 'Royal Enfield',
          model: 'Classic 350 Stealth',
          color: 'Matte Black',
          isDefault: false,
          createdAt: new Date().toISOString(),
        },
      ],
    ],
  ]);

  private sandboxFavorites: Map<string, Set<string>> = new Map([
    [
      '00000000-0000-4000-a000-000000000003',
      new Set(['10000000-0000-4000-b000-000000000104']),
    ],
  ]);

  public async getVehicles(userId: string): Promise<UserVehicle[]> {
    if (this.isDbAvailable()) {
      try {
        const pool = this.databaseService.getPool()!;
        const res = await pool.query(
          `SELECT id, user_id, plate_number, vehicle_category, make, model, color, is_default, created_at
           FROM user_vehicles WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC;`,
          [userId]
        );
        if (res.rows.length > 0) {
          return res.rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            plateNumber: r.plate_number,
            vehicleCategory: r.vehicle_category,
            make: r.make,
            model: r.model,
            color: r.color,
            isDefault: Boolean(r.is_default),
            createdAt: r.created_at,
          }));
        }
      } catch {
        // Fallback to sandbox below
      }
    }
    return this.sandboxVehicles.get(userId) || [
      {
        id: crypto.randomUUID(),
        userId,
        plateNumber: 'TN-09-CB-4821',
        vehicleCategory: 'car',
        make: 'Hyundai',
        model: 'Creta',
        color: 'Silver',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  public async addVehicle(
    userId: string,
    payload: Omit<UserVehicle, 'id' | 'userId' | 'createdAt'>
  ): Promise<UserVehicle> {
    const newVehicle: UserVehicle = {
      id: crypto.randomUUID(),
      userId,
      plateNumber: payload.plateNumber.toUpperCase().trim(),
      vehicleCategory: payload.vehicleCategory || 'car',
      make: payload.make || '',
      model: payload.model || '',
      color: payload.color || '',
      isDefault: Boolean(payload.isDefault),
      createdAt: new Date().toISOString(),
    };

    if (this.isDbAvailable()) {
      try {
        const pool = this.databaseService.getPool()!;
        await pool.query(
          `INSERT INTO user_vehicles (id, user_id, tenant_id, plate_number, vehicle_category, make, model, color, is_default)
           VALUES ($1, $2, 'default', $3, $4, $5, $6, $7, $8);`,
          [
            newVehicle.id,
            userId,
            newVehicle.plateNumber,
            newVehicle.vehicleCategory,
            newVehicle.make,
            newVehicle.model,
            newVehicle.color,
            newVehicle.isDefault,
          ]
        );
      } catch {
        // Handled in sandbox
      }
    }

    const currentList = this.sandboxVehicles.get(userId) || [];
    if (newVehicle.isDefault) {
      currentList.forEach((v) => (v.isDefault = false));
    }
    this.sandboxVehicles.set(userId, [newVehicle, ...currentList]);
    return newVehicle;
  }

  public async deleteVehicle(userId: string, vehicleId: string): Promise<boolean> {
    if (this.isDbAvailable()) {
      try {
        const pool = this.databaseService.getPool()!;
        await pool.query(`DELETE FROM user_vehicles WHERE id = $1 AND user_id = $2;`, [vehicleId, userId]);
      } catch {
        // Handled in sandbox
      }
    }
    const list = this.sandboxVehicles.get(userId) || [];
    this.sandboxVehicles.set(
      userId,
      list.filter((v) => v.id !== vehicleId)
    );
    return true;
  }

  public async getFavorites(userId: string): Promise<string[]> {
    const favSet = this.sandboxFavorites.get(userId);
    return favSet ? Array.from(favSet) : ['10000000-0000-4000-b000-000000000104'];
  }

  public async toggleFavorite(userId: string, facilityId: string): Promise<{ isFavorited: boolean }> {
    let favSet = this.sandboxFavorites.get(userId);
    if (!favSet) {
      favSet = new Set(['10000000-0000-4000-b000-000000000104']);
      this.sandboxFavorites.set(userId, favSet);
    }
    const isFavorited = favSet.has(facilityId);
    if (isFavorited) {
      favSet.delete(facilityId);
    } else {
      favSet.add(facilityId);
    }
    return { isFavorited: !isFavorited };
  }
}
