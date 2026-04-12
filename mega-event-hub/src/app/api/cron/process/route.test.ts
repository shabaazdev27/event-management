import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/venue-core", () => ({
  processScheduledCalculations: vi.fn().mockResolvedValue(undefined),
}));

import { processScheduledCalculations } from "@/lib/venue-core";

describe("/api/cron/process", () => {
  const prevEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(processScheduledCalculations).mockClear();
    process.env = { ...prevEnv };
    process.env.NODE_ENV = "development";
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env = prevEnv;
  });

  it("GET runs calculations when cron auth passes in development", async () => {
    const res = await GET(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(200);
    expect(processScheduledCalculations).toHaveBeenCalledTimes(1);
  });

  it("POST delegates to same handler as GET", async () => {
    const res = await POST(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(200);
    expect(processScheduledCalculations).toHaveBeenCalled();
  });

  it("returns 500 in production when CRON_SECRET unset", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    const res = await GET(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(500);
    expect(processScheduledCalculations).not.toHaveBeenCalled();
  });
});
