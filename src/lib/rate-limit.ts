import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

type DurableRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
};

declare global {
  var openWaitlistRateLimitStore: Map<string, RateLimitEntry> | undefined;
  var openWaitlistRateLimitSweep: ReturnType<typeof setInterval> | undefined;
}

const store = globalThis.openWaitlistRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.openWaitlistRateLimitStore = store;

if (!globalThis.openWaitlistRateLimitSweep) {
  globalThis.openWaitlistRateLimitSweep = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 60_000);
}

function readPositiveInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('true-client-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;

  return {
    success: true,
    limit,
    remaining: limit - current.count,
    resetAt: current.resetAt,
  };
}

async function checkDurableRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowMs: number,
) {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const { data, error } = await supabaseAdmin
    .rpc('check_waitlist_rate_limit', {
      rate_bucket: bucket,
      rate_identifier: identifier,
      max_attempts: limit,
      window_seconds: windowSeconds,
    })
    .maybeSingle<DurableRateLimitResult>();

  if (error || !data) {
    if (error) {
      console.warn('Durable rate limit check failed, falling back to memory:', error);
    }

    return checkRateLimit(`${bucket}:${identifier}`, limit, windowMs);
  }

  const resetAt = new Date(data.reset_at).getTime();

  return {
    success: data.allowed,
    limit,
    remaining: data.remaining,
    resetAt: Number.isFinite(resetAt) ? resetAt : Date.now() + data.retry_after_seconds * 1000,
  };
}

export function checkSignupIpRateLimit(request: NextRequest) {
  const clientIp = getClientIp(request);
  const limit = readPositiveInt('WAITLIST_RATE_LIMIT_MAX', 10);
  const windowMs = readPositiveInt('WAITLIST_RATE_LIMIT_WINDOW_MS', 60_000);

  return checkDurableRateLimit('waitlist:signup:ip', clientIp, limit, windowMs);
}

export function checkSignupEmailRateLimit(email: string) {
  const limit = readPositiveInt('WAITLIST_EMAIL_RATE_LIMIT_MAX', 3);
  const windowMs = readPositiveInt('WAITLIST_EMAIL_RATE_LIMIT_WINDOW_MS', 60 * 60_000);

  return checkDurableRateLimit('waitlist:signup:email', email, limit, windowMs);
}

export function getRateLimitHeaders(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const headers = new Headers();

  headers.set('Retry-After', retryAfter.toString());
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

  return headers;
}
