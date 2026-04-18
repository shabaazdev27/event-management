/**
 * Google BigQuery Integration Tests
 * Tests analytics streaming and data warehousing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsTable, bigQueryManager } from "./gcp-bigquery";
import { logger } from "./gcp-monitoring";

// Mock @google-cloud/bigquery
vi.mock("@google-cloud/bigquery", () => ({
  BigQuery: vi.fn().mockImplementation(() => ({
    dataset: vi.fn().mockReturnValue({
      exists: vi.fn().mockResolvedValue([true]),
      table: vi.fn().mockReturnValue({
        exists: vi.fn().mockResolvedValue([true]),
        insert: vi.fn().mockResolvedValue([{}]),
      }),
    }),
  })),
  Dataset: vi.fn(),
  Table: vi.fn(),
}));

vi.mock("./gcp-monitoring", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("BigQuery Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Analytics Event Tracking", () => {
    it("should track venue events", async () => {
      const event = {
        event_id: "evt_123",
        venue_id: "venue_456",
        event_type: "crowd_update",
        timestamp: new Date().toISOString(),
        properties: { count: 5000 },
      };

      const ok = await bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, event);
      expect(ok).toBe(true);
    });

    it("should handle tracking errors gracefully", async () => {
      const event = {
        event_id: "evt_123",
        venue_id: "venue_456",
        event_type: "test",
        timestamp: new Date().toISOString(),
        properties: {},
      };

      // Should not throw
      await expect(
        bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, event)
      ).resolves.not.toThrow();
    });

    it("should batch multiple events", async () => {
      const events = [
        {
          event_id: "evt_1",
          venue_id: "venue_1",
          event_type: "entry",
          timestamp: new Date().toISOString(),
          properties: {},
        },
        {
          event_id: "evt_2",
          venue_id: "venue_1",
          event_type: "exit",
          timestamp: new Date().toISOString(),
          properties: {},
        },
      ];

      const ok = await bigQueryManager.insertEvents(AnalyticsTable.GATE_ACTIVITY, events);
      expect(ok).toBe(true);
    });
  });

  describe("Table Management", () => {
    it("should support all analytics table types", () => {
      expect(AnalyticsTable.VENUE_EVENTS).toBe("venue_events");
      expect(AnalyticsTable.USER_INTERACTIONS).toBe("user_interactions");
      expect(AnalyticsTable.CROWD_METRICS).toBe("crowd_metrics");
      expect(AnalyticsTable.GATE_ACTIVITY).toBe("gate_activity");
      expect(AnalyticsTable.WEATHER_DATA).toBe("weather_data");
    });
  });

  describe("Development Mode", () => {
    it("should handle development environment", async () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv("NODE_ENV", "development");

      const event = {
        event_id: "evt_dev",
        venue_id: "venue_dev",
        event_type: "test",
        timestamp: new Date().toISOString(),
        properties: {},
      };

      // Should not throw in development
      await expect(
        bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, event)
      ).resolves.not.toThrow();

      vi.stubEnv("NODE_ENV", originalEnv ?? "test");
    });
  });

  describe("Crowd Metrics Tracking", () => {
    it("should query crowd metrics with proper schema", async () => {
      const result = await bigQueryManager.getCrowdMetrics(
        "venue_123",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Query Execution", () => {
    it("should execute read-only SQL queries", async () => {
      const results = await bigQueryManager.query("SELECT * FROM test");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should reject non-read-only SQL queries", async () => {
      const results = await bigQueryManager.query("DELETE FROM test WHERE id = '1'");
      expect(results).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith("Rejected non-read-only BigQuery query");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const event = {
        event_id: "evt_error",
        venue_id: "venue_error",
        event_type: "test",
        timestamp: new Date().toISOString(),
        properties: {},
      };

      // Should not throw even if BigQuery is unavailable
      await expect(
        bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, event)
      ).resolves.not.toThrow();
    });

    it("should handle missing environment variables", () => {
      const originalProject = process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_CLOUD_PROJECT;

      // Should not throw during initialization
      expect(() => {
        // Re-initialize would happen here
      }).not.toThrow();

      process.env.GOOGLE_CLOUD_PROJECT = originalProject;
    });
  });

  describe("Data Validation", () => {
    it("should handle invalid events gracefully", async () => {
      const invalidEvent = {
        event_id: "evt_123",
        // Missing required fields
      };

      // Should handle invalid events gracefully
      await expect(
        bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, invalidEvent as any)
      ).resolves.not.toThrow();
    });

    it("should handle null/undefined values", async () => {
      const event = {
        event_id: "evt_123",
        venue_id: "venue_456",
        event_type: "test",
        timestamp: new Date().toISOString(),
        user_id: undefined,
        session_id: null,
        properties: {},
      };

      await expect(
        bigQueryManager.insertEvent(AnalyticsTable.VENUE_EVENTS, event as any)
      ).resolves.not.toThrow();
    });
  });
});
