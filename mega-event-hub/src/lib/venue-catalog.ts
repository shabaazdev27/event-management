import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { VenueDefinition } from "@/lib/venues";

export const VENUE_CATALOG_COLLECTION = "venue_catalog";

export function venueCatalogDoc(venueId: string) {
  return doc(db, VENUE_CATALOG_COLLECTION, venueId);
}

export function venueCatalogCollection() {
  return collection(db, VENUE_CATALOG_COLLECTION);
}

export function normalizeVenueFromFirestore(
  id: string,
  data: Record<string, unknown>
): VenueDefinition | null {
  if (!data || typeof data !== "object") return null;
  const name = String(data.name ?? "").trim();
  if (!name) return null;
  const shortName = String(data.shortName ?? name).trim() || name;
  const city = String(data.city ?? "").trim() || "Unknown";
  const region = String(data.region ?? "").trim() || "—";
  const lat = Number(data.lat);
  const lon = Number(data.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const timezone = String(data.timezone || "Asia/Kolkata").trim() || "Asia/Kolkata";
  const cap = Math.floor(Number(data.defaultCapacity));
  const defaultCapacity =
    Number.isFinite(cap) && cap >= 500 ? cap : 50000;
  const parkingSummary =
    String(data.parkingSummary ?? "See venue parking map").trim() ||
    "See venue parking map";

  return {
    id,
    name,
    shortName,
    city,
    region,
    lat,
    lon,
    timezone,
    defaultCapacity,
    parkingSummary,
  };
}

export async function venueExistsInCatalog(venueId: string): Promise<boolean> {
  if (!venueId) return false;
  const snap = await getDoc(venueCatalogDoc(venueId));
  return snap.exists();
}

export async function getVenueCatalogCapacity(venueId: string): Promise<number> {
  const snap = await getDoc(venueCatalogDoc(venueId));
  if (!snap.exists()) return 50000;
  const cap = Math.floor(Number(snap.data()?.defaultCapacity));
  return Number.isFinite(cap) && cap >= 500 ? cap : 50000;
}

export async function listAllVenueIds(): Promise<string[]> {
  const snap = await getDocs(venueCatalogCollection());
  return snap.docs.map((d) => d.id);
}
