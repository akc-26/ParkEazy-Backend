import { Controller, Get, Post, Put, Body, Param, Query, Inject } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('overview')
  public async getOverview() {
    const data = await this.adminService.getPlatformOverview();
    return { success: true, data };
  }

  @Get('users')
  public async getUsers(@Query('role') role?: string) {
    const data = await this.adminService.getAllUsers(role);
    return { success: true, data };
  }

  @Put('users/:id/status')
  public async updateUserStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const data = await this.adminService.updateUserStatus(id, body.status);
    return { success: true, data };
  }

  @Get('hosts')
  public async getHosts() {
    const data = await this.adminService.getAllHosts();
    return { success: true, data };
  }

  @Post('hosts/:id/approve')
  public async approveHost(@Param('id') id: string) {
    const data = await this.adminService.approveHost(id);
    return { success: true, data };
  }

  @Post('hosts/:id/reject')
  public async rejectHost(@Param('id') id: string, @Body() body: { reason?: string }) {
    const data = await this.adminService.rejectHost(id, body?.reason);
    return { success: true, data };
  }

  @Get('facilities')
  public async getFacilities() {
    const data = await this.adminService.getAllFacilities();
    return { success: true, data };
  }

  @Post('facilities/:id/moderate')
  public async moderateFacility(@Param('id') id: string, @Body() body: { status: string }) {
    const data = await this.adminService.moderateFacility(id, body.status);
    return { success: true, data };
  }

  @Get('bookings')
  public async getBookings(@Query('status') status?: string) {
    const data = await this.adminService.getAllBookings(status);
    return { success: true, data };
  }

  @Get('audit-logs')
  public getAuditLogs() {
    const data = this.adminService.getAuditLogs();
    return { success: true, data };
  }
}
