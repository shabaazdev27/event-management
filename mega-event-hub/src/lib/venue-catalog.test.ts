import { describe, it, expect } from "vitest";
import { normalizeVenueFromFirestore } from "./venue-catalog";

describe("normalizeVenueFromFirestore", () => {
  it("returns null for non-objects or missing name", () => {
    expect(normalizeVenueFromFirestore("x", null as unknown as Record<string, unknown>)).toBeNull();
    expect(normalizeVenueFromFirestore("x", {})).toBeNull();
    expect(normalizeVenueFromFirestore("x", { name: "  " })).toBeNull();
  });

  it("returns null when lat/lon are not finite", () => {
    expect(
      normalizeVenueFromFirestore("v", {
        name: "Venue",
        lat: NaN,
        lon: 0,
      })
    ).toBeNull();
  });

  it("normalizes fields and defaults", () => {
    const v = normalizeVenueFromFirestore("hub", {
      name: "  Main Arena  ",
      shortName: "",
      city: "",
      region: "",
      lat: 12.5,
      lon: -3.25,
      timezone: "",
      defaultCapacity: 600,
      parkingSummary: "",
    });
    expect(v).toMatchObject({
      id: "hub",
      name: "Main Arena",
      shortName: "Main Arena",
      city: "Unknown",
      region: "—",
      lat: 12.5,
      lon: -3.25,
      timezone: "Asia/Kolkata",
      defaultCapacity: 600,
      parkingSummary: "See venue parking map",
      eventManagementHelpline: "1800-200-1122",
    });
  });

  it("normalizes venue-specific helpline when provided", () => {
    const v = normalizeVenueFromFirestore("hub", {
      name: "Main Arena",
      lat: 12.5,
      lon: -3.25,
      eventManagementHelpline: "1800-999-1234",
    });
    expect(v?.eventManagementHelpline).toBe("1800-999-1234");
  });

  it("clamps defaultCapacity below 500 to 50000", () => {
    const v = normalizeVenueFromFirestore("low", {
      name: "Low Cap",
      lat: 0,
      lon: 0,
      defaultCapacity: 100,
    });
    expect(v?.defaultCapacity).toBe(50000);
  });
});
