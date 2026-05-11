import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitForTests } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimitForTests());

  it('allows requests under the limit', async () => {
    await expect(checkRateLimit('login:test', 2, 60_000)).resolves.toBe(true);
    await expect(checkRateLimit('login:test', 2, 60_000)).resolves.toBe(true);
  });

  it('blocks requests over the limit', async () => {
    await expect(checkRateLimit('login:test', 1, 60_000)).resolves.toBe(true);
    await expect(checkRateLimit('login:test', 1, 60_000)).resolves.toBe(false);
  });
});
