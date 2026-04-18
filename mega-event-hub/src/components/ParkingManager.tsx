"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, addDoc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Car, Plus, Trash2, X, Edit2, Check } from "lucide-react";

type CameraFeed = {
  id: string;
  location: string;
  status: 'critical' | 'warning' | 'normal';
  count: number;
  capacity: number;
  videoUrl: string;
};

export default function ParkingManager() {
  const { venueId } = useVenue();
  const [feeds, setFeeds] = useState<CameraFeed[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ location: "", count: 0, capacity: 1000, videoUrl: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ location: "", count: 0, capacity: 1000, videoUrl: "" });
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleToggleAdd = () => {
    if (isAdding) {
      setAddForm({ location: "", count: 0, capacity: 1000, videoUrl: "" });
      setError("");
      setIsAdding(false);
      return;
    }
    setAddForm({ location: "", count: 0, capacity: 1000, videoUrl: "" });
    setError("");
    setIsAdding(true);
  };

  useEffect(() => {
    const parkingCol = venuePaths.parkingCameras(venueId);
    const q = query(parkingCol);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        const defaultFeeds = [
          { location: "Lot A (VIP / Stadium)", status: "normal", count: 120, capacity: 500, videoUrl: "https://www.youtube.com/watch?v=1F2b2QzQ51Y" },
          { location: "Lot B (General)", status: "warning", count: 850, capacity: 1000, videoUrl: "https://www.youtube.com/watch?v=q6DoMrtgCgA" },
          { location: "Lot D (East Wing)", status: "critical", count: 980, capacity: 1000, videoUrl: "https://www.youtube.com/watch?v=F3J0iVqM6M0" },
        ];

        try {
          await Promise.all(
            defaultFeeds.map((feed) =>
              addDoc(parkingCol, { ...feed, createdAt: serverTimestamp() })
            )
          );
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to seed default parking feeds.");
        }
      } else {
        const liveFeeds = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CameraFeed[];
        setFeeds(liveFeeds);
      }
    });

    return () => unsubscribe();
  }, [venueId]);

  const getStatus = (count: number, capacity: number) => {
    const p = count / capacity;
    if (p > 0.85) return 'critical';
    if (p > 0.70) return 'warning';
    return 'normal';
  };

  const sanitizeMediaUrl = (value: string) => value.trim();

  const isSafeMediaUrl = (value: string) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const previousForm = { ...addForm };
    const sanitizedUrl = sanitizeMediaUrl(previousForm.videoUrl);
    if (!previousForm.location.trim()) {
      setError("Location is required.");
      return;
    }
    if (previousForm.capacity <= 0) {
      setError("Capacity must be greater than 0.");
      return;
    }
    if (!isSafeMediaUrl(sanitizedUrl)) {
      setError("Media URL must be a valid HTTPS URL.");
      return;
    }
    try {
      setError("");
      setIsAdding(false);
      setAddForm({ location: "", count: 0, capacity: 1000, videoUrl: "" });
      setSaving(true);
      await addDoc(venuePaths.parkingCameras(venueId), {
        location: previousForm.location.trim(),
        count: previousForm.count,
        capacity: previousForm.capacity,
        videoUrl: sanitizedUrl,
        status: getStatus(previousForm.count, previousForm.capacity),
        createdAt: serverTimestamp()
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add parking feed.");
      setAddForm(previousForm);
      setIsAdding(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this parking feed?")) {
      try {
        setError("");
        setSaving(true);
        await deleteDoc(venuePaths.parkingCameraDoc(venueId, id));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to remove parking feed.");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleStartEdit = (feed: CameraFeed) => {
    setError("");
    setEditingId(feed.id);
    setEditForm({
      location: feed.location,
      count: feed.count,
      capacity: feed.capacity,
      videoUrl: feed.videoUrl,
    });
  };

  const handleUpdate = async (targetId: string, form: { location: string; count: number; capacity: number; videoUrl: string }) => {
    if (!targetId || !form.location.trim() || form.capacity <= 0) return;
    const previousForm = { ...form };
    const sanitizedUrl = sanitizeMediaUrl(previousForm.videoUrl);
    if (!isSafeMediaUrl(sanitizedUrl)) {
      setError("Media URL must be a valid HTTPS URL.");
      return;
    }

    try {
      setError("");
      setSavingEditId(targetId);
      // Close edit form immediately after update click.
      setEditingId(null);

      await setDoc(
        venuePaths.parkingCameraDoc(venueId, targetId),
        {
          location: previousForm.location.trim(),
          count: previousForm.count,
          capacity: previousForm.capacity,
          videoUrl: sanitizedUrl,
          status: getStatus(previousForm.count, previousForm.capacity),
        },
        { merge: true }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update parking feed.");
      setEditForm(previousForm);
      setEditingId(targetId);
    } finally {
      setSavingEditId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold">Parking AI Vision</h2>
        </div>
        <button
          onClick={handleToggleAdd}
          className="flex items-center gap-1 text-xs font-semibold bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/30 transition-colors text-emerald-400"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Feed"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-neutral-800/40 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-37.5">
            <label className="text-xs text-neutral-400 mb-1 block">Location</label>
            <input type="text" placeholder="e.g. South Lot" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" value={addForm.location} onChange={e => setAddForm({ ...addForm, location: e.target.value })} />
          </div>
          <div className="w-24">
            <label className="text-xs text-neutral-400 mb-1 block">Count</label>
            <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" value={addForm.count} onChange={e => setAddForm({ ...addForm, count: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="w-24">
            <label className="text-xs text-neutral-400 mb-1 block">Capacity</label>
            <input type="number" required className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" value={addForm.capacity} onChange={e => setAddForm({ ...addForm, capacity: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="flex-1 min-w-37.5">
            <label className="text-xs text-neutral-400 mb-1 block">Media URL</label>
            <input type="text" className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="https://" value={addForm.videoUrl} onChange={e => setAddForm({ ...addForm, videoUrl: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">{saving ? "Saving..." : "Add"}</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {feeds.map((feed) =>
          editingId === feed.id ? (
            <form
              key={feed.id}
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdate(feed.id, editForm);
              }}
              className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-emerald-300">Update Parking Feed</h3>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Location</label>
                <input
                  type="text"
                  required
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Count</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    value={editForm.count}
                    onChange={(e) => setEditForm({ ...editForm, count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Media URL</label>
                <input
                  type="text"
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleUpdate(feed.id, editForm);
                  }}
                  disabled={savingEditId === feed.id}
                  aria-label="Save parking feed"
                  className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 disabled:opacity-70"
                  title="Save parking feed"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel edit"
                  className="p-2 bg-neutral-700/50 text-neutral-300 rounded-lg hover:bg-neutral-700"
                  title="Cancel edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <VideoFeedCard
              key={feed.id}
              feed={feed}
              onDelete={() => handleDelete(feed.id)}
              onEdit={() => handleStartEdit(feed)}
            />
          )
        )}
      </div>
    </div>
  );
}

function VideoFeedCard({ feed, onDelete, onEdit }: { feed: CameraFeed; onDelete: () => void; onEdit: () => void }) {
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
    return match?.[2] && match[2].length === 11 ? match[2] : null;
  };

  const isImage = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0]?.toLowerCase();
    if (!cleanUrl) return false;
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
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="YouTube video player"
          />
        ) : isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={feed.videoUrl} alt={feed.location} className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : feed.videoUrl ? (
          <video src={feed.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-70" />
        ) : null}

        <div className="absolute top-4 left-4 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
          ALPR TRACKING
        </div>

        <div className="absolute inset-0 p-4 font-mono text-[10px] text-white/80 tracking-wider pointer-events-none z-10 flex flex-col justify-end">
          <div><span className="bg-black/50 px-1 rounded">SPOTS_SCAN: ACTIVE</span></div>
        </div>
      </div>

      <div className="p-4 relative">
        <button type="button" onClick={onDelete} aria-label={`Delete ${feed.location} feed`} className="absolute top-4 right-4 p-1.5 text-rose-400/80 hover:text-rose-300 bg-neutral-800 rounded-lg border border-rose-500/20 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={onEdit} aria-label={`Edit ${feed.location} feed`} className="absolute top-4 right-14 p-1.5 text-neutral-300 hover:text-white bg-neutral-800 rounded-lg border border-white/10 transition-colors" title="Edit parking feed">
          <Edit2 className="w-4 h-4" />
        </button>

        <h3 className="font-semibold text-sm mb-3 pr-8 truncate">{feed.location}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Cars Parked</span>
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
