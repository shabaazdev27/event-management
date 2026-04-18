"use client";

import { PhoneCall } from "lucide-react";
import { useVenue } from "@/context/VenueContext";

export default function SosHelplinesCard() {
  const { venue } = useVenue();
  const eventHelpline = venue.eventManagementHelpline || "1800-200-1122";
  const eventHelplineDial = eventHelpline.replace(/[^\d+]/g, "");

  return (
    <section className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <PhoneCall className="w-4 h-4 text-rose-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-300">SOS Helplines</h2>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="text-neutral-300">Event management</span>
          <a href={`tel:${eventHelplineDial}`} className="font-semibold text-rose-300 hover:text-rose-200 transition-colors">
            {eventHelpline}
          </a>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-neutral-300">National emergency</span>
          <a href="tel:112" className="font-semibold text-rose-300 hover:text-rose-200 transition-colors">
            112
          </a>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-neutral-300">Police</span>
          <a href="tel:100" className="font-semibold text-rose-300 hover:text-rose-200 transition-colors">
            100
          </a>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-neutral-300">Ambulance</span>
          <a href="tel:108" className="font-semibold text-rose-300 hover:text-rose-200 transition-colors">
            108
          </a>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-neutral-300">Fire</span>
          <a href="tel:101" className="font-semibold text-rose-300 hover:text-rose-200 transition-colors">
            101
          </a>
        </li>
      </ul>
    </section>
  );
}
