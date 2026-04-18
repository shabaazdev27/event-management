import AlertBanner from "@/components/AlertBanner";
import Chatbot from "@/components/Chatbot";
import LiveWaitTimes from "@/components/LiveWaitTimes";
import FanGateGuide from "@/components/FanGateGuide";
import Map from "@/components/Map";
import InteractiveFanZone from "@/components/InteractiveFanZone";
import EventSchedule from "@/components/EventSchedule";
import EventDetails from "@/components/EventDetails";
import FanGame from "@/components/FanGame";
import LiveFeeds from "@/components/LiveFeeds";
import VenueSelector from "@/components/VenueSelector";
import SosHelplinesCard from "@/components/SosHelplinesCard";
import { StaffDashboardLink } from "@/components/VenueAwareNav";
import { MapPin, User, Activity } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500/30">
      <AlertBanner />

      <header className="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-md border-b border-white/10">
        <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-5 md:px-6 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3 min-w-0 lg:justify-start">
            <Link
              href="/venues"
              className="flex items-center gap-2 min-w-0 group"
              title="All venues"
            >
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 p-1.5">
                <Image
                  src="/logo.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-base sm:text-lg tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                  ArenaLink
                </h1>
                <p className="text-[10px] sm:text-xs text-neutral-500 truncate">
                  Guest experience · same venue in staff tools
                </p>
              </div>
            </Link>
            <span className="lg:hidden text-[10px] uppercase tracking-wider font-semibold text-emerald-400/90 border border-emerald-500/30 rounded-full px-2 py-0.5 shrink-0">
              Guest
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 min-w-0">
            <VenueSelector variant="guest" className="flex-1 sm:flex-initial min-w-0" />
            <nav className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
              <span className="hidden lg:inline text-[10px] uppercase tracking-wider font-semibold text-emerald-400/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
                Guest
              </span>
              <Link
                href="/venues"
                className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-indigo-400 transition-colors whitespace-nowrap"
              >
                All venues
              </Link>
              <StaffDashboardLink className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-indigo-400 transition-colors whitespace-nowrap">
                Staff access
              </StaffDashboardLink>
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-neutral-400" />
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-screen-2xl mx-auto px-3 sm:px-5 md:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start outline-none"
      >
        <aside className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 sm:gap-6 min-w-0 w-full lg:max-w-none">
          <FanGateGuide />
          <EventDetails />
          <SosHelplinesCard />
          <LiveWaitTimes />
          <InteractiveFanZone />
        </aside>

        <div className="lg:col-span-7 xl:col-span-8 space-y-5 sm:space-y-6 flex flex-col min-w-0 w-full min-h-0">
          <section className="bg-neutral-900/50 border border-white/5 rounded-2xl p-1 overflow-hidden shrink-0 relative min-h-70 sm:min-h-95 lg:min-h-105">
            <Map />
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex gap-2 items-center text-center sm:text-left min-w-0">
                <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-balance">
                  CrowdVision density overlay active
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30 shrink-0">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 grow min-w-0">
            <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
              <FanGame />
              <EventSchedule />
            </div>
            <section className="grow flex flex-col bg-neutral-900/50 border border-white/5 rounded-2xl p-3 sm:p-4 min-h-[min(420px,70vh)] md:min-h-100">
              <Chatbot />
            </section>
          </div>
        </div>

        <div className="lg:col-span-12 space-y-5 sm:space-y-6 min-w-0">
          <LiveFeeds
            collectionName="cameras"
            title="Live Gate Security Feeds"
            iconType="video"
          />
          <LiveFeeds
            collectionName="parking_cameras"
            title="Live Parking Capacity Feeds"
            iconType="car"
          />
        </div>
      </main>
    </div>
  );
}
