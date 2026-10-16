import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = (typeof incomingId === 'string' ? incomingId : null) ||
    'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    // Structured JSON logging
    if (req.originalUrl?.startsWith('/api/v1')) {
      console.log(JSON.stringify(logData));
    }
  });

  next();
}
