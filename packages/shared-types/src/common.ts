/**
 * @fileoverview Common domain types, identifiers, pagination, monetary models, and API responses.
 * Browser-safe and server-safe with zero native runtime dependencies.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface TimeWindow {
  startsAt: string; // ISO-8601
  endsAt: string;   // ISO-8601
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  validationErrors?: string[];
  timestamp: string;
  path: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
