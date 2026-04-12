"use client";

import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { CloudRain, Thermometer, Car, Compass, Info, Loader2 } from "lucide-react";
import { onSnapshot } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";

type WeatherPayload = {
  tempF: number;
  tempC: number;
  condition: string;
  rainChancePercent: number | null;
};

function StatRow({
  icon: Icon,
  label,
  children,
  iconClass,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex gap-3 py-2.5 px-3 rounded-xl bg-neutral-950/50 border border-white/5 min-w-0">
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 mb-0.5">
          {label}
        </div>
        <div className="text-sm sm:text-base text-neutral-100">{children}</div>
      </div>
    </div>
  );
}

export default function EventDetails() {
  const { venueId, venue } = useVenue();
  const [capacityFill, setCapacityFill] = useState("—");
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherErr, setWeatherErr] = useState<string | null>(null);

  useEffect(() => {
    const metricsRef = venuePaths.metricsDoc(venueId);
    const unsubscribe = onSnapshot(metricsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.global_status?.occupancy_percent !== undefined) {
          setCapacityFill(`${Math.round(data.global_status.occupancy_percent * 100)}%`);
        }
      }
    });
    return () => unsubscribe();
  }, [venueId]);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherErr(null);
    try {
      const params = new URLSearchParams({
        lat: String(venue.lat),
        lon: String(venue.lon),
        timezone: venue.timezone,
      });
      const res = await fetch(`/api/weather?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Weather request failed");
      }
      setWeather({
        tempF: data.tempF,
        tempC: data.tempC,
        condition: data.condition,
        rainChancePercent: data.rainChancePercent,
      });
    } catch (e: unknown) {
      setWeatherErr(e instanceof Error ? e.message : "Weather unavailable");
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [venue.lat, venue.lon, venue.timezone]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const rainDisplay =
    weather?.rainChancePercent != null ? `${weather.rainChancePercent}%` : "—";

  return (
    <section className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 sm:p-5 relative overflow-hidden min-w-0 w-full shrink-0">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Info className="w-20 h-20" />
      </div>

      <div className="relative z-10 flex flex-col gap-3 min-w-0">
        <div className="flex items-start gap-2 pb-1 border-b border-white/5">
          <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="font-semibold text-base sm:text-lg leading-tight">
              Venue & weather
            </h2>
            <p className="text-xs text-neutral-400 mt-1 leading-snug">
              <span className="text-white/90 font-medium">{venue.name}</span>
              <span className="text-neutral-500">
                {" "}
                · {venue.city}, {venue.region}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <StatRow
            icon={Thermometer}
            label="Weather"
            iconClass="text-orange-400"
          >
            {weatherLoading ? (
              <span className="inline-flex items-center gap-2 text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </span>
            ) : weatherErr ? (
              <span className="text-amber-400/90 text-sm">{weatherErr}</span>
            ) : (
              <>
                <span className="font-light text-xl sm:text-2xl">
                  {Math.round(weather!.tempF)}°F
                  <span className="text-sm text-neutral-500 ml-2">
                    ({weather!.tempC}°C)
                  </span>
                </span>
                <span className="block text-xs text-neutral-400 mt-0.5">
                  {weather!.condition}
                </span>
              </>
            )}
          </StatRow>

          <StatRow
            icon={CloudRain}
            label="Rain today (max chance)"
            iconClass="text-blue-400"
          >
            <span className="font-light text-xl">{rainDisplay}</span>
          </StatRow>

          <StatRow icon={Car} label="Parking" iconClass="text-emerald-400">
            <span className="text-emerald-400 font-medium">Available</span>
            <span className="block text-xs text-neutral-500 mt-0.5">
              {venue.parkingSummary}
            </span>
          </StatRow>

          <StatRow icon={Compass} label="Capacity (live)" iconClass="text-purple-400">
            <span className="font-medium text-lg">{capacityFill}</span>
            <span className="block text-xs text-neutral-500 mt-0.5">
              Current fill
            </span>
          </StatRow>
        </div>
      </div>
    </section>
  );
}
