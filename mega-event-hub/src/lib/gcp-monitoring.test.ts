/**
 * Test suite for Google Cloud Monitoring integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger, createRequestLogger } from "./gcp-monitoring";

// Mock the Google Cloud libraries
vi.mock("@google-cloud/logging", () => ({
  Logging: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockReturnValue({
      entry: vi.fn(),
      write: vi.fn().mockResolvedValue(undefined),
    }),
  })),
}));

vi.mock("@google-cloud/error-reporting", () => ({
  ErrorReporting: vi.fn().mockImplementation(() => ({
    report: vi.fn(),
  })),
}));

describe("CloudLogger", () => {
  const consoleLogSpy = vi
    .spyOn(console, "log")
    .mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log info messages", async () => {
    await logger.info("Test info message", { userId: "123" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[INFO] Test info message",
      { userId: "123" }
    );
  });

  it("should log warning messages", async () => {
    await logger.warn("Test warning", { action: "test" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[WARNING] Test warning",
      { action: "test" }
    );
  });

  it("should log error messages with stack trace", async () => {
    const error = new Error("Test error");
    await logger.error("Error occurred", error, { context: "test" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[ERROR] Error occurred",
      expect.objectContaining({
        context: "test",
        error: "Test error",
      })
    );
  });

  it("should log critical errors", async () => {
    const error = new Error("Critical failure");
    await logger.critical("Critical error", error);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[CRITICAL] Critical error",
      expect.objectContaining({
        error: "Critical failure",
      })
    );
  });

  it("should log metrics", async () => {
    await logger.metric("api_response_time", 150, { endpoint: "/api/test" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[INFO] Metric: api_response_time",
      {
        metric: "api_response_time",
        value: 150,
        labels: { endpoint: "/api/test" },
      }
    );
  });
});

describe("Request Logger", () => {
  it("should create request-scoped logger", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(logger, "warn").mockResolvedValue(undefined);
    const errorSpy = vi.spyOn(logger, "error").mockResolvedValue(undefined);

    const requestLogger = createRequestLogger("req-123", "user-456");
    
    await requestLogger.info("Request started");
    await requestLogger.warn("Slow response");
    
    const error = new Error("Request failed");
    await requestLogger.error("Request error", error);
    
    expect(infoSpy).toHaveBeenCalledWith("Request started", {
      requestId: "req-123",
      userId: "user-456",
    });
    expect(warnSpy).toHaveBeenCalledWith("Slow response", {
      requestId: "req-123",
      userId: "user-456",
    });
    expect(errorSpy).toHaveBeenCalledWith("Request error", error, {
      requestId: "req-123",
      userId: "user-456",
    });
  });

  it("should include request context in logs", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockResolvedValue(undefined);

    const requestLogger = createRequestLogger("req-789");
    
    await requestLogger.info("Processing request", { 
      path: "/api/chat",
      method: "POST" 
    });
    
    expect(infoSpy).toHaveBeenCalledWith("Processing request", {
      path: "/api/chat",
      method: "POST",
      requestId: "req-789",
      userId: undefined,
    });
  });
});
