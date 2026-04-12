import { describe, it, expect } from "vitest";
import {
  DEFAULT_VENUE_ID,
  SEED_VENUES,
  pickVenue,
  isValidNewVenueId,
  type VenueDefinition,
} from "./venues";

describe("pickVenue", () => {
  it("returns the requested venue when present", () => {
    expect(pickVenue(SEED_VENUES, "mumbai").id).toBe("mumbai");
  });

  it("falls back to DEFAULT_VENUE_ID when id is missing or unknown", () => {
    expect(pickVenue(SEED_VENUES, null).id).toBe(DEFAULT_VENUE_ID);
    expect(pickVenue(SEED_VENUES, "nope").id).toBe(DEFAULT_VENUE_ID);
  });

  it("uses first map entry when default is absent", () => {
    const only: Record<string, VenueDefinition> = {
      alpha: { ...SEED_VENUES.chennai, id: "alpha", name: "Alpha" },
    };
    expect(pickVenue(only, "unknown-id").id).toBe("alpha");
  });

  it("returns shipped default when map is empty", () => {
    expect(pickVenue({}, "any").id).toBe(DEFAULT_VENUE_ID);
  });
});

describe("isValidNewVenueId", () => {
  it("accepts lowercase ids with hyphens", () => {
    expect(isValidNewVenueId("stadium-1")).toBe(true);
  });

  it("rejects uppercase, bad chars, or wrong length", () => {
    expect(isValidNewVenueId("Stadium")).toBe(false);
    expect(isValidNewVenueId("a")).toBe(false);
    expect(isValidNewVenueId("a".repeat(50))).toBe(false);
    expect(isValidNewVenueId("9start")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidNewVenueId("  chennai-2  ")).toBe(true);
  });
});
