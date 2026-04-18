import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import TriviaManager from "./TriviaManager";
import { onSnapshot, setDoc } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("../lib/venue-firestore-paths", () => ({
  venuePaths: {
    trivia: vi.fn(() => ({ path: "trivia" })),
  },
}));

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("TriviaManager", () => {
  const onSnapshotMock = onSnapshot as unknown as ReturnType<typeof vi.fn>;
  const setDocMock = setDoc as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({ venueId: "test-venue" });
    global.confirm = vi.fn(() => true);

    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => { questions: Array<{ question: string; options: string[]; answer: string }> } }) => void) => {
      cb({
        exists: () => true,
        data: () => ({
          questions: [
            {
              question: "What year was the venue built?",
              options: ["2000", "2005", "2010", "2015"],
              answer: "2010",
            },
          ],
        }),
      });
      return vi.fn();
    });
  });

  it("renders trivia manager and existing question", () => {
    render(<TriviaManager />);
    expect(screen.getByText("Manage Fan Trivia")).toBeTruthy();
    expect(screen.getByText("What year was the venue built?")).toBeTruthy();
  });

  it("adds a new question", async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<TriviaManager />);

    fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
    fireEvent.change(screen.getAllByRole("textbox")[0] as HTMLInputElement, {
      target: { value: "New question?" },
    });
    fireEvent.change(screen.getAllByRole("textbox")[1] as HTMLInputElement, {
      target: { value: "A" },
    });
    fireEvent.change(screen.getAllByRole("textbox")[2] as HTMLInputElement, {
      target: { value: "B" },
    });
    fireEvent.change(screen.getAllByRole("textbox")[5] as HTMLInputElement, {
      target: { value: "A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Question/i }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
    });
  });
});
