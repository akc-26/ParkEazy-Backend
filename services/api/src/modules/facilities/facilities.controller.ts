import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  Req,
  Inject,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service.js';
import type {
  CreateFacilityPayload,
  UpdateFacilityPayload,
  CreateSpacePayload,
  BulkCreateSpacesPayload,
  UpdateSpacePayload,
  SpaceStatus,
  JwtPayload,
} from '@parkeazy/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../auth/guards/tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles, Public } from '../auth/guards/roles.decorator.js';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class FacilitiesController {
  constructor(@Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService) {}

  private getEffectiveHost(req: any, headerTenant?: string): { hostId: string; tenantId: string } {
    const user = req.user as JwtPayload;
    if (!user || !user.sub) {
      throw new ForbiddenException('Authenticated host context is required.');
    }
    const hostId = user.sub;
    const tenantId = user.tenantId || headerTenant || 'default';
    return { hostId, tenantId };
  }

  // Host Facilities Endpoints
  @Get('facilities')
  @Roles('host', 'superadmin')
  async listFacilities(
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.listHostFacilities(ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('facilities')
  @Roles('host', 'superadmin')
  async createFacility(
    @Body() payload: CreateFacilityPayload,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.createFacility(ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Get('facilities/:id')
  @Roles('host', 'superadmin')
  async getFacility(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.getFacility(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Put('facilities/:id')
  @Roles('host', 'superadmin')
  async updateFacility(
    @Param('id') id: string,
    @Body() payload: UpdateFacilityPayload,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.updateFacility(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Get('facilities/:id/spaces')
  @Roles('host', 'superadmin')
  async getFacilitySpaces(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.listSpaces(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('facilities/:id/spaces')
  @Roles('host', 'superadmin')
  async createSpace(
    @Param('id') id: string,
    @Body() payload: CreateSpacePayload,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.createSpace(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Post('facilities/:id/spaces/bulk')
  @Roles('host', 'superadmin')
  async bulkCreateSpaces(
    @Param('id') id: string,
    @Body() payload: BulkCreateSpacesPayload,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.bulkCreateSpaces(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Get('facilities/:id/readiness')
  @Roles('host', 'superadmin')
  async getReadiness(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.getPublicationReadiness(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('facilities/:id/publish')
  @Roles('host', 'superadmin')
  async publishFacility(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.publishFacility(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('facilities/:id/unpublish')
  @Roles('host', 'superadmin')
  async unpublishFacility(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.unpublishFacility(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Patch('facilities/:id/status')
  @Roles('host', 'superadmin')
  async updateFacilityStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.updateFacilityStatus(id, ctx.hostId, ctx.tenantId, status);
    return { data };
  }

  @Delete('facilities/:id')
  @Roles('host', 'superadmin')
  async deleteFacility(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.deleteFacility(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Put('facilities/:id/spaces/bulk')
  @Roles('host', 'superadmin')
  async bulkUpdateSpaces(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const spaces = Array.isArray(body) ? body : (body.spaces || []);
    const data = await this.facilitiesService.bulkUpdateSpaces(id, ctx.hostId, ctx.tenantId, spaces);
    return { data };
  }

  @Delete('facilities/:id/spaces/:spaceId')
  @Roles('host', 'superadmin')
  async deleteFacilitySpace(
    @Param('id') _facilityId: string,
    @Param('spaceId') spaceId: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.deleteSpace(spaceId, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('facilities/:id/photos')
  @Roles('host', 'superadmin')
  async addFacilityPhoto(
    @Param('id') id: string,
    @Body() payload: { url: string; caption?: string; isPrimary?: boolean },
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.addFacilityPhoto(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Delete('facilities/:id/photos/:photoId')
  @Roles('host', 'superadmin')
  async deleteFacilityPhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.deleteFacilityPhoto(id, photoId, ctx.hostId, ctx.tenantId);
    return { data };
  }

  // Spaces Endpoints
  @Get('spaces/:id')
  @Roles('host', 'superadmin')
  async getSpace(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.getSpace(id, ctx.tenantId, ctx.hostId);
    return { data };
  }

  @Put('spaces/:id')
  @Roles('host', 'superadmin')
  async updateSpace(
    @Param('id') id: string,
    @Body() payload: UpdateSpacePayload,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.updateSpace(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Patch('spaces/:id/status')
  @Roles('host', 'superadmin')
  async updateSpaceStatus(
    @Param('id') id: string,
    @Body('status') status: SpaceStatus,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.updateSpaceStatus(id, ctx.hostId, ctx.tenantId, status);
    return { data };
  }

  @Delete('spaces/:id')
  @Roles('host', 'superadmin')
  async deleteSpace(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.deleteSpace(id, ctx.hostId, ctx.tenantId);
    return { data };
  }

  @Post('spaces/:id/photos')
  @Roles('host', 'superadmin')
  async addSpacePhoto(
    @Param('id') id: string,
    @Body() payload: { url: string; caption?: string; isPrimary?: boolean },
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.addSpacePhoto(id, ctx.hostId, ctx.tenantId, payload);
    return { data };
  }

  @Delete('spaces/:id/photos/:photoId')
  @Roles('host', 'superadmin')
  async deleteSpacePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() req: any,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const ctx = this.getEffectiveHost(req, tenantId);
    const data = await this.facilitiesService.deleteSpacePhoto(id, photoId, ctx.hostId, ctx.tenantId);
    return { data };
  }

  // Public Marketplace Feed
  @Public()
  @Get('public/listings')
  async listPublicListings(@Headers('x-tenant-id') tenantId: string = 'default') {
    const data = await this.facilitiesService.listPublicListings(tenantId);
    return { data };
  }

  @Public()
  @Get('public/listings/:id')
  async getPublicListing(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string = 'default'
  ) {
    const data = await this.facilitiesService.getPublicListing(id, tenantId);
    return { data };
  }
}
