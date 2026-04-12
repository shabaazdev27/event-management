import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveVenueIdFromRequest } from "./venue-resolve";
import { DEFAULT_VENUE_ID } from "./venues";
import { venueExistsInCatalog } from "@/lib/venue-catalog";

vi.mock("@/lib/venue-catalog", () => ({
  venueExistsInCatalog: vi.fn(),
}));

const mockVenueExists = vi.mocked(venueExistsInCatalog);

describe("resolveVenueIdFromRequest", () => {
  beforeEach(() => {
    mockVenueExists.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prefers valid x-venue header over body", async () => {
    mockVenueExists.mockImplementation(async (id: string) =>
      ["hdr", "body"].includes(id)
    );
    const id = await resolveVenueIdFromRequest("body", "hdr");
    expect(id).toBe("hdr");
  });

  it("uses body when header missing or unknown", async () => {
    mockVenueExists.mockImplementation(async (id: string) => id === "body-only");
    const id = await resolveVenueIdFromRequest("body-only", null);
    expect(id).toBe("body-only");
  });

  it("falls back to DEFAULT_VENUE_ID when nothing matches", async () => {
    mockVenueExists.mockResolvedValue(false);
    const id = await resolveVenueIdFromRequest("nope", "also-nope");
    expect(id).toBe(DEFAULT_VENUE_ID);
  });

  it("ignores non-string body venue", async () => {
    mockVenueExists.mockResolvedValue(false);
    const id = await resolveVenueIdFromRequest(123 as unknown as string, null);
    expect(id).toBe(DEFAULT_VENUE_ID);
  });
});
