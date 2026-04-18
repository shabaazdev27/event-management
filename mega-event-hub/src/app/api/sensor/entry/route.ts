import { handleSensorEntry } from "@/lib/venue-core";
import { resolveVenueIdFromRequest } from "@/lib/venue-resolve";
import {
  ApiValidationError,
  assertSensorsAuthorized,
  readJsonBodyLimited,
  validateGateId,
} from "@/lib/api-validation";
import { createErrorResponse, createSuccessResponse } from "@/lib/security";

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

    await handleSensorEntry(gateId, venueId);
    return createSuccessResponse({
      success: true,
      message: `Entry processed for ${gateId}`,
    });
  } catch (err: unknown) {
    if (err instanceof ApiValidationError) {
      return createErrorResponse(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return createErrorResponse(message, 500);
  }
}
