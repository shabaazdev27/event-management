import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  ApiValidationError,
  readJsonBodyLimited,
  clampChatMessage,
} from "@/lib/api-validation";

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

export async function POST(req: Request) {
  try {
    const raw = await readJsonBodyLimited(req);
    const body = raw as Record<string, unknown>;
    const message = clampChatMessage(body.message);

    const venueName =
      typeof body.venueName === "string" ? body.venueName.slice(0, 200) : "";
    const venueCity =
      typeof body.venueCity === "string" ? body.venueCity.slice(0, 200) : "";

    const venueLine =
      venueName || venueCity
        ? ` The fan is currently at "${venueName || "the venue"}" in ${venueCity || "the host city"}.`
        : "";

    const lowerMessage = message.toLowerCase();

    let demoResponse: string | null = null;
    if (lowerMessage.includes("wait time") || lowerMessage.includes("line")) {
      demoResponse =
        "Wait times at Gate A are currently 15 minutes. However, Gate B and C are seeing less than 5 minutes. I recommend utilizing Gate B for faster entry!";
    } else if (
      lowerMessage.includes("bathroom") ||
      lowerMessage.includes("restroom") ||
      lowerMessage.includes("toilet")
    ) {
      demoResponse =
        "The closest restrooms are located behind Section 112, approximately a 2-minute walk from the Main Concourse. Wait times there are very short.";
    } else if (
      lowerMessage.includes("merch") ||
      lowerMessage.includes("jersey") ||
      lowerMessage.includes("shop")
    ) {
      demoResponse =
        "The main merchandise tent is quite packed (about a 35-minute wait). There is a secondary popup store near Gate North with current wait times below 10 minutes.";
    } else if (
      lowerMessage.includes("schedule") ||
      lowerMessage.includes("time") ||
      lowerMessage.includes("start")
    ) {
      demoResponse =
        "The opening ceremony begins in 45 minutes, followed by the main event. Please make your way to your seat soon. It takes about 8 minutes to walk from your current zone.";
    }

    const ai = getGenAI();
    if (demoResponse && !ai) {
      const localized = venueCity
        ? demoResponse
            .replace(/here/gi, `at ${venueCity}`)
            .replace(/today's event/gi, `this ${venueCity} event`)
        : demoResponse;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return NextResponse.json({ reply: localized });
    }

    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an AI assistant for ArenaLink, helping fans at arena and stadium events.${venueLine} You provide logistics, wait times, and directions. Keep answers extremely short, helpful, and polite. Only address event-related information. User question: ${message}`,
      });
      return NextResponse.json({ reply: response.text });
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({
      reply:
        "I am the ArenaLink assistant. I can help with locations, wait times, and schedules. (API key required for dynamic AI responses).",
    });
  } catch (error: unknown) {
    if (error instanceof ApiValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error generating chat response:", error);
    return NextResponse.json(
      { error: "Unable to generate a response." },
      { status: 500 }
    );
  }
}
