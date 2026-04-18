/**
 * Alert Banner Component Tests
 * Tests alert display, animations, and real-time updates
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

vitestExpect.extend(matchers);
import AlertBanner from "./AlertBanner";
import { onSnapshot } from "firebase/firestore";

// Mock dependencies
vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
}));

vi.mock("@/context/VenueContext", () => ({
  useVenue: () => ({
    venueId: "test-venue-123",
    venue: {
      id: "test-venue-123",
      name: "Test Arena",
      city: "Test City",
    },
  }),
}));

vi.mock("@/lib/venue-firestore-paths", () => ({
  venuePaths: {
    metricsDoc: vi.fn(() => ({ path: "metrics/test-venue-123" })),
  },
}));

describe("AlertBanner Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.gtag
    global.window.gtag = vi.fn();
  });

  it("should render without alerts initially", () => {
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({ exists: () => false, data: () => ({}) } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);
    
    const alerts = screen.queryByRole("alert");
    expect(alerts).not.toBeInTheDocument();
  });

  it("should display alert message when available", async () => {
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "High crowd density in Zone A",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);

    await waitFor(() => {
      expect(screen.getByText("High crowd density in Zone A")).toBeInTheDocument();
    });
  });

  it("should use guest styling by default", async () => {
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "Test alert",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);

    await waitFor(() => {
      const alertElement = screen.getByText("Test alert").closest("div");
      expect(alertElement).toHaveClass("bg-amber-500/20", "border-amber-500/50");
    });
  });

  it("should use staff styling when staffMode is true", async () => {
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "Staff alert",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner staffMode={true} />);

    await waitFor(() => {
      const alertElement = screen.getByText("Staff alert").closest("div");
      expect(alertElement).toHaveClass("bg-rose-500/20", "border-rose-500/50");
    });
  });

  it("should have proper ARIA attributes", async () => {
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "Important alert",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);

    await waitFor(() => {
      const alertText = screen.getByText("Important alert");
      expect(alertText).toHaveAttribute("role", "alert");
      expect(alertText).toHaveAttribute("aria-live", "assertive");
    });
  });

  it("should track alert shown with Google Analytics", async () => {
    const gtagSpy = vi.fn();
    global.window.gtag = gtagSpy;

    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "Analytics test alert",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith("event", "alert_banner_shown", {
        venue_id: "test-venue-123",
        alert_type: "guest",
        message: "Analytics test alert",
      });
    });
  });

  it("should remove alert when message is cleared", async () => {
    let updateCallback: any;
    
    vi.mocked(onSnapshot).mockImplementation((_, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      if (typeof cb === "function") {
        updateCallback = cb;
        cb({
          exists: () => true,
          data: () => ({
            global_status: {
              alert_message: "Initial alert",
            },
          }),
        } as any);
      }
      return vi.fn();
    });

    render(<AlertBanner />);

    await waitFor(() => {
      expect(screen.getByText("Initial alert")).toBeInTheDocument();
    });

    // Clear the alert
    updateCallback({
      exists: () => true,
      data: () => ({
        global_status: {},
      }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Initial alert")).not.toBeInTheDocument();
    });
  });

  it("should clean up subscription on unmount", () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsubscribeMock);

    const { unmount } = render(<AlertBanner />);
    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
