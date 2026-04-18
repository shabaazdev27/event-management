"use client";

import Link from "next/link";
import { useVenue } from "@/context/VenueContext";
import { MapPin, LayoutGrid, ArrowRight } from "lucide-react";

export default function VenuesOverviewPage() {
  const { venueList } = useVenue();

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-white/10">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-6 h-6 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-lg tracking-tight truncate">
                Venue dashboards
              </h1>
              <p className="text-xs text-neutral-500 truncate">
                Includes venues from your catalog (staff can add more)
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
          >
            ← Back to ArenaLink
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 outline-none"
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {venueList.map((v) => (
            <li key={v.id}>
              <article className="h-full rounded-2xl border border-white/10 bg-neutral-900/50 p-5 flex flex-col gap-4 shadow-lg shadow-black/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-300">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-white leading-snug">{v.name}</h2>
                    <p className="text-sm text-neutral-400 mt-1">
                      {v.city}, {v.region}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2 line-clamp-2">
                      Capacity baseline ~{v.defaultCapacity.toLocaleString()} ·{" "}
                      {v.parkingSummary}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
                  <Link
                    href={`/?venue=${v.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 px-3 transition-colors"
                  >
                    Guest view
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/staff?venue=${v.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-100 text-sm font-medium py-2.5 px-3 transition-colors"
                  >
                    Staff ops
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
