"use client";

import { VenueProvider } from "@/context/VenueContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <VenueProvider>{children}</VenueProvider>;
}
