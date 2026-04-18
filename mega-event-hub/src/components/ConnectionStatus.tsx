"use client";

import { useEffect, useState } from "react";
import { connectionState } from "@/lib/firebase";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Firebase connection status indicator
 * Shows when offline data is being used
 */
export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = connectionState.subscribe((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setShowOffline(true);
        // Track offline event
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "connection_lost", {
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Track reconnection
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "connection_restored", {
            timestamp: new Date().toISOString(),
          });
        }
        // Keep showing for 2 seconds after reconnecting
        setTimeout(() => setShowOffline(false), 2000);
      }
    });

    return unsubscribe;
  }, []);

  if (!showOffline && isConnected) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border text-sm font-medium transition-all duration-300 ${
        isConnected
          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
          : "bg-amber-500/20 border-amber-500/30 text-amber-400"
      }`}
      role="status"
      aria-live="polite"
    >
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4" aria-hidden />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" aria-hidden />
          <span>Using cached data</span>
        </>
      )}
    </div>
  );
}
