import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../services/api/src/modules/search/search.service';
import { FacilitiesService } from '../services/api/src/modules/facilities/facilities.service';
import { ApiClient } from '../packages/api-client/src/client';
import { SearchQueryPayload } from '../packages/shared-types/src/search';

describe('Part 06: Availability, Search & Discovery Test Suite', () => {
  let searchService: SearchService;
  let facilitiesService: FacilitiesService;

  beforeEach(() => {
    facilitiesService = new FacilitiesService();
    searchService = new SearchService(facilitiesService);
  });

  describe('Geo-Spatial Mathematics & Distance Calculation', () => {
    it('should calculate Haversine distance correctly between Anna Nagar and T. Nagar', () => {
      // Anna Nagar: 13.0850, 80.2100 | T. Nagar: 13.0400, 80.2330 (~5.5 km)
      const distance = searchService.calculateDistanceMeters(13.0850, 80.2100, 13.0400, 80.2330);
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(6500);
    });

    it('should calculate zero distance for identical coordinates', () => {
      const distance = searchService.calculateDistanceMeters(13.0850, 80.2100, 13.0850, 80.2100);
      expect(distance).toBe(0);
    });

    it('should calculate walking duration at standard 80m/min pace', () => {
      expect(searchService.calculateWalkingMinutes(400)).toBe(5);
      expect(searchService.calculateWalkingMinutes(800)).toBe(10);
      expect(searchService.calculateWalkingMinutes(40)).toBe(1); // Minimum 1 minute
    });
  });

  describe('Geo-Spatial Search Query Execution (POST /api/v1/search/query)', () => {
    it('should find published facilities near Anna Nagar with default radius', async () => {
      const res = await searchService.querySearch({
        latitude: 13.0850,
        longitude: 80.2100,
        radiusKm: 5.0,
        vehicleCategory: 'car',
        durationHours: 2,
      });

      expect(res.totalMatches).toBeGreaterThan(0);
      expect(res.results).toBeInstanceOf(Array);
      expect(res.appliedRadiusKm).toBe(5.0);

      const first = res.results[0];
      expect(first).toHaveProperty('facilityId');
      expect(first).toHaveProperty('facilityName');
      expect(first).toHaveProperty('hourlyRateInr');
      expect(first).toHaveProperty('totalEstimatedInr');
      expect(first).toHaveProperty('distanceMeters');
      expect(first).toHaveProperty('walkingMinutes');
      expect(first).toHaveProperty('urgencyBadge');
      expect(first.totalEstimatedInr).toBe(first.hourlyRateInr * 2);
    });

    it('should filter facilities strictly by geographic radius', async () => {
      // Very tight radius of 100 meters around Anna Nagar epicenter
      const resTight = await searchService.querySearch({
        latitude: 13.0850,
        longitude: 80.2100,
        radiusKm: 0.1, // 100m
      });

      // Anna Nagar Plaza is at 13.0850, 80.2100 (0 meters away)
      expect(resTight.results.some(r => r.facilityName.includes('Anna Nagar'))).toBe(true);
      // T. Nagar (~5.5km away) must be excluded
      expect(resTight.results.some(r => r.facilityName.includes('T. Nagar'))).toBe(false);
    });

    it('should filter by vehicle category compatibility (car vs bike vs auto)', async () => {
      const resCar = await searchService.querySearch({
        query: 'Anna Nagar',
        vehicleCategory: 'car',
      });
      expect(resCar.results.length).toBeGreaterThan(0);
      for (const r of resCar.results) {
        expect(r.supportedVehicles).toContain('car');
      }
    });

    it('should filter by EV fast charging amenity when requested', async () => {
      const resEv = await searchService.querySearch({
        query: 'Anna Nagar',
        filters: { hasEvCharger: true },
      });

      // Only facilities with EV chargers in active spaces
      for (const r of resEv.results) {
        expect(r.amenities).toContain('ev_charger');
      }
    });

    it('should filter by covered parking roof', async () => {
      const resCovered = await searchService.querySearch({
        query: 'Anna Nagar',
        filters: { isCovered: true },
      });

      for (const r of resCovered.results) {
        expect(r.isCovered).toBe(true);
      }
    });

    it('should sort results by price ascending when requested', async () => {
      const res = await searchService.querySearch({
        query: 'Chennai',
        radiusKm: 15.0,
        sortBy: 'price_asc',
      });

      if (res.results.length > 1) {
        for (let i = 0; i < res.results.length - 1; i++) {
          expect(res.results[i].hourlyRateInr).toBeLessThanOrEqual(res.results[i + 1].hourlyRateInr);
        }
      }
    });

    it('should sort results by distance ascending when requested', async () => {
      const res = await searchService.querySearch({
        latitude: 13.0850,
        longitude: 80.2100,
        radiusKm: 15.0,
        sortBy: 'distance_asc',
      });

      if (res.results.length > 1) {
        for (let i = 0; i < res.results.length - 1; i++) {
          expect(res.results[i].distanceMeters).toBeLessThanOrEqual(res.results[i + 1].distanceMeters);
        }
      }
    });

    it('should sort results by rating descending when requested', async () => {
      const res = await searchService.querySearch({
        query: 'Chennai',
        radiusKm: 15.0,
        sortBy: 'rating_desc',
      });

      if (res.results.length > 1) {
        for (let i = 0; i < res.results.length - 1; i++) {
          expect(res.results[i].rating).toBeGreaterThanOrEqual(res.results[i + 1].rating);
        }
      }
    });
  });

  describe('Autocomplete Location Suggestions (GET /api/v1/search/suggestions)', () => {
    it('should return top Chennai transit and commercial hubs when query is empty', () => {
      const suggestions = searchService.getSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('title');
      expect(suggestions[0]).toHaveProperty('coordinates');
      expect(suggestions[0]).toHaveProperty('verifiedSpacesAvailable');
      expect(suggestions[0]).toHaveProperty('tags');
    });

    it('should return Anna Nagar Roundtana when searching for "Anna"', () => {
      const suggestions = searchService.getSuggestions('Anna');
      expect(suggestions.length).toBeGreaterThan(0);
      const match = suggestions.find(s => s.title.includes('Anna Nagar'));
      expect(match).toBeDefined();
      expect(match?.type).toBe('metro_station');
    });

    it('should return T. Nagar when searching for "Usman"', () => {
      const suggestions = searchService.getSuggestions('Usman');
      expect(suggestions.length).toBeGreaterThan(0);
      const match = suggestions.find(s => s.title.includes('T. Nagar'));
      expect(match).toBeDefined();
    });

    it('should return airport terminal hub when searching for "Airport"', () => {
      const suggestions = searchService.getSuggestions('Airport');
      expect(suggestions.length).toBeGreaterThan(0);
      const match = suggestions.find(s => s.title.includes('Airport'));
      expect(match).toBeDefined();
    });
  });

  describe('Curated Explore Catalog (GET /api/v1/search/explore)', () => {
    it('should return curated hubs across transit, commercial, and mall categories', () => {
      const catalog = searchService.getExploreCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(4);
      const categories = catalog.map(c => c.category);
      expect(categories).toContain('transit');
      expect(categories).toContain('commercial');
      expect(categories).toContain('mall');
      for (const item of catalog) {
        expect(item.startingPriceInr).toBeGreaterThan(0);
        expect(item.availableBays).toBeGreaterThan(0);
        expect(item.photoUrl).toBeDefined();
      }
    });
  });

  describe('Zero Results Fallback Alternatives (GET /api/v1/search/fallback)', () => {
    it('should return nearby alternative hubs and radius suggestion', () => {
      const fallback = searchService.getFallback('Ranganathan Street');
      expect(fallback.searchQuery).toBe('Ranganathan Street');
      expect(fallback.suggestedRadiusKm).toBeGreaterThan(1.0);
      expect(fallback.alternativeHubs.length).toBeGreaterThan(0);
      expect(fallback.alternativeHubs[0]).toHaveProperty('name');
      expect(fallback.alternativeHubs[0]).toHaveProperty('distanceMeters');
      expect(fallback.alternativeHubs[0]).toHaveProperty('startingPriceInr');
    });
  });

  describe('ApiClient Search & Discovery Integration', () => {
    it('should build proper search query request and parse response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            results: [],
            totalMatches: 0,
            appliedRadiusKm: 3.0,
            centerCoordinates: { latitude: 13.0850, longitude: 80.2100 },
            selectedVehicle: 'car',
            durationHours: 2,
          },
        }),
      });
      global.fetch = mockFetch;

      const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
      const payload: SearchQueryPayload = {
        query: 'Anna Nagar',
        vehicleCategory: 'car',
        radiusKm: 3.0,
      };

      const res = await client.search.query(payload);
      expect(res.appliedRadiusKm).toBe(3.0);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/search/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should fetch suggestions with url encoded query parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'hub-1',
              title: 'Anna Nagar',
              subtitle: 'Near Metro',
              type: 'metro_station',
              coordinates: { latitude: 13.085, longitude: 80.21 },
              verifiedSpacesAvailable: 10,
              tags: ['Metro'],
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
      const suggestions = await client.search.getSuggestions('Anna Nagar');
      expect(suggestions).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/search/suggestions?q=Anna%20Nagar',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should fetch explore catalog and fallback suggestions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = mockFetch;

      const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
      await client.search.getExploreCatalog();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/search/explore',
        expect.objectContaining({ method: 'GET' })
      );

      await client.search.getFallback('T. Nagar');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/search/fallback?location=T.%20Nagar',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });
});
