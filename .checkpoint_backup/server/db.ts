import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  FacilityStatus
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
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_parkeazy_salt').digest('hex');
}

export class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadOrSeed();
    this.cleanExpiredHolds();
    // Run hold expiry checker periodically every 30 seconds
    setInterval(() => this.cleanExpiredHolds(), 30000);
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
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, reseeding...', err);
      }
    }

    const seeded = this.generateSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }

  private persist() {
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
    const existing = this.findUserByEmail(userData.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: 'usr_' + crypto.randomUUID().slice(0, 8),
      email: userData.email.toLowerCase(),
      passwordHash: hashPassword(userData.password),
      fullName: userData.fullName,
      phone: userData.phone || '+1 (555) 000-0000',
      role: userData.role,
      status: userData.role === 'host' ? 'active' : 'active',
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
      businessDetails: userData.businessDetails || (userData.role === 'host' ? {
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

  public verifyPassword(user: User, password: string): boolean {
    return user.passwordHash === hashPassword(password);
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

  public requestPayout(
    hostId: string,
    amount: number,
    method: 'stripe_instant' | 'ach_bank_transfer',
    destinationAccount: string,
    actor: User
  ): PayoutRequest {
    const available = this.getHostAvailableBalance(hostId);
    if (amount <= 0) throw new Error('Payout amount must be greater than 0');
    if (amount > available) {
      throw new Error(`Insufficient available balance ($${available.toFixed(2)}) for payout of $${amount.toFixed(2)}.`);
    }

    const now = new Date().toISOString();
    const refNum = 'PO-' + Math.floor(10000000 + Math.random() * 90000000);
    const payout: PayoutRequest = {
      id: 'po_' + crypto.randomUUID().slice(0, 8),
      hostId,
      amount,
      method,
      destinationAccount,
      status: method === 'stripe_instant' ? 'paid' : 'processing',
      referenceNumber: refNum,
      requestedAt: now,
      completedAt: method === 'stripe_instant' ? now : undefined,
      notes: method === 'stripe_instant' ? 'Transferred via Stripe Instant Payouts' : 'ACH Standard Transfer initiated'
    };

    this.data.payouts.push(payout);

    // Record ledger debit
    this.recordLedgerEntry({
      idempotencyKey: 'payout_tx_' + payout.id,
      hostId,
      type: 'host_payout',
      amount: -amount,
      currency: 'USD',
      description: `Payout to ${destinationAccount} (${refNum})`,
      status: 'completed'
    });

    this.logAudit(actor.id, actor.fullName, actor.role, 'PAYOUT_REQUESTED', 'payout', payout.id, `Requested payout $${amount.toFixed(2)} via ${method}`);
    this.persist();
    return payout;
  }

  public getPayouts(hostId?: string): PayoutRequest[] {
    let list = this.data.payouts;
    if (hostId) {
      list = list.filter(p => p.hostId === hostId);
    }
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  // ----------------- THIRD PARTY PROVIDERS -----------------
  public getProviders(): ThirdPartyProviderConfig[] {
    return this.data.providers;
  }

  public updateProvider(id: string, updates: Partial<ThirdPartyProviderConfig>, admin: User): ThirdPartyProviderConfig {
    const p = this.data.providers.find(prov => prov.id === id);
    if (!p) throw new Error('Provider not found');

    if (updates.isEnabled !== undefined) p.isEnabled = updates.isEnabled;
    if (updates.settings) {
      p.settings = { ...p.settings, ...updates.settings };
    }

    this.logAudit(admin.id, admin.fullName, 'admin', 'PROVIDER_CONFIG_UPDATED', 'provider', id, `Updated configuration for ${p.name}`);
    this.persist();
    return p;
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
