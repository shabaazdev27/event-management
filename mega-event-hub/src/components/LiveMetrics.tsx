"use client";

import { useEffect, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";
import { Activity, AlertTriangle, Users } from "lucide-react";

type StaffMetrics = {
  totalInside: number;
  highDensityZones: number;
  trend: string;
};

type StaffMetricOverrides = Partial<StaffMetrics>;

type GateWaitRow = { wait_time?: number };

export default function LiveMetrics() {
  const { venueId } = useVenue();
  const [metrics, setMetrics] = useState<StaffMetrics>({
    totalInside: 48291,
    highDensityZones: 3,
    trend: "+1,200/hr",
  });

  const [avgWaitTime, setAvgWaitTime] = useState("12 mins");
  const [activeIncidents, setActiveIncidents] = useState(0);

  useEffect(() => {
    const metricsRef = venuePaths.metricsDoc(venueId);
    const unsubscribe = onSnapshot(metricsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        setMetrics((prev) => ({
          ...prev,
          totalInside: data.global_status?.occupied ?? prev.totalInside,
        }));

        const gates = data.gates as GateWaitRow[] | undefined;
        if (gates && gates.length > 0) {
          const totalWait = gates.reduce(
            (acc, curr) => acc + (curr.wait_time || 0),
            0
          );
          const avg = Math.round(totalWait / gates.length);
          setAvgWaitTime(`${avg} mins`);
        } else {
          setAvgWaitTime("0 mins");
        }
      }
    });

    return () => unsubscribe();
  }, [venueId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(venuePaths.incidents(venueId), (snapshot) => {
      setActiveIncidents(snapshot.size);
    });
    return () => unsubscribe();
  }, [venueId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(venuePaths.staffMetricOverrides(venueId), (docSnap) => {
      if (!docSnap || typeof (docSnap as { exists?: unknown }).exists !== "function") {
        return;
      }
      if (!docSnap.exists()) return;
      const data = docSnap.data() as StaffMetricOverrides;

      setMetrics((prev) => ({
        ...prev,
        totalInside:
          typeof data.totalInside === "number" ? data.totalInside : prev.totalInside,
        highDensityZones:
          typeof data.highDensityZones === "number"
            ? data.highDensityZones
            : prev.highDensityZones,
        trend: typeof data.trend === "string" ? data.trend : prev.trend,
      }));
    });

    return () => unsubscribe();
  }, [venueId]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<StaffMetrics>(metrics);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleEditing = () => {
    if (isEditing) {
      setEditForm(metrics);
      setError("");
      setIsEditing(false);
    } else {
      setEditForm(metrics);
      setError("");
      setIsEditing(true);
    }
  };

  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    const nextMetrics = { ...editForm };
    setMetrics(nextMetrics);
    setIsEditing(false);
    try {
      await Promise.race([
        setDoc(venuePaths.staffMetricOverrides(venueId), nextMetrics, { merge: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Save timed out. Please try again.")), 8000)
        ),
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save metrics.");
      setIsEditing(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">
          Live Metrics
        </h2>
        <button
          type="button"
          onClick={toggleEditing}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded-md transition-colors"
        >
          {isEditing ? "Cancel" : "Edit Metrics"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {isEditing ? (
        <form
          onSubmit={handleSaveMetrics}
          className="bg-neutral-800/40 border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1" htmlFor="metric-total-inside">
                Total Inside Venue
              </label>
              <input
                id="metric-total-inside"
                type="number"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={editForm.totalInside}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    totalInside: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1" htmlFor="metric-trend">
                Entrance Trend (e.g., +1,200/hr)
              </label>
              <input
                id="metric-trend"
                type="text"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={editForm.trend}
                onChange={(e) => setEditForm({ ...editForm, trend: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1" htmlFor="metric-zones">
                High Density Zones
              </label>
              <input
                id="metric-zones"
                type="number"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={editForm.highDensityZones}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    highDensityZones: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Note: Active Incidents and Avg Wait Time are calculated automatically.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Save Details
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total inside Venue"
            value={metrics.totalInside.toLocaleString()}
            trend={metrics.trend}
            alert={false}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="High Density Zones"
            value={metrics.highDensityZones}
            alert={metrics.highDensityZones > 0}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <MetricCard
            title="Avg Wait Time"
            value={avgWaitTime}
            alert={false}
            icon={<Activity className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Incidents"
            value={activeIncidents}
            alert={activeIncidents > 0}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>
      )}
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  trend?: string;
  alert?: boolean;
  icon: React.ReactNode;
};

function MetricCard({ title, value, trend, alert = false, icon }: MetricCardProps) {
  return (
    <div
      className={`p-5 rounded-2xl border bg-neutral-900/50 backdrop-blur-sm ${
        alert
          ? "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
          : "border-white/5"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={`p-2 rounded-lg ${
            alert ? "bg-rose-500/20 text-rose-400" : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {icon}
        </div>
        {trend ? (
          <span
            className={`text-xs font-semibold ${
              trend.startsWith("+") ? "text-emerald-400" : "text-blue-400"
            }`}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-3xl font-bold mb-1 tracking-tight">{value}</div>
        <div className="text-sm text-neutral-400">{title}</div>
      </div>
    </div>
  );
}
