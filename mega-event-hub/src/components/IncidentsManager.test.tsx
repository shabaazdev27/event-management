import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import IncidentsManager from "./IncidentsManager";
import { onSnapshot } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  query: vi.fn((x: unknown) => x),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    incidents: vi.fn(() => ({ path: "incidents" })),
    incidentDoc: vi.fn((venueId: string, id: string) => ({ path: `${venueId}/${id}` })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("IncidentsManager", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });

    onSnapshotMock.mockImplementation(
      (
        _q: unknown,
        _opts: unknown,
        cb: (snap: { docs: Array<{ id: string; data: () => unknown }> }) => void,
      ) => {
        cb({
          docs: [
            {
              id: "i1",
              data: () => ({ title: "Gate blocked", description: "Security issue", severity: "high" }),
            },
          ],
        });
        return vi.fn();
      },
    );
  });

  it("renders incidents header and an incident", () => {
    render(<IncidentsManager />);
    expect(screen.getByText("Active Incidents")).toBeTruthy();
    expect(screen.getByText("Gate blocked")).toBeTruthy();
  });
});
