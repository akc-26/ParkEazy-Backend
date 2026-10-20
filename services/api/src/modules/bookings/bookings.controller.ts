import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Inject,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import type { JwtPayload, CreateBookingPayload } from '@parkeazy/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../auth/guards/tenant.guard.js';
import { Public } from '../auth/guards/roles.decorator.js';

@Controller('bookings')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookingsService: BookingsService) {}

  private requireUser(req: any): JwtPayload {
    const user = req.user as JwtPayload | undefined;
    if (!user?.sub || !user?.tenantId) throw new ForbiddenException('Authenticated customer context is required.');
    return user;
  }

  private async requireOwnBooking(id: string, req: any) {
    const user = this.requireUser(req);
    const booking = await this.bookingsService.getBookingById(id);
    if (booking.customerId !== user.sub && !user.roles?.includes('superadmin')) {
      throw new ForbiddenException('You are not authorized to access this booking.');
    }
    if (booking.tenantId !== user.tenantId && !user.roles?.includes('superadmin')) {
      throw new ForbiddenException('Cross-tenant booking access is not permitted.');
    }
    return user;
  }

  @Public()
  @Post('calculate')
  public async calculatePricing(@Body() body: { spaceId: string; startsAt: string; endsAt: string }) {
    if (!body?.spaceId || !body?.startsAt || !body?.endsAt) {
      throw new BadRequestException('spaceId, startsAt, and endsAt are required');
    }
    const data = await this.bookingsService.calculatePricing(body.spaceId, body.startsAt, body.endsAt);
    return { success: true, data };
  }

  @Post('hold')
  public async holdSpace(@Req() req: any, @Body() body: { spaceId: string; startsAt: string; endsAt: string }) {
    const user = this.requireUser(req);
    const data = await this.bookingsService.holdSpace(user.sub, body.spaceId, body.startsAt, body.endsAt);
    return { success: true, data };
  }

  @Post('renew-hold')
  public async renewHold(@Req() req: any, @Body() body: { holdId: string }) {
    if (!body?.holdId) throw new BadRequestException('holdId is required');
    const user = this.requireUser(req);
    const data = await this.bookingsService.renewHold(body.holdId, user.sub);
    return { success: true, data };
  }

  @Post('release-hold')
  public async releaseHold(@Req() req: any, @Body() body: { holdId: string }) {
    const user = this.requireUser(req);
    if (!body?.holdId) throw new BadRequestException('holdId is required');
    const data = await this.bookingsService.releaseHold(body.holdId, user.sub);
    return { success: true, data };
  }

  @Public()
  @Get('alternatives/search')
  public async getAlternatives(
    @Req() req: any,
  ) {
    const spaceId = req.query.spaceId || '10000000-0000-4000-b000-000000000104-01';
    const startsAt = req.query.startsAt || new Date().toISOString();
    const endsAt = req.query.endsAt || new Date(Date.now() + 2 * 3600000).toISOString();
    const data = await this.bookingsService.getAlternativeSpaces(spaceId, startsAt, endsAt);
    return { success: true, data };
  }

  @Post()
  public async createBooking(@Req() req: any, @Body() body: CreateBookingPayload) {
    const user = this.requireUser(req);
    if (!body?.spaceId || !body?.vehiclePlate) {
      throw new BadRequestException('spaceId and vehiclePlate are required');
    }
    const data = await this.bookingsService.createBooking(user.sub, user.tenantId, body);
    return { success: true, data };
  }

  @Get('my')
  public async getMyBookings(@Req() req: any) {
    const user = this.requireUser(req);
    const data = await this.bookingsService.getMyBookings(user.sub, user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  public async getBookingById(@Param('id') id: string, @Req() req: any) {
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.getBookingById(id);
    return { success: true, data };
  }

  @Get(':id/pass')
  public async getPass(@Param('id') id: string, @Req() req: any) {
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.getPass(id);
    return { success: true, data };
  }

  @Post(':id/cancel-preview')
  public async previewCancel(@Param('id') id: string, @Req() req: any) {
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.previewCancelBooking(id);
    return { success: true, data };
  }

  @Get(':id/overstay')
  public async getOverstay(@Param('id') id: string, @Req() req: any) {
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.getOverstayDetails(id);
    return { success: true, data };
  }

  @Post(':id/support')
  public async createSupport(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { category: string; description: string }
  ) {
    const user = this.requireUser(req);
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.createSupportTicket(id, user.sub, body.category || 'other', body.description || '');
    return { success: true, data };
  }

  @Post(':id/check-in')
  public async checkIn(@Param('id') id: string, @Req() req: any) {
    const user = await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.checkIn(id, user.sub);
    return { success: true, data };
  }

  @Post(':id/check-out')
  public async checkOut(@Param('id') id: string, @Req() req: any) {
    const user = await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.checkOut(id, user.sub);
    return { success: true, data };
  }

  @Post(':id/extend')
  public async extendBooking(@Param('id') id: string, @Req() req: any, @Body() body: { additionalHours?: number }) {
    const user = await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.extendBooking(id, body?.additionalHours || 1, user.sub);
    return { success: true, data };
  }

  @Post(':id/cancel')
  public async cancelBooking(@Param('id') id: string, @Req() req: any, @Body() body: { reason?: string }) {
    const user = await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.cancelBooking(id, body?.reason, user.sub);
    return { success: true, data };
  }

  @Get(':id/receipt')
  public async getReceipt(@Param('id') id: string, @Req() req: any) {
    await this.requireOwnBooking(id, req);
    const data = await this.bookingsService.getReceipt(id);
    return { success: true, data };
  }
}
