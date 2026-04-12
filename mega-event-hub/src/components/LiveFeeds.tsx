"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onSnapshot, query } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Video, Camera, Car } from "lucide-react";

type Feed = {
  id?: string;
  location: string;
  status: "normal" | "warning" | "critical";
  count: number;
  capacity: number;
  videoUrl?: string;
};

export default function LiveFeeds({ title = "Live Gate Feeds", collectionName = "cameras", iconType = "video" }: { title?: string, collectionName?: string, iconType?: "video" | "car" }) {
  const { venueId } = useVenue();
  const [feeds, setFeeds] = useState<Feed[]>([]);

  useEffect(() => {
    const col =
      collectionName === "parking_cameras"
        ? venuePaths.parkingCameras(venueId)
        : venuePaths.cameras(venueId);
    const q = query(col);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setFeeds(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Feed)));
      } else {
        setFeeds([]);
      }
    });
    return () => unsubscribe();
  }, [collectionName, venueId]);

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isClient) return null;

  const Icon = iconType === "car" ? Car : Video;

  return (
    <section className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 w-full min-w-0 relative z-0 isolate" aria-labelledby={`live-feeds-${collectionName}`}>
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-rose-400" aria-hidden />
        <h2 id={`live-feeds-${collectionName}`} className="font-semibold text-lg">{title}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {feeds.map(feed => <FeedCard key={feed.id || feed.location} feed={feed} />)}
      </div>
      
      {feeds.length === 0 && (
         <div className="text-center p-8 text-neutral-500 italic border border-dashed border-white/10 rounded-xl">
           No active feeds published.
         </div>
      )}
    </section>
  );
}

function FeedCard({ feed }: { feed: Feed }) {
  const statusColors = {
    normal: "border-emerald-500/30",
    warning: "border-amber-500/30",
    critical: "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
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
    return cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
  };

  const ytid = getYouTubeId(feed.videoUrl || "");
  const isImg = !ytid && isImage(feed.videoUrl || "");

  return (
    <div className={`rounded-2xl border ${statusColors[feed.status]} bg-neutral-900 overflow-hidden relative group`}>
      <div className="h-32 sm:h-40 bg-black relative border-b border-white/5 flex items-center justify-center overflow-hidden">
        {ytid ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytid}?autoplay=1&mute=1&loop=1&playlist=${ytid}&controls=0`}
            className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none border-0"
            allow="autoplay; encrypted-media"
            title={`Live video: ${feed.location}`}
          />
        ) : isImg ? (
          <img src={feed.videoUrl} alt={`Camera feed: ${feed.location}`} className="absolute inset-0 w-full h-full object-cover opacity-80" />
        ) : feed.videoUrl ? (
          <video src={feed.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
        ) : (
          <Camera className="w-8 h-8 text-neutral-700" />
        )}
        
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-white/90">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="p-4 relative">
        <h3 className="font-semibold text-sm mb-3 truncate">{feed.location}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400 font-medium">Occupancy</span>
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
  );
}
