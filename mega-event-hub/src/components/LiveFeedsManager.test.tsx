import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import LiveFeedsManager from "./LiveFeedsManager";
import { onSnapshot, setDoc } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  query: vi.fn((x: unknown) => x),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    cameras: vi.fn(() => ({ path: "cameras" })),
    cameraDoc: vi.fn((venueId: string, id: string) => ({ path: `${venueId}/${id}` })),
    queues: vi.fn(() => ({ path: "queues" })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("LiveFeedsManager", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;
  const setDocMock = setDoc as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });

    onSnapshotMock.mockImplementation((_q: unknown, cb: (snap: { docs: Array<{ id: string; data: () => unknown }> }) => void) => {
      cb({
        docs: [
          {
            id: "1",
            data: () => ({
              location: "Gate A",
              status: "normal",
              count: 10,
              capacity: 100,
              videoUrl: "",
            }),
          },
        ],
      });
      return vi.fn();
    });
  });

  it("renders manager title", () => {
    render(<LiveFeedsManager />);
    expect(screen.getByText("Live Gate Security Feeds")).toBeTruthy();
  });

  it("updates feed and closes edit form", async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<LiveFeedsManager />);

    fireEvent.click(screen.getByTitle("Edit feed"));
    fireEvent.change(screen.getByDisplayValue("Gate A"), {
      target: { value: "Gate A Updated" },
    });
    fireEvent.click(screen.getByTitle("Save feed"));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
      expect(screen.queryByTitle("Save feed")).toBeNull();
    });
  });
});
