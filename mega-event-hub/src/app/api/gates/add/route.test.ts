import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/venue-core", () => ({
  addNewGate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/venue-resolve", () => ({
  resolveVenueIdFromRequest: vi.fn().mockResolvedValue("chennai"),
}));

import { addNewGate } from "@/lib/venue-core";
import { resolveVenueIdFromRequest } from "@/lib/venue-resolve";

describe("POST /api/gates/add", () => {
  beforeEach(() => {
    vi.mocked(addNewGate).mockClear();
    vi.mocked(resolveVenueIdFromRequest).mockClear();
    delete process.env.SENSORS_API_KEY;
  });

  function post(body: Record<string, unknown>, headers?: Record<string, string>) {
    return new Request("http://localhost/api/gates/add", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when SENSORS_API_KEY set and no credentials", async () => {
    process.env.SENSORS_API_KEY = "secret";
    const res = await POST(
      post({ id: "G1", max_flow: 10, location: "GENERAL" })
    );
    expect(res.status).toBe(401);
    expect(addNewGate).not.toHaveBeenCalled();
  });

  it("adds gate and returns success when authorized", async () => {
    process.env.SENSORS_API_KEY = "k";
    const res = await POST(
      post(
        { id: "Gate-A", max_flow: 100, location: "FANZONE", venueId: "mumbai" },
        { "x-api-key": "k" }
      )
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success?: boolean };
    expect(json.success).toBe(true);
    expect(addNewGate).toHaveBeenCalledWith(
      "Gate-A",
      100,
      "FANZONE",
      "chennai"
    );
    expect(resolveVenueIdFromRequest).toHaveBeenCalled();
  });

  it("returns 400 for ApiValidationError", async () => {
    const res = await POST(post({ id: "", max_flow: 1, location: "GENERAL" }));
    expect(res.status).toBe(400);
  });
});
