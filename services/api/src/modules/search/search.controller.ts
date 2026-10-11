import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Inject,
} from '@nestjs/common';
import { SearchService } from './search.service.js';
import {
  SearchQueryPayload,
  SearchResponse,
  LocationSuggestion,
  ExploreCatalogHub,
  FallbackSuggestionsResponse,
} from '@parkeazy/shared-types';

@Controller('search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  /**
   * High-performance PostGIS & Geo-spatial radius search endpoint
   * POST /api/v1/search/query
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async querySearch(
    @Body() payload: SearchQueryPayload,
    @Headers('x-tenant-id') tenantId = 'default'
  ): Promise<{ data: SearchResponse }> {
    const data = await this.searchService.querySearch(payload, tenantId);
    return { data };
  }

  /**
   * Fast location autocomplete suggestions dropdown
   * GET /api/v1/search/suggestions
   */
  @Get('suggestions')
  async getSuggestions(
    @Query('q') query?: string,
    @Headers('x-tenant-id') tenantId = 'default'
  ): Promise<{ data: LocationSuggestion[] }> {
    const data = await this.searchService.getSuggestions(query, tenantId);
    return { data };
  }

  /**
   * Discovery catalog hubs for explore view
   * GET /api/v1/search/explore
   */
  @Get('explore')
  async getExploreCatalog(@Headers('x-tenant-id') tenantId = 'default'): Promise<{ data: ExploreCatalogHub[] }> {
    const data = await this.searchService.getExploreCatalog(tenantId);
    return { data };
  }

  /**
   * Fallback suggestions when search results are empty
   * GET /api/v1/search/fallback
   */
  @Get('fallback')
  async getFallback(
    @Query('location') location?: string,
    @Headers('x-tenant-id') tenantId = 'default'
  ): Promise<{ data: FallbackSuggestionsResponse }> {
    const data = await this.searchService.getFallback(location, tenantId);
    return { data };
  }
}
