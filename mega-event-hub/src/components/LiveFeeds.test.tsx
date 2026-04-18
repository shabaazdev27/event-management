import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LiveFeeds from "./LiveFeeds";
import { onSnapshot } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  query: vi.fn((x: unknown) => x),
  limit: vi.fn(),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    cameras: vi.fn(() => ({ path: "cameras" })),
    parkingCameras: vi.fn(() => ({ path: "parking_cameras" })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("LiveFeeds", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });

    onSnapshotMock.mockImplementation(
      (
        _q: unknown,
        _opts: unknown,
        cb: (snap: { empty: boolean; docs: Array<{ id: string; data: () => unknown }> }) => void,
      ) => {
        cb({
          empty: false,
          docs: [
            {
              id: "f1",
              data: () => ({ location: "Gate A", status: "normal", count: 10, capacity: 100, videoUrl: "" }),
            },
          ],
        });
        return vi.fn();
      },
    );
  });

  it("renders feed title and card", () => {
    render(<LiveFeeds />);
    expect(screen.getByText("Live Gate Feeds")).toBeTruthy();
    expect(screen.getByText("Gate A")).toBeTruthy();
  });
});
