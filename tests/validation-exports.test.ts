import { describe, expect, it } from 'vitest';
import { validateLoginPayload, validateSignupPayload } from '@parkeazy/validation';

describe('API validation workspace exports', () => {
  it('exports login and signup validators through the public package entry point', () => {
    expect(validateLoginPayload).toBeTypeOf('function');
    expect(validateSignupPayload).toBeTypeOf('function');
  });

  it('rejects an empty login payload instead of bypassing validation', () => {
    const result = validateLoginPayload({});
    expect(result.success).toBe(false);
  });
});
