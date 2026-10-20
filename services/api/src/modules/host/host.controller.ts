import { Controller, Get, Post, Req, Inject } from '@nestjs/common';
import { HostOpsService } from './host.service.js';
import { JwtPayload } from '@parkeazy/shared-types';

@Controller('host')
export class HostOpsController {
  constructor(@Inject(HostOpsService) private readonly hostOpsService: HostOpsService) {}

  @Get('bookings')
  public async getBookings(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getHostBookings(user.sub);
    return { success: true, data };
  }

  @Get('occupancy')
  public async getOccupancy(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getOccupancy(user.sub);
    return { success: true, data };
  }

  @Get('earnings')
  public async getEarnings(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getEarnings(user.sub);
    return { success: true, data };
  }

  @Get('ledger')
  public async getLedger(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getLedger(user.sub);
    return { success: true, data };
  }

  @Get('payouts')
  public async getPayouts(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getPayouts(user.sub);
    return { success: true, data };
  }

  @Post('payouts/request')
  public async requestPayout(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.requestPayout(user.sub);
    return { success: true, data };
  }

  @Get('extension-requests')
  public async getExtensionRequests(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.getExtensionRequests(user.sub);
    return { success: true, data };
  }

  @Post('extension-requests/:id/decision')
  public async decideExtensionRequest(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000002' };
    const data = await this.hostOpsService.decideExtensionRequest(req.params.id, req.body?.decision, user.sub);
    return { success: true, data };
  }
}
