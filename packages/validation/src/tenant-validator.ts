export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { success: true, data, errors: [] };
}
export function validationFailure<T = never>(...errors: string[]): ValidationResult<T> {
  return { success: false, errors };
}
