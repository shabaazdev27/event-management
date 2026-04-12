"use client";

import { MapPin, ChevronDown } from "lucide-react";
import { useVenue } from "@/context/VenueContext";

type Props = {
  variant?: "guest" | "staff";
  className?: string;
};

export default function VenueSelector({ variant = "guest", className = "" }: Props) {
  const { venueId, setVenueId, venue, venueList } = useVenue();
  const border =
    variant === "staff"
      ? "border-rose-500/30 bg-rose-950/20"
      : "border-white/10 bg-neutral-950/40";

  return (
    <label
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 min-w-0 ${border} ${className}`}
    >
      <MapPin
        className={`w-4 h-4 flex-shrink-0 ${variant === "staff" ? "text-rose-300" : "text-indigo-400"}`}
      />
      <select
        aria-label="Select venue"
        value={venueId}
        onChange={(e) => setVenueId(e.target.value)}
        className="bg-transparent text-xs sm:text-sm text-white font-medium truncate cursor-pointer focus:outline-none focus:ring-0 min-w-0 flex-1 max-w-[200px] sm:max-w-[280px]"
      >
        {venueList.map((v) => (
          <option key={v.id} value={v.id} className="bg-neutral-900 text-white">
            {v.city} — {v.shortName}
          </option>
        ))}
      </select>
      {/* <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0 pointer-events-none" /> */}
      <span className="sr-only">Current venue: {venue.name}</span>
    </label>
  );
}
