import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitForTests } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimitForTests());

  it('allows requests under the limit', () => {
    expect(checkRateLimit('login:test', 2, 60_000)).toBe(true);
    expect(checkRateLimit('login:test', 2, 60_000)).toBe(true);
  });

  it('blocks requests over the limit', () => {
    expect(checkRateLimit('login:test', 1, 60_000)).toBe(true);
    expect(checkRateLimit('login:test', 1, 60_000)).toBe(false);
  });
});
