import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  ApiValidationError,
  readJsonBodyLimited,
  clampChatMessage,
} from "@/lib/api-validation";
import { createRateLimiter, RATE_LIMITS } from "@/lib/middleware";
import { logger } from "@/lib/gcp-monitoring";
import { pubSubManager } from "@/lib/gcp-pubsub";
import { bigQueryManager, AnalyticsTable } from "@/lib/gcp-bigquery";
import { createErrorResponse, createSuccessResponse } from "@/lib/security";
import { getVenueState, type VenueState } from "@/lib/venue-core";

// Rate limiter for chat endpoint
const rateLimiter = createRateLimiter(RATE_LIMITS.CHAT);

/**
 * Get Gemini AI client instance
 */
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

type VenueChatContext = {
  occupancyPercent: number;
  occupied: number;
  capacity: number;
  leastBusyGate?: { id: string; waitMins: number };
  busiestGate?: { id: string; waitMins: number };
};

type ChatIntent =
  | "operational"
  | "facilities"
  | "shopping"
  | "schedule"
  | "general";

function estimateWaitMins(state: VenueState, gateId: string): number {
  const gate = state.gates.find((g) => g.id === gateId);
  if (!gate || gate.max_flow <= 0) return 5;
  const ratio = gate.current_occupied / gate.max_flow;
  return Math.max(2, Math.min(45, Math.round(ratio * 30)));
}

function buildVenueContext(state: VenueState): VenueChatContext {
  const occupancyPercent = Math.round(
    (state.current_occupied / Math.max(1, state.total_capacity)) * 100
  );

  const sorted = [...state.gates].sort(
    (a, b) => a.current_occupied / Math.max(1, a.max_flow) - b.current_occupied / Math.max(1, b.max_flow)
  );

  const least = sorted[0];
  const most = sorted[sorted.length - 1];

  return {
    occupancyPercent,
    occupied: state.current_occupied,
    capacity: state.total_capacity,
    leastBusyGate: least
      ? { id: least.id, waitMins: estimateWaitMins(state, least.id) }
      : undefined,
    busiestGate: most
      ? { id: most.id, waitMins: estimateWaitMins(state, most.id) }
      : undefined,
  };
}

