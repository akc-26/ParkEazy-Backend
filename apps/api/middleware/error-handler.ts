import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../../packages/contracts';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: any[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.correlationId || 'unknown';
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Do not expose stack traces in production / public API responses
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message || 'Internal server error';

  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: err.details,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(responseBody);
}
