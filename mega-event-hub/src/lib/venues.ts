export type VenueDefinition = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  timezone: string;
  defaultCapacity: number;
  parkingSummary: string;
  eventManagementHelpline: string;
};

/** Shipped defaults; copied into Firestore `venue_catalog` when the collection is empty. */
export const SEED_VENUES: Record<string, VenueDefinition> = {
  chennai: {
    id: "chennai",
    name: "M. A. Chidambaram Stadium",
    shortName: "Chepauk",
    city: "Chennai",
    region: "Tamil Nadu",
    lat: 13.0629,
    lon: 80.2792,
    timezone: "Asia/Kolkata",
    defaultCapacity: 50000,
    parkingSummary: "Lots A, B, North plaza",
    eventManagementHelpline: "1800-200-1122",
  },
  bangalore: {
    id: "bangalore",
    name: "M. Chinnaswamy Stadium",
    shortName: "Chinnaswamy",
    city: "Bengaluru",
    region: "Karnataka",
    lat: 12.9784,
    lon: 77.5998,
    timezone: "Asia/Kolkata",
    defaultCapacity: 40000,
    parkingSummary: "MG Road & Cubbon Park zones",
    eventManagementHelpline: "1800-200-1133",
  },
  mumbai: {
    id: "mumbai",
    name: "Wankhede Stadium",
    shortName: "Wankhede",
    city: "Mumbai",
    region: "Maharashtra",
    lat: 18.9389,
    lon: 72.8258,
    timezone: "Asia/Kolkata",
    defaultCapacity: 33000,
    parkingSummary: "Marine Lines & Churchgate",
    eventManagementHelpline: "1800-200-1144",
  },
};

export const DEFAULT_VENUE_ID = "chennai";

export function pickVenue(
  map: Record<string, VenueDefinition>,
  id: string | null | undefined
): VenueDefinition {
  if (id && map[id]) return map[id];
  if (map[DEFAULT_VENUE_ID]) return map[DEFAULT_VENUE_ID];
  const first = Object.values(map)[0];
  if (first) return first;
  return SEED_VENUES[DEFAULT_VENUE_ID];
}

const VENUE_ID_PATTERN = /^[a-z][a-z0-9-]{1,48}$/;

export function isValidNewVenueId(id: string): boolean {
  return VENUE_ID_PATTERN.test(id.trim());
}
