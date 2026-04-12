"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_VENUE_ID,
  SEED_VENUES,
  pickVenue,
  type VenueDefinition,
} from "@/lib/venues";
import {
  normalizeVenueFromFirestore,
  VENUE_CATALOG_COLLECTION,
} from "@/lib/venue-catalog";

const STORAGE_KEY = "arenalink-venue";

function sortVenues(list: VenueDefinition[]) {
  return [...list].sort((a, b) =>
    `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`)
  );
}

type VenueContextValue = {
  venueId: string;
  venue: VenueDefinition;
  venueMap: Record<string, VenueDefinition>;
  venueList: VenueDefinition[];
  catalogHydrated: boolean;
  setVenueId: (id: string) => void;
};

const VenueContext = createContext<VenueContextValue | null>(null);

function VenueSearchParamsSync({
  resolveStoredId,
  setVenueIdState,
}: {
  resolveStoredId: (params: URLSearchParams) => string;
  setVenueIdState: Dispatch<SetStateAction<string>>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const next = resolveStoredId(searchParams);
    setVenueIdState((prev) => (prev === next ? prev : next));
  }, [searchParams, resolveStoredId, setVenueIdState]);
  return null;
}

export function VenueProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [venueMap, setVenueMap] = useState<Record<string, VenueDefinition>>(() => ({
    ...SEED_VENUES,
  }));
  const [catalogHydrated, setCatalogHydrated] = useState(false);
  const [venueId, setVenueIdState] = useState(DEFAULT_VENUE_ID);

  useEffect(() => {
    const col = collection(db, VENUE_CATALOG_COLLECTION);
    const unsub = onSnapshot(
      col,
      async (snap) => {
        if (snap.empty) {
          const batch = writeBatch(db);
          for (const v of Object.values(SEED_VENUES)) {
            batch.set(doc(db, VENUE_CATALOG_COLLECTION, v.id), v);
          }
          await batch.commit();
          setCatalogHydrated(true);
          return;
        }
        const next: Record<string, VenueDefinition> = {};
        snap.forEach((d) => {
          const v = normalizeVenueFromFirestore(
            d.id,
            d.data() as Record<string, unknown>
          );
          if (v) next[d.id] = v;
        });
        setVenueMap(Object.keys(next).length ? next : { ...SEED_VENUES });
        setCatalogHydrated(true);
      },
      () => {
        setCatalogHydrated(true);
      }
    );
    return () => unsub();
  }, []);

  const validIds = useMemo(() => new Set(Object.keys(venueMap)), [venueMap]);

  const resolveStoredId = useCallback(
    (params: URLSearchParams) => {
      const fromUrl = params.get("venue")?.trim() ?? "";
      let stored = "";
      try {
        stored = window.localStorage.getItem(STORAGE_KEY) ?? "";
      } catch {
        /* ignore */
      }
      if (fromUrl && validIds.has(fromUrl)) return fromUrl;
      if (stored && validIds.has(stored)) return stored;
      if (validIds.has(DEFAULT_VENUE_ID)) return DEFAULT_VENUE_ID;
      const first = [...validIds][0];
      return first ?? DEFAULT_VENUE_ID;
    },
    [validIds]
  );

  const setVenueId = useCallback(
    (id: string) => {
      if (!validIds.has(id)) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      setVenueIdState(id);
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      params.set("venue", id);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, validIds]
  );

  const venue = useMemo(() => pickVenue(venueMap, venueId), [venueMap, venueId]);

  const venueList = useMemo(
    () => sortVenues(Object.values(venueMap)),
    [venueMap]
  );

  const value = useMemo(
    () => ({
      venueId,
      venue,
      venueMap,
      venueList,
      catalogHydrated,
      setVenueId,
    }),
    [venueId, venue, venueMap, venueList, catalogHydrated, setVenueId]
  );

  return (
    <VenueContext.Provider value={value}>
      <Suspense fallback={null}>
        <VenueSearchParamsSync
          resolveStoredId={resolveStoredId}
          setVenueIdState={setVenueIdState}
        />
      </Suspense>
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue(): VenueContextValue {
  const ctx = useContext(VenueContext);
  if (!ctx) {
    throw new Error("useVenue must be used within VenueProvider");
  }
  return ctx;
}
