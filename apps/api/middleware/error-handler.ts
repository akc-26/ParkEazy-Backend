import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, ApiErrorDetail } from '../../../packages/contracts';
import { appConfig } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: ApiErrorDetail[];

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details: ApiErrorDetail[], message = 'Request validation failed') {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resourceName = 'Resource', id?: string) {
    const message = id
      ? `${resourceName} with ID '${id}' was not found.`
      : `${resourceName} was not found.`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ApiErrorDetail[]) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required to access this resource') {
    super(message, 401, 'UNAUTHENTICATED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Maps PostgreSQL specific error codes to safe, structured HTTP errors.
 */
function handleDatabaseError(err: any): { statusCode: number; code: string; message: string } {
  // PostgreSQL error code reference:
  // 23505 = unique_violation
  // 23503 = foreign_key_violation
  // 23502 = not_null_violation
  // 23514 = check_violation
  // 08001 / 08006 = connection errors
  if (err.code === '23505') {
    return {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'A resource with these details already exists.',
    };
  }
  if (err.code === '23503') {
    return {
      statusCode: 400,
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced entity does not exist.',
    };
  }
  if (err.code === '23502') {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'A required database field was not provided.',
    };
  }
  if (err.code?.startsWith('08')) {
    return {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database service is currently unreachable.',
    };
  }
  return {
    statusCode: 500,
    code: 'DATABASE_ERROR',
    message: 'A database operation failed.',
  };
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers were already written to the stream, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const correlationId = req.correlationId || 'unknown';
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected internal server error occurred.';
  let details: ApiErrorDetail[] | undefined = undefined;

  // 1. JSON parsing syntax errors (e.g., malformed request body)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Invalid JSON in request payload.';
  }
  // 2. Custom AppErrors and subclasses
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // 3. PostgreSQL Database errors
  else if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' && (err.code.length === 5 || err.routine)) {
    const dbErr = handleDatabaseError(err);
    statusCode = dbErr.statusCode;
    code = dbErr.code;
    message = dbErr.message;
  }
  // 4. Other standard errors
  else if (err instanceof Error) {
    statusCode = (err as any).status || (err as any).statusCode || 500;
    code = (err as any).code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');

    // Never leak internal stack traces or internal messages in production 5xx responses
    if (statusCode >= 500) {
      if (appConfig.nodeEnv === 'production') {
        message = 'An unexpected internal server error occurred.';
      } else {
        message = err.message || 'Internal server error.';
      }
    } else {
      message = err.message;
    }
  }

  // Diagnostic log without leaking credentials or client secrets
  console.error(
    `[ParkEazy-Error] [${correlationId}] ${req.method} ${req.originalUrl || req.url} - ${statusCode} ${code}: ${message}`
  );

  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(responseBody);
}
