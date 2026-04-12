import { NextResponse } from "next/server";
import { processScheduledCalculations } from "@/lib/venue-core";
import { assertCronAuthorized } from "@/lib/api-validation";

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    await processScheduledCalculations();
    return NextResponse.json({
      success: true,
      message: "Scheduled calculation completed.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Some schedulers use POST; same auth as GET. */
export async function POST(request: Request) {
  return GET(request);
}
