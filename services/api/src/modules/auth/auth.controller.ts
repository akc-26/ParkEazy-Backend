import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { TenantGuard } from './guards/tenant.guard.js';
import { Public } from './guards/roles.decorator.js';
import { JwtPayload } from '@parkeazy/shared-types';
import {
  validateLoginPayload,
  validateSignupPayload,
} from '@parkeazy/validation';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    const valResult = validateLoginPayload(body);
    if (!valResult.success) {
      throw new BadRequestException(valResult.errors?.join('; ') || 'Invalid login payload');
    }
    const data = await this.authService.login(valResult.data!, tenantIdHeader);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  public async register(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    const valResult = validateSignupPayload(body);
    if (!valResult.success) {
      throw new BadRequestException(valResult.errors?.join('; ') || 'Invalid registration payload');
    }
    const data = await this.authService.register(valResult.data!, tenantIdHeader);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  public async sendOtp(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    if (!body || !body.destination) {
      throw new BadRequestException('Destination phone or email is required for OTP challenge');
    }
    const data = await this.authService.sendOtp(
      {
        destination: body.destination,
        channel: body.channel || 'sms',
        purpose: body.purpose || 'login',
        tenantId: body.tenantId,
      },
      tenantIdHeader
    );
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  public async verifyOtp(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    if (!body || !body.challengeId || !body.code) {
      throw new BadRequestException('ChallengeId and 6-digit code are required');
    }
    const data = await this.authService.verifyOtp(
      {
        challengeId: body.challengeId,
        code: body.code,
        destination: body.destination || '',
        tenantId: body.tenantId,
      },
      tenantIdHeader
    );
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const data = await this.authService.refreshToken(refreshToken, tenantIdHeader);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logout(@Body() body?: Record<string, any>) {
    await this.authService.logout(body?.refreshToken);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  public async forgotPassword(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    if (!body || !body.email) {
      throw new BadRequestException('Email address is required for password recovery');
    }
    const data = await this.authService.forgotPassword(
      { email: body.email, tenantId: body.tenantId },
      tenantIdHeader
    );
    return {
      success: true,
      data,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  public async resetPassword(
    @Body() body: Record<string, any>,
    @Headers('x-tenant-id') tenantIdHeader?: string
  ) {
    if (!body || !body.token || !body.newPassword) {
      throw new BadRequestException('Reset token and new password are required');
    }
    const data = await this.authService.resetPassword(
      {
        token: body.token,
        newPassword: body.newPassword,
        tenantId: body.tenantId,
      },
      tenantIdHeader
    );
    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('me')
  public async me(@Req() req: any) {
    const userPayload = req.user as JwtPayload;
    const user = await this.authService.getUserById(userPayload.sub, userPayload.tenantId);
    return {
      success: true,
      data: user || userPayload,
    };
  }
}
