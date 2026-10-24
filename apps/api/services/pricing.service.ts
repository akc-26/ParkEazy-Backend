import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  RatePlan,
  CreateRatePlanRequest,
  UpdateRatePlanRequest,
  FacilityOperatingDay,
  UpdateOperatingHoursRequest,
  PricingPolicy,
  UpdatePricingPolicyRequest,
  FacilityClosure,
  CreateFacilityClosureRequest,
  PriceEstimateRequest,
  PriceEstimateResponse,
  QuoteAndAvailabilityResponse,
  BulkPriceUpdateRequest,
  BulkPriceUpdatePreviewResponse,
  BulkPriceUpdateTargetPreview,
  PricingConflict,
  PricingAuditRecord,
  BookingStatus,
} from '../../../packages/contracts';
import {
  validateRatePlanInput,
  resolveApplicablePricingRule,
  detectPricingRuleConflict,
} from '@parkeazy/validation';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/error-handler';
import { inventoryService } from './inventory.service';
import { bookingService } from './booking.service';
import { dbManager } from '../database/connection';
import { appConfig } from '../config/env';
import { db } from '../../../server/db';
import { availabilityService } from './availability.service';

export class PricingService {
  private static instance: PricingService;
  private readonly storageFilePath: string;

  private ratePlans: RatePlan[] = [];
  private operatingHours: FacilityOperatingDay[] = [];
  private policies: PricingPolicy[] = [];
  private closures: FacilityClosure[] = [];
  private auditLogs: PricingAuditRecord[] = [];

  private readonly INITIAL_RATE_PLANS: RatePlan[] = [
    {
      id: 'rp-dt-001',
      hostId: 'usr-host-001',
      facilityId: 'loc-dt-001',
      name: 'Standard Financial District Tier',
      hourlyRateCents: 650,
      dailyRateCents: 3800,
      minBillableMinutes: 60,
      minBookingMinutes: 60,
      maxBookingMinutes: 4320,
      stepMinutes: 30,
      vehicleCategory: 'ALL',
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      isActive: true,
      createdAtUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rp-res-002',
      hostId: 'usr-host-001',
      facilityId: 'loc-res-002',
      name: 'Palo Alto Residential EV Rate',
      hourlyRateCents: 450,
      dailyRateCents: 2800,
      minBillableMinutes: 60,
      minBookingMinutes: 60,
      maxBookingMinutes: 4320,
      stepMinutes: 30,
      vehicleCategory: 'ALL',
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      isActive: true,
      createdAtUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
    {
      id: 'rp-sub-003',
      hostId: 'usr-host-001',
      facilityId: 'loc-sub-003',
      name: 'Mission Bay Commuter Rate',
      hourlyRateCents: 500,
      dailyRateCents: 3200,
      minBillableMinutes: 60,
      minBookingMinutes: 60,
      maxBookingMinutes: 4320,
      stepMinutes: 30,
      vehicleCategory: 'ALL',
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      isActive: true,
      createdAtUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
  ];

  private readonly INITIAL_POLICIES: PricingPolicy[] = [
    {
      id: 'pol-dt-001',
      facilityId: 'loc-dt-001',
      minDurationMinutes: 60,
      maxDurationMinutes: 4320,
      bookingIncrementMinutes: 30,
      transitionBufferMinutes: 15,
      cancellationPolicyTier: 'STANDARD_48H',
      securityDepositCents: 2500,
      overstayPenaltyPerHourCents: 2000,
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
    {
      id: 'pol-res-002',
      facilityId: 'loc-res-002',
      minDurationMinutes: 60,
      maxDurationMinutes: 4320,
      bookingIncrementMinutes: 30,
      transitionBufferMinutes: 15,
      cancellationPolicyTier: 'FLEXIBLE_24H',
      securityDepositCents: 1500,
      overstayPenaltyPerHourCents: 1500,
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
    {
      id: 'pol-sub-003',
      facilityId: 'loc-sub-003',
      minDurationMinutes: 60,
      maxDurationMinutes: 4320,
      bookingIncrementMinutes: 30,
      transitionBufferMinutes: 15,
      cancellationPolicyTier: 'STANDARD_48H',
      securityDepositCents: 2000,
      overstayPenaltyPerHourCents: 1800,
      effectiveFromUtc: '2026-01-01T00:00:00Z',
      updatedAtUtc: '2026-01-01T00:00:00Z',
    },
  ];

  private constructor() {
    this.storageFilePath = path.resolve(
      process.cwd(),
      'apps/api/database/data/pricing_store.json'
    );
    this.loadFromDisk();
  }

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.ratePlans) && parsed.ratePlans.length > 0) {
          this.ratePlans = parsed.ratePlans;
          this.operatingHours = Array.isArray(parsed.operatingHours) ? parsed.operatingHours : [];
          this.policies = Array.isArray(parsed.policies) ? parsed.policies : [];
          this.closures = Array.isArray(parsed.closures) ? parsed.closures : [];
          this.auditLogs = Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [];
          return;
        }
      }
    } catch (err: any) {
      console.warn('[ParkEazy-Pricing] Could not load pricing store from disk:', err.message);
    }

