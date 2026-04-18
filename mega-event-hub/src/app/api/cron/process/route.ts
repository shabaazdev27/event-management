import { processScheduledCalculations } from "@/lib/venue-core";
import { assertCronAuthorized } from "@/lib/api-validation";
import { createErrorResponse, createSuccessResponse } from "@/lib/security";

export async function GET(request: Request) {
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

/** Some schedulers use POST; same auth as GET. */
export async function POST(request: Request) {
  return GET(request);
}
