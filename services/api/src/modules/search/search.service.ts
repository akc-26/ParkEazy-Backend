import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FacilitiesService } from '../facilities/facilities.service.js';
import {
  SearchQueryPayload,
  SearchResponse,
  SearchResultFacility,
  LocationSuggestion,
  ExploreCatalogHub,
  FallbackSuggestionsResponse,
  VehicleType,
} from '@parkeazy/shared-types';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(@Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService) {}

  /**
   * Calculate Haversine distance in meters between two coordinates.
   */
  public calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Calculate walking duration in minutes at standard 80m/minute walking speed.
   */
  public calculateWalkingMinutes(distanceMeters: number): number {
    return Math.max(1, Math.round(distanceMeters / 80));
  }

  /**
   * Resolve epicenter coordinates from query or payload.
   */
  private resolveEpicenter(payload: SearchQueryPayload, facilities: import('@parkeazy/shared-types').ParkingFacility[]): {
    latitude: number;
    longitude: number;
  } {
    if (payload.latitude !== undefined && payload.longitude !== undefined) {
      return { latitude: payload.latitude, longitude: payload.longitude };
    }
    const q = (payload.query || '').trim().toLocaleLowerCase();
    const matched = q ? facilities.find((f) =>
      [f.name, f.addressLine1, f.addressLine2, f.city, f.postalCode].some((v) => v?.toLocaleLowerCase().includes(q))
    ) : undefined;
    const first = matched || facilities[0];
    if (!first) {
      throw new ServiceUnavailableException('No published inventory is available for location search.');
    }
    return { latitude: first.latitude, longitude: first.longitude };
  }

  /**
   * Execute high-performance Geo-Spatial Search Query (POST /api/v1/search/query).
   */
  public async querySearch(payload: SearchQueryPayload, tenantId = 'default'): Promise<SearchResponse> {
    const inventory = await this.facilitiesService.getSearchInventory(tenantId, payload.arrivalTime, payload.durationHours || 2);
    const center = this.resolveEpicenter(payload, inventory.facilities.filter((f) => f.status === 'published'));
    const radiusKm = payload.radiusKm || 3.0;
    const radiusMeters = radiusKm * 1000;
    const targetVehicle: VehicleType = payload.vehicleCategory || 'car';
    const durationHours = payload.durationHours || 2;
    const filters = payload.filters || {};

    const facilities = inventory.facilities;
    const allSpaces = inventory.spaces;

    // Map each facility to a SearchResultFacility with spatial calculation
    const candidates: SearchResultFacility[] = [];

    for (const fac of facilities) {
      if (fac.status !== 'published') {
        continue;
      }

      const distanceMeters = this.calculateDistanceMeters(
        center.latitude,
        center.longitude,
        fac.latitude,
        fac.longitude
      );

      // Distance radius filter
      if (distanceMeters > radiusMeters) {
        continue;
      }

      const facSpaces = allSpaces.filter((s) => s.facilityId === fac.id);
      if (facSpaces.length === 0) {
        continue;
      }

      // Check vehicle category compatibility
      const vehicleSpaces = facSpaces.filter((s) => {
        if (s.vehicleCategory === targetVehicle) return true;
        if (s.allowedVehicleCategories && s.allowedVehicleCategories.includes(targetVehicle)) return true;
        return false;
      });

      // Filter: Vehicle compatibility
      if (vehicleSpaces.length === 0) {
        continue;
      }

      // Filter: EV Charger
      if (filters.hasEvCharger && !vehicleSpaces.some((s) => s.hasEvCharger)) {
        continue;
      }

      // Filter: Covered parking
      if (filters.isCovered && !fac.isCovered) {
        continue;
      }

      // Filter: 24/7 Security guard or guard on duty
      if (
        filters.hasSecurityGuard &&
        !fac.amenities?.some((a) => a.includes('guard') || a.includes('security'))
      ) {
        continue;
      }

      // Filter: CCTV
      if (
        filters.hasCctv &&
        !fac.amenities?.some((a) => a.includes('cctv'))
      ) {
        continue;
      }

      // Filter: ANPR Barrier
      if (
        filters.hasAnprBarrier &&
        !fac.amenities?.some((a) => a.includes('anpr') || a.includes('barrier'))
      ) {
        continue;
      }

      // Filter: Disabled Accessibility
      if (
        filters.isDisabledAccessible &&
        !vehicleSpaces.some((s) => s.isDisabledAccessible)
      ) {
        continue;
      }

      // Filter: Clearance Height
      if (filters.clearance === 'high' && (fac.maxHeightClearanceMeters || 2.1) < 2.4) {
        continue;
      }

      // Hourly rates calculation
      const rates = vehicleSpaces.map((s) => s.hourlyRateInr).filter((r) => r > 0);
      const hourlyRateInr = rates.length > 0 ? Math.min(...rates) : 40;

      // Filter: Rate Range
      if (filters.minHourlyRate && hourlyRateInr < filters.minHourlyRate) {
        continue;
      }
      if (filters.maxHourlyRate && hourlyRateInr > filters.maxHourlyRate) {
        continue;
      }

      const totalEstimatedInr = hourlyRateInr * durationHours;
      const walkingMinutes = this.calculateWalkingMinutes(distanceMeters);
      const availableSpacesCount = vehicleSpaces.filter((s) => s.status === 'available').length;
      const totalSpacesCount = vehicleSpaces.length;

      // Truthful capacity determination based strictly on actual available spaces
      let urgencyBadge: 'SPOTS LEFT' | 'AVAILABLE NOW' | 'FAST FILLING' | 'SOLD OUT' = 'AVAILABLE NOW';
      let urgencyBadgeText = 'AVAILABLE NOW';

      if (availableSpacesCount === 0) {
        urgencyBadge = 'SOLD OUT';
        urgencyBadgeText = 'SOLD OUT';
      } else if (availableSpacesCount <= 3) {
        urgencyBadge = 'SPOTS LEFT';
        urgencyBadgeText = `${availableSpacesCount} SPOTS LEFT`;
      } else {
        urgencyBadge = 'AVAILABLE NOW';
        urgencyBadgeText = `${availableSpacesCount} SPOTS AVAILABLE`;
      }

      // Ratings & reviews from facility records
      const rating = Number((fac as any).rating ?? 0);
      const reviewCount = Number((fac as any).reviewCount ?? 0);

      const supportedVehicles: VehicleType[] = Array.from(
        new Set(facSpaces.map((s) => s.vehicleCategory))
      );

      const photos = fac.photos && fac.photos.length > 0 ? fac.photos.map((p) => p.url) : [];

      candidates.push({
        facilityId: fac.id,
        facilityCode: fac.facilityCode,
        facilityName: fac.name,
        addressLine1: fac.addressLine1,
        locality: fac.addressLine2 || fac.addressLine1,
        city: fac.city,
        postalCode: fac.postalCode,
        distanceMeters,
        walkingMinutes,
        coordinates: { latitude: fac.latitude, longitude: fac.longitude },
        hourlyRateInr,
        totalEstimatedInr,
        availableSpacesCount,
        totalSpacesCount,
        isCovered: fac.isCovered,
        is24x7: fac.is24x7,
        rating,
        reviewCount,
        supportedVehicles: supportedVehicles.length > 0 ? supportedVehicles : ['car'],
        amenities: fac.amenities || [],
        photos,
        operatingModel: fac.operatingModel || 'commercial_garage',
        urgencyBadge,
        urgencyBadgeText,
        isInstantBooking: false,
      });
    }

    // Apply sorting
    const sortBy = payload.sortBy || 'recommended';
    candidates.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.hourlyRateInr - b.hourlyRateInr;
      }
      if (sortBy === 'rating_desc') {
        return b.rating - a.rating;
      }
      if (sortBy === 'distance_asc') {
        return a.distanceMeters - b.distanceMeters;
      }
      // 'recommended' ranking formula: distance priority combined with rating
      const scoreA = a.rating * 1000 - a.distanceMeters + (a.urgencyBadge === 'SPOTS LEFT' ? 200 : 0);
      const scoreB = b.rating * 1000 - b.distanceMeters + (b.urgencyBadge === 'SPOTS LEFT' ? 200 : 0);
      return scoreB - scoreA;
    });

    return {
      results: candidates,
      totalMatches: candidates.length,
      appliedRadiusKm: radiusKm,
      centerCoordinates: center,
      searchQuery: payload.query,
      selectedVehicle: targetVehicle,
      durationHours,
    };
  }

  /**
   * Fast Autocomplete Location Suggestions (GET /api/v1/search/suggestions).
   */
  public async getSuggestions(query?: string, tenantId = 'default'): Promise<LocationSuggestion[]> {
    const inventory = await this.facilitiesService.getSearchInventory(tenantId);
    const q = (query || '').trim().toLocaleLowerCase();
    return inventory.facilities
      .filter((f) => f.status === 'published' && (!q || [f.name, f.addressLine1, f.addressLine2, f.city, f.postalCode].some((v) => v?.toLocaleLowerCase().includes(q))))
      .slice(0, 8)
      .map((f) => ({
        id: f.id,
        title: f.name,
        subtitle: [f.addressLine1, f.addressLine2, f.city].filter(Boolean).join(', '),
        type: 'commercial_hub' as const,
        coordinates: { latitude: f.latitude, longitude: f.longitude },
        verifiedSpacesAvailable: inventory.spaces.filter((s) => s.facilityId === f.id && s.isActive && s.status === 'available').length,
        tags: f.amenities || [],
      }));
  }

  /**
   * Curated Explore Parking Catalog (GET /api/v1/search/explore).
   */
  public async getExploreCatalog(tenantId = 'default'): Promise<ExploreCatalogHub[]> {
    const inventory = await this.facilitiesService.getSearchInventory(tenantId);
    return inventory.facilities.filter((f) => f.status === 'published').slice(0, 8).map((f) => {
      const spaces = inventory.spaces.filter((s) => s.facilityId === f.id && s.isActive);
      const rates = spaces.map((s) => s.hourlyRateInr).filter((rate) => Number.isFinite(rate) && rate > 0);
      return {
        id: f.id,
        name: f.name,
        category: 'commercial' as const,
        badge: f.isCovered ? 'Covered parking' : 'Open-air parking',
        location: [f.addressLine1, f.city].filter(Boolean).join(', '),
        coordinates: { latitude: f.latitude, longitude: f.longitude },
        startingPriceInr: rates.length ? Math.min(...rates) : 0,
        availableBays: spaces.filter((s) => s.status === 'available').length,
        rating: 0,
        photoUrl: f.photos?.[0]?.url || '',
      };
    });
  }

  /**
   * Fallback Alternatives when 0 exact matches occur (GET /api/v1/search/fallback).
   */
  public async getFallback(location?: string, tenantId = 'default'): Promise<FallbackSuggestionsResponse> {
    const inventory = await this.facilitiesService.getSearchInventory(tenantId);
    const alternatives = inventory.facilities.filter((f) => f.status === 'published').slice(0, 3).map((f) => {
      const spaces = inventory.spaces.filter((s) => s.facilityId === f.id && s.isActive);
      const rates = spaces.map((s) => s.hourlyRateInr).filter((rate) => Number.isFinite(rate) && rate > 0);
      return {
        id: f.id,
        name: f.name,
        distanceMeters: 0,
        availableSpaces: spaces.filter((s) => s.status === 'available').length,
        startingPriceInr: rates.length ? Math.min(...rates) : 0,
        coordinates: { latitude: f.latitude, longitude: f.longitude },
      };
    });
    return {
      searchQuery: location || '',
      message: alternatives.length ? 'Try these published parking facilities.' : 'No published parking facilities are available yet.',
      suggestedRadiusKm: 5,
      alternativeHubs: alternatives,
    };
  }
}
