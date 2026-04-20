import { processScheduledCalculations } from "@/lib/venue-core";
import { assertCronAuthorized } from "@/lib/api-validation";
import { createErrorResponse, createSuccessResponse, validateGetRequest, validatePostRequest } from "@/lib/security";

async function handleCronRequest(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    await processScheduledCalculations();
    return createSuccessResponse({
      success: true,
      message: "Scheduled calculation completed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return createErrorResponse(message, 500);
  }
}

export async function GET(request: Request) {
  const validation = validateGetRequest(request);
  if (!validation.valid) return validation.error!;

  return handleCronRequest(request);
}

/** Some schedulers use POST; same auth as GET. */
export async function POST(request: Request) {
  const validation = await validatePostRequest(request);
  if (!validation.valid) return validation.error!;

  return handleCronRequest(request);
}
