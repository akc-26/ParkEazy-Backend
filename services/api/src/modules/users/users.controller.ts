import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { TenantGuard } from '../auth/guards/tenant.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { JwtPayload, HostKycSubmissionPayload } from '@parkeazy/shared-types';
import { validateHostKycPayload } from '@parkeazy/validation';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('profile')
  public async getProfile(@Req() req: any) {
    const user = req.user as JwtPayload;
    const profile = await this.usersService.getProfile(user.sub, user.tenantId);
    return {
      success: true,
      data: profile,
    };
  }

  @Roles('host', 'superadmin')
  @Get('host-profile')
  public async getHostProfile(@Req() req: any) {
    const user = req.user as JwtPayload;
    const profile = await this.usersService.getHostProfile(user.sub, user.tenantId);
    return {
      success: true,
      data: profile,
    };
  }

  @Roles('host', 'superadmin')
  @Put('host-profile')
  public async updateHostProfile(@Req() req: any, @Body() body: any) {
    const user = req.user as JwtPayload;
    const updated = await this.usersService.updateHostProfile(user.sub, user.tenantId, body);
    return {
      success: true,
      data: updated,
    };
  }

  @Roles('host', 'superadmin')
  @Post('host-kyc/submit')
  public async submitHostKyc(@Req() req: any, @Body() body: unknown) {
    const user = req.user as JwtPayload;
    const valResult = validateHostKycPayload(body);
    if (!valResult.success) {
      throw new BadRequestException(valResult.errors?.join('; ') || 'Invalid KYC payload');
    }
    const updated = await this.usersService.submitHostKyc(user.sub, user.tenantId, valResult.data!);
    return {
      success: true,
      data: updated,
    };
  }
}
