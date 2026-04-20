/**
 * Rate limiting and security middleware for API routes.
 * Protects against abuse and implements security best practices.
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { logger } from "./gcp-monitoring";
import { sanitizeInput as sanitizeSecurityInput } from "./security";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

/**
 * In-memory rate limit store (use Redis/Memorystore in production for distributed systems)
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is within rate limit
   */
  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      // First request or expired window
      const resetAt = now + config.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

const rateLimitStore = new RateLimitStore();

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request): Promise<NextResponse | null> => {
    // Get client identifier (IP address or auth token)
    const clientId = getClientIdentifier(req);
    
    const result = rateLimitStore.check(clientId, config);

    if (!result.allowed) {
      const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
      
      logger.warn("Rate limit exceeded", {
        clientId,
        endpoint: new URL(req.url).pathname,
      });

      return NextResponse.json(
        {
          error: config.message || "Too many requests. Please try again later.",
          retryAfter: resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": resetInSeconds.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(result.resetAt).toISOString());

    return null; // Allow request to proceed
  };
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(req: Request): string {
  // Prefer a stable hash of auth credentials when present.
  // This avoids exposing token fragments in memory/logs.
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const digest = createHash("sha256").update(token).digest("hex").slice(0, 20);
      return `token:${digest}`;
    }
  }

  // Fall back to client IP from trusted proxy headers.
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : realIp?.trim() || "unknown";
  
  return `ip:${ip}`;
}

/**
 * Validate API key middleware
 */
export function validateApiKey(req: Request, envKey: string): NextResponse | null {
  const expectedKey = process.env[envKey];
  
  if (!expectedKey) {
    // No key configured, allow in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    
    logger.error(`API key not configured: ${envKey}`);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const providedKey = 
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.headers.get("x-api-key");

  if (!providedKey || providedKey !== expectedKey) {
    logger.warn("Invalid API key attempt", {
      endpoint: new URL(req.url).pathname,
      clientId: getClientIdentifier(req),
    });

    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 }
    );
  }

  return null; // Valid API key
}

/**
 * Validate cron secret for scheduled jobs
 */
export function validateCronSecret(req: Request): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    
    logger.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const providedSecret = 
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.headers.get("x-cron-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    logger.warn("Invalid cron secret attempt", {
      endpoint: new URL(req.url).pathname,
    });

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // Valid cron secret
}

/**
 * CORS middleware with configurable origins
 */
export function corsMiddleware(req: Request, allowedOrigins: string[]): NextResponse {
  const origin = req.headers.get("origin");
  const response = NextResponse.next();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  return response;
}

/**
 * Standard rate limits for different endpoint types
 */
export const RATE_LIMITS = {
  // Public endpoints - generous limits
  PUBLIC: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    message: "Too many requests. Please try again in a minute.",
  },
  
  // Chat/AI endpoints - moderate limits
  CHAT: {
    maxRequests: 20,
    windowMs: 60000,
    message: "Chat rate limit exceeded. Please wait before sending more messages.",
  },
  
  // Sensor/write endpoints - strict limits
  SENSORS: {
    maxRequests: 1000,
    windowMs: 60000,
    message: "Sensor data rate limit exceeded.",
  },
  
  // Authentication attempts - very strict
  AUTH: {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
    message: "Too many authentication attempts. Please try again later.",
  },
};

/**
 * Input sanitization helper
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return sanitizeSecurityInput(input).slice(0, maxLength);
}

/**
 * Validate request body size
 */
export function validateBodySize(body: unknown, maxBytes: number = 100000): boolean {
  const size = JSON.stringify(body).length;
  return size <= maxBytes;
}

// Export store for testing
export { rateLimitStore };
