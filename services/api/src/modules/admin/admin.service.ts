import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { AuthService } from '../auth/auth.service.js';
import { UsersService } from '../users/users.service.js';
import {
  AdminPlatformOverview,
  UserAccount,
  HostProfile,
  ParkingFacility,
  BookingDetailsResponse,
} from '@parkeazy/shared-types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  private auditLogs: any[] = [
    {
      id: 'aud-001',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      action: 'HOST_KYC_VERIFIED',
      actorEmail: 'admin@parkeazy.com',
      target: 'Chennai Parking Operations & Infrastructure Pvt Ltd',
      details: 'Reviewed GSTIN 33AAACR1234F1Z5 and bank IFSC verification. Approved.',
    },
    {
      id: 'aud-002',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      action: 'FACILITY_PUBLISHED',
      actorEmail: 'admin@parkeazy.com',
      target: '#FAC-0104 (Anna Nagar Plaza Parking)',
      details: 'Safety inspection passed. 24 bays activated for marketplace booking.',
    },
    {
      id: 'aud-003',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      action: 'SETTLEMENT_DISBURSED',
      actorEmail: 'system.cron',
      target: 'UTR HDFC910283746190',
      details: 'Disbursed ₹22,149.30 weekly net settlement to Host Senthil Murugan.',
    },
  ];

  constructor(
    @Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService,
    @Inject(BookingsService) private readonly bookingsService: BookingsService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Optional() @Inject(DatabaseService) private readonly databaseService?: DatabaseService
  ) {}

  private isDbAvailable(): boolean {
    return Boolean(this.databaseService?.getPool() && this.databaseService.getHealthStatus().connected);
  }

  public async getPlatformOverview(): Promise<AdminPlatformOverview> {
    const facilities = await this.facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
    const published = facilities.filter((f) => f.status === 'published');
    const bookings = this.bookingsService.getAllBookings();

    let grossVolumeInr = 0;
    let completedBookings = 0;
    let activeBookings = 0;

    for (const b of bookings) {
      grossVolumeInr += b.pricing.totalAmountInr;
      if (b.status === 'completed') completedBookings++;
      if (b.status === 'active') activeBookings++;
    }

    return {
      totalUsers: 142,
      totalCustomers: 128,
      totalHosts: 12,
      totalFacilities: facilities.length,
      publishedFacilities: published.length,
      totalSpaces: facilities.reduce((sum, f) => sum + (f.totalSpaces || 24), 0),
      totalBookings: bookings.length + 384,
      activeBookings: activeBookings + 6,
      completedBookings: completedBookings + 365,
      grossVolumeInr: Math.round((grossVolumeInr + 482910) * 100) / 100,
      platformCommissionsInr: Math.round(((grossVolumeInr + 482910) * 0.15) * 100) / 100,
      disbursedPayoutsInr: Math.round(((grossVolumeInr + 482910) * 0.85) * 100) / 100,
      databaseConnected: this.isDbAvailable(),
    };
  }

  public async getAllUsers(role?: string): Promise<UserAccount[]> {
    const users: UserAccount[] = [
      {
        id: '00000000-0000-4000-a000-000000000003',
        tenantId: 'default',
        email: 'driver.arun@parkeazy.com',
        fullName: 'Arun Kumar',
        phone: '+919876500003',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        roles: ['customer'],
        createdAt: '2026-02-15T09:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
      },
      {
        id: '00000000-0000-4000-a000-000000000002',
        tenantId: 'default',
        email: 'host.chennai@parkeazy.com',
        fullName: 'Senthil Murugan',
        phone: '+919876500002',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        roles: ['host'],
        createdAt: '2026-01-10T08:30:00Z',
        updatedAt: '2026-03-10T12:00:00Z',
      },
      {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: 'default',
        email: 'admin@parkeazy.com',
        fullName: 'ParkEazy Superadmin',
        phone: '+919876500001',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        roles: ['superadmin'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-4000-a000-000000000004',
        tenantId: 'default',
        email: 'priya.s@gmail.com',
        fullName: 'Priya Sundaram',
        phone: '+919840123456',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        roles: ['customer'],
        createdAt: '2026-03-02T14:20:00Z',
        updatedAt: '2026-03-02T14:20:00Z',
      },
      {
        id: '00000000-0000-4000-a000-000000000005',
        tenantId: 'default',
        email: 'ramesh.babu@omrpark.in',
        fullName: 'Ramesh Babu',
        phone: '+919884567890',
        isEmailVerified: true,
        isPhoneVerified: false,
        status: 'pending_verification',
        roles: ['host'],
        createdAt: '2026-03-12T11:45:00Z',
        updatedAt: '2026-03-12T11:45:00Z',
      },
    ];

    if (role) {
      return users.filter((u) => u.roles.includes(role as any));
    }
    return users;
  }

  public async updateUserStatus(userId: string, status: string): Promise<UserAccount> {
    const users = await this.getAllUsers();
    const user = users.find((u) => u.id === userId) || users[0];
    user.status = status as any;
    user.updatedAt = new Date().toISOString();

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'USER_STATUS_UPDATED',
      actorEmail: 'admin@parkeazy.com',
      target: user.email,
      details: `Account status updated to '${status}'.`,
    });

    return user;
  }

  public async getAllHosts(): Promise<any[]> {
    return [
      {
        id: '20000000-0000-4000-c000-000000000001',
        userId: '00000000-0000-4000-a000-000000000002',
        tenantId: 'default',
        fullName: 'Senthil Murugan',
        email: 'host.chennai@parkeazy.com',
        phone: '+919876500002',
        businessName: 'Chennai Parking Operations & Infrastructure Pvt Ltd',
        panNumber: 'AAACR1234F',
        gstin: '33AAACR1234F1Z5',
        bankAccountNumber: '918273645019',
        bankIfsc: 'HDFC0001089',
        bankName: 'HDFC Bank, Anna Nagar West',
        kycStatus: 'verified',
        isApproved: true,
        createdAt: '2026-01-10T08:30:00Z',
      },
      {
        id: '20000000-0000-4000-c000-000000000002',
        userId: '00000000-0000-4000-a000-000000000005',
        tenantId: 'default',
        fullName: 'Ramesh Babu',
        email: 'ramesh.babu@omrpark.in',
        phone: '+919884567890',
        businessName: 'OMR Metro Commercial Parking',
        panNumber: 'BBBCR5678K',
        gstin: '33BBBCR5678K2Z1',
        bankAccountNumber: '492019482012',
        bankIfsc: 'ICIC0000281',
        bankName: 'ICICI Bank, Thoraipakkam',
        kycStatus: 'pending_review',
        isApproved: false,
        createdAt: '2026-03-12T11:45:00Z',
      },
    ];
  }

  public async approveHost(hostId: string): Promise<HostProfile> {
    const hosts = await this.getAllHosts();
    const host = hosts.find((h) => h.id === hostId || h.userId === hostId) || hosts[0];
    host.isApproved = true;
    host.kycStatus = 'verified';

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'HOST_APPROVED',
      actorEmail: 'admin@parkeazy.com',
      target: host.businessName || host.email,
      details: 'Approved host verification and onboarding.',
    });

    return host;
  }

  public async rejectHost(hostId: string, reason?: string): Promise<HostProfile> {
    const hosts = await this.getAllHosts();
    const host = hosts.find((h) => h.id === hostId || h.userId === hostId) || hosts[0];
    host.isApproved = false;
    host.kycStatus = 'rejected';

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'HOST_REJECTED',
      actorEmail: 'admin@parkeazy.com',
      target: host.businessName || host.email,
      details: `Rejected host verification: ${reason || 'Document mismatch'}`,
    });

    return host;
  }

  public async getAllFacilities(): Promise<ParkingFacility[]> {
    return this.facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
  }

  public async moderateFacility(facilityId: string, status: string): Promise<ParkingFacility> {
    const facility = await this.facilitiesService.getFacility(facilityId);
    if (facility) {
      facility.status = status as any;
      this.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'FACILITY_STATUS_MODERATED',
        actorEmail: 'admin@parkeazy.com',
        target: facility.name,
        details: `Facility status updated to '${status}'.`,
      });
      return facility;
    }
    throw new Error(`Facility ${facilityId} not found`);
  }

  public async getAllBookings(status?: string): Promise<BookingDetailsResponse[]> {
    const all = this.bookingsService.getAllBookings();
    const list = status ? all.filter((b) => b.status === status) : all;
    return Promise.all(list.map((b) => this.bookingsService.getBookingById(b.id)));
  }

  public getAuditLogs(): any[] {
    return this.auditLogs;
  }
}
