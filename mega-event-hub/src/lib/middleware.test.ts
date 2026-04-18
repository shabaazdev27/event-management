/**
 * Comprehensive test suite for rate limiting and security middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createRateLimiter,
  RATE_LIMITS,
  validateApiKey,
  validateCronSecret,
  sanitizeInput,
  validateBodySize,
  rateLimitStore,
} from "./middleware";

describe("Rate Limiting Middleware", () => {
  beforeEach(() => {
    rateLimitStore.clear();
  });

  it("should allow requests within rate limit", async () => {
    const rateLimiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const response = await rateLimiter(req);
    expect(response).toBeNull(); // Allowed
  });

  it("should block requests exceeding rate limit", async () => {
    const rateLimiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 60000,
      message: "Rate limit exceeded",
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    // First two requests should pass
    await rateLimiter(req);
    await rateLimiter(req);

    // Third request should be blocked
    const response = await rateLimiter(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);

    const data = await response?.json();
    expect(data).toMatchObject({
      error: "Rate limit exceeded",
    });
  });

  it("should include rate limit headers", async () => {
    const rateLimiter = createRateLimiter(RATE_LIMITS.PUBLIC);

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });

    const response = await rateLimiter(req);
    expect(response).toBeNull(); // First request allowed
  });

  it("should use different limits for different IPs", async () => {
    const rateLimiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 60000,
    });

    const req1 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const req2 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.2" },
    });

    await rateLimiter(req1);
    const response = await rateLimiter(req2);
    expect(response).toBeNull(); // Different IP, should be allowed
  });
});

describe("API Key Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  });

  it("should allow requests with valid API key", () => {
    process.env.TEST_API_KEY = "secret123";

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-api-key": "secret123" },
    });

    const response = validateApiKey(req, "TEST_API_KEY");
    expect(response).toBeNull();
  });

  it("should block requests with invalid API key", () => {
    process.env.TEST_API_KEY = "secret123";
    vi.stubEnv("NODE_ENV", "production");

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-api-key": "wrong" },
    });

    const response = validateApiKey(req, "TEST_API_KEY");
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  it("should allow requests in development without key", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.TEST_API_KEY;

    const req = new NextRequest("http://localhost:3000/api/test");

    const response = validateApiKey(req, "TEST_API_KEY");
    expect(response).toBeNull();
  });

  it("should accept API key from Authorization header", () => {
    process.env.TEST_API_KEY = "secret123";

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer secret123" },
    });

    const response = validateApiKey(req, "TEST_API_KEY");
    expect(response).toBeNull();
  });
});

describe("Cron Secret Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  });

  it("should allow requests with valid cron secret", () => {
    process.env.CRON_SECRET = "cron123";

    const req = new NextRequest("http://localhost:3000/api/cron/process", {
      headers: { "x-cron-secret": "cron123" },
    });

    const response = validateCronSecret(req);
    expect(response).toBeNull();
  });

  it("should block requests with invalid cron secret", () => {
    process.env.CRON_SECRET = "cron123";
    vi.stubEnv("NODE_ENV", "production");

    const req = new NextRequest("http://localhost:3000/api/cron/process", {
      headers: { "x-cron-secret": "wrong" },
    });

    const response = validateCronSecret(req);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });
});

describe("Input Sanitization", () => {
  it("should remove HTML tags", () => {
    const input = "Hello <script>alert('xss')</script> World";
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe("Hello scriptalert('xss')/script World");
  });

  it("should trim whitespace", () => {
    const input = "  Hello World  ";
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe("Hello World");
  });

  it("should enforce max length", () => {
    const input = "a".repeat(2000);
    const sanitized = sanitizeInput(input, 100);
    expect(sanitized.length).toBe(100);
  });

  it("should handle empty strings", () => {
    const sanitized = sanitizeInput("");
    expect(sanitized).toBe("");
  });
});

describe("Body Size Validation", () => {
  it("should allow small bodies", () => {
    const body = { message: "Hello" };
    const isValid = validateBodySize(body, 1000);
    expect(isValid).toBe(true);
  });

  it("should reject large bodies", () => {
    const body = { message: "a".repeat(100000) };
    const isValid = validateBodySize(body, 1000);
    expect(isValid).toBe(false);
  });

  it("should handle arrays", () => {
    const body = [1, 2, 3, 4, 5];
    const isValid = validateBodySize(body, 100);
    expect(isValid).toBe(true);
  });
});
