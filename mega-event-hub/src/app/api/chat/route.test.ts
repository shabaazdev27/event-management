import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { getVenueState } = vi.hoisted(() => ({
  getVenueState: vi.fn(),
}));

vi.mock("@/lib/venue-core", () => ({
  getVenueState,
}));

describe("POST /api/chat", () => {
  beforeEach(() => {
    generateContent.mockReset();
    getVenueState.mockReset();
    getVenueState.mockResolvedValue({
      total_capacity: 1000,
      current_occupied: 400,
      gates: [
        { id: "Gate A", max_flow: 100, current_occupied: 30, total_entries_count: 0, location: "GENERAL" },
        { id: "Gate B", max_flow: 100, current_occupied: 10, total_entries_count: 0, location: "GENERAL" },
      ],
      fanzone_capacity: 100,
      fanzone_occupied: 20,
      critical_threshold: 0.9,
    });
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function post(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when message missing", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(400);
  });

  it("uses Gemini when API key is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "Hello from model" });

    const res = await POST(post({ message: "Where is gate A?" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { reply?: string };
    expect(json.reply).toBe("Hello from model");
    expect(generateContent).toHaveBeenCalled();
  });

  it("skips venue context lookup for non-operational prompts", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "General help" });

    const res = await POST(post({ message: "How do I contact support?", venueId: "mumbai" }));
    expect(res.status).toBe(200);
    expect(getVenueState).not.toHaveBeenCalled();
  });

  it("includes live venue telemetry in Gemini prompt when available", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "Live response" });

    const res = await POST(post({ message: "Best gate now?", venueId: "mumbai" }));
    expect(res.status).toBe(200);
    const firstCall = generateContent.mock.calls[0]?.[0];
    expect(String(firstCall?.contents)).toContain("Live venue telemetry");
    expect(getVenueState).toHaveBeenCalledWith("mumbai");
  });

  it("returns demo reply without Gemini when keywords match", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(post({ message: "What is the wait time?", venueId: "mumbai" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { reply?: string };
    expect(json.reply).toContain("Fastest entry is");
  });

  it("prefers deterministic routing for urgent operational requests even when Gemini is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: "Model response" });

    const res = await POST(post({ message: "urgent where is nearest bathroom" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { reply?: string };
    expect(json.reply).toContain("closest restrooms");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("adds security headers on success responses", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(post({ message: "wait time please" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
