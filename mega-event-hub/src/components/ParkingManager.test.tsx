import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ParkingManager from "./ParkingManager";
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
    parkingCameras: vi.fn(() => ({ path: "parkingCameras" })),
    parkingCameraDoc: vi.fn((venueId: string, id: string) => ({ path: `${venueId}/${id}` })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("ParkingManager", () => {
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
            id: "p1",
            data: () => ({
              location: "Lot A",
              status: "normal",
              count: 120,
              capacity: 500,
              videoUrl: "",
            }),
          },
        ],
      });
      return vi.fn();
    });
  });

  it("renders manager title", () => {
    render(<ParkingManager />);
    expect(screen.getByText("Parking AI Vision")).toBeTruthy();
  });

  it("updates parking feed and closes edit form", async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<ParkingManager />);

    fireEvent.click(screen.getByTitle("Edit parking feed"));
    fireEvent.change(screen.getByDisplayValue("Lot A"), {
      target: { value: "Lot A Updated" },
    });
    fireEvent.click(screen.getByTitle("Save parking feed"));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
      expect(screen.queryByTitle("Save parking feed")).toBeNull();
    });
  });
});
