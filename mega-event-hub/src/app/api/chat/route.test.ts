import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

describe("POST /api/chat", () => {
  const prevKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    generateContent.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = prevKey;
  });

  function post(body: Record<string, unknown>) {
    return new Request("http://localhost/api/chat", {
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
    process.env.GEMINI_API_KEY = "test-key";
    generateContent.mockResolvedValue({ text: "Hello from model" });

    const res = await POST(post({ message: "Where is gate A?" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { reply?: string };
    expect(json.reply).toBe("Hello from model");
    expect(generateContent).toHaveBeenCalled();
  });

  it("returns demo reply without Gemini when keywords match", async () => {
    delete process.env.GEMINI_API_KEY;
    vi.useFakeTimers();
    const p = POST(post({ message: "What is the wait time?" }));
    await vi.advanceTimersByTimeAsync(1500);
    const res = await p;
    expect(res.status).toBe(200);
    const json = (await res.json()) as { reply?: string };
    expect(json.reply).toContain("Wait times");
  });
});
