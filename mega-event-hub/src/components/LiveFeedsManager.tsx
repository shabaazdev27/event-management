"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Video, Plus, Trash2, X } from "lucide-react";

type CameraFeed = {
  id: string;
  location: string;
  status: 'critical' | 'warning' | 'normal';
  count: number;
  capacity: number;
  videoUrl: string;
};

export default function LiveFeedsManager() {
  const { venueId } = useVenue();
  const [feeds, setFeeds] = useState<CameraFeed[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ location: "", count: 0, capacity: 500, videoUrl: "" });

  useEffect(() => {
    const camerasCol = venuePaths.cameras(venueId);
    const q = query(camerasCol);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        const defaultFeeds = [
          { location: "Gate A (Main)", status: "critical", count: 450, capacity: 500, videoUrl: "https://www.youtube.com/watch?v=2UOwesF2cwM" },
          { location: "Gate B (North)", status: "warning", count: 320, capacity: 400, videoUrl: "https://www.youtube.com/watch?v=ZUIElwm6Axc" },
          { location: "Gate 6", status: "normal", count: 85, capacity: 150, videoUrl: "https://www.youtube.com/watch?v=TmyEz4dmobI" },
        ];

        defaultFeeds.forEach((feed) => {
          addDoc(camerasCol, { ...feed, createdAt: serverTimestamp() });
        });
      } else {
        const liveFeeds = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CameraFeed[];
        setFeeds(liveFeeds);
      }
    });

    return () => unsubscribe();
  }, [venueId]);

  const [availableQueues, setAvailableQueues] = useState<string[]>([]);
  useEffect(() => {
    const q = query(venuePaths.queues(venueId));
    return onSnapshot(q, (snapshot) => {
      setAvailableQueues(snapshot.docs.map((d) => d.data().title || ""));
    });
  }, [venueId]);

  const getStatus = (count: number, capacity: number) => {
    const p = count / capacity;
    if (p > 0.85) return 'critical';
    if (p > 0.70) return 'warning';
    return 'normal';
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(venuePaths.cameras(venueId), {
      location: addForm.location,
      count: addForm.count,
      capacity: addForm.capacity,
      videoUrl: addForm.videoUrl,
      status: getStatus(addForm.count, addForm.capacity),
      createdAt: serverTimestamp()
    });
    setIsAdding(false);
    setAddForm({ location: "", count: 0, capacity: 500, videoUrl: "" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this camera feed?")) {
      await deleteDoc(venuePaths.cameraDoc(venueId, id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-rose-400" />
          <h2 className="font-semibold">Live Gate Security Feeds</h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs font-semibold bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/30 transition-colors text-rose-400"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Feed"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-neutral-400 mb-1 block">Location</label>
            <input type="text" list="gateLocations" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.location} onChange={e => setAddForm({ ...addForm, location: e.target.value })} />
            <datalist id="gateLocations">
              {availableQueues.map((q, i) => <option key={i} value={q} />)}
            </datalist>
          </div>
          <div className="w-24">
            <label className="text-xs text-neutral-400 mb-1 block">Count</label>
            <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.count} onChange={e => setAddForm({ ...addForm, count: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="w-24">
            <label className="text-xs text-neutral-400 mb-1 block">Capacity</label>
            <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" value={addForm.capacity} onChange={e => setAddForm({ ...addForm, capacity: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-neutral-400 mb-1 block">Media URL (YouTube, Video, Image)</label>
            <input type="text" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50" placeholder="https://" value={addForm.videoUrl} onChange={e => setAddForm({ ...addForm, videoUrl: e.target.value })} />
          </div>
          <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {feeds.map(feed => (
          <VideoFeedCard key={feed.id} feed={feed} onDelete={() => handleDelete(feed.id)} />
        ))}
      </div>
    </div>
  );
}

function VideoFeedCard({ feed, onDelete }: { feed: CameraFeed; onDelete: () => void }) {
  const statusColors = {
    critical: "border-rose-500/50 text-rose-400",
    warning: "border-amber-500/50 text-amber-400",
    normal: "border-emerald-500/50 text-emerald-400"
  };

  const percentage = (feed.count / feed.capacity) * 100;

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isImage = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return /\.(jpeg|jpg|gif|png|webp|avif|svg)$/.test(cleanUrl) || url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|avif|svg)(%2F|\?|&|$)/);
  };

  const ytid = getYouTubeId(feed.videoUrl);
  const isImg = isImage(feed.videoUrl);

  return (
    <div className={`rounded-2xl border ${statusColors[feed.status]} bg-neutral-900 overflow-hidden relative group`}>
      <div className="h-48 bg-black relative border-b border-white/5 flex items-center justify-center overflow-hidden">

        {ytid ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytid}?autoplay=1&mute=1&loop=1&playlist=${ytid}&controls=0`}
            className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none border-0"
            allow="autoplay; encrypted-media"
            title="YouTube video player"
          />
        ) : isImg ? (
          <img src={feed.videoUrl} alt={feed.location} className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : feed.videoUrl ? (
          <video src={feed.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : null}

        <div className="absolute inset-0 p-4 font-mono text-[10px] text-white/80 tracking-wider pointer-events-none z-10">
          <div className="bg-black/50 inline-block px-1 rounded">[AI_VISION_MODULE: ACTIVE]</div><br />
          <div className="bg-black/50 inline-block px-1 rounded mt-1">FPS: 29.97 | CONFIDENCE: 98.2%</div>
        </div>
      </div>

      <div className="p-4 relative">
        <button onClick={onDelete} className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 rounded-lg">
          <Trash2 className="w-4 h-4" />
        </button>

        <h3 className="font-semibold text-sm mb-3 pr-8 truncate">{feed.location}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Current Load</span>
            <span className="font-mono">{feed.count} / {feed.capacity}</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${percentage > 85 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
