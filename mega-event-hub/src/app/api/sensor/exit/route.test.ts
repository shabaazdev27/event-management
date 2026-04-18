import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/venue-core", () => ({
  handleSensorExit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/venue-resolve", () => ({
  resolveVenueIdFromRequest: vi.fn().mockResolvedValue("mumbai"),
}));

import { handleSensorExit } from "@/lib/venue-core";

describe("POST /api/sensor/exit", () => {
  beforeEach(() => {
    vi.mocked(handleSensorExit).mockClear();
    delete process.env.SENSORS_API_KEY;
  });

  function post(body: Record<string, unknown>, headers?: Record<string, string>) {
    return new Request("http://localhost/api/sensor/exit", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when API key required but missing", async () => {
    process.env.SENSORS_API_KEY = "secret";
    const res = await POST(post({ gateId: "G1" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("processes exit when authorized", async () => {
    process.env.SENSORS_API_KEY = "k";
    const res = await POST(
      post({ gateId: "Exit-A" }, { "x-api-key": "k" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(handleSensorExit).toHaveBeenCalledWith("Exit-A", "mumbai");
  });
});
