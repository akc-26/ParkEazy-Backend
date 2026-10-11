import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
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

  @Get('me/vehicles')
  public async getVehicles(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.usersService.getVehicles(user.sub);
    return {
      success: true,
      data,
    };
  }

  @Post('me/vehicles')
  public async addVehicle(@Req() req: any, @Body() body: any) {
    const user = req.user as JwtPayload;
    if (!body?.plateNumber) {
      throw new BadRequestException('plateNumber is required');
    }
    const data = await this.usersService.addVehicle(user.sub, body);
    return {
      success: true,
      data,
    };
  }

  @Delete('me/vehicles/:id')
  public async deleteVehicle(@Req() req: any, @Param('id') id: string) {
    const user = req.user as JwtPayload;
    const success = await this.usersService.deleteVehicle(user.sub, id);
    return {
      success,
      data: { success },
    };
  }

  @Get('me/favorites')
  public async getFavorites(@Req() req: any) {
    const user = req.user as JwtPayload;
    const data = await this.usersService.getFavorites(user.sub);
    return {
      success: true,
      data,
    };
  }

  @Post('me/favorites/:id/toggle')
  public async toggleFavorite(@Req() req: any, @Param('id') id: string) {
    const user = req.user as JwtPayload;
    const data = await this.usersService.toggleFavorite(user.sub, id);
    return {
      success: true,
      data,
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

