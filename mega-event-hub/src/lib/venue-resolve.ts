import { DEFAULT_VENUE_ID } from "@/lib/venues";
import { venueExistsInCatalog } from "@/lib/venue-catalog";

export async function resolveVenueIdFromRequest(
  bodyVenue: unknown,
  headerVenue: string | null
): Promise<string> {
  const fromHeader = headerVenue?.trim() ?? "";
  if (fromHeader && (await venueExistsInCatalog(fromHeader))) {
    return fromHeader;
  }
  const fromBody = typeof bodyVenue === "string" ? bodyVenue.trim() : "";
  if (fromBody && (await venueExistsInCatalog(fromBody))) {
    return fromBody;
  }
  return DEFAULT_VENUE_ID;
}
