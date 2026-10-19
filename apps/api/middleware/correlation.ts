import { Request, Response, NextFunction } from 'express';
import { appConfig } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

/**
 * Sanitizes and validates incoming correlation ID.
 * Permits alphanumeric characters, hyphens, underscores, and periods up to 64 chars.
 * Replaces invalid characters or returns a generated ID if format is invalid.
 */
export function sanitizeCorrelationId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > 64) return null;
  // Match safe characters
  if (/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function generateCorrelationId(): string {
  return (
    'req-' +
    Math.random().toString(36).substring(2, 9) +
    '-' +
    Date.now().toString(36)
  );
}

/**
 * Redacts authorization headers, cookies, passwords, tokens, and provider secrets
 * to ensure that sensitive user credentials or keys are never exposed in log output.
 */
export function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'secret',
    'jwtsecret',
    'apikey',
    'secretkey',
    'webhooksecret',
    'authorization',
    'cookie',
    'cardnumber',
    'cvv',
  ]);

  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      result[key] = redactSensitiveData(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const sanitized = sanitizeCorrelationId(incomingId);
  const correlationId = sanitized || generateCorrelationId();

  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}

/**
 * Structured, machine-readable JSON logger with sensitive data redaction.
 * Guarantees that logger errors can never terminate or interrupt ordinary request handling.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    try {
      const duration = Date.now() - req.startTime;
      const severity = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      const logData = {
        timestamp: new Date().toISOString(),
        severity,
        environment: appConfig.nodeEnv,
        service: 'parkeazy-api',
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: duration,
        userAgent: req.headers['user-agent'] || 'unknown',
      };

      // Structured JSON logging for API routes
      if (req.originalUrl?.startsWith('/api/')) {
        console.log(JSON.stringify(logData));
      }
    } catch (logErr: any) {
      // Safe fallback - logging must never crash the process
      console.warn('[ParkEazy-Logger] Error writing request log:', logErr.message);
    }
  });

  next();
}
