/**
 * Security headers and utilities for API routes
 * Implements OWASP security best practices
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Comprehensive security headers following OWASP guidelines
 */
export const securityHeaders = {
  // Prevent clickjacking attacks
  "X-Frame-Options": "DENY",
  
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",
  
  // Referrer policy for privacy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy to restrict features
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  
  // Strict Transport Security (HTTPS only)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.google-analytics.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

function getAllowedOriginForResponse(): string {
  if (process.env.NODE_ENV === "development") return "*";

  const explicit =
    process.env.ALLOWED_ORIGIN?.trim() ||
    process.env.DEFAULT_ALLOWED_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();

  if (explicit) return explicit;

  const firstFromList = process.env.ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean)[0];

  return firstFromList || "null";
}

/**
 * Apply security headers to a response
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CORS headers for API routes
  const allowOrigin = getAllowedOriginForResponse();
  response.headers.set("Access-Control-Allow-Origin", allowOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Venue-ID, X-Request-ID");
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.set("Vary", "Origin");

  if (allowOrigin !== "*") {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  return response;
}

/**
 * Input sanitization to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Validate and sanitize JSON input
 */
export function validateJsonInput<T>(
  data: unknown,
  requiredFields: string[]
): { valid: boolean; data?: T; errors?: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid input data"] };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Sanitize string fields
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      obj[key] = sanitizeInput(value);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true, data: obj as T };
}

/**
 * Validate venue ID format
 */
export function isValidVenueId(venueId: unknown): venueId is string {
  if (typeof venueId !== "string") return false;
  // Venue IDs should be alphanumeric with optional hyphens/underscores
  return /^[a-zA-Z0-9_-]{1,100}$/.test(venueId);
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: unknown): apiKey is string {
  if (typeof apiKey !== "string") return false;
  // API keys should be 32-64 characters alphanumeric
  return /^[a-zA-Z0-9]{32,64}$/.test(apiKey);
}

/**
 * Generate secure request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request (with proxy support)
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  return "unknown";
}

/**
 * Create error response with security headers
 */
export function createErrorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status }
  );
  
  return withSecurityHeaders(response);
}

/**
 * Create success response with security headers
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return withSecurityHeaders(response);
}

/**
 * Validate request method
 */
export function validateMethod(
  request: NextRequest,
  allowedMethods: string[]
): { valid: boolean; error?: NextResponse } {
  if (!allowedMethods.includes(request.method)) {
    return {
      valid: false,
      error: createErrorResponse(
        `Method ${request.method} not allowed`,
        405,
        { allowed: allowedMethods }
      ),
    };
  }
  
  return { valid: true };
}

/**
 * Validate content type
 */
export function validateContentType(
  request: NextRequest,
  expectedType: string = "application/json"
): { valid: boolean; error?: NextResponse } {
  const contentType = request.headers.get("content-type");
  
  if (!contentType?.includes(expectedType)) {
    return {
      valid: false,
      error: createErrorResponse(
        `Invalid content type. Expected ${expectedType}`,
        415
      ),
    };
  }
  
  return { valid: true };
}

/**
 * OWASP compliance check
 */
export function validateRequest(request: NextRequest): {
  valid: boolean;
  requestId: string;
  clientIp: string;
  error?: NextResponse;
} {
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const clientIp = getClientIp(request);
  
  // Check for suspiciously large requests
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 10_000_000) {
    return {
      valid: false,
      requestId,
      clientIp,
      error: createErrorResponse("Request payload too large", 413),
    };
  }
  
  return { valid: true, requestId, clientIp };
}
