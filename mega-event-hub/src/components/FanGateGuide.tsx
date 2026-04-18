"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { Navigation, MapPinned } from "lucide-react";

import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";

type QueueRow = {
  id: string;
  title: string;
  minutes: number;
  mapLocation?: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function FanGateGuide() {
  const { venueId, venue } = useVenue();
  const [gates, setGates] = useState<QueueRow[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    const q = query(venuePaths.queues(venueId), orderBy("order", "asc"), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => {
          const data = d.data() as { title?: string; minutes?: number; mapLocation?: string };
          return {
            id: d.id,
            title: data.title ?? "Gate",
            minutes: typeof data.minutes === "number" ? data.minutes : 0,
            mapLocation: data.mapLocation ?? "",
          };
        });
        setGates(rows);
        setSelectedGateId((prev) => prev || rows[0]?.id || "");
        setLoading(false);
      },
      () => {
        setGates([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [venueId]);

  const selectedGate = useMemo(() => {
    return gates.find((g) => g.id === selectedGateId) ?? gates[0] ?? null;
  }, [gates, selectedGateId]);

  const fastestGate = useMemo(() => {
    if (gates.length === 0) return null;
    return [...gates].sort((a, b) => a.minutes - b.minutes)[0] ?? null;
  }, [gates]);

  const mapsUrl = useMemo(() => {
    if (!selectedGate) return "#";
    const rawMapLocation = (selectedGate.mapLocation || "").trim();
    if (rawMapLocation && isHttpUrl(rawMapLocation)) {
      return rawMapLocation;
    }
    const destination = encodeURIComponent(rawMapLocation || `${venue.name} ${selectedGate.title}`);
    return `https://www.google.com/maps/search/?api=1&query=${destination}`;
  }, [selectedGate, venue.name]);

  const isUrlDestination = useMemo(() => {
    if (!selectedGate) return false;
    return Boolean(selectedGate.mapLocation && isHttpUrl(selectedGate.mapLocation.trim()));
  }, [selectedGate]);

  const navigationTargetLabel = useMemo(() => {
    if (!selectedGate) return "";
    if (isUrlDestination) {
      return selectedGate.title;
    }
    return selectedGate.mapLocation || selectedGate.title;
  }, [isUrlDestination, selectedGate]);

  const selectedWaitStatus = useMemo(() => {
    if (!selectedGate) return "moderate" as const;
    if (selectedGate.minutes < 10) return "fast" as const;
    if (selectedGate.minutes >= 25) return "slow" as const;
    return "moderate" as const;
  }, [selectedGate]);

  const waitBadgeStyles = {
    fast: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    slow: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };

  const handleChooseFastest = () => {
    if (!fastestGate) return;
    setSelectedGateId(fastestGate.id);
  };

  const handleCopyDestination = async () => {
    if (!navigationTargetLabel && !mapsUrl) return;
    try {
      const payload = isUrlDestination ? mapsUrl : navigationTargetLabel;
      await navigator.clipboard.writeText(payload);
      setCopyState("done");
    } catch {
      setCopyState("error");
    }

    setTimeout(() => {
      setCopyState("idle");
    }, 1800);
  };

  return (
    <section className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm w-full">
      <div className="flex items-center gap-2 mb-4 text-cyan-300">
        <Navigation className="w-5 h-5" aria-hidden="true" />
        <h2 className="font-semibold">Fan Navigation Guide</h2>
      </div>

      {loading && <p className="text-sm text-neutral-400">Loading gate guidance...</p>}

      {!loading && gates.length === 0 && (
        <p className="text-sm text-neutral-500 italic">
          Gate guidance will appear once staff publish queue/gate entries.
        </p>
      )}

      {!loading && gates.length > 0 && selectedGate && (
        <div className="space-y-4">
          {fastestGate && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs sm:text-sm text-cyan-100">
                Recommended now: <span className="font-semibold">{fastestGate.title}</span> ({fastestGate.minutes} mins)
              </p>
              <button
                type="button"
                onClick={handleChooseFastest}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/35 transition-colors"
              >
                Use recommended gate
              </button>
            </div>
          )}

          <div>
            <label htmlFor="fan-gate-select" className="text-xs text-neutral-400 block mb-1">
              Choose your gate
            </label>
            <select
              id="fan-gate-select"
              value={selectedGate.id}
              onChange={(e) => setSelectedGateId(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/60"
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} ({g.minutes} mins)
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-neutral-800/40 border border-white/5 p-4 space-y-2">
            <p className="text-sm text-neutral-200">
              Head to <span className="font-semibold text-cyan-300">{selectedGate.title}</span> at {venue.shortName}.
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-neutral-400">Current queue estimate: {selectedGate.minutes} mins</p>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded-full ${waitBadgeStyles[selectedWaitStatus]}`}>
                {selectedWaitStatus}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Route target: {isUrlDestination ? `${selectedGate.title} map pin` : (selectedGate.mapLocation || `${venue.name} ${selectedGate.title}`)}
            </p>
            {!selectedGate.mapLocation && (
              <p className="text-xs text-amber-300/90">
                Staff has not set a precise landmark for this gate yet.
              </p>
            )}
            {isUrlDestination && (
              <p className="text-xs text-cyan-300/90">Using staff-configured map pin link.</p>
            )}
            {fastestGate && fastestGate.id !== selectedGate.id && selectedGate.minutes - fastestGate.minutes >= 10 && (
              <p className="text-xs text-amber-300">
                Faster option available: {fastestGate.title} ({fastestGate.minutes} mins)
              </p>
            )}
          </div>

          <ol className="text-xs text-neutral-300 space-y-1 list-decimal list-inside">
            <li>Follow venue signs toward {selectedGate.title}.</li>
            <li>Keep your ticket/QR ready before joining the queue.</li>
            <li>Use the route button for live map guidance.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
            >
              <MapPinned className="w-4 h-4" aria-hidden="true" />
              Open Navigation to {navigationTargetLabel}
            </a>
            <button
              type="button"
              onClick={handleCopyDestination}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-neutral-200 hover:bg-neutral-700 transition-colors text-sm"
            >
              Copy destination
            </button>
            {copyState === "done" && <span className="text-xs text-emerald-300">Copied</span>}
            {copyState === "error" && <span className="text-xs text-rose-300">Copy failed</span>}
          </div>
        </div>
      )}
    </section>
  );
}
