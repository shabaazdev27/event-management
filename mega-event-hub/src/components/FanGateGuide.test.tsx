import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

import FanGateGuide from "./FanGateGuide";
import { onSnapshot } from "firebase/firestore";

vitestExpect.extend(matchers);

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  query: vi.fn((...args) => args),
  orderBy: vi.fn((...args) => args),
  limit: vi.fn((v) => v),
}));

vi.mock("@/lib/venue-firestore-paths", () => ({
  venuePaths: {
    queues: vi.fn(() => ({ path: "siteVenues/test/queues" })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("@/context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("FanGateGuide", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({
      venueId: "test",
      venue: {
        name: "Test Arena",
        shortName: "Arena",
      },
    });
  });

  it("renders empty state when no gates are available", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({ docs: [] } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByText(/Gate guidance will appear/i)).toBeInTheDocument();
    });
  });

  it("renders guidance and route link for selected gate", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({
                title: "Gate A (Main)",
                minutes: 22,
                mapLocation: "Test Arena North Gate Drop-off",
              }),
            },
            { id: "b", data: () => ({ title: "Gate B (North)", minutes: 8 }) },
          ],
        } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByText(/Head to/i)).toBeInTheDocument();
    });

    const routeLink = screen.getByRole("link", { name: /Open Navigation to Test Arena North Gate Drop-off/i });
    expect(routeLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Test%20Arena%20North%20Gate%20Drop-off"
    );

    expect(screen.getByText(/Route target: Test Arena North Gate Drop-off/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use recommended gate/i })).toBeInTheDocument();

    expect(screen.getByText(/Faster option available: Gate B \(North\)/i)).toBeInTheDocument();
  });

  it("updates route target when selected gate changes", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [
            { id: "a", data: () => ({ title: "Gate A", minutes: 12 }) },
            { id: "b", data: () => ({ title: "Gate B", minutes: 9 }) },
          ],
        } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });

    expect(screen.getByRole("link", { name: /Open Navigation to Gate B/i })).toBeInTheDocument();
  });

  it("lets users switch to recommended gate quickly", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [
            { id: "a", data: () => ({ title: "Gate A", minutes: 22 }) },
            { id: "b", data: () => ({ title: "Gate B", minutes: 6 }) },
          ],
        } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Use recommended gate/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Use recommended gate/i }));

    expect(screen.getByRole("link", { name: /Open Navigation to Gate B/i })).toBeInTheDocument();
  });

  it("copies destination text for quick sharing", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({ title: "Gate A", minutes: 10, mapLocation: "Landmark A" }),
            },
          ],
        } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy destination/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Copy destination/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Landmark A");
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });
  
  it("shows friendly labels when map location is a full URL and opens that URL directly", async () => {
    const url =
      "https://www.google.com/maps/place/C+Stand/@13.063066,80.2792708,19.64z";
  
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [
            {
              id: "c",
              data: () => ({ title: "Gate C", minutes: 10, mapLocation: url }),
            },
          ],
        } as any);
      }
      return vi.fn();
    });
  
    render(<FanGateGuide />);
  
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Open Navigation to Gate C/i })).toBeInTheDocument();
    });
  
    expect(screen.getByText(/Route target: Gate C map pin/i)).toBeInTheDocument();
    expect(screen.getByText(/Using staff-configured map pin link/i)).toBeInTheDocument();
  
    const navLink = screen.getByRole("link", { name: /Open Navigation to Gate C/i });
    expect(navLink).toHaveAttribute("href", url);
  
    fireEvent.click(screen.getByRole("button", { name: /Copy destination/i }));
  
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });
  });

  it("falls back to venue + gate title when map location is not configured", async () => {
    onSnapshotMock.mockImplementation((_, onNext) => {
      if (typeof onNext === "function") {
        onNext({
          docs: [{ id: "a", data: () => ({ title: "Gate A", minutes: 12 }) }],
        } as any);
      }
      return vi.fn();
    });

    render(<FanGateGuide />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Open Navigation to Gate A/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Route target: Test Arena Gate A/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Navigation to Gate A/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Test%20Arena%20Gate%20A"
    );
  });
});
