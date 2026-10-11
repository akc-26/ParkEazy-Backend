import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
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
  constructor(private readonly searchService: SearchService) {}

  /**
   * High-performance PostGIS & Geo-spatial radius search endpoint
   * POST /api/v1/search/query
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async querySearch(
    @Body() payload: SearchQueryPayload
  ): Promise<{ data: SearchResponse }> {
    const data = await this.searchService.querySearch(payload);
    return { data };
  }

  /**
   * Fast location autocomplete suggestions dropdown
   * GET /api/v1/search/suggestions
   */
  @Get('suggestions')
  getSuggestions(
    @Query('q') query?: string
  ): { data: LocationSuggestion[] } {
    const data = this.searchService.getSuggestions(query);
    return { data };
  }

  /**
   * Discovery catalog hubs for explore view
   * GET /api/v1/search/explore
   */
  @Get('explore')
  getExploreCatalog(): { data: ExploreCatalogHub[] } {
    const data = this.searchService.getExploreCatalog();
    return { data };
  }

  /**
   * Fallback suggestions when search results are empty
   * GET /api/v1/search/fallback
   */
  @Get('fallback')
  getFallback(
    @Query('location') location?: string
  ): { data: FallbackSuggestionsResponse } {
    const data = this.searchService.getFallback(location);
    return { data };
  }
}
