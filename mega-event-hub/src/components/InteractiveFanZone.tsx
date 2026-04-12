"use client";

import { useEffect, useState } from "react";
import { onSnapshot, setDoc, increment } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Trophy, Music, Flame } from "lucide-react";

type FanPollDoc = {
  question: string;
  options: Record<string, number>;
  totalVotes: number;
};

export default function InteractiveFanZone() {
  const { venueId } = useVenue();
  return <InteractiveFanZoneInner key={venueId} venueId={venueId} />;
}

function InteractiveFanZoneInner({ venueId }: { venueId: string }) {
  const [poll, setPoll] = useState<FanPollDoc | null>(null);
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    const pollRef = venuePaths.fanpoll(venueId);
    const unsubscribe = onSnapshot(pollRef, (snap) => {
      if (!snap.exists()) {
        const defaultPoll: FanPollDoc = {
          question: "Which encore song should the headliner play?",
          options: {
            "Neon Nights": 140,
            "Electric Pulse": 210,
            "Midnight Run": 89,
          },
          totalVotes: 439,
        };
        setDoc(pollRef, defaultPoll);
        setPoll(defaultPoll);
      } else {
        setPoll(snap.data() as FanPollDoc);
      }
    });

    return () => unsubscribe();
  }, [venueId]);

  const handleVote = async (optionKey: string) => {
    if (voted) return;
    const pollRef = venuePaths.fanpoll(venueId);
    await setDoc(
      pollRef,
      {
        options: {
          [optionKey]: increment(1),
        },
        totalVotes: increment(1),
      },
      { merge: true }
    );
    setVoted(optionKey);
  };

  if (!poll)
    return (
      <div
        className="animate-pulse bg-neutral-900/50 h-64 rounded-2xl border border-white/5"
        role="status"
        aria-label="Loading fan zone poll"
      />
    );

  return (
    <section
      className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden w-full shrink-0 isolate"
      aria-labelledby="fan-zone-heading"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden>
        <Trophy className="w-24 h-24" />
      </div>
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Flame className="w-5 h-5 text-purple-400" aria-hidden />
        <h2 id="fan-zone-heading" className="font-semibold text-lg">
          Live Fan Zone
        </h2>
      </div>
      <p className="text-sm text-neutral-300 mb-6 relative z-10">{poll.question}</p>

      <div className="space-y-4 relative z-10">
        {Object.entries(poll.options).map(([key, count]) => {
          const percent =
            poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
          const isWinner = voted === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleVote(key)}
              disabled={!!voted}
              className={`w-full text-left relative overflow-hidden rounded-xl bg-neutral-950/50 border transition-all ${
                voted
                  ? isWinner
                    ? "border-purple-500/50"
                    : "border-white/5 opacity-50"
                  : "border-white/10 hover:border-purple-500/30 hover:bg-neutral-900/50"
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-1000 ${isWinner ? "bg-purple-500/20" : "bg-indigo-500/10"}`}
                style={{ width: `${percent}%` }}
                aria-hidden
              />
              <div className="relative p-3 flex justify-between items-center text-sm">
                <span className="font-medium flex items-center gap-2">
                  <Music className="w-4 h-4 text-neutral-400" aria-hidden />
                  {key}
                  {isWinner && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full ml-2">
                      Voted
                    </span>
                  )}
                </span>
                <span className="font-mono text-neutral-400">{percent}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-center text-neutral-500 font-mono relative z-10">
        {poll.totalVotes} Total Live Votes
      </div>
    </section>
  );
}
