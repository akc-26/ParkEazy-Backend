import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Headers,
  Query,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service.js';
import {
  CreateFacilityPayload,
  UpdateFacilityPayload,
  CreateSpacePayload,
  BulkCreateSpacesPayload,
  UpdateSpacePayload,
  SpaceStatus,
} from '@parkeazy/shared-types';

@Controller()
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  // Host Facilities Endpoints
  @Get('facilities')
  async listFacilities(
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    return { data };
  }

  @Post('facilities')
  async createFacility(
    @Body() payload: CreateFacilityPayload,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.createFacility(hostId, tenantId, payload);
    return { data };
  }

  @Get('facilities/:id')
  async getFacility(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.getFacility(id, hostId, tenantId);
    return { data };
  }

  @Put('facilities/:id')
  async updateFacility(
    @Param('id') id: string,
    @Body() payload: UpdateFacilityPayload,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.updateFacility(id, hostId, tenantId, payload);
    return { data };
  }

  @Get('facilities/:id/spaces')
  async getFacilitySpaces(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.listSpaces(id, hostId, tenantId);
    return { data };
  }

  @Post('facilities/:id/spaces')
  async createSpace(
    @Param('id') id: string,
    @Body() payload: CreateSpacePayload,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.createSpace(id, hostId, tenantId, payload);
    return { data };
  }

  @Post('facilities/:id/spaces/bulk')
  async bulkCreateSpaces(
    @Param('id') id: string,
    @Body() payload: BulkCreateSpacesPayload,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.bulkCreateSpaces(id, hostId, tenantId, payload);
    return { data };
  }

  @Get('facilities/:id/readiness')
  async getReadiness(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.getPublicationReadiness(id, hostId, tenantId);
    return { data };
  }

  @Post('facilities/:id/publish')
  async publishFacility(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.publishFacility(id, hostId, tenantId);
    return { data };
  }

  // Spaces Endpoints
  @Get('spaces/:id')
  async getSpace(@Param('id') id: string) {
    const data = await this.facilitiesService.getSpace(id);
    return { data };
  }

  @Put('spaces/:id')
  async updateSpace(
    @Param('id') id: string,
    @Body() payload: UpdateSpacePayload,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.updateSpace(id, hostId, tenantId, payload);
    return { data };
  }

  @Patch('spaces/:id/status')
  async updateSpaceStatus(
    @Param('id') id: string,
    @Body('status') status: SpaceStatus,
    @Headers('x-tenant-id') tenantId: string = 'default',
    @Headers('x-host-id') hostId: string = '00000000-0000-4000-a000-000000000002'
  ) {
    const data = await this.facilitiesService.updateSpaceStatus(id, hostId, tenantId, status);
    return { data };
  }

  // Public Marketplace Feed
  @Get('public/listings')
  async listPublicListings(@Headers('x-tenant-id') tenantId: string = 'default') {
    const data = await this.facilitiesService.listPublicListings(tenantId);
    return { data };
  }

  @Get('public/listings/:id')
  async getPublicListing(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const data = await this.facilitiesService.getPublicListing(id, tenantId);
    return { data };
  }
}
