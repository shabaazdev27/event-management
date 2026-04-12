import AlertBanner from "@/components/AlertBanner";
import QueueManager from "@/components/QueueManager";
import LiveMetrics from "@/components/LiveMetrics";
import LiveFeedsManager from "@/components/LiveFeedsManager";
import IncidentsManager from "@/components/IncidentsManager";
import FanZoneManager from "@/components/FanZoneManager";
import TriviaManager from "@/components/TriviaManager";
import EventManager from "@/components/EventManager";
import ParkingManager from "@/components/ParkingManager";
import VenueSelector from "@/components/VenueSelector";
import VenueCatalogManager from "@/components/VenueCatalogManager";
import { GuestEventLink } from "@/components/VenueAwareNav";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-rose-500/30">
      <AlertBanner staffMode={true} />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-md border-b border-rose-500/20">
        <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-5 md:px-6 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-base sm:text-lg tracking-tight truncate">
                Staff operations
              </h1>
              <p className="text-[10px] sm:text-xs text-neutral-500 truncate">
                Same venue selection as guest view
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 min-w-0">
            <VenueSelector variant="staff" className="flex-1 sm:flex-initial min-w-0" />
            <nav className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
              <Link href="/venues" className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-rose-400 transition-colors whitespace-nowrap">
                All venues
              </Link>
              <GuestEventLink className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-rose-400 transition-colors whitespace-nowrap">
                Guest event
              </GuestEventLink>
              <div className="px-2.5 py-1 bg-rose-500/20 text-rose-400 rounded-full text-[10px] sm:text-xs font-semibold border border-rose-500/20 flex items-center gap-2 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Live
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-screen-2xl mx-auto px-3 sm:px-5 md:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 outline-none"
      >
        
        {/* Live Top metrics */}
        <LiveMetrics />

        <VenueCatalogManager />

        {/* Global Event Master Management */}
        <EventManager />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* Wait Times Management */}
            <QueueManager />
            
            {/* Fan Interactions Management */}
            <FanZoneManager />
            <TriviaManager />
          </div>
          
          <div className="space-y-8">
            {/* Global Incident Tracking */}
            <IncidentsManager />

            {/* Security Feeds Management */}
            <LiveFeedsManager />

            {/* Parking Management */}
            <ParkingManager />
          </div>
        </div>

      </main>
    </div>
  );
}
