import { PaginationParams } from '@parkeazy/shared-types';
import { ValidationResult } from './tenant-validator';

export interface PaginationValidationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export function validatePaginationParams(
  params: unknown,
  options: PaginationValidationOptions = {}
): ValidationResult<PaginationParams> {
  const errors: string[] = [];
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;

  if (params === null || params === undefined) {
    return {
      success: true,
      data: { page: 1, limit: defaultLimit },
      errors: [],
    };
  }

  if (typeof params !== 'object') {
    return {
      success: false,
      errors: ['Pagination parameters must be an object'],
    };
  }

  const p = params as Record<string, any>;
  let page = 1;
  let limit = defaultLimit;

  if (p.page !== undefined && p.page !== null && p.page !== '') {
    const parsedPage = Number(p.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      errors.push('page must be an integer greater than or equal to 1');
    } else {
      page = parsedPage;
    }
  }

  if (p.limit !== undefined && p.limit !== null && p.limit !== '') {
    const parsedLimit = Number(p.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      errors.push('limit must be an integer greater than or equal to 1');
    } else if (parsedLimit > maxLimit) {
      errors.push(`limit cannot exceed ${maxLimit}`);
    } else {
      limit = parsedLimit;
    }
  }

  let cursor: string | undefined = undefined;
  if (p.cursor !== undefined && p.cursor !== null) {
    if (typeof p.cursor !== 'string' || p.cursor.length > 512) {
      errors.push('cursor must be a valid string not exceeding 512 characters');
    } else {
      cursor = p.cursor;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { page, limit, ...(cursor ? { cursor } : {}) },
    errors: [],
  };
}
