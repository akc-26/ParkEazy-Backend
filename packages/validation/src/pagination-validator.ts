import { PaginationParams } from '@parkeazy/shared-types';
export function validatePagination(input: Record<string, unknown>, defaultLimit = 20, maxLimit = 100): Required<Pick<PaginationParams, 'page' | 'limit'>> & Pick<PaginationParams, 'cursor'> {
  const page = Number(input.page ?? 1);
  const limit = Number(input.limit ?? defaultLimit);
  const cursor = typeof input.cursor === 'string' && input.cursor.length <= 512 ? input.cursor : undefined;
  return { page: Number.isInteger(page) && page > 0 ? page : 1, limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, maxLimit) : defaultLimit, cursor };
}
