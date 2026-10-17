import { Request, Response, NextFunction } from 'express';
import { ApiErrorDetail } from '../../../packages/contracts';
import { ValidationError } from './error-handler';

export type RuleLocation = 'body' | 'query' | 'params';

export interface ValidationRule {
  field: string;
  location?: RuleLocation;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: (string | number)[];
  pattern?: RegExp;
  custom?: (val: any) => string | null; // return error message or null if valid
  customMessage?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const CommonValidators = {
  isValidEmail(val: string): boolean {
    return typeof val === 'string' && EMAIL_REGEX.test(val.trim());
  },
  isValidIsoDate(val: string): boolean {
    if (typeof val !== 'string' || !ISO_DATE_REGEX.test(val)) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  isValidId(val: string): boolean {
    return typeof val === 'string' && /^[a-zA-Z0-9_\-]{2,64}$/.test(val);
  },
};

/**
 * Creates an Express middleware that validates request parameters, query strings, and body fields.
 * Collects all validation failures and returns a structured 400 Bad Request response with details.
 */
export function validate(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: ApiErrorDetail[] = [];

    for (const rule of rules) {
      const loc = rule.location || 'body';
      const container = req[loc] || {};
      const val = container[rule.field];

      // Check required
      if (val === undefined || val === null || val === '') {
        if (rule.required) {
          details.push({
            field: rule.field,
            code: 'REQUIRED_FIELD_MISSING',
            message: rule.customMessage || `Field '${rule.field}' in ${loc} is required.`,
          });
        }
        continue;
      }

      // Check type
      if (rule.type) {
        if (rule.type === 'number') {
          const num = typeof val === 'number' ? val : Number(val);
          if (isNaN(num)) {
            details.push({
              field: rule.field,
              code: 'INVALID_TYPE',
              message: `Field '${rule.field}' must be a valid number.`,
            });
            continue;
          }
        } else if (rule.type === 'boolean') {
          if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
            details.push({
              field: rule.field,
              code: 'INVALID_TYPE',
              message: `Field '${rule.field}' must be a boolean.`,
            });
            continue;
          }
        } else if (rule.type === 'array') {
          if (!Array.isArray(val)) {
            details.push({
              field: rule.field,
              code: 'INVALID_TYPE',
              message: `Field '${rule.field}' must be an array.`,
            });
            continue;
          }
        } else if (rule.type === 'string') {
          if (typeof val !== 'string') {
            details.push({
              field: rule.field,
              code: 'INVALID_TYPE',
              message: `Field '${rule.field}' must be a string.`,
            });
            continue;
          }
        }
      }

      // String lengths
      if (typeof val === 'string') {
        if (rule.minLength !== undefined && val.length < rule.minLength) {
          details.push({
            field: rule.field,
            code: 'STRING_TOO_SHORT',
            message: `Field '${rule.field}' must have at least ${rule.minLength} character(s).`,
          });
        }
        if (rule.maxLength !== undefined && val.length > rule.maxLength) {
          details.push({
            field: rule.field,
            code: 'STRING_TOO_LONG',
            message: `Field '${rule.field}' cannot exceed ${rule.maxLength} characters.`,
          });
        }
      }

      // Number ranges
      if (rule.type === 'number' || typeof val === 'number') {
        const numVal = Number(val);
        if (rule.min !== undefined && numVal < rule.min) {
          details.push({
            field: rule.field,
            code: 'NUMBER_TOO_SMALL',
            message: `Field '${rule.field}' must be at least ${rule.min}.`,
          });
        }
        if (rule.max !== undefined && numVal > rule.max) {
          details.push({
            field: rule.field,
            code: 'NUMBER_TOO_LARGE',
            message: `Field '${rule.field}' cannot exceed ${rule.max}.`,
          });
        }
      }

      // Enum check
      if (rule.enum && !rule.enum.includes(val)) {
        details.push({
          field: rule.field,
          code: 'INVALID_ENUM_VALUE',
          message: `Field '${rule.field}' must be one of: ${rule.enum.join(', ')}.`,
        });
      }

      // Pattern check
      if (rule.pattern && typeof val === 'string' && !rule.pattern.test(val)) {
        details.push({
          field: rule.field,
          code: 'PATTERN_MISMATCH',
          message: rule.customMessage || `Field '${rule.field}' has an invalid format.`,
        });
      }

      // Custom check
      if (rule.custom) {
        const errMessage = rule.custom(val);
        if (errMessage) {
          details.push({
            field: rule.field,
            code: 'VALIDATION_FAILED',
            message: errMessage,
          });
        }
      }
    }

    if (details.length > 0) {
      return next(new ValidationError(details, 'Request validation failed.'));
    }

    next();
  };
}
