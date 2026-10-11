import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { JwtPayload, CreateBookingPayload } from '@parkeazy/shared-types';

@Controller('bookings')
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookingsService: BookingsService) {}

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
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000003' };
    const data = await this.bookingsService.holdSpace(user.sub, body.spaceId, body.startsAt, body.endsAt);
    return { success: true, data };
  }

  @Post()
  public async createBooking(@Req() req: any, @Body() body: CreateBookingPayload) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000003', tenantId: 'default' };
    if (!body?.spaceId || !body?.vehiclePlate) {
      throw new BadRequestException('spaceId and vehiclePlate are required');
    }
    const data = await this.bookingsService.createBooking(user.sub, user.tenantId, body);
    return { success: true, data };
  }

  @Get('my')
  public async getMyBookings(@Req() req: any) {
    const user = (req.user as JwtPayload) || { sub: '00000000-0000-4000-a000-000000000003' };
    const data = await this.bookingsService.getMyBookings(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  public async getBookingById(@Param('id') id: string) {
    const data = await this.bookingsService.getBookingById(id);
    return { success: true, data };
  }

  @Post(':id/check-in')
  public async checkIn(@Param('id') id: string) {
    const data = await this.bookingsService.checkIn(id);
    return { success: true, data };
  }

  @Post(':id/check-out')
  public async checkOut(@Param('id') id: string) {
    const data = await this.bookingsService.checkOut(id);
    return { success: true, data };
  }

  @Post(':id/extend')
  public async extendBooking(@Param('id') id: string, @Body() body: { additionalHours?: number }) {
    const data = await this.bookingsService.extendBooking(id, body?.additionalHours || 1);
    return { success: true, data };
  }

  @Post(':id/cancel')
  public async cancelBooking(@Param('id') id: string, @Body() body: { reason?: string }) {
    const data = await this.bookingsService.cancelBooking(id, body?.reason);
    return { success: true, data };
  }

  @Get(':id/receipt')
  public async getReceipt(@Param('id') id: string) {
    const data = await this.bookingsService.getReceipt(id);
    return { success: true, data };
  }
}
