import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import QueueManager from "./QueueManager";
import { onSnapshot, addDoc, setDoc } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  query: vi.fn((x: unknown) => x),
  orderBy: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    queues: vi.fn(() => ({ path: "queues" })),
    queueDoc: vi.fn((venueId: string, id: string) => ({ path: `${venueId}/${id}` })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("QueueManager", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;
  const addDocMock = addDoc as unknown as ReturnType<typeof vi.fn>;
  const setDocMock = setDoc as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });

    onSnapshotMock.mockImplementation((_q: unknown, cb: (snap: { empty: boolean; docs: Array<{ id: string; data: () => unknown }> }) => void) => {
      cb({
        empty: false,
        docs: [
          {
            id: "q1",
            data: () => ({ title: "Security", minutes: 10, order: 0, mapLocation: "North Security Gate" }),
          },
        ],
      });
      return vi.fn();
    });
  });

  it("renders queue manager", () => {
    render(<QueueManager />);
    expect(screen.getByText("Manage Wait Times")).toBeTruthy();
    expect(screen.getByText("Security")).toBeTruthy();
    expect(screen.getByText("Map: North Security Gate")).toBeTruthy();
  });

  it("shows friendly map label for URL locations in staff list", () => {
    onSnapshotMock.mockImplementation((_q: unknown, cb: (snap: { empty: boolean; docs: Array<{ id: string; data: () => unknown }> }) => void) => {
      cb({
        empty: false,
        docs: [
          {
            id: "q1",
            data: () => ({
              title: "Gate A (Main)",
              minutes: 15,
              order: 0,
              mapLocation: "https://www.google.com/maps/place/MAC+G+Stand",
            }),
          },
        ],
      });
      return vi.fn();
    });

    render(<QueueManager />);

    expect(screen.getByText("Map: Pin link configured")).toBeTruthy();
    expect(screen.queryByText(/https:\/\//i)).toBeNull();
    const mapAction = screen.getByRole("link", { name: "Map" });
    expect(mapAction.getAttribute("href")).toBe("https://www.google.com/maps/place/MAC+G+Stand");
  });

  it("adds a queue", async () => {
    addDocMock.mockResolvedValue({ id: "new" });

    render(<QueueManager />);
    fireEvent.click(screen.getByRole("button", { name: /Add Queue/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Gate A (Main)"), {
      target: { value: "VIP" },
    });
    fireEvent.change(screen.getByRole("spinbutton") as HTMLInputElement, {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Test Arena Gate A, North Entrance"), {
      target: { value: "Test Arena VIP North Entrance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    expect(addDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: "VIP",
        mapLocation: "Test Arena VIP North Entrance",
      })
    );
  });

  it("uses gate title as map location fallback on add", async () => {
    addDocMock.mockResolvedValue({ id: "new" });

    render(<QueueManager />);
    fireEvent.click(screen.getByRole("button", { name: /Add Queue/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Gate A (Main)"), {
      target: { value: "Gate C" },
    });
    fireEvent.change(screen.getByRole("spinbutton") as HTMLInputElement, {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    expect(addDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: "Gate C",
        mapLocation: "Gate C",
      })
    );
  });

  it("closes add form after successful save", async () => {
    addDocMock.mockResolvedValue({ id: "new" });

    render(<QueueManager />);
    fireEvent.click(screen.getByRole("button", { name: /Add Queue/i }));

    expect(screen.getByPlaceholderText("e.g. Gate A (Main)")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("e.g. Gate A (Main)"), {
      target: { value: "Gate A (Main)" },
    });
    fireEvent.change(screen.getByRole("spinbutton") as HTMLInputElement, {
      target: { value: "020" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Test Arena Gate A, North Entrance"), {
      target: {
        value:
          "https://www.google.com/maps/place/MAC+G+Stand/@13.063066,80.2792708,19z",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("e.g. Gate A (Main)")).toBeNull();
      expect(screen.getByRole("button", { name: /Add Queue/i })).toBeTruthy();
    });
  });

  it("closes add form immediately while save is pending", async () => {
    addDocMock.mockImplementation(
      () => new Promise(() => {
        // Intentionally never resolves to simulate pending server ack.
      })
    );

    render(<QueueManager />);
    fireEvent.click(screen.getByRole("button", { name: /Add Queue/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Gate A (Main)"), {
      target: { value: "Gate B" },
    });
    fireEvent.change(screen.getByRole("spinbutton") as HTMLInputElement, {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
      expect(screen.queryByPlaceholderText("e.g. Gate A (Main)")).toBeNull();
    });
  });

  it("saves edit when clicking tick icon and exits edit mode", async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<QueueManager />);
    fireEvent.click(screen.getByTitle("Edit queue"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Map location / landmark")).toBeNull();
    });
  });

  it("allows editing and saving via tick icon multiple times", async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<QueueManager />);

    fireEvent.click(screen.getByTitle("Edit queue"));
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "Security Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Map location / landmark")).toBeNull();
    });

    fireEvent.click(screen.getByTitle("Edit queue"));
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "Security Updated Again" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalledTimes(2);
    });
  });
});
