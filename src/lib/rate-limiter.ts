import { createAdminClient } from './supabase/server';

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/fixtures': { windowSeconds: 60, maxRequests: 30 },
  '/api/reveal': { windowSeconds: 60, maxRequests: 10 },
  '/api/predict': { windowSeconds: 60, maxRequests: 5 },
};

export function getRateLimitConfig(route: string): RateLimitConfig {
  return ROUTE_LIMITS[route] ?? { windowSeconds: 60, maxRequests: 30 };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Check if a request is within rate limits for the given route.
 * Uses atomic increment RPC for authenticated users, IP-based fallback for anonymous.
 */
export async function checkRateLimit(
  userId: string | null,
  ipAddress: string,
  route: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = getRateLimitConfig(route);
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = windowStart.getTime() + windowMs;

  try {
    const supabase = await createAdminClient();

    if (userId) {
      // Atomic increment via RPC for authenticated users
      const { data, error } = await supabase.rpc('increment_rate_limit', {
        p_user_id: userId,
        p_route: route,
        p_window_start: windowStart.toISOString(),
      });

      if (error) throw error;
      const count = data as number;
      return {
        allowed: count <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        resetAt,
      };
    }

    // IP-based limiting for anonymous users
    const { data, error } = await supabase.rpc('increment_rate_limit_by_ip', {
      p_ip_address: ipAddress,
      p_route: route,
      p_window_start: windowStart.toISOString(),
    });

    if (error) throw error;
    const count = data as number;
    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
    };
  } catch {
    // Fail open: if rate limiting infrastructure isn't ready (e.g. migrations not applied),
    // allow the request through. Rate limiting errors should never block the app.
    return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowSeconds * 1000 };
  }
}

/**
 * Build standard rate limit response headers.
 */
export function buildRateLimitHeaders(info: {
  remaining: number;
  resetAt: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': String(Math.ceil(info.resetAt / 1000)),
  };
}
