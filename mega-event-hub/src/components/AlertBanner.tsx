"use client";

import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { onSnapshot } from "firebase/firestore";
import { venuePaths } from "@/lib/venue-firestore-paths";
import { useVenue } from "@/context/VenueContext";

export default function AlertBanner({ staffMode = false }: { staffMode?: boolean }) {
  const { venueId } = useVenue();
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const metricsRef = venuePaths.metricsDoc(venueId);
    const unsubscribe = onSnapshot(
      metricsRef,
      { includeMetadataChanges: true },
      (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.global_status?.alert_message) {
          // Track alert shown (client-side analytics)
          if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "alert_banner_shown", {
              venue_id: venueId,
              alert_type: staffMode ? "staff" : "guest",
              message: data.global_status.alert_message,
            });
          }
          setMessages([data.global_status.alert_message]);
        } else {
          setMessages([]);
        }
      }
    });

    return () => unsubscribe();
  }, [staffMode, venueId]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border ${
              staffMode 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-100' 
                : 'bg-amber-500/20 border-amber-500/50 text-amber-100'
            }`}
          >
            <AlertCircle className={`w-5 h-5 ${staffMode ? 'text-rose-400' : 'text-amber-400'}`} aria-hidden="true" />
            <p className="text-sm font-medium" role="alert" aria-live="assertive">{msg}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
