import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import VenueCatalogManager from "./VenueCatalogManager";
import { deleteDoc, setDoc } from "firebase/firestore";
import { isValidNewVenueId, type VenueDefinition } from "../lib/venues";

vi.mock("firebase/firestore", () => ({
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("../lib/venue-catalog", () => ({
  venueCatalogDoc: vi.fn((id: string) => ({ id, path: `venueCatalog/${id}` })),
}));

vi.mock("../lib/venues", async () => {
  const actual = await vi.importActual<typeof import("../lib/venues")>("../lib/venues");
  return {
    ...actual,
    isValidNewVenueId: vi.fn((id: string) => /^[a-z][a-z0-9-]{1,48}$/.test(id)),
  };
});

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("../context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("VenueCatalogManager", () => {
  const setDocMock = setDoc as unknown as ReturnType<typeof vi.fn>;
  const deleteDocMock = deleteDoc as unknown as ReturnType<typeof vi.fn>;
  const isValidNewVenueIdMock = isValidNewVenueId as unknown as ReturnType<typeof vi.fn>;

  const mockVenues: VenueDefinition[] = [
    {
      id: "ahmedabad",
      name: "Narendra Modi Stadium",
      shortName: "Modi Stadium",
      city: "Ahmedabad",
      region: "Gujarat",
      lat: 23.0937,
      lon: 72.5947,
      timezone: "Asia/Kolkata",
      defaultCapacity: 132000,
      parkingSummary: "Multiple parking zones available",
      eventManagementHelpline: "1800-200-1122",
    },
  ];

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseVenue.mockReturnValue({
      venueList: mockVenues,
      catalogHydrated: true,
    });
    global.confirm = vi.fn(() => true);
  });

  it("renders catalog manager", () => {
    render(<VenueCatalogManager />);
    expect(screen.getByText("Venue catalog")).toBeTruthy();
    expect(screen.getByText("Narendra Modi Stadium")).toBeTruthy();
  });

  it("submits valid venue", async () => {
    setDocMock.mockResolvedValue(undefined);
    isValidNewVenueIdMock.mockReturnValue(true);

    render(<VenueCatalogManager />);

    fireEvent.change(screen.getByPlaceholderText("e.g. ahmedabad"), {
      target: { value: "mumbai" },
    });
    fireEvent.change(screen.getByPlaceholderText("Stadium or arena name"), {
      target: { value: "Wankhede Stadium" },
    });
    fireEvent.change(screen.getByPlaceholderText("12.97"), {
      target: { value: "19.02" },
    });
    fireEvent.change(screen.getByPlaceholderText("77.59"), {
      target: { value: "72.84" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add or update venue/i }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
    });
  });

  it("deletes venue on confirmation", async () => {
    deleteDocMock.mockResolvedValue(undefined);

    render(<VenueCatalogManager />);
    fireEvent.click(screen.getAllByRole("button")[2]);

    await waitFor(() => {
      expect(deleteDocMock).toHaveBeenCalled();
    });
  });
});
