"use client";

import { useEffect, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Flame, Save, RefreshCw } from "lucide-react";

type FanPollDoc = {
  question?: string;
  options?: Record<string, number>;
  totalVotes?: number;
};

export default function FanZoneManager() {
  const { venueId } = useVenue();
  return <FanZoneManagerInner key={venueId} venueId={venueId} />;
}

function FanZoneManagerInner({ venueId }: { venueId: string }) {
  const [poll, setPoll] = useState<FanPollDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [optionsStr, setOptionsStr] = useState("");

  useEffect(() => {
    const pollRef = venuePaths.fanpoll(venueId);
    const unsubscribe = onSnapshot(pollRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as FanPollDoc;
        setPoll(data);
        setQuestion(data.question || "");
        setOptionsStr(Object.keys(data.options || {}).join(", "));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [venueId]);

  const handleUpdate = async () => {
    const opts = optionsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const optionsObj: Record<string, number> = {};
    opts.forEach((opt) => {
      optionsObj[opt] = poll?.options?.[opt] ?? 0;
    });

    let total = 0;
    for (const v of Object.values(optionsObj)) {
      total += v;
    }

    await setDoc(
      venuePaths.fanpoll(venueId),
      {
        question,
        options: optionsObj,
        totalVotes: total,
      },
      { merge: true }
    );

    alert("Poll updated successfully!");
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all votes to 0?")) return;

    const opts = optionsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const optionsObj: Record<string, number> = {};
    opts.forEach((opt) => {
      optionsObj[opt] = 0;
    });

    await setDoc(venuePaths.fanpoll(venueId), {
      question,
      options: optionsObj,
      totalVotes: 0,
    });
  };

  if (loading)
    return <div className="text-sm text-neutral-400">Loading Fan Zone Manager...</div>;

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6 text-purple-400">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5" aria-hidden />
          <h2 className="font-semibold">Manage Live Fan Zone</h2>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block" htmlFor="fan-poll-question">
            Poll Question
          </label>
          <input
            id="fan-poll-question"
            type="text"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-neutral-400 mb-1 block" htmlFor="fan-poll-options">
            Options (comma separated)
          </label>
          <input
            id="fan-poll-options"
            type="text"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            value={optionsStr}
            onChange={(e) => setOptionsStr(e.target.value)}
          />
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={handleUpdate}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" aria-hidden /> Save Poll
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium border border-rose-500/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden /> Reset Votes
          </button>
        </div>
      </div>
    </div>
  );
}
