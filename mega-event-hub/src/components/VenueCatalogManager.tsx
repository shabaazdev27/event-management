"use client";

import { useMemo, useState } from "react";
import { deleteDoc, setDoc } from "firebase/firestore";
import { venueCatalogDoc } from "@/lib/venue-catalog";
import { isValidNewVenueId, type VenueDefinition } from "@/lib/venues";
import { useVenue } from "@/context/VenueContext";
import { MapPin, Plus, Trash2, Building2 } from "lucide-react";

const emptyForm = {
  id: "",
  name: "",
  shortName: "",
  city: "",
  region: "",
  lat: "",
  lon: "",
  timezone: "Asia/Kolkata",
  defaultCapacity: "40000",
  parkingSummary: "",
  eventManagementHelpline: "",
};

export default function VenueCatalogManager() {
  const { venueList, catalogHydrated } = useVenue();
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () => [...venueList].sort((a, b) => a.id.localeCompare(b.id)),
    [venueList]
  );

  const handleToggleForm = () => {
    if (isFormOpen) {
      setForm(emptyForm);
      setError("");
      setIsFormOpen(false);
      return;
    }
    setSaving(false);
    setForm(emptyForm);
    setError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    const id = form.id.trim().toLowerCase();
    if (!isValidNewVenueId(id)) {
      setError(
        "Venue id must be 2–49 chars: start with a letter, then lowercase letters, numbers, or hyphens (URL slug)."
      );
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setError("Venue name is required.");
      return;
    }
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }
    const cap = Math.floor(Number(form.defaultCapacity));
    if (!Number.isFinite(cap) || cap < 500) {
      setError("Capacity must be at least 500.");
      return;
    }

    const docBody: VenueDefinition = {
      id,
      name,
      shortName: form.shortName.trim() || name,
      city: form.city.trim() || "—",
      region: form.region.trim() || "—",
      lat,
      lon,
      timezone: form.timezone.trim() || "Asia/Kolkata",
      defaultCapacity: cap,
      parkingSummary: form.parkingSummary.trim() || "See venue map",
      eventManagementHelpline:
        form.eventManagementHelpline.trim() || "1800-200-1122",
    };

    setSaving(true);
    setForm(emptyForm);
    setIsFormOpen(false);
    try {
      await setDoc(venueCatalogDoc(id), docBody);
    } catch (err: unknown) {
      setIsFormOpen(true);
      setError(err instanceof Error ? err.message : "Failed to save venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: VenueDefinition) => {
    if (
      !confirm(
        `Remove "${v.name}" from the catalog? Data under siteVenues/${v.id} is not deleted automatically.`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(venueCatalogDoc(v.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <Building2 className="w-5 h-5" />
        <h2 className="font-semibold text-white">Venue catalog</h2>
        <button
          type="button"
          onClick={handleToggleForm}
          className="ml-auto inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          {!isFormOpen && <Plus className="w-4 h-4" />}
          {isFormOpen ? "Close" : "Add venue"}
        </button>
        {!catalogHydrated && (
          <span className="text-xs text-neutral-500">Syncing…</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 mb-6">
        Add stadiums or arenas here. Each venue id is used in the URL (
        <code className="text-neutral-400">?venue=your-id</code>) and scopes
        Firestore data under <code className="text-neutral-400">siteVenues/</code>.
      </p>
      {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

      {isFormOpen && (
      <form
        onSubmit={handleSubmit}
        className="mb-8 p-4 rounded-xl bg-neutral-800/40 border border-white/5 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Venue id (slug)</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="e.g. ahmedabad"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-400 block mb-1">Official name</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Stadium or arena name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Short name</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Label on map"
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">City</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Region / state</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Latitude</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="12.97"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Longitude</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="77.59"
              value={form.lon}
              onChange={(e) => setForm({ ...form, lon: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">IANA timezone</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Default capacity</label>
            <input
              type="number"
              min={500}
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              value={form.defaultCapacity}
              onChange={(e) => setForm({ ...form, defaultCapacity: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs text-neutral-400 block mb-1">Parking summary</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="Lots / zones fans should know"
              value={form.parkingSummary}
              onChange={(e) => setForm({ ...form, parkingSummary: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs text-neutral-400 block mb-1">Event management helpline</label>
            <input
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="e.g. 1800-200-1122"
              value={form.eventManagementHelpline}
              onChange={(e) =>
                setForm({ ...form, eventManagementHelpline: e.target.value })
              }
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 border border-sky-300/80 shadow-[0_0_0_1px_rgba(125,211,252,0.35)] disabled:bg-sky-500/80 disabled:border-sky-300/50 disabled:text-white/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add or update venue
        </button>
      </form>
      )}

      <h3 className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-3">
        Registered venues ({sorted.length})
      </h3>
      <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {sorted.map((v) => (
          <li
            key={v.id}
            className="flex items-start justify-between gap-3 p-3 rounded-xl bg-neutral-800/40 border border-white/5"
          >
            <div className="flex gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">{v.name}</div>
                <div className="text-xs text-neutral-500">
                  <span className="font-mono text-indigo-300/90">{v.id}</span>
                  {" · "}
                  {v.city}, {v.region}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Helpline: {v.eventManagementHelpline}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(v)}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 shrink-0"
              title="Remove from catalog"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
