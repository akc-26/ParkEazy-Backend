import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, IS_PUBLIC_KEY } from './roles.decorator.js';
import { UserRole, JwtPayload } from '@parkeazy/shared-types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user || !user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('User identity lacks role attributes');
    }

    const hasRole = user.roles.some((r) =>
      requiredRoles.includes(r) || user.roles.includes('superadmin')
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient privileges: requires one of [${requiredRoles.join(', ')}]`
      );
    }

    return true;
  }
}
