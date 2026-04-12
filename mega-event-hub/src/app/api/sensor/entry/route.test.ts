import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/venue-core", () => ({
  handleSensorEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/venue-resolve", () => ({
  resolveVenueIdFromRequest: vi.fn().mockResolvedValue("chennai"),
}));

import { handleSensorEntry } from "@/lib/venue-core";

describe("POST /api/sensor/entry", () => {
  beforeEach(() => {
    vi.mocked(handleSensorEntry).mockClear();
    delete process.env.SENSORS_API_KEY;
  });

  function post(body: Record<string, unknown>, headers?: Record<string, string>) {
    return new Request("http://localhost/api/sensor/entry", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when API key required but missing", async () => {
    process.env.SENSORS_API_KEY = "k";
    const res = await POST(post({ gateId: "G1" }));
    expect(res.status).toBe(401);
  });

  it("processes entry when authorized", async () => {
    process.env.SENSORS_API_KEY = "k";
    const res = await POST(
      post({ gateId: "North-1", venueId: "x" }, { Authorization: "Bearer k" })
    );
    expect(res.status).toBe(200);
    expect(handleSensorEntry).toHaveBeenCalledWith("North-1", "chennai");
  });

  it("returns 400 for invalid gate id", async () => {
    const res = await POST(post({ gateId: "../bad" }));
    expect(res.status).toBe(400);
  });
});
