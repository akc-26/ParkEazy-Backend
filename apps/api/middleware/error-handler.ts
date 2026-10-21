import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const correlationId = (req as any).correlationId || req.headers['x-correlation-id'];

  console.error(`[ParkEazy-Error] [${correlationId}] ${err.message}`, err.stack || '');

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected server error occurred.',
      details: err.details,
    },
    correlationId,
    timestamp: new Date().toISOString(),
  });
}
