import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './roles.decorator.js';
import { JwtPayload } from '@parkeazy/shared-types';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return true;
    }

    const requestTenantId = request.headers['x-tenant-id'] || 'default';

    // Allow superadmin cross-tenant inspection
    if (user.roles && user.roles.includes('superadmin')) {
      return true;
    }

    // Validate that user is operating within their authenticated tenant boundary
    if (user.tenantId && user.tenantId !== requestTenantId) {
      throw new ForbiddenException(
        `Cross-tenant access denied: authenticated for '${user.tenantId}', attempted '${requestTenantId}'`
      );
    }

    return true;
  }
}
