import { Controller, Get, Post, Req, Inject, UseGuards, Param, Body } from '@nestjs/common';
import { HostOpsService } from './host.service.js';
import { JwtPayload } from '@parkeazy/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../auth/guards/tenant.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';

@Controller('host')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('host', 'superadmin')
export class HostOpsController {
  constructor(@Inject(HostOpsService) private readonly hostOpsService: HostOpsService) {}

  @Get('bookings')
  public async getBookings(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getHostBookings(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('occupancy')
  public async getOccupancy(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getOccupancy(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('earnings')
  public async getEarnings(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getEarnings(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('ledger')
  public async getLedger(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getLedger(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('payouts')
  public async getPayouts(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getPayouts(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Post('payouts/request')
  public async requestPayout(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.requestPayout(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Post('bookings/:id/check-in')
  public async checkIn(@Param('id') id: string, @Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.checkIn(id, user.sub, user.tenantId);
    return { success: true, data };
  }

  @Post('bookings/:id/check-out')
  public async checkOut(@Param('id') id: string, @Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.checkOut(id, user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('audit')
  public async getAuditEvents(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getAuditEvents(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get('extension-requests')
  public async getExtensionRequests(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.getExtensionRequests(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Post('extension-requests/:id/decision')
  public async decideExtensionRequest(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.hostOpsService.decideExtensionRequest(id, body?.decision, user.sub, user.tenantId);
    return { success: true, data };
  }
}
