import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    crypto.randomUUID();

  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  next();
}