    // Seed defaults
    this.ratePlans = [...this.INITIAL_RATE_PLANS];
    this.policies = [...this.INITIAL_POLICIES];
    this.initDefaultOperatingHours();
    this.saveToDisk();
  }

  private initDefaultOperatingHours(): void {
    const facilities = ['loc-dt-001', 'loc-res-002', 'loc-sub-003'];
    for (const facilityId of facilities) {
      for (let day = 0; day < 7; day++) {
        this.operatingHours.push({
          id: `oph-${facilityId}-${day}`,
          facilityId,
          dayOfWeek: day,
          isClosed: false,
          openTime: '06:00',
          closeTime: '23:00',
          isOvernight: false,
        });
      }
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        ratePlans: this.ratePlans,
        operatingHours: this.operatingHours,
        policies: this.policies,
        closures: this.closures,
        auditLogs: this.auditLogs,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ParkEazy-Pricing] Error writing pricing storage:', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // Audit Trail Logging
  // --------------------------------------------------------------------------

  private recordAuditLog(
    hostId: string,
    facilityId: string,
    action: PricingAuditRecord['action'],
    actorId: string,
    diffSummary: string,
    previousValue?: any,
    newValue?: any,
    spaceId?: string,
    correlationId?: string
  ): void {
    const facility = inventoryService.getLocationById(facilityId);
    let spaceNumber: string | undefined;
    if (spaceId) {
      const bay = inventoryService.getBayById(spaceId);
      spaceNumber = bay?.bayNumber;
    }

    const record: PricingAuditRecord = {
      id: 'aud-' + crypto.randomUUID().substring(0, 8),
      hostId,
      facilityId,
      facilityName: facility?.name,
      spaceId,
      spaceNumber,
      action,
      actorId,
      previousValue,
      newValue,
      diffSummary,
      correlationId,
      createdAtUtc: new Date().toISOString(),
    };

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Pricing Overview
  // --------------------------------------------------------------------------

  public getPricingOverview(hostId: string) {
    const facilities = inventoryService.getLocationsForHost(hostId);
    const hostRates = this.ratePlans.filter((r) => r.hostId === hostId && r.isActive);
    const hostClosures = this.closures.filter((c) => c.hostId === hostId);
    const conflicts = this.getPricingConflicts(hostId);

    const facilitySummaries = facilities.map((fac) => {
      const activeRate = hostRates.find((r) => r.facilityId === fac.id && !r.bayId);
      const policy = this.getPolicyForFacility(fac.id);
      const activeClosures = hostClosures.filter((c) => c.facilityId === fac.id);
      const bays = inventoryService.getBaysByLocationId(fac.id);

      return {
        facilityId: fac.id,
        facilityName: fac.name,
        propertyType: fac.propertyType,
        status: fac.status,
        totalBays: bays.length,
        hourlyRateCents: activeRate ? activeRate.hourlyRateCents : fac.hourlyRateCents,
        dailyRateCents: activeRate ? activeRate.dailyRateCents : fac.dailyRateCents,
        securityDepositCents: policy ? policy.securityDepositCents : fac.securityDepositCents,
        cancellationPolicyTier: policy ? policy.cancellationPolicyTier : 'STANDARD_48H',
        activeClosuresCount: activeClosures.length,
        hasConflicts: conflicts.some((cnf) => cnf.facilityId === fac.id),
      };
    });

    return {
      hostId,
      totalFacilities: facilities.length,
      activeRatePlansCount: hostRates.length,
      activeClosuresCount: hostClosures.length,
      unresolvedConflictsCount: conflicts.length,
      facilities: facilitySummaries,
    };
  }

  // --------------------------------------------------------------------------
  // Rate Plans CRUD (pe_hw_03_02)
  // --------------------------------------------------------------------------

  public registerRatePlan(plan: RatePlan): void {
    const idx = this.ratePlans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      this.ratePlans[idx] = plan;
    } else {
      this.ratePlans.unshift(plan);
    }
  }

  public removeRatePlan(planId: string): void {
    this.ratePlans = this.ratePlans.filter((p) => p.id !== planId);
  }

  public getRatePlansForHost(hostId: string, facilityId?: string): RatePlan[] {
    const dbPlans = ((db as any)?.data?.ratePlans || []) as RatePlan[];
    const map = new Map<string, RatePlan>();
    for (const p of this.ratePlans) {
      if (p && p.id) map.set(p.id, p);
    }
    for (const p of dbPlans) {
      if (p && p.id) map.set(p.id, p);
    }
    const combined = Array.from(map.values());
    return combined.filter((r) => {
      if (r.hostId && r.hostId !== hostId) return false;
      if (facilityId && r.facilityId !== facilityId) return false;
      return true;
    });
  }

  public getRatePlanById(rateId: string): RatePlan {
    const dbPlans = ((db as any)?.data?.ratePlans || []) as RatePlan[];
    const rate = dbPlans.find((r) => r.id === rateId) || this.ratePlans.find((r) => r.id === rateId);
    if (!rate) {
      throw new NotFoundError(`Rate plan '${rateId}' not found.`);
    }
    return rate;
  }

  public createRatePlan(
    hostId: string,
    req: CreateRatePlanRequest,
    actorId: string,
    correlationId?: string
  ): RatePlan {
    const facility = inventoryService.getLocationById(req.facilityId) ||
      ((db as any)?.data?.facilities || []).find((f: any) => f.id === req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    if (req.bayId) {
      const bay = inventoryService.getBayById(req.bayId) ||
        ((db as any)?.data?.bays || []).find((b: any) => b.id === req.bayId);
      if (!bay || (bay.locationId && bay.locationId !== req.facilityId && bay.facilityId !== req.facilityId)) {
        throw new NotFoundError(`Space '${req.bayId}' not found in facility '${req.facilityId}'.`);
      }
    }

    const validation = validateRatePlanInput({
      ...req,
      facilityId: req.facilityId,
    });
    if (!validation.success) {
      throw new AppError(validation.errors.join('; '), 400, 'VALIDATION_ERROR');
    }
    const val = validation.data!;

    const nowIso = new Date().toISOString();
    const newPlan: RatePlan = {
      id: 'rp-' + crypto.randomUUID().substring(0, 8),
      hostId,
      facilityId: val.facilityId,
      bayId: val.bayId,
      name: val.name,
      hourlyRateCents: val.hourlyRateCents,
      dailyRateCents: val.dailyRateCents,
      minBillableMinutes: val.minBillableMinutes,
      minBookingMinutes: val.minBookingMinutes,
      maxBookingMinutes: val.maxBookingMinutes,
      stepMinutes: val.stepMinutes,
      vehicleCategory: val.vehicleCategory as any,
      effectiveFromUtc: val.effectiveFromUtc,
      effectiveUntilUtc: val.effectiveUntilUtc,
      isActive: val.isActive,
      createdAtUtc: nowIso,
      updatedAtUtc: nowIso,
    };

    // Conflict detection across all active plans in this facility
    const existingPlans = this.getRatePlansForHost(hostId, val.facilityId);
    const conflict = detectPricingRuleConflict(existingPlans, newPlan);
    if (conflict) {
      throw new AppError(conflict, 409, 'PRICING_RULE_CONFLICT');
    }

    this.ratePlans.unshift(newPlan);
    this.saveToDisk();

    // Persist to authoritative store & PostgreSQL
    try {
      if (db && typeof (db as any).persistEntity === 'function') {
        (db as any).persistEntity('ratePlans', newPlan.id, newPlan);
        const legacyRule = {
          id: newPlan.id,
          facilityId: newPlan.facilityId,
          name: newPlan.name,
          baseHourlyRate: newPlan.hourlyRateCents / 100,
          dailyMaxRate: newPlan.dailyRateCents / 100,
          overnightFlatRate: (newPlan.dailyRateCents / 100) * 0.6,
          surgeMultiplier: 1.0,
          peakHours: [],
          specialEvents: [],
          discounts: [],
          isActive: newPlan.isActive,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        (db as any).persistEntity('pricingRules', newPlan.id, legacyRule);
      }
      if (dbManager.isPostgresConnected()) {
        dbManager.query(
          `INSERT INTO pricing_rate_plans
           (id, facility_id, host_id, bay_id, space_id, name, hourly_rate_cents, daily_rate_cents, min_billable_minutes, min_booking_minutes, max_booking_minutes, step_minutes, vehicle_category, is_active, effective_from_utc, effective_until_utc, created_at_utc, updated_at_utc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             hourly_rate_cents = EXCLUDED.hourly_rate_cents,
             daily_rate_cents = EXCLUDED.daily_rate_cents,
             is_active = EXCLUDED.is_active,
             updated_at_utc = EXCLUDED.updated_at_utc`,
          [
            newPlan.id,
            newPlan.facilityId,
            newPlan.hostId,
            newPlan.bayId || null,
            newPlan.bayId || null,
            newPlan.name,
            newPlan.hourlyRateCents,
            newPlan.dailyRateCents,
            newPlan.minBillableMinutes,
            newPlan.minBookingMinutes,
            newPlan.maxBookingMinutes,
            newPlan.stepMinutes,
            newPlan.vehicleCategory || 'ALL',
            newPlan.isActive,
            newPlan.effectiveFromUtc,
            newPlan.effectiveUntilUtc || null,
            newPlan.createdAtUtc,
            newPlan.updatedAtUtc,
          ]
        ).catch(() => {});
      }
    } catch {}

    this.recordAuditLog(
      hostId,
      req.facilityId,
      'RATE_CREATED',
      actorId,
      `Created rate plan "${newPlan.name}" ($${(newPlan.hourlyRateCents / 100).toFixed(2)}/hr, $${(newPlan.dailyRateCents / 100).toFixed(2)}/day)`,
      undefined,
      newPlan,
      req.bayId,
      correlationId
    );

    return newPlan;
  }

  public updateRatePlan(
    hostId: string,
    rateId: string,
    req: UpdateRatePlanRequest,
    actorId: string,
    correlationId?: string
  ): RatePlan {
    const plan = this.getRatePlanById(rateId);
    if (plan.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this rate plan.');
    }

    const prev = { ...plan };

    if (req.name !== undefined) plan.name = req.name.trim();
    if (req.hourlyRateCents !== undefined) {
      if (req.hourlyRateCents < 0) throw new AppError('Hourly rate cannot be negative.', 400, 'INVALID_RATE');
      plan.hourlyRateCents = Math.round(req.hourlyRateCents);
    }
    if (req.dailyRateCents !== undefined) {
      if (req.dailyRateCents < 0) throw new AppError('Daily rate cannot be negative.', 400, 'INVALID_RATE');
      plan.dailyRateCents = Math.round(req.dailyRateCents);
    }
    if (req.minBillableMinutes !== undefined) plan.minBillableMinutes = req.minBillableMinutes;
    if (req.minBookingMinutes !== undefined) plan.minBookingMinutes = req.minBookingMinutes;
    if (req.maxBookingMinutes !== undefined) plan.maxBookingMinutes = req.maxBookingMinutes;
    if (req.stepMinutes !== undefined) plan.stepMinutes = req.stepMinutes;
    if (req.vehicleCategory !== undefined) plan.vehicleCategory = req.vehicleCategory;
    if (req.effectiveFromUtc !== undefined) plan.effectiveFromUtc = req.effectiveFromUtc;
    if (req.effectiveUntilUtc !== undefined) plan.effectiveUntilUtc = req.effectiveUntilUtc;
    if (req.isActive !== undefined) plan.isActive = req.isActive;

    plan.updatedAtUtc = new Date().toISOString();
    this.saveToDisk();

    try {
      if (db && typeof (db as any).persistEntity === 'function') {
        (db as any).persistEntity('ratePlans', plan.id, plan);
      }
      if (dbManager.isPostgresConnected()) {
        dbManager.query(
          `UPDATE pricing_rate_plans SET
             name = $1,
             hourly_rate_cents = $2,
             daily_rate_cents = $3,
             is_active = $4,
             updated_at_utc = $5
           WHERE id = $6`,
          [plan.name, plan.hourlyRateCents, plan.dailyRateCents, plan.isActive, plan.updatedAtUtc, plan.id]
        ).catch(() => {});
      }
    } catch {}

    this.recordAuditLog(
      hostId,
      plan.facilityId,
      'RATE_UPDATED',
      actorId,
      `Updated rate plan "${plan.name}"`,
      prev,
      plan,
      plan.bayId,
      correlationId
    );

    return plan;
  }

  public deactivateRatePlan(
    hostId: string,
    rateId: string,
    actorId: string,
    correlationId?: string
  ): RatePlan {
    const plan = this.getRatePlanById(rateId);
    if (plan.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this rate plan.');
    }

    const prev = { ...plan };
    plan.isActive = false;
    plan.updatedAtUtc = new Date().toISOString();
    this.saveToDisk();

    try {
      if (db && typeof (db as any).persistEntity === 'function') {
        (db as any).persistEntity('ratePlans', plan.id, plan);
      }
      if (dbManager.isPostgresConnected()) {
        dbManager.query(
          `UPDATE pricing_rate_plans SET is_active = FALSE, updated_at_utc = NOW() WHERE id = $1`,
          [plan.id]
        ).catch(() => {});
      }
    } catch {}

    this.recordAuditLog(
      hostId,
      plan.facilityId,
      'RATE_DEACTIVATED',
      actorId,
      `Deactivated rate plan "${plan.name}"`,
      prev,
      plan,
      plan.bayId,
      correlationId
    );

    return plan;
  }

  // --------------------------------------------------------------------------
  // Operating Hours (pe_hw_03_03)
  // --------------------------------------------------------------------------

  public getOperatingHours(facilityId: string): FacilityOperatingDay[] {
    const existing = this.operatingHours.filter((o) => o.facilityId === facilityId);
    if (existing.length === 7) {
      return [...existing].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }

    // Generate defaults for any missing days
    const result: FacilityOperatingDay[] = [];
    for (let day = 0; day < 7; day++) {
      const match = existing.find((o) => o.dayOfWeek === day);
      if (match) {
        result.push(match);
      } else {
        const def: FacilityOperatingDay = {
          id: `oph-${facilityId}-${day}`,
          facilityId,
          dayOfWeek: day,
          isClosed: false,
          openTime: '06:00',
          closeTime: '23:00',
          isOvernight: false,
        };
        this.operatingHours.push(def);
        result.push(def);
      }
    }
    this.saveToDisk();
    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  public updateOperatingHours(
    hostId: string,
    req: UpdateOperatingHoursRequest,
    actorId: string,
    correlationId?: string
  ): FacilityOperatingDay[] {
    const facility = inventoryService.getLocationById(req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    // Time validation (HH:mm format)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const item of req.schedule) {
      if (!item.isClosed) {
        if (!timeRegex.test(item.openTime) || !timeRegex.test(item.closeTime)) {
          throw new AppError(
            `Invalid time format '${item.openTime}' or '${item.closeTime}'. Expected HH:mm.`,
            400,
            'INVALID_TIME_FORMAT'
          );
        }
      }
    }

    const prevSchedule = this.getOperatingHours(req.facilityId);

    // Apply updates
    for (const item of req.schedule) {
      const isOvernight = item.closeTime < item.openTime;
      const idx = this.operatingHours.findIndex(
        (o) => o.facilityId === req.facilityId && o.dayOfWeek === item.dayOfWeek
      );
      const entry: FacilityOperatingDay = {
        id: `oph-${req.facilityId}-${item.dayOfWeek}`,
        facilityId: req.facilityId,
        dayOfWeek: item.dayOfWeek,
        isClosed: item.isClosed,
        openTime: item.openTime,
        closeTime: item.closeTime,
        isOvernight,
      };

      if (idx >= 0) {
        this.operatingHours[idx] = entry;
      } else {
        this.operatingHours.push(entry);
      }
    }

    this.saveToDisk();

    this.recordAuditLog(
      hostId,
      req.facilityId,
      'SCHEDULE_UPDATED',
      actorId,
      `Updated weekly operating schedule for "${facility.name}"`,
      prevSchedule,
      req.schedule,
      undefined,
      correlationId
    );

    return this.getOperatingHours(req.facilityId);
  }

  // --------------------------------------------------------------------------
  // Pricing Policies (pe_hw_03_05)
  // --------------------------------------------------------------------------

  public getPolicyForFacility(facilityId: string): PricingPolicy {
    let policy = this.policies.find((p) => p.facilityId === facilityId);
    if (!policy) {
      policy = {
        id: 'pol-' + facilityId,
        facilityId,
        minDurationMinutes: 60,
        maxDurationMinutes: 4320,
        bookingIncrementMinutes: 30,
        transitionBufferMinutes: 15,
        cancellationPolicyTier: 'STANDARD_48H',
        securityDepositCents: 2000,
        overstayPenaltyPerHourCents: 1500,
        effectiveFromUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      this.policies.push(policy);
      this.saveToDisk();
    }
    return policy;
  }

  public updatePolicy(
    hostId: string,
    req: UpdatePricingPolicyRequest,
    actorId: string,
    correlationId?: string
  ): PricingPolicy {
    const facility = inventoryService.getLocationById(req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const policy = this.getPolicyForFacility(req.facilityId);
    const prev = { ...policy };

    if (req.minDurationMinutes !== undefined) {
      if (req.minDurationMinutes < 15) throw new AppError('Minimum duration must be at least 15 minutes.', 400, 'INVALID_POLICY');
      policy.minDurationMinutes = req.minDurationMinutes;
    }
    if (req.maxDurationMinutes !== undefined) {
      if (req.maxDurationMinutes < policy.minDurationMinutes) {
        throw new AppError('Maximum duration cannot be less than minimum duration.', 400, 'INVALID_POLICY');
      }
      policy.maxDurationMinutes = req.maxDurationMinutes;
    }
    if (req.bookingIncrementMinutes !== undefined) policy.bookingIncrementMinutes = req.bookingIncrementMinutes;
    if (req.transitionBufferMinutes !== undefined) policy.transitionBufferMinutes = req.transitionBufferMinutes;
    if (req.cancellationPolicyTier !== undefined) policy.cancellationPolicyTier = req.cancellationPolicyTier;
    if (req.securityDepositCents !== undefined) {
      if (req.securityDepositCents < 0) throw new AppError('Security deposit cannot be negative.', 400, 'INVALID_POLICY');
      policy.securityDepositCents = Math.round(req.securityDepositCents);
    }
    if (req.overstayPenaltyPerHourCents !== undefined) {
      if (req.overstayPenaltyPerHourCents < 0) throw new AppError('Overstay penalty cannot be negative.', 400, 'INVALID_POLICY');
      policy.overstayPenaltyPerHourCents = Math.round(req.overstayPenaltyPerHourCents);
    }

    policy.updatedAtUtc = new Date().toISOString();
    this.saveToDisk();

    this.recordAuditLog(
      hostId,
      req.facilityId,
      'POLICY_UPDATED',
      actorId,
      `Updated pricing and booking duration policy for "${facility.name}"`,
      prev,
      policy,
      undefined,
      correlationId
    );

    return policy;
  }

  // --------------------------------------------------------------------------
  // Facility Closures (pe_hw_03_04)
  // --------------------------------------------------------------------------

  public getClosuresForHost(hostId: string, facilityId?: string): FacilityClosure[] {
    return this.closures.filter((c) => {
      if (c.hostId !== hostId) return false;
      if (facilityId && c.facilityId !== facilityId) return false;
      return true;
    });
  }

  public createClosure(
    hostId: string,
    req: CreateFacilityClosureRequest,
    actorId: string,
    correlationId?: string
  ): FacilityClosure {
    const facility = inventoryService.getLocationById(req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const reqStart = new Date(req.startTimeUtc).getTime();
    const reqEnd = new Date(req.endTimeUtc).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
      throw new AppError('End time must be strictly after start time.', 400, 'INVALID_TIME_RANGE');
    }

    // MANDATORY INVARIANT: Check against confirmed reservations and active holds
    // A host closure must NEVER silently cancel, move, or overwrite confirmed bookings!
    const confirmedBookings = bookingService.getAllBookings().filter((b) => {
      if (b.status !== BookingStatus.CONFIRMED && b.status !== BookingStatus.ACTIVE) return false;
      if (b.locationId !== req.facilityId) return false;
      if (req.bayId && b.bayId !== req.bayId) return false;

      const bStart = new Date(b.startTimeUtc).getTime();
      const bEnd = new Date(b.endTimeUtc).getTime();
      return Math.max(reqStart, bStart) < Math.min(reqEnd, bEnd);
    });

    if (confirmedBookings.length > 0) {
      const conflictSummary = confirmedBookings
        .map((b) => `Reservation ${b.id} on Bay ${b.bayNumber} (${b.startTimeUtc} to ${b.endTimeUtc})`)
        .join('; ');
      throw new AppError(
        `Cannot schedule closure. Conflicting confirmed reservations exist in this time interval: ${conflictSummary}. Host cannot unilaterally close spaces during active customer bookings.`,
        409,
        'CLOSURE_OVERLAPS_CONFIRMED_BOOKINGS'
      );
    }

    // Also verify active unexpired holds
    const activeHolds = bookingService.getActiveHolds().filter((h) => {
      if (h.locationId !== req.facilityId) return false;
      if (req.bayId && h.bayId !== req.bayId) return false;
      const hStart = new Date(h.startTimeUtc).getTime();
      const hEnd = new Date(h.endTimeUtc).getTime();
      return Math.max(reqStart, hStart) < Math.min(reqEnd, hEnd);
    });

    if (activeHolds.length > 0) {
      throw new AppError(
        'Cannot schedule closure. One or more spaces are currently locked under an active customer checkout hold (10-minute hold lock). Please retry once the hold completes or expires.',
        409,
        'CLOSURE_OVERLAPS_ACTIVE_HOLD'
      );
    }

    const closure: FacilityClosure = {
      id: 'cls-' + crypto.randomUUID().substring(0, 8),
      hostId,
      facilityId: req.facilityId,
      bayId: req.bayId,
      title: req.title.trim(),
      reason: req.reason,
      startTimeUtc: req.startTimeUtc,
      endTimeUtc: req.endTimeUtc,
      createdAtUtc: new Date().toISOString(),
    };

    this.closures.unshift(closure);
    this.saveToDisk();

    this.recordAuditLog(
      hostId,
      req.facilityId,
      'CLOSURE_CREATED',
      actorId,
      `Created closure "${closure.title}" (${closure.startTimeUtc} to ${closure.endTimeUtc})`,
      undefined,
      closure,
      req.bayId,
      correlationId
    );

    return closure;
  }

  public removeClosure(
    hostId: string,
    closureId: string,
    actorId: string,
    correlationId?: string
  ): void {
    const idx = this.closures.findIndex((c) => c.id === closureId);
    if (idx < 0) {
      throw new NotFoundError(`Closure '${closureId}' not found.`);
    }
    const closure = this.closures[idx];
    if (closure.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this closure.');
    }

    this.closures.splice(idx, 1);
    this.saveToDisk();

    this.recordAuditLog(
      hostId,
      closure.facilityId,
      'CLOSURE_REMOVED',
      actorId,
      `Removed closure "${closure.title}"`,
      closure,
      undefined,
      closure.bayId,
      correlationId
    );
  }

  // --------------------------------------------------------------------------
  // Authoritative Price Estimate (pe_hw_03_06)
  // --------------------------------------------------------------------------

  public calculateAuthoritativeEstimate(req: PriceEstimateRequest): PriceEstimateResponse {
    const facility = inventoryService.getLocationById(req.facilityId) ||
      ((db as any)?.data?.facilities || []).find((f: any) => f.id === req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }

    let bayNumber: string | undefined;
    if (req.bayId) {
      const bay = inventoryService.getBayById(req.bayId) ||
        ((db as any)?.data?.bays || []).find((b: any) => b.id === req.bayId);
      if (!bay || (bay.locationId && bay.locationId !== req.facilityId && bay.facilityId !== req.facilityId)) {
        throw new NotFoundError(`Space '${req.bayId}' not found in facility '${req.facilityId}'.`);
      }
      bayNumber = bay.bayNumber || bay.identifier || req.bayId;
    }

    const start = new Date(req.startTimeUtc);
    const end = new Date(req.endTimeUtc);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      throw new AppError('Invalid estimate time bounds: end time must be strictly after start time.', 400, 'INVALID_BOUNDS');
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    const policy = this.getPolicyForFacility(req.facilityId);

    // Duration boundaries check
    if (durationMinutes < policy.minDurationMinutes) {
      throw new AppError(
        `Duration ${durationMinutes} mins is below facility minimum of ${policy.minDurationMinutes} mins.`,
        400,
        'DURATION_BELOW_MINIMUM'
      );
    }
    if (durationMinutes > policy.maxDurationMinutes) {
      throw new AppError(
        `Duration ${durationMinutes} mins exceeds facility maximum of ${policy.maxDurationMinutes} mins.`,
        400,
        'DURATION_EXCEEDS_MAXIMUM'
      );
    }

    // Determine applicable rate plan using strict 5-tier precedence:
    // Level 1: Bay + exact vehicle category
    // Level 2: Bay + ALL vehicle category
    // Level 3: Facility + exact vehicle category
    // Level 4: Facility + ALL vehicle category
    // Level 5: Facility default rate
    const activeRates = this.getRatePlansForHost(facility.hostId, req.facilityId).filter(
      (r) => r.isActive
    );
    const resolved = resolveApplicablePricingRule(
      activeRates,
      { hourlyRateCents: facility.hourlyRateCents, dailyRateCents: facility.dailyRateCents },
      { bayId: req.bayId, vehicleCategory: req.vehicleCategory, queryTime: start }
    );

    if (!resolved || (resolved.hourlyRateCents <= 0 && resolved.dailyRateCents <= 0)) {
      throw new AppError(
        'No applicable pricing rule found for the requested facility, bay, vehicle category, and duration.',
        400,
        'NO_APPLICABLE_PRICING_RULE'
      );
    }

    // Check duration bounds against the applicable rule's constraints
    if (resolved.minBookingMinutes && durationMinutes < resolved.minBookingMinutes) {
      throw new AppError(
        `Duration ${durationMinutes} mins is below applicable rate plan minimum of ${resolved.minBookingMinutes} mins.`,
        400,
        'DURATION_BELOW_MINIMUM'
      );
    }
    if (resolved.maxBookingMinutes && durationMinutes > resolved.maxBookingMinutes) {
      throw new AppError(
        `Duration ${durationMinutes} mins exceeds applicable rate plan maximum of ${resolved.maxBookingMinutes} mins.`,
        400,
        'DURATION_EXCEEDS_MAXIMUM'
      );
    }

    const hourlyRateCents = resolved.hourlyRateCents;
    const dailyRateCents = resolved.dailyRateCents;
    const applicablePricingRuleId = resolved.ruleId;
    const precedenceTier = resolved.precedenceTier;
    const securityDepositCents = policy.securityDepositCents;

    // Authoritative Hybrid rate calculation
    let baseAmountCents = 0;
    let rateTierApplied: 'HOURLY' | 'DAILY' | 'HYBRID' = 'HOURLY';
    const billableHours = Math.ceil(durationMinutes / 60);
    const billableDays = Math.ceil(durationMinutes / 1440);

    const breakdown: PriceEstimateResponse['breakdown'] = [];

    if (durationMinutes < 1440) {
      // Less than 24 hours
      const hourlyTotal = billableHours * hourlyRateCents;
      if (dailyRateCents > 0 && hourlyTotal > dailyRateCents) {
        // Capped at daily rate
        baseAmountCents = dailyRateCents;
        rateTierApplied = 'DAILY';
        breakdown.push({
          description: `Daily Capped Parking Rate (${billableHours} hrs)`,
          amountCents: baseAmountCents,
          unitRateCents: dailyRateCents,
          quantity: 1,
          unitLabel: 'Day',
        });
      } else {
        baseAmountCents = hourlyTotal;
        rateTierApplied = 'HOURLY';
        breakdown.push({
          description: `Hourly Parking Rate (${billableHours} hrs @ $${(hourlyRateCents / 100).toFixed(2)}/hr)`,
          amountCents: baseAmountCents,
          unitRateCents: hourlyRateCents,
          quantity: billableHours,
          unitLabel: 'Hour',
        });
      }
    } else {
      // 24 hours or longer: Hybrid calculation
      rateTierApplied = 'HYBRID';
      const fullDays = Math.floor(durationMinutes / 1440);
      const remainingMinutes = durationMinutes % 1440;
      const remainingHours = Math.ceil(remainingMinutes / 60);
      const remainingCost = Math.min(remainingHours * hourlyRateCents, dailyRateCents);

      const daysCost = fullDays * dailyRateCents;
      baseAmountCents = daysCost + remainingCost;

      breakdown.push({
        description: `Daily Rate Tier (${fullDays} full day${fullDays > 1 ? 's' : ''} @ $${(dailyRateCents / 100).toFixed(2)}/day)`,
        amountCents: daysCost,
        unitRateCents: dailyRateCents,
        quantity: fullDays,
        unitLabel: 'Days',
      });

      if (remainingHours > 0) {
        breakdown.push({
          description: `Remainder Duration (${remainingHours} hr${remainingHours > 1 ? 's' : ''})`,
          amountCents: remainingCost,
          unitRateCents: hourlyRateCents,
          quantity: remainingHours,
          unitLabel: 'Hours',
        });
      }
    }

    // Platform Commission (15%) & Taxes (10%)
    const platformFeeCents = Math.round(baseAmountCents * 0.15);
    const taxesCents = Math.round(baseAmountCents * 0.10);
    const totalPayableCents = baseAmountCents + securityDepositCents + platformFeeCents + taxesCents;

    breakdown.push({
      description: 'Refundable Security Deposit (Escrowed)',
      amountCents: securityDepositCents,
    });
    breakdown.push({
      description: 'Marketplace Platform Service Fee (15%)',
      amountCents: platformFeeCents,
    });
    breakdown.push({
      description: 'Estimated State & Municipal Parking Tax (10%)',
      amountCents: taxesCents,
    });

    const res: PriceEstimateResponse & { applicablePricingRuleId: string; precedenceTier: string } = {
      quoteId: 'est-' + crypto.randomUUID().substring(0, 8),
      facilityId: req.facilityId,
      facilityName: facility.name,
      bayId: req.bayId,
      bayNumber,
      startTimeUtc: req.startTimeUtc,
      endTimeUtc: req.endTimeUtc,
      durationMinutes,
      billableHours,
      billableDays,
      appliedHourlyRateCents: hourlyRateCents,
      appliedDailyRateCents: dailyRateCents,
      rateTierApplied,
      baseAmountCents,
      securityDepositCents,
      platformFeeCents,
      taxesCents,
      totalPayableCents,
      currency: 'USD',
      cancellationPolicyTier: policy.cancellationPolicyTier,
      breakdown,
      quotedAtUtc: new Date().toISOString(),
      applicablePricingRuleId,
      precedenceTier,
    };

    return res;
  }

  /**
   * Scope C: Combined Server-side Price Quote & Authoritative Real Availability Response
   */
  public calculateQuoteAndAvailability(req: PriceEstimateRequest): QuoteAndAvailabilityResponse {
    const estimate = this.calculateAuthoritativeEstimate(req);
    const avail = availabilityService.calculateSpaceAvailability(
      req.facilityId,
      req.startTimeUtc,
      req.endTimeUtc,
      req.bayId,
      req.vehicleCategory
    );

    const isAvailable = req.bayId
      ? avail.spaces.some((s: any) => s.spaceId === req.bayId && s.isAvailable)
      : avail.availableSpacesCount > 0;

    return {
      ...estimate,
      isAvailable,
      availableCapacity: avail.availableSpacesCount,
      totalCapacity: avail.totalSpaces,
      eligibleBayIds: avail.eligibleBayIds || [],
      eligibleBays: avail.spaces,
      applicablePricingRuleId: (estimate as any).applicablePricingRuleId || 'facility_default',
      unavailabilityReason: !isAvailable
        ? (avail.unavailabilityReason || 'No eligible spaces currently available for this timeframe')
        : null,
      isInformationalQuote: true,
      vehicleCategory: req.vehicleCategory,
      precedenceTier: (estimate as any).precedenceTier,
    };
  }

  // --------------------------------------------------------------------------
  // Bulk Pricing Updates (pe_hw_03_07)
  // --------------------------------------------------------------------------

  public previewBulkUpdate(
    hostId: string,
    req: BulkPriceUpdateRequest
  ): BulkPriceUpdatePreviewResponse {
    const hostFacilities = inventoryService.getLocationsForHost(hostId);
    let targetFacilities = hostFacilities;

    if (req.targetType === 'SELECTED_FACILITIES' && Array.isArray(req.facilityIds)) {
      targetFacilities = hostFacilities.filter((f) => req.facilityIds!.includes(f.id));
    }

    const targets: BulkPriceUpdateTargetPreview[] = [];

    for (const fac of targetFacilities) {
      const activeRate = this.ratePlans.find((r) => r.facilityId === fac.id && !r.bayId && r.isActive);
      const currHourly = activeRate ? activeRate.hourlyRateCents : fac.hourlyRateCents;
      const currDaily = activeRate ? activeRate.dailyRateCents : fac.dailyRateCents;

      let propHourly = currHourly;
      let propDaily = currDaily;

      if (req.rateAdjustment.type === 'EXACT') {
        if (req.rateAdjustment.hourlyRateCents !== undefined) propHourly = req.rateAdjustment.hourlyRateCents;
        if (req.rateAdjustment.dailyRateCents !== undefined) propDaily = req.rateAdjustment.dailyRateCents;
      } else if (req.rateAdjustment.type === 'PERCENTAGE' && req.rateAdjustment.percentageChange !== undefined) {
        const factor = 1 + req.rateAdjustment.percentageChange / 100;
        propHourly = Math.round(currHourly * factor);
        propDaily = Math.round(currDaily * factor);
      } else if (req.rateAdjustment.type === 'FIXED_OFFSET') {
        if (req.rateAdjustment.hourlyChangeCents !== undefined) propHourly = currHourly + req.rateAdjustment.hourlyChangeCents;
        if (req.rateAdjustment.dailyChangeCents !== undefined) propDaily = currDaily + req.rateAdjustment.dailyChangeCents;
      }

      let hasConflict = false;
      let conflictReason: string | undefined;

      if (propHourly < 0 || propDaily < 0) {
        hasConflict = true;
        conflictReason = 'Calculated rate cannot be negative.';
      }

      targets.push({
        facilityId: fac.id,
        facilityName: fac.name,
        currentHourlyRateCents: currHourly,
        currentDailyRateCents: currDaily,
        proposedHourlyRateCents: Math.max(0, propHourly),
        proposedDailyRateCents: Math.max(0, propDaily),
        hasConflict,
        conflictReason,
      });
    }

    const conflictingCount = targets.filter((t) => t.hasConflict).length;
    const eligibleCount = targets.length - conflictingCount;

    return {
      totalTargetsCount: targets.length,
      eligibleTargetsCount: eligibleCount,
      conflictingTargetsCount: conflictingCount,
      targets,
      summaryMessage: `Prepared bulk update for ${targets.length} facilities. ${eligibleCount} eligible, ${conflictingCount} conflicts.`,
    };
  }

  public applyBulkUpdate(
    hostId: string,
    req: BulkPriceUpdateRequest,
    actorId: string,
    correlationId?: string
  ): { appliedCount: number; message: string } {
    const preview = this.previewBulkUpdate(hostId, req);
    if (preview.conflictingTargetsCount > 0) {
      throw new AppError(
        `Cannot apply bulk update: ${preview.conflictingTargetsCount} target facilities have validation conflicts.`,
        400,
        'BULK_UPDATE_CONFLICTS'
      );
    }

    let appliedCount = 0;
    const effectiveFrom = req.effectiveFromUtc || new Date().toISOString();

    for (const target of preview.targets) {
      // Deactivate older base rates for this facility
      for (const r of this.ratePlans) {
        if (r.facilityId === target.facilityId && !r.bayId && r.isActive) {
          r.isActive = false;
          r.updatedAtUtc = new Date().toISOString();
        }
      }

      // Create new active rate plan
      const newPlan: RatePlan = {
        id: 'rp-' + crypto.randomUUID().substring(0, 8),
        hostId,
        facilityId: target.facilityId,
        name: `Bulk Rate Update (${new Date().toLocaleDateString()})`,
        hourlyRateCents: target.proposedHourlyRateCents,
        dailyRateCents: target.proposedDailyRateCents,
        minBillableMinutes: 60,
        minBookingMinutes: 60,
        maxBookingMinutes: 4320,
        stepMinutes: 30,
        vehicleCategory: 'ALL',
        effectiveFromUtc: effectiveFrom,
        isActive: true,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      this.ratePlans.unshift(newPlan);

      // Also sync location base rates
      inventoryService.updateLocation(target.facilityId, hostId, {
        hourlyRateCents: target.proposedHourlyRateCents,
        dailyRateCents: target.proposedDailyRateCents,
      });

      this.recordAuditLog(
        hostId,
        target.facilityId,
        'BULK_UPDATE_APPLIED',
        actorId,
        `Bulk rate update applied: $${(target.proposedHourlyRateCents / 100).toFixed(2)}/hr, $${(target.proposedDailyRateCents / 100).toFixed(2)}/day`,
        { hourly: target.currentHourlyRateCents, daily: target.currentDailyRateCents },
        { hourly: target.proposedHourlyRateCents, daily: target.proposedDailyRateCents },
        undefined,
        correlationId
      );

      appliedCount++;
    }

    this.saveToDisk();

    return {
      appliedCount,
      message: `Successfully applied bulk pricing update to ${appliedCount} facilities.`,
    };
  }

  // --------------------------------------------------------------------------
  // Conflicts & Audit History (pe_hw_03_08 & pe_hw_03_09)
  // --------------------------------------------------------------------------

  public getPricingConflicts(hostId: string): PricingConflict[] {
    const conflicts: PricingConflict[] = [];
    const hostFacilities = inventoryService.getLocationsForHost(hostId);
    const closures = this.closures.filter((c) => c.hostId === hostId);
    const confirmedBookings = bookingService.getAllBookings().filter(
      (b) => b.hostId === hostId && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)
    );

    // Overlap between closures and bookings
    for (const closure of closures) {
      const cStart = new Date(closure.startTimeUtc).getTime();
      const cEnd = new Date(closure.endTimeUtc).getTime();

      for (const booking of confirmedBookings) {
        if (booking.locationId !== closure.facilityId) continue;
        if (closure.bayId && booking.bayId !== closure.bayId) continue;

        const bStart = new Date(booking.startTimeUtc).getTime();
        const bEnd = new Date(booking.endTimeUtc).getTime();

        if (Math.max(cStart, bStart) < Math.min(cEnd, bEnd)) {
          const facility = hostFacilities.find((f) => f.id === closure.facilityId);
          conflicts.push({
            id: 'cnf-' + crypto.randomUUID().substring(0, 8),
            facilityId: closure.facilityId,
            facilityName: facility?.name || 'Facility',
            spaceId: closure.bayId,
            spaceNumber: booking.bayNumber,
            type: 'CONFIRMED_BOOKING_OVERLAP',
            severity: 'CRITICAL',
            message: `Closure "${closure.title}" overlaps confirmed reservation ${booking.id} (${booking.startTimeUtc} to ${booking.endTimeUtc}).`,
            startTimeUtc: new Date(Math.max(cStart, bStart)).toISOString(),
            endTimeUtc: new Date(Math.min(cEnd, bEnd)).toISOString(),
            bookingReference: booking.id,
            suggestedAction: 'Reschedule or cancel closure period to protect confirmed driver reservation.',
          });
        }
      }
    }

    return conflicts;
  }

  public getPricingHistory(hostId: string): PricingAuditRecord[] {
    return this.auditLogs.filter((a) => a.hostId === hostId);
  }
}

export const pricingService = PricingService.getInstance();
