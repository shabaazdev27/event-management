import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/venue-core", () => ({
  processScheduledCalculations: vi.fn().mockResolvedValue(undefined),
}));

import { processScheduledCalculations } from "@/lib/venue-core";

describe("/api/cron/process", () => {
  beforeEach(() => {
    vi.mocked(processScheduledCalculations).mockClear();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("GET runs calculations when cron auth passes in development", async () => {
    const res = await GET(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(processScheduledCalculations).toHaveBeenCalledTimes(1);
  });

  it("POST delegates to same handler as GET", async () => {
    const res = await POST(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(200);
    expect(processScheduledCalculations).toHaveBeenCalled();
  });

  it("returns 500 in production when CRON_SECRET unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(500);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(processScheduledCalculations).not.toHaveBeenCalled();
  });
});
