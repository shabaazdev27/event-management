"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Clock } from "lucide-react";

type QueueRow = {
  id: string;
  title: string;
  minutes: number;
};

/**
 * LiveWaitTimes component displays real-time queue wait times
 * with visual indicators and accessibility features.
 * Optimized with caching and loading indicators.
 */
export default function LiveWaitTimes() {
  const { venueId } = useVenue();
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const queuesCol = venuePaths.queues(venueId);
    // Limit to 20 most recent queues for performance
    const q = query(queuesCol, orderBy("order", "asc"), limit(20));
    
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        // Check if data is from cache for instant loading
        const isFromCache = snap.metadata.fromCache;
        setFromCache(isFromCache);
        
        const rows: QueueRow[] = snap.docs.map((d) => {
          const data = d.data() as { title?: string; minutes?: number };
          return {
            id: d.id,
            title: data.title ?? "Location",
            minutes: typeof data.minutes === "number" ? data.minutes : 0,
          };
        });
        setQueues(rows);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching queues for live wait times:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [venueId]);

  return (
    <section 
      className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm w-full shrink-0 relative z-0 isolate"
      aria-label="Live wait times"
    >
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <Clock className="w-5 h-5" aria-hidden="true" />
        <h2 className="font-semibold" id="wait-times-heading">Live Wait Times</h2>
        {loading && (
          <span 
            className="text-xs ml-auto text-neutral-500 animate-pulse"
            role="status"
            aria-live="polite"
          >
            Loading…
          </span>
        )}
        {!loading && fromCache && (
          <span 
            className="text-xs ml-auto text-emerald-400/70"
            role="status"
            title="Synced with server"
          >
            ● Live
          </span>
        )}
      </div>

      <div 
        className="space-y-4"
        role="list"
        aria-labelledby="wait-times-heading"
        aria-live="polite"
        aria-busy={loading}
      >
        {queues.length === 0 && !loading && (
          <div 
            className="text-sm text-neutral-500 italic p-2 text-center border border-dashed border-white/10 rounded-xl"
            role="status"
          >
            No wait times yet. Staff can add them under Manage Wait Times.
          </div>
        )}

        {queues.map((q) => {
          let status: "fast" | "moderate" | "slow" = "moderate";
          if (q.minutes < 10) status = "fast";
          else if (q.minutes >= 25) status = "slow";

          return (
            <QueueItem
              key={q.id}
              title={q.title}
              time={`${q.minutes} mins`}
              status={status}
            />
          );
        })}

        {loading && queues.length === 0 && (
          <div className="space-y-4" aria-hidden="true">
            <div className="h-12 bg-neutral-800/40 rounded-xl animate-pulse" />
            <div className="h-12 bg-neutral-800/40 rounded-xl animate-pulse" />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * QueueItem displays a single wait time with status indicator
 */
function QueueItem({
  title,
  time,
  status,
}: {
  title: string;
  time: string;
  status: "fast" | "moderate" | "slow";
}) {
  const colors = {
    fast: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    moderate: "bg-amber-500/20 text-amber-400 border-amber-500/20",
    slow: "bg-rose-500/20 text-rose-400 border-rose-500/20",
  };

  return (
    <div className="flex justify-between items-center gap-3 p-3 rounded-xl bg-neutral-800/40 border border-white/5 min-w-0">
      <span className="text-sm font-medium text-neutral-200 truncate">{title}</span>
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-md border shrink-0 ${colors[status] || colors.moderate}`}
      >
        {time}
      </span>
    </div>
  );
}
