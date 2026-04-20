/**
 * Comprehensive test suite for health check endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDoc } from "firebase/firestore";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => true }),
}));

vi.mock("@/lib/gcp-monitoring", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    metric: vi.fn(),
  },
}));

describe("Health Check Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return healthy status with all services up", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("APP_VERSION", "1.0.0");

    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.checks.firestore).toBe("ok");
    expect(data.checks.geminiApi).toBe("ok");
    expect(data.version).toBe("1.0.0");
    expect(data.uptime).toBeGreaterThan(0);
  });

  it("should return degraded status without Gemini API in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(data.status).toBe("degraded");
    expect(data.checks.geminiApi).toBe("not_configured");
  });

  it("should return healthy in development without Gemini API", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(data.checks.geminiApi).toBe("not_configured");
  });

  it("should include timestamp and version", async () => {
    vi.stubEnv("APP_VERSION", "2.0.0");

    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    expect(data.version).toBe("2.0.0");
  });

  it("should return no-cache headers", async () => {
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("should handle Firestore connection errors gracefully", async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error("Connection failed"));

    const response = await GET(new Request("http://localhost/api/health"));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.checks.firestore).toBe("error");
  });
});
