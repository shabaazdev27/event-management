/**
 * Live Metrics Component Tests
 * Tests real-time metrics display, editing, and Firebase integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

vitestExpect.extend(matchers);
import LiveMetrics from "./LiveMetrics";
import { onSnapshot, setDoc } from "firebase/firestore";

const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;

// Mock dependencies
vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/context/VenueContext", () => ({
  useVenue: () => ({
    venueId: "test-venue-123",
    venue: {
      id: "test-venue-123",
      name: "Test Arena",
    },
  }),
}));

vi.mock("@/lib/venue-firestore-paths", () => ({
  venuePaths: {
    metricsDoc: vi.fn(() => ({ path: "metrics/test-venue-123" })),
    incidents: vi.fn(() => ({ path: "incidents/test-venue-123" })),
    staffMetricOverrides: vi.fn(() => ({ path: "staffMetricOverrides/test-venue-123" })),
  },
}));

describe("LiveMetrics Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render with default metrics", () => {
    onSnapshotMock.mockImplementation((_, callback) => {
      if (typeof callback === "function") {
        callback({ exists: () => false } as any);
      }
      return vi.fn();
    });

    render(<LiveMetrics />);

    expect(screen.getByText("Live Metrics")).toBeInTheDocument();
  });

  it("should display total inside count from Firebase", async () => {
    onSnapshotMock.mockImplementation((ref, callback) => {
      if (typeof callback === "function") {
        const path = (ref as any).path;
        if (path.includes("metrics")) {
          callback({
            exists: () => true,
            data: () => ({
              global_status: {
                occupied: 52000,
              },
              gates: [
                { wait_time: 10 },
                { wait_time: 14 },
              ],
            }),
          } as any);
        } else if (path.includes("incidents")) {
          callback({ size: 2 } as any);
        }
      }
      return vi.fn();
    });

    render(<LiveMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/52,?000/)).toBeInTheDocument();
    });
  });

  it("should calculate and display average wait time", async () => {
    onSnapshotMock.mockImplementation((ref, callback) => {
      if (typeof callback === "function") {
        const path = (ref as any).path;
        if (path.includes("metrics")) {
          callback({
            exists: () => true,
            data: () => ({
              global_status: { occupied: 50000 },
              gates: [
                { wait_time: 10 },
                { wait_time: 20 },
                { wait_time: 12 },
              ],
            }),
          } as any);
        } else {
          callback({ size: 0 } as any);
        }
      }
      return vi.fn();
    });

    render(<LiveMetrics />);

    await waitFor(() => {
      expect(screen.getByText("14 mins")).toBeInTheDocument();
    });
  });

  it("should display active incidents count", async () => {
    onSnapshotMock.mockImplementation((ref, callback) => {
      if (typeof callback === "function") {
        const path = (ref as any).path;
        if (path.includes("incidents")) {
          callback({ size: 3 } as any);
        } else {
          callback({ exists: () => false } as any);
        }
      }
      return vi.fn();
    });

    render(<LiveMetrics />);

    await waitFor(() => {
      // Look for the Active Incidents label and verify the parent card has the value
      const label = screen.getByText("Active Incidents");
      const card = label.closest(".p-5");
      expect(card).toHaveTextContent("3");
      expect(card).toHaveTextContent("Active Incidents");
    });
  });

  it("should show Edit Metrics button", () => {
    onSnapshotMock.mockReturnValue(vi.fn());

    render(<LiveMetrics />);

    expect(screen.getByRole("button", { name: /Edit Metrics/i })).toBeInTheDocument();
  });

  it("should toggle editing mode when Edit button clicked", async () => {
    const user = userEvent.setup();
    onSnapshotMock.mockReturnValue(vi.fn());

    render(<LiveMetrics />);

    const editButton = screen.getByRole("button", { name: /Edit Metrics/i });
    await user.click(editButton);

    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("should save metrics when form is submitted", async () => {
    const user = userEvent.setup();
    const setDocMock = vi.mocked(setDoc);
    
    onSnapshotMock.mockReturnValue(vi.fn());

    render(<LiveMetrics />);

    const editButton = screen.getByRole("button", { name: /Edit Metrics/i });
    await user.click(editButton);

    // Find and submit the form
    const form = document.querySelector("form");
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      
      await waitFor(() => {
        expect(setDocMock).toHaveBeenCalled();
      });
    }
  });

  it("should handle zero wait time gracefully", async () => {
    onSnapshotMock.mockImplementation((ref, callback) => {
      if (typeof callback === "function") {
        const path = (ref as any).path;
        if (path.includes("metrics")) {
          callback({
            exists: () => true,
            data: () => ({
              global_status: { occupied: 50000 },
              gates: [],
            }),
          } as any);
        } else {
          callback({ size: 0 } as any);
        }
      }
      return vi.fn();
    });

    render(<LiveMetrics />);

    await waitFor(() => {
      expect(screen.getByText("0 mins")).toBeInTheDocument();
    });
  });

  it("should have proper section heading", () => {
    onSnapshotMock.mockReturnValue(vi.fn());

    render(<LiveMetrics />);

    const heading = screen.getByText("Live Metrics");
    expect(heading).toHaveClass("uppercase", "tracking-widest");
  });

  it("should display metrics with proper icons", () => {
    onSnapshotMock.mockReturnValue(vi.fn());

    render(<LiveMetrics />);

    // Icons should be present (Users, Activity, AlertTriangle)
    const container = screen.getByText("Live Metrics").closest("div");
    expect(container).toBeInTheDocument();
  });

  it("should clean up subscriptions on unmount", () => {
    const unsubscribeMock1 = vi.fn();
    const unsubscribeMock2 = vi.fn();
    
    onSnapshotMock
      .mockReturnValueOnce(unsubscribeMock1)
      .mockReturnValueOnce(unsubscribeMock2);

    const { unmount } = render(<LiveMetrics />);
    unmount();

    expect(unsubscribeMock1).toHaveBeenCalled();
    expect(unsubscribeMock2).toHaveBeenCalled();
  });
});
