"use client";

import Script from "next/script";
import type { ReactElement } from "react";

/**
 * GoogleAnalytics component for GA4 integration.
 * Loads Google Analytics 4 tracking when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 * Uses gtag.js; measurement ID is public by design and safe for client-side use.
 * 
 * @returns {JSX.Element | null} The GA4 scripts or null if no measurement ID is configured
 * 
 * @example
 * ```tsx
 * // In your root layout
 * <GoogleAnalytics />
 * ```
 */
export function GoogleAnalytics(): ReactElement | null {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  
  if (!gaId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
        id="ga-script"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
            send_page_view: true,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
