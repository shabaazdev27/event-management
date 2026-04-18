/**
 * Connection Status Component Tests
 * Tests offline/online status indicator and notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

vitestExpect.extend(matchers);
import { ConnectionStatus } from "./ConnectionStatus";

// Mock Firebase connection state
vi.mock("@/lib/firebase", () => ({
  connectionState: {
    subscribe: vi.fn(),
  },
}));

// Import the mocked module
import { connectionState } from "@/lib/firebase";
const mockConnectionState = connectionState as unknown as {
  subscribe: ReturnType<typeof vi.fn>;
};

describe("ConnectionStatus Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    global.window.gtag = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("should not render when connected", () => {
    mockConnectionState.subscribe.mockImplementation((callback) => {
      callback(true); // Connected
      return vi.fn();
    });

    render(<ConnectionStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should show offline status when disconnected", async () => {
    mockConnectionState.subscribe.mockImplementation((callback) => {
      setTimeout(() => callback(false), 0); // Trigger disconnected asynchronously
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Using cached data")).toBeInTheDocument();
    });
  });

  it("should show reconnection message when back online", async () => {
    let connectionCallback: (connected: boolean) => void;
    
    mockConnectionState.subscribe.mockImplementation((callback) => {
      connectionCallback = callback;
      callback(false); // Start disconnected
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByText("Using cached data")).toBeInTheDocument();
    });

    // Reconnect
    connectionCallback!(true);

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeInTheDocument();
    });
  });

  it("should hide status after 2 seconds of being online", async () => {
    vi.useRealTimers();
    let connectionCallback: (connected: boolean) => void;
    
    mockConnectionState.subscribe.mockImplementation((callback) => {
      connectionCallback = callback;
      callback(false);
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(screen.getByText("Using cached data")).toBeInTheDocument();
    });

    // Reconnect
    connectionCallback!(true);

    await waitFor(() => {
      expect(screen.getByText("Back online")).toBeInTheDocument();
    });

    await new Promise((resolve) => setTimeout(resolve, 2200));

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("should have proper ARIA attributes", async () => {
    mockConnectionState.subscribe.mockImplementation((callback) => {
      callback(false);
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
    });
  });

  it("should track connection lost event with Google Analytics", async () => {
    const gtagSpy = vi.fn();
    global.window.gtag = gtagSpy;

    mockConnectionState.subscribe.mockImplementation((callback) => {
      callback(false); // Trigger disconnect
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith("event", "connection_lost", {
        timestamp: expect.any(String),
      });
    });
  });

  it("should track connection restored event with Google Analytics", async () => {
    const gtagSpy = vi.fn();
    global.window.gtag = gtagSpy;

    let connectionCallback: (connected: boolean) => void;
    
    mockConnectionState.subscribe.mockImplementation((callback) => {
      connectionCallback = callback;
      callback(false);
      return vi.fn();
    });

    render(<ConnectionStatus />);

    // Reconnect
    connectionCallback!(true);

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith("event", "connection_restored", {
        timestamp: expect.any(String),
      });
    });
  });

  it("should use appropriate styling for offline state", async () => {
    mockConnectionState.subscribe.mockImplementation((callback) => {
      callback(false);
      return vi.fn();
    });

    render(<ConnectionStatus />);

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status).toHaveClass("bg-amber-500/20", "border-amber-500/30", "text-amber-400");
    });
  });

  it("should use appropriate styling for online state", async () => {
    let connectionCallback: (connected: boolean) => void;
    
    mockConnectionState.subscribe.mockImplementation((callback) => {
      connectionCallback = callback;
      callback(false);
      return vi.fn();
    });

    render(<ConnectionStatus />);

    connectionCallback!(true);

    await waitFor(() => {
      const status = screen.getByRole("status");
      expect(status).toHaveClass("bg-emerald-500/20", "border-emerald-500/30", "text-emerald-400");
    });
  });

  it("should clean up subscription on unmount", () => {
    const unsubscribeMock = vi.fn();
    mockConnectionState.subscribe.mockReturnValue(unsubscribeMock);

    const { unmount } = render(<ConnectionStatus />);
    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
