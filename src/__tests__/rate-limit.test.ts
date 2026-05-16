import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit (in-memory)', () => {
  beforeEach(() => {
    // Clear the global store between tests
    globalThis.openWaitlistRateLimitStore?.clear();
  });

  it('allows requests under the limit', () => {
    const result = checkRateLimit('test:key', 3, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('counts requests correctly', () => {
    checkRateLimit('test:key2', 3, 60_000);
    checkRateLimit('test:key2', 3, 60_000);
    const result = checkRateLimit('test:key2', 3, 60_000);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    checkRateLimit('test:key3', 2, 60_000);
    checkRateLimit('test:key3', 2, 60_000);
    const result = checkRateLimit('test:key3', 2, 60_000);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    checkRateLimit('test:a', 1, 60_000);
    const resultA = checkRateLimit('test:a', 1, 60_000);
    const resultB = checkRateLimit('test:b', 1, 60_000);

    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });

  it('includes resetAt in the future', () => {
    const before = Date.now();
    const result = checkRateLimit('test:key4', 5, 60_000);

    expect(result.resetAt).toBeGreaterThan(before);
    expect(result.resetAt).toBeLessThanOrEqual(before + 60_000 + 100);
  });
});
