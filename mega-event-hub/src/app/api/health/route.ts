/**
 * Health check endpoint for Cloud Run and monitoring systems.
 * Returns service status and dependency health.
 */

import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/gcp-monitoring";
import { withSecurityHeaders, validateGetRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    firestore: "ok" | "error";
    geminiApi: "ok" | "not_configured" | "error";
    environment: "production" | "development";
  };
  uptime: number;
}

/**
 * GET /api/health - Health check endpoint
 */
export async function GET(req: Request): Promise<NextResponse> {
  const validation = validateGetRequest(req);
  if (!validation.valid) return validation.error!;

  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    firestore: "ok",
    geminiApi: "not_configured",
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
  };

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // Check Firestore connectivity
  try {
    // Attempt a simple read to verify connection without generating writes.
    const testDocRef = doc(db, "_health_check", "test");
    await getDoc(testDocRef);
    checks.firestore = "ok";
  } catch (error) {
    await logger.error("Health check: Firestore connection failed", error as Error);
    checks.firestore = "error";
    overallStatus = "degraded";
  }

  // Check Gemini API configuration
  if (process.env.GEMINI_API_KEY) {
    checks.geminiApi = "ok";
  } else {
    checks.geminiApi = "not_configured";
    if (process.env.NODE_ENV === "production") {
      overallStatus = "degraded";
    }
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    checks,
    uptime: process.uptime(),
  };

  const statusCode = overallStatus === "healthy" ? 200 : 503;

  // Log health check results
  if (overallStatus !== "healthy") {
    await logger.warn("Health check returned degraded/unhealthy status", { checks });
  }

  const duration = Date.now() - startTime;
  await logger.metric("health_check_duration_ms", duration);

  return withSecurityHeaders(NextResponse.json(response, { 
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  }));
}
