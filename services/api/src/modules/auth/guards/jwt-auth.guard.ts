import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './roles.decorator.js';
import { verifyJwt } from '../jwt.util.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {
    const configuredSecret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
    }
    this.jwtSecret = configuredSecret || 'parkeazy-development-super-secret-key-2026!';
  }

  public canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7).trim();

    try {
      const payload = verifyJwt(token, this.jwtSecret);
      request.user = payload;
      return true;
    } catch (err: any) {
      throw new UnauthorizedException(`Unauthorized: ${err.message || 'Token verification failed'}`);
    }
  }
}
