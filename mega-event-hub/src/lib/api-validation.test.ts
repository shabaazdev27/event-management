import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiValidationError,
  assertCronAuthorized,
  assertSensorsAuthorized,
  clampChatMessage,
  parseLatLon,
  readJsonBodyLimited,
  validateGateId,
  validateLocation,
  validateMaxFlow,
} from "./api-validation";

describe("validateGateId", () => {
  it("accepts safe ids", () => {
    expect(validateGateId("Gate-A_1")).toBe("Gate-A_1");
  });

  it("rejects empty and invalid", () => {
    expect(() => validateGateId("")).toThrow(ApiValidationError);
    expect(() => validateGateId("../x")).toThrow(ApiValidationError);
    expect(() => validateGateId("a".repeat(70))).toThrow(ApiValidationError);
  });
});

describe("parseLatLon", () => {
  it("parses valid coordinates", () => {
    expect(parseLatLon("40.7", "-74")).toEqual({ lat: 40.7, lon: -74 });
  });

  it("throws when lat or lon missing", () => {
    expect(() => parseLatLon(null, "0")).toThrow(ApiValidationError);
    expect(() => parseLatLon("0", null)).toThrow(ApiValidationError);
    expect(() => parseLatLon("", "")).toThrow(ApiValidationError);
  });

  it("throws for NaN", () => {
    expect(() => parseLatLon("x", "0")).toThrow(ApiValidationError);
  });

  it("throws for out of range", () => {
    expect(() => parseLatLon("91", "0")).toThrow(ApiValidationError);
    expect(() => parseLatLon("0", "200")).toThrow(ApiValidationError);
  });
});

describe("clampChatMessage", () => {
  it("requires non-empty string", () => {
    expect(() => clampChatMessage("")).toThrow(ApiValidationError);
    expect(() => clampChatMessage("   ")).toThrow(ApiValidationError);
    expect(() => clampChatMessage(null)).toThrow(ApiValidationError);
  });

  it("truncates long input", () => {
    const long = "x".repeat(5000);
    const out = clampChatMessage(long);
    expect(out.length).toBeLessThanOrEqual(2000);
  });
});

describe("validateMaxFlow", () => {
  it("accepts integers in range", () => {
    expect(validateMaxFlow(100)).toBe(100);
    expect(validateMaxFlow("50")).toBe(50);
  });

  it("rejects invalid", () => {
    expect(() => validateMaxFlow(0)).toThrow(ApiValidationError);
    expect(() => validateMaxFlow(2e9)).toThrow(ApiValidationError);
  });
});

describe("validateLocation", () => {
  it("accepts GENERAL and FANZONE", () => {
    expect(validateLocation("GENERAL")).toBe("GENERAL");
    expect(validateLocation("FANZONE")).toBe("FANZONE");
  });

  it("rejects other values", () => {
    expect(() => validateLocation("VIP")).toThrow(ApiValidationError);
  });
});

describe("readJsonBodyLimited", () => {
  it("parses JSON under limit", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    const data = await readJsonBodyLimited(req);
    expect(data).toEqual({ a: 1 });
  });

  it("rejects oversized body by length", async () => {
    const big = JSON.stringify({ x: "y".repeat(100_000) });
    const req = new Request("http://t", {
      method: "POST",
      body: big,
    });
    await expect(readJsonBodyLimited(req, 1000)).rejects.toThrow(
      ApiValidationError
    );
  });

  it("rejects invalid JSON", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: "{not-json",
    });
    await expect(readJsonBodyLimited(req)).rejects.toThrow(ApiValidationError);
  });

  it("rejects when Content-Length exceeds max", async () => {
    const req = new Request("http://t", {
      method: "POST",
      headers: { "Content-Length": "999999" },
      body: "{}",
    });
    await expect(readJsonBodyLimited(req, 1000)).rejects.toThrow(
      ApiValidationError
    );
  });
});

describe("assertCronAuthorized", () => {
  const prevEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...prevEnv };
  });

  afterEach(() => {
    process.env = prevEnv;
  });

  it("allows when CRON_SECRET unset in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.CRON_SECRET;
    const res = assertCronAuthorized(new Request("http://t"));
    expect(res).toBeNull();
  });

  it("returns 500 when CRON_SECRET unset in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    const res = assertCronAuthorized(new Request("http://t"));
    expect(res?.status).toBe(500);
  });

  it("accepts Bearer token", () => {
    process.env.CRON_SECRET = "abc";
    process.env.NODE_ENV = "production";
    const res = assertCronAuthorized(
      new Request("http://t", {
        headers: { Authorization: "Bearer abc" },
      })
    );
    expect(res).toBeNull();
  });

  it("accepts x-cron-secret header", () => {
    process.env.CRON_SECRET = "secret";
    process.env.NODE_ENV = "production";
    const res = assertCronAuthorized(
      new Request("http://t", {
        headers: { "x-cron-secret": "secret" },
      })
    );
    expect(res).toBeNull();
  });
});

describe("assertSensorsAuthorized", () => {
  const prev = process.env.SENSORS_API_KEY;

  afterEach(() => {
    process.env.SENSORS_API_KEY = prev;
  });

  it("allows when key not configured", () => {
    delete process.env.SENSORS_API_KEY;
    expect(assertSensorsAuthorized(new Request("http://t"))).toBeNull();
  });

  it("rejects without key when configured", () => {
    process.env.SENSORS_API_KEY = "k";
    const res = assertSensorsAuthorized(new Request("http://t"));
    expect(res?.status).toBe(401);
  });

  it("accepts x-api-key", () => {
    process.env.SENSORS_API_KEY = "k";
    const res = assertSensorsAuthorized(
      new Request("http://t", { headers: { "x-api-key": "k" } })
    );
    expect(res).toBeNull();
  });
});
