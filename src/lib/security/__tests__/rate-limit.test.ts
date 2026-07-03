import { describe, expect, it, beforeEach } from 'vitest';
import {
  checkRateLimit,
  clearRateLimit,
  isRateLimitExceeded,
  recordRateLimitAttempt,
  resetRateLimitForTests,
} from '../rate-limit';

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

  it('can peek before recording manual attempts', async () => {
    await expect(isRateLimitExceeded('failed-login:test', 2, 60_000)).resolves.toBe(false);
    await expect(recordRateLimitAttempt('failed-login:test', 2, 60_000)).resolves.toBe(true);
    await expect(isRateLimitExceeded('failed-login:test', 2, 60_000)).resolves.toBe(false);
    await expect(recordRateLimitAttempt('failed-login:test', 2, 60_000)).resolves.toBe(true);
    await expect(isRateLimitExceeded('failed-login:test', 2, 60_000)).resolves.toBe(true);
    await expect(recordRateLimitAttempt('failed-login:test', 2, 60_000)).resolves.toBe(false);
  });

  it('clears manual attempts after a successful action', async () => {
    await expect(recordRateLimitAttempt('failed-login:test', 1, 60_000)).resolves.toBe(true);
    await expect(isRateLimitExceeded('failed-login:test', 1, 60_000)).resolves.toBe(true);
    await clearRateLimit('failed-login:test');
    await expect(isRateLimitExceeded('failed-login:test', 1, 60_000)).resolves.toBe(false);
  });
});
