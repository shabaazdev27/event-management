import { addNewGate } from "@/lib/venue-core";
import { resolveVenueIdFromRequest } from "@/lib/venue-resolve";
import {
  ApiValidationError,
  assertSensorsAuthorized,
  readJsonBodyLimited,
  validateGateId,
  validateLocation,
  validateMaxFlow,
} from "@/lib/api-validation";
import { createErrorResponse, createSuccessResponse } from "@/lib/security";

export async function POST(request: Request) {
  const auth = assertSensorsAuthorized(request);
  if (auth) return auth;

  try {
    const body = (await readJsonBodyLimited(request)) as Record<string, unknown>;
    const id = validateGateId(body.id);
    const max_flow = validateMaxFlow(body.max_flow);
    const location = validateLocation(body.location);
    const venueId = await resolveVenueIdFromRequest(
      body.venueId,
      request.headers.get("x-venue-id")
    );

    await addNewGate(id, max_flow, location, venueId);
    return createSuccessResponse({
      success: true,
      message: `Gate ${id} added successfully.`,
    });
  } catch (err: unknown) {
    if (err instanceof ApiValidationError) {
      return createErrorResponse(err.message, err.status);
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return createErrorResponse(message, 500);
  }
}
