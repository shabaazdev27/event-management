"use client";

import { useVenue } from "@/context/VenueContext";

/**
 * Interactive venue map component with accessibility features.
 * Displays a stylized visualization of the venue layout with crowd density indicators.
 */
export default function Map() {
  const { venue } = useVenue();

  return (
    <div 
      className="w-full h-full min-h-70 sm:min-h-90 bg-neutral-900 rounded-xl relative overflow-hidden flex items-center justify-center"
      role="img"
      aria-label={`Interactive map of ${venue.name} venue showing crowd density and key locations`}
    >
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <span 
          className="text-[10px] sm:text-xs font-mono font-semibold tracking-widest uppercase bg-black/50 border border-white/10 text-white/80 px-2 py-1 rounded-lg max-w-full truncate"
          aria-label={`Current venue: ${venue.shortName} in ${venue.city}`}
        >
          {venue.shortName} · {venue.city}
        </span>
      </div>

      <div
        className="w-3/4 max-w-md aspect-square rounded-full border-4 border-indigo-500/20 relative animate-[spin_60s_linear_infinite]"
        style={{ borderRadius: "50% 50% 60% 40% / 50% 60% 40% 50%" }}
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-rose-500/50 blur-3xl rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-amber-500/40 blur-3xl rounded-full animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/4 left-1/2 w-24 h-24 bg-indigo-500/50 blur-2xl rounded-full animate-[pulse_4s_ease-in-out_infinite]" />

        <div className="absolute inset-4 border border-white/5 rounded-full flex items-center justify-center">
          <div className="w-1/2 h-1/2 bg-linear-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-500/20 rounded relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <div 
              className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10 animate-ping"
              title="Your current location"
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
        <div 
          className="text-white/30 font-mono text-[10px] sm:text-xs font-semibold tracking-widest uppercase"
          aria-label="Map grid section 1-A"
        >
          Grid 1-A
        </div>
        <div 
          className="text-white/30 font-mono text-[10px] sm:text-xs font-semibold tracking-widest uppercase self-end"
          aria-label="Map grid section 4-D"
        >
          Grid 4-D
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(10,10,10,0.8)_100%)] pointer-events-none" />
      
      {/* Screen reader only description */}
      <div className="sr-only">
        This map shows the {venue.name} venue layout with real-time crowd density visualization. 
        Colored areas indicate different crowd concentrations: red for high density, 
        yellow for moderate, and blue for low. Your current location is marked in the center.
      </div>
    </div>
  );
}
