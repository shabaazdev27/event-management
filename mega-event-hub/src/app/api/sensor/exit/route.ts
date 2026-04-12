import { NextResponse } from "next/server";
import { handleSensorExit } from "@/lib/venue-core";
import { resolveVenueIdFromRequest } from "@/lib/venue-resolve";
import {
  ApiValidationError,
  assertSensorsAuthorized,
  readJsonBodyLimited,
  validateGateId,
} from "@/lib/api-validation";

export async function POST(request: Request) {
  const auth = assertSensorsAuthorized(request);
  if (auth) return auth;

  try {
    const body = (await readJsonBodyLimited(request)) as Record<string, unknown>;
    const gateId = validateGateId(body.gateId);
    const venueId = await resolveVenueIdFromRequest(
      body.venueId,
      request.headers.get("x-venue-id")
    );

    await handleSensorExit(gateId, venueId);
    return NextResponse.json({
      success: true,
      message: `Exit processed for ${gateId}`,
    });
  } catch (err: unknown) {
    if (err instanceof ApiValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