async function maybeLoadVenueContext(venueId: string): Promise<VenueChatContext | null> {
  if (!venueId || venueId === "unknown") return null;
  try {
    const state = await getVenueState(venueId);
    return buildVenueContext(state);
  } catch (error) {
    logger.warn("Unable to load live venue context for chat", {
      venueId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

function classifyIntent(lowerMessage: string): ChatIntent {
  if (/(bathroom|restroom|toilet|washroom)/i.test(lowerMessage)) {
    return "facilities";
  }
  if (/(merch|jersey|shop|store)/i.test(lowerMessage)) {
    return "shopping";
  }
  if (
    /(schedule|kickoff|start time|when (does|is) (the )?(event|game|show)|what time (does|is) (the )?(event|game|show))/i.test(
      lowerMessage
    )
  ) {
    return "schedule";
  }
  if (/(wait|line|gate|entry|exit|crowd|occupancy|status|fastest|nearest)/i.test(lowerMessage)) {
    return "operational";
  }
  return "general";
}

function getDeterministicReply(
  lowerMessage: string,
  context: VenueChatContext | null,
  intent: ChatIntent
): string | null {
  if (intent === "operational") {
    if (!/(wait|line|status|crowd|occupancy|fastest|nearest)/i.test(lowerMessage)) {
      return null;
    }
    if (context?.leastBusyGate && context.busiestGate) {
      return `Current occupancy is about ${context.occupancyPercent}%. Fastest entry is ${context.leastBusyGate.id} at around ${context.leastBusyGate.waitMins} minutes. Slowest is ${context.busiestGate.id} at around ${context.busiestGate.waitMins} minutes.`;
    }
    return "Wait times at Gate A are currently 15 minutes. However, Gate B and C are seeing less than 5 minutes. I recommend utilizing Gate B for faster entry!";
  }
  if (intent === "facilities") {
    return "The closest restrooms are located behind Section 112, approximately a 2-minute walk from the Main Concourse. Wait times there are very short.";
  }
  if (intent === "shopping") {
    return "The main merchandise tent is quite packed (about a 35-minute wait). There is a secondary popup store near Gate North with current wait times below 10 minutes.";
  }
  if (intent === "schedule") {
    return "The opening ceremony begins in 45 minutes, followed by the main event. Please make your way to your seat soon. It takes about 8 minutes to walk from your current zone.";
  }
  return null;
}

function shouldPreferDeterministic(lowerMessage: string, intent: ChatIntent): boolean {
  return intent !== "general" || /(urgent|emergency|now|quick|fastest|nearest|where)/i.test(lowerMessage);
}

/**
 * POST /api/chat - AI chatbot endpoint with rate limiting and analytics
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const raw = await readJsonBodyLimited(req);
    const body = raw as Record<string, unknown>;
    const message = clampChatMessage(body.message);

    const venueName =
      typeof body.venueName === "string" ? body.venueName.slice(0, 200) : "";
    const venueCity =
      typeof body.venueCity === "string" ? body.venueCity.slice(0, 200) : "";
    const venueId =
      typeof body.venueId === "string" ? body.venueId.slice(0, 100) : "unknown";

    const venueLine =
      venueName || venueCity
        ? ` The fan is currently at "${venueName || "the venue"}" in ${venueCity || "the host city"}.`
        : "";

    const lowerMessage = message.toLowerCase();
    const intent = classifyIntent(lowerMessage);
    const needsVenueContext = intent === "operational";
    const venueContext = needsVenueContext
      ? await maybeLoadVenueContext(venueId)
      : null;

    // Log analytics event
    await pubSubManager.publishAnalyticsEvent(venueId, "chat_message", {
      message_length: message.length,
      venueName,
      venueCity,
      intent,
      hasVenueContext: !!venueContext,
      requestId,
    });

    const deterministicReply = getDeterministicReply(
      lowerMessage,
      venueContext,
      intent
    );

    const ai = getGenAI();
    if (deterministicReply && (!ai || shouldPreferDeterministic(lowerMessage, intent))) {
      const localized = venueCity
        ? deterministicReply
            .replace(/here/gi, `at ${venueCity}`)
            .replace(/today's event/gi, `this ${venueCity} event`)
        : deterministicReply;
      
      const duration = Date.now() - startTime;
      logger.metric("chat_response_time_ms", duration, { type: "demo" });
      
      return createSuccessResponse({ reply: localized });
    }

    if (ai) {
      const contextLine = venueContext
        ? ` Live venue telemetry: occupancy ${venueContext.occupancyPercent}% (${venueContext.occupied}/${venueContext.capacity}), least busy gate ${venueContext.leastBusyGate?.id ?? "unknown"} (~${venueContext.leastBusyGate?.waitMins ?? "n/a"} min), busiest gate ${venueContext.busiestGate?.id ?? "unknown"} (~${venueContext.busiestGate?.waitMins ?? "n/a"} min).`
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an AI assistant for ArenaLink, helping fans at arena and stadium events.${venueLine}${contextLine} You provide logistics, wait times, and directions. Keep answers extremely short, helpful, and polite. Only address event-related information and prefer live telemetry when provided. User question: ${message}`,
      });
      
      const duration = Date.now() - startTime;
      logger.metric("chat_response_time_ms", duration, { type: "ai" });
      logger.info("Chat response generated", { venueId, requestId, duration });

      // Track in BigQuery
      await bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, {
        event_id: requestId,
        venue_id: venueId,
        event_type: "chat_interaction",
        timestamp: new Date().toISOString(),
        properties: {
          message_length: message.length,
          intent,
          response_time_ms: duration,
          has_ai_key: true,
          has_venue_context: !!venueContext,
        },
      });
      
      return createSuccessResponse({ reply: response.text ?? "No reply received." });
    }

    const duration = Date.now() - startTime;
    logger.metric("chat_response_time_ms", duration, { type: "fallback" });
    
    return createSuccessResponse({
      reply:
        "I am the ArenaLink assistant. I can help with locations, wait times, and schedules. (API key required for dynamic AI responses).",
    });
  } catch (error: unknown) {
    if (error instanceof ApiValidationError) {
      logger.warn("Chat validation error", { message: error.message, requestId });
      return createErrorResponse(error.message, error.status);
    }
    
    logger.error("Error generating chat response", error as Error, { requestId });
    return createErrorResponse("Unable to generate a response.", 500);
  }
}
