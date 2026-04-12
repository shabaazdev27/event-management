"use client";

import Link from "next/link";
import { useVenue } from "@/context/VenueContext";

export function GuestEventLink({
  className = "",
  children = "Guest event",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { venueId } = useVenue();
  return (
    <Link href={`/?venue=${venueId}`} className={className}>
      {children}
    </Link>
  );
}

export function StaffDashboardLink({
  className = "",
  children = "Staff access",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { venueId } = useVenue();
  return (
    <Link href={`/staff?venue=${venueId}`} className={className}>
      {children}
    </Link>
  );
}
