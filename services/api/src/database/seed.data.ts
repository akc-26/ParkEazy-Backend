/**
 * @fileoverview Realistic seed data for ParkEazy initial database setup.
 * Includes default tenant branding, test accounts, and 3 production-grade Chennai facilities.
 */

export interface SeedSpace {
  bay: string;
  floor: string;
  category: string;
  rate: number;
  hasEv: boolean;
  evKw?: number;
  accessible: boolean;
}

export const SEED_TENANT = {
  id: 'default',
  displayName: 'ParkEazy',
  legal_name: 'ParkEazy Technologies Pvt. Ltd.',
  tagline: 'Smart Parking Marketplace',
  primary_domain: 'localhost',
  theme_tokens: {
    colors: {
      primary: '#0F766E',
      secondary: '#14B8A6',
      accent: '#D6A84F',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Plus Jakarta Sans',
    },
    radii: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
  },
  assets: {
    logoUrl: '/branding/logos/parkeazy-logo.svg',
    iconUrl: '/branding/logos/parkeazy-icon.svg',
    faviconUrl: '/favicon.ico',
  },
  status: 'active',
};

export const SEED_USERS = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'admin@parkeazy.com',
    fullName: 'ParkEazy Platform Admin',
    phone: '+919876500001',
    role: 'superadmin',
    isEmailVerified: true,
    isPhoneVerified: true,
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'host.chennai@parkeazy.com',
    fullName: 'Senthil Murugan (Chennai Parking Operations)',
    phone: '+919876500002',
    role: 'host',
    isEmailVerified: true,
    isPhoneVerified: true,
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    email: 'driver.arun@parkeazy.com',
    fullName: 'Arun Kumar',
    phone: '+919876500003',
    role: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true,
  },
];

export const SEED_FACILITIES = [
  {
    id: '10000000-0000-4000-b000-000000000104',
    facilityCode: '#FAC-0104',
    name: 'Anna Nagar Plaza Parking',
    addressLine1: '2nd Avenue, Near Roundtana',
    addressLine2: 'Anna Nagar East',
    city: 'Chennai',
    postalCode: '600102',
    latitude: 13.085038,
    longitude: 80.210137,
    entranceInstructions: 'Enter through Gate 2 from 2nd Avenue. Scan QR code at the boom barrier.',
    gatePinCode: '4821',
    isCovered: true,
    is24x7: false,
    status: 'published',
    amenities: ['CCTV Surveillance', 'EV Fast Charging', 'Covered Parking', 'Security Guard', 'Boom Barrier'],
    operatingHours: { open: '06:00:00', close: '23:00:00' },
    spaces: [
      // 14 Cars (4 with EV)
      ...Array.from({ length: 14 }, (_, i) => ({
        bay: `A-${String(i + 1).padStart(2, '0')}`,
        floor: 'Ground',
        category: 'car',
        rate: 40.0,
        hasEv: i < 4,
        evKw: i < 4 ? 22.0 : undefined,
        accessible: i === 0,
      })),
      // 8 Bikes
      ...Array.from({ length: 8 }, (_, i) => ({
        bay: `B-${String(i + 1).padStart(2, '0')}`,
        floor: 'Ground',
        category: 'bike',
        rate: 15.0,
        hasEv: false,
        accessible: false,
      })),
      // 2 SUVs
      ...Array.from({ length: 2 }, (_, i) => ({
        bay: `S-${String(i + 1).padStart(2, '0')}`,
        floor: 'Ground',
        category: 'suv',
        rate: 60.0,
        hasEv: false,
        accessible: false,
      })),
    ],
  },
  {
    id: '10000000-0000-4000-b000-000000000208',
    facilityCode: '#FAC-0208',
    name: 'T. Nagar Commercial Multi-Level Parking',
    addressLine1: 'Pondy Bazaar Main Road',
    addressLine2: 'Opposite Naidu Hall, T. Nagar',
    city: 'Chennai',
    postalCode: '600017',
    latitude: 13.04052,
    longitude: 80.233688,
    entranceInstructions: 'Ramp access via South Usman Road flyover side. Attendant stationed at Level 1.',
    gatePinCode: '1089',
    isCovered: true,
    is24x7: true,
    status: 'published',
    amenities: ['Automated Valet', '24/7 Security', 'Elevator', 'Restroom', 'CCTV', 'EV Ultra-Fast Hub'],
    operatingHours: { open: '00:00:00', close: '23:59:59' },
    spaces: [
      // 24 Cars
      ...Array.from({ length: 24 }, (_, i) => ({
        bay: `L1-${String(i + 1).padStart(2, '0')}`,
        floor: 'Level 1',
        category: 'car',
        rate: 50.0,
        hasEv: i < 6,
        evKw: i < 6 ? 50.0 : undefined,
        accessible: i < 2,
      })),
      // 10 Bikes
      ...Array.from({ length: 10 }, (_, i) => ({
        bay: `BK-${String(i + 1).padStart(2, '0')}`,
        floor: 'Ground',
        category: 'bike',
        rate: 20.0,
        hasEv: false,
        accessible: false,
      })),
      // 2 Autos
      ...Array.from({ length: 2 }, (_, i) => ({
        bay: `AU-${String(i + 1).padStart(2, '0')}`,
        floor: 'Ground',
        category: 'auto',
        rate: 25.0,
        hasEv: false,
        accessible: false,
      })),
    ],
  },
  {
    id: '10000000-0000-4000-b000-000000000315',
    facilityCode: '#FAC-0315',
    name: 'OMR IT Corridor Parking Hub',
    addressLine1: 'Rajiv Gandhi Salai, Thoraipakkam',
    addressLine2: 'Near Cognizant & ASV Suntech Park',
    city: 'Chennai',
    postalCode: '600097',
    latitude: 12.939226,
    longitude: 80.234857,
    entranceInstructions: 'Service lane entry past Okkiyam Thoraipakkam signal. Dedicated FASTag & QR lane.',
    gatePinCode: '9315',
    isCovered: false,
    is24x7: true,
    status: 'published',
    amenities: ['24/7 Access', 'Wide Bay Layout', 'EV Charging', 'High Clearance for SUVs', 'Security Staff'],
    operatingHours: { open: '00:00:00', close: '23:59:59' },
    spaces: [
      // 36 Cars
      ...Array.from({ length: 36 }, (_, i) => ({
        bay: `IT-${String(i + 1).padStart(2, '0')}`,
        floor: 'Open Lot',
        category: 'car',
        rate: 35.0,
        hasEv: i < 8,
        evKw: i < 8 ? 22.0 : undefined,
        accessible: i < 2,
      })),
      // 8 SUVs
      ...Array.from({ length: 8 }, (_, i) => ({
        bay: `SUV-${String(i + 1).padStart(2, '0')}`,
        floor: 'Open Lot',
        category: 'suv',
        rate: 50.0,
        hasEv: false,
        accessible: false,
      })),
      // 4 Bikes
      ...Array.from({ length: 4 }, (_, i) => ({
        bay: `MB-${String(i + 1).padStart(2, '0')}`,
        floor: 'Open Lot',
        category: 'bike',
        rate: 15.0,
        hasEv: false,
        accessible: false,
      })),
    ],
  },
];
