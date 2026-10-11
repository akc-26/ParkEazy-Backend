import { Injectable, Logger } from '@nestjs/common';
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

interface HubAnchor {
  id: string;
  name: string;
  subtitle: string;
  keywords: string[];
  type: 'metro_station' | 'commercial_hub' | 'landmark';
  latitude: number;
  longitude: number;
  tags: string[];
  verifiedSpaces: number;
}

const CHENNAI_HUBS: HubAnchor[] = [
  {
    id: 'hub-anna-nagar',
    name: 'Anna Nagar Roundtana',
    subtitle: 'Near Roundtana Metro & Roundtana Police Booth',
    keywords: ['anna', 'nagar', 'roundtana', 'metro', 'tower'],
    type: 'metro_station',
    latitude: 13.0850,
    longitude: 80.2100,
    tags: ['Metro Station', 'Covered', 'EV Fast Charge'],
    verifiedSpaces: 24,
  },
  {
    id: 'hub-t-nagar',
    name: 'T. Nagar Usman Road Hub',
    subtitle: 'Commercial shopping arcade & Usman Road flyover',
    keywords: ['t nagar', 't. nagar', 'usman', 'pondypazaar', 'panagal'],
    type: 'commercial_hub',
    latitude: 13.0400,
    longitude: 80.2330,
    tags: ['Commercial Hub', 'Multi-Level', 'CCTV Security'],
    verifiedSpaces: 36,
  },
  {
    id: 'hub-vadapalani',
    name: 'Nexus Vijaya Mall, Vadapalani',
    subtitle: 'Multi-level covered mall basement parking',
    keywords: ['vadapalani', 'nexus', 'vijaya', 'mall', 'forum'],
    type: 'commercial_hub',
    latitude: 13.0520,
    longitude: 80.2120,
    tags: ['Mall Basement', 'Valet Available', 'ANPR Gate'],
    verifiedSpaces: 48,
  },
  {
    id: 'hub-koyambedu',
    name: 'Koyambedu CMBT Transit Interchange',
    subtitle: 'Inter-city bus terminal & Metro interchange station',
    keywords: ['koyambedu', 'cmbt', 'bus', 'transit', 'market'],
    type: 'metro_station',
    latitude: 13.0700,
    longitude: 80.1900,
    tags: ['Transit Hub', '24/7 Security', 'High Clearance'],
    verifiedSpaces: 32,
  },
  {
    id: 'hub-airport',
    name: 'Chennai International Airport (MAA)',
    subtitle: 'Multi-level car parking (MLCP) opposite Terminal 2',
    keywords: ['airport', 'maa', 'meenambakkam', 'flight', 'terminal'],
    type: 'landmark',
    latitude: 12.9800,
    longitude: 80.1600,
    tags: ['Airport Terminal', 'Covered MLCP', 'Fast Tag / ANPR'],
    verifiedSpaces: 60,
  },
  {
    id: 'hub-central',
    name: 'Puratchi Thalaivar Dr. M.G.R. Central Railway',
    subtitle: 'Park Town & Central Metro interchange concourse',
    keywords: ['central', 'railway', 'station', 'park town', 'mgr'],
    type: 'metro_station',
    latitude: 13.0827,
    longitude: 80.2757,
    tags: ['Railway Station', '24/7 Monitored', 'Two-Wheeler'],
    verifiedSpaces: 40,
  },
];

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly facilitiesService: FacilitiesService) {}

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
  private resolveEpicenter(payload: SearchQueryPayload): {
    latitude: number;
    longitude: number;
  } {
    if (payload.latitude && payload.longitude) {
      return { latitude: payload.latitude, longitude: payload.longitude };
    }

    if (payload.query) {
      const q = payload.query.toLowerCase();
      const matchedHub = CHENNAI_HUBS.find((h) =>
        h.keywords.some((k) => q.includes(k)) || h.name.toLowerCase().includes(q)
      );
      if (matchedHub) {
        return { latitude: matchedHub.latitude, longitude: matchedHub.longitude };
      }
    }

    // Default to Anna Nagar, Chennai epicenter
    return { latitude: 13.0850, longitude: 80.2100 };
  }

  /**
   * Execute high-performance Geo-Spatial Search Query (POST /api/v1/search/query).
   */
  public async querySearch(payload: SearchQueryPayload): Promise<SearchResponse> {
    const center = this.resolveEpicenter(payload);
    const radiusKm = payload.radiusKm || 3.0;
    const radiusMeters = radiusKm * 1000;
    const targetVehicle: VehicleType = payload.vehicleCategory || 'car';
    const durationHours = payload.durationHours || 2;
    const filters = payload.filters || {};

    const facilities = this.facilitiesService.getInternalFacilities();
    const allSpaces = this.facilitiesService.getInternalSpaces();

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

      // Urgency badge determination
      let urgencyBadge: 'SPOTS LEFT' | 'AVAILABLE NOW' | 'FAST FILLING' | 'SOLD OUT' = 'AVAILABLE NOW';
      let urgencyBadgeText = 'AVAILABLE NOW';

      if (availableSpacesCount === 0) {
        urgencyBadge = 'SOLD OUT';
        urgencyBadgeText = 'SOLD OUT FOR YOUR TIME';
      } else if (availableSpacesCount <= 3) {
        urgencyBadge = 'SPOTS LEFT';
        urgencyBadgeText = `${availableSpacesCount} SPOTS LEFT`;
      } else if (availableSpacesCount <= 8) {
        urgencyBadge = 'FAST FILLING';
        urgencyBadgeText = 'FAST FILLING • HIGH DEMAND';
      }

      // Realistic reviews & ratings
      const rating = fac.facilityCode.includes('0104') ? 4.9 : fac.facilityCode.includes('0105') ? 4.8 : 4.6;
      const reviewCount = fac.facilityCode.includes('0104') ? 142 : fac.facilityCode.includes('0105') ? 98 : 64;

      const supportedVehicles: VehicleType[] = Array.from(
        new Set(facSpaces.map((s) => s.vehicleCategory))
      );

      const photos =
        fac.photos && fac.photos.length > 0
          ? fac.photos.map((p) => p.url)
          : [
              'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
            ];

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
        amenities: fac.amenities || ['covered_roof', 'cctv_security'],
        photos,
        operatingModel: fac.operatingModel || 'commercial_garage',
        urgencyBadge,
        urgencyBadgeText,
        isInstantBooking: true,
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
  public getSuggestions(query?: string): LocationSuggestion[] {
    const q = (query || '').toLowerCase().trim();

    if (!q) {
      // Default: Top Chennai Transit & Commercial Hubs
      return CHENNAI_HUBS.slice(0, 4).map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: h.subtitle,
        type: h.type,
        coordinates: { latitude: h.latitude, longitude: h.longitude },
        verifiedSpacesAvailable: h.verifiedSpaces,
        tags: h.tags,
        distanceKm: 0.8,
      }));
    }

    // Filter by title, subtitle, or keywords
    const filtered = CHENNAI_HUBS.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.subtitle.toLowerCase().includes(q) ||
        h.keywords.some((k) => k.includes(q))
    );

    return filtered.map((h) => ({
      id: h.id,
      title: h.name,
      subtitle: h.subtitle,
      type: h.type,
      coordinates: { latitude: h.latitude, longitude: h.longitude },
      verifiedSpacesAvailable: h.verifiedSpaces,
      tags: h.tags,
      distanceKm: 1.2,
    }));
  }

  /**
   * Curated Explore Parking Catalog (GET /api/v1/search/explore).
   */
  public getExploreCatalog(): ExploreCatalogHub[] {
    return [
      {
        id: 'cat-anna-nagar',
        name: 'Anna Nagar Metro & Shopping Hub',
        category: 'transit',
        badge: 'Top Pick • High Clearance',
        location: '2nd Avenue, Anna Nagar West',
        coordinates: { latitude: 13.0850, longitude: 80.2100 },
        startingPriceInr: 40,
        availableBays: 24,
        rating: 4.9,
        photoUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat-t-nagar',
        name: 'T. Nagar Commercial Hub',
        category: 'commercial',
        badge: 'Covered • Multi-Level',
        location: 'Usman Road, T. Nagar',
        coordinates: { latitude: 13.0400, longitude: 80.2330 },
        startingPriceInr: 50,
        availableBays: 36,
        rating: 4.8,
        photoUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat-vadapalani',
        name: 'Nexus Vijaya Mall Super Hub',
        category: 'mall',
        badge: 'EV Fast Charging • 24/7',
        location: 'Vadapalani Concourse',
        coordinates: { latitude: 13.0520, longitude: 80.2120 },
        startingPriceInr: 45,
        availableBays: 48,
        rating: 4.7,
        photoUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat-airport',
        name: 'Chennai Airport MLCP Terminal Hub',
        category: 'transit',
        badge: 'Flight Transit • ANPR Pass',
        location: 'Meenambakkam, GST Road',
        coordinates: { latitude: 12.9800, longitude: 80.1600 },
        startingPriceInr: 60,
        availableBays: 60,
        rating: 4.9,
        photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      },
    ];
  }

  /**
   * Fallback Alternatives when 0 exact matches occur (GET /api/v1/search/fallback).
   */
  public getFallback(location?: string): FallbackSuggestionsResponse {
    return {
      searchQuery: location || 'Anna Nagar West',
      message: 'No exact matches within current radius. Broaden radius or explore neighboring transit hubs.',
      suggestedRadiusKm: 3.5,
      alternativeHubs: [
        {
          id: 'alt-koyambedu',
          name: 'Koyambedu CMBT Multi-Level Parking',
          distanceMeters: 1400,
          availableSpaces: 18,
          startingPriceInr: 30,
          coordinates: { latitude: 13.0700, longitude: 80.1900 },
        },
        {
          id: 'alt-shenoy',
          name: 'Shenoy Nagar Metro Station Basements',
          distanceMeters: 1800,
          availableSpaces: 12,
          startingPriceInr: 35,
          coordinates: { latitude: 13.0780, longitude: 80.2250 },
        },
        {
          id: 'alt-kilpauk',
          name: 'Kilpauk Medical College Covered Facility',
          distanceMeters: 2200,
          availableSpaces: 9,
          startingPriceInr: 40,
          coordinates: { latitude: 13.0800, longitude: 80.2400 },
        },
      ],
    };
  }
}
