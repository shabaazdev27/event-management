import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("GET /api/weather", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function req(lat: string | null, lon: string | null) {
    const u = new URL("http://localhost/api/weather");
    if (lat != null) u.searchParams.set("lat", lat);
    if (lon != null) u.searchParams.set("lon", lon);
    return new NextRequest(u);
  }

  it("returns 400 when lat/lon missing", async () => {
    const res = await GET(req(null, null));
    expect(res.status).toBe(400);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns 400 when coordinates out of range", async () => {
    const res = await GET(req("91", "0"));
    expect(res.status).toBe(400);
  });

  it("returns fallback data when provider responds not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;

    const res = await GET(req("40.7", "-74"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.isFallback).toBe(true);
    expect(body.tempC).toBe(20);
    expect(body.condition).toBe("Clear");
  });

  it("returns JSON with temps and condition on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 20.456,
          weather_code: 0,
          relative_humidity_2m: 55,
        },
        daily: { precipitation_probability_max: [12.3] },
      }),
    }) as unknown as typeof fetch;

    const res = await GET(req("40", "-74"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tempC).toBe(20.5);
    expect(body.condition).toBe("Clear skies");
    expect(body.humidityPercent).toBe(55);
    expect(body.rainChancePercent).toBe(12);
    expect(body.weatherCode).toBe(0);
  });

  it("returns fallback data when temperature missing in payload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { weather_code: 1 } }),
    }) as unknown as typeof fetch;

    const res = await GET(req("1", "1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.isFallback).toBe(true);
    expect(body.tempC).toBe(20);
  });
});
