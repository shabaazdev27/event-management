import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import InteractiveFanZone from "./InteractiveFanZone";
import { onSnapshot } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  increment: vi.fn((v: number) => v),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    fanpoll: vi.fn(() => ({ path: "fanpoll" })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("InteractiveFanZone", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });

    onSnapshotMock.mockImplementation(
      (_ref: unknown, _opts: unknown, cb: (snap: { exists: () => boolean; data: () => unknown }) => void) => {
        cb({
          exists: () => true,
          data: () => ({
            question: "Which encore song should the headliner play?",
            options: { "Neon Nights": 140, "Electric Pulse": 210, "Midnight Run": 89 },
            totalVotes: 439,
          }),
        });
        return vi.fn();
      },
    );
  });

  it("renders fan zone poll", () => {
    render(<InteractiveFanZone />);
    expect(screen.getByText("Live Fan Zone")).toBeTruthy();
    expect(screen.getByText("Which encore song should the headliner play?")).toBeTruthy();
  });
});
