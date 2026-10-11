import { VehicleType } from './parking';
import { GeoCoordinates } from './common';

export interface SearchFilters {
  hasEvCharger?: boolean;
  isCovered?: boolean;
  hasSecurityGuard?: boolean;
  hasCctv?: boolean;
  hasAnprBarrier?: boolean;
  isDisabledAccessible?: boolean;
  carBodyProfile?: 'hatchback' | 'sedan' | 'compact_suv' | 'full_suv';
  clearance?: 'standard' | 'high';
  minHourlyRate?: number;
  maxHourlyRate?: number;
}

export type SearchSortOption = 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc';

export interface SearchQueryPayload {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  vehicleCategory?: VehicleType;
  arrivalTime?: string;
  durationHours?: number;
  filters?: SearchFilters;
  sortBy?: SearchSortOption;
}

export type UrgencyBadge = 'SPOTS LEFT' | 'AVAILABLE NOW' | 'FAST FILLING' | 'SOLD OUT';

export interface SearchResultFacility {
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  addressLine1: string;
  locality: string;
  city: string;
  postalCode: string;
  distanceMeters: number;
  walkingMinutes: number;
  coordinates: GeoCoordinates;
  hourlyRateInr: number;
  totalEstimatedInr: number;
  availableSpacesCount: number;
  totalSpacesCount: number;
  isCovered: boolean;
  is24x7: boolean;
  rating: number;
  reviewCount: number;
  supportedVehicles: VehicleType[];
  amenities: string[];
  photos: string[];
  operatingModel?: string;
  urgencyBadge?: UrgencyBadge;
  urgencyBadgeText?: string;
  isInstantBooking?: boolean;
}

export interface SearchResponse {
  results: SearchResultFacility[];
  totalMatches: number;
  appliedRadiusKm: number;
  centerCoordinates: GeoCoordinates;
  searchQuery?: string;
  selectedVehicle: VehicleType;
  durationHours: number;
}

export interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  type: 'metro_station' | 'commercial_hub' | 'landmark' | 'recent' | 'current_location';
  coordinates: GeoCoordinates;
  verifiedSpacesAvailable: number;
  tags: string[];
  distanceKm?: number;
}

export interface ExploreCatalogHub {
  id: string;
  name: string;
  category: 'transit' | 'commercial' | 'mall' | 'ev_hub';
  badge: string;
  location: string;
  coordinates: GeoCoordinates;
  startingPriceInr: number;
  availableBays: number;
  rating: number;
  photoUrl: string;
}

export interface FallbackSuggestionsResponse {
  searchQuery?: string;
  message: string;
  suggestedRadiusKm: number;
  alternativeHubs: Array<{
    id: string;
    name: string;
    distanceMeters: number;
    availableSpaces: number;
    startingPriceInr: number;
    coordinates: GeoCoordinates;
  }>;
}
