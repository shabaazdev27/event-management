import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setDoc } from "firebase/firestore";

import VenueCatalogManager from "./VenueCatalogManager";

vi.mock("firebase/firestore", () => ({
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/lib/venue-catalog", () => ({
  venueCatalogDoc: vi.fn((id: string) => ({ id, path: `venueCatalog/${id}` })),
}));

vi.mock("@/lib/venues", async () => {
  const actual = await vi.importActual<typeof import("@/lib/venues")>("@/lib/venues");
  return {
    ...actual,
    isValidNewVenueId: vi.fn(() => true),
  };
});

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("@/context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("VenueCatalogManager helpline handling", () => {
  const setDocMock = setDoc as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setDocMock.mockResolvedValue(undefined);
    mockUseVenue.mockReturnValue({
      venueList: [],
      catalogHydrated: true,
    });
  });

  async function submitBaseForm() {
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
      expect(setDocMock).toHaveBeenCalledOnce();
    });
  }

  it("persists custom event management helpline for a venue", async () => {
    render(<VenueCatalogManager />);

    fireEvent.change(screen.getByPlaceholderText("e.g. 1800-200-1122"), {
      target: { value: "1800-300-7788" },
    });

    await submitBaseForm();

    expect(setDocMock.mock.calls[0]?.[1]).toMatchObject({
      eventManagementHelpline: "1800-300-7788",
    });
  });

  it("uses default event management helpline when field is left blank", async () => {
    render(<VenueCatalogManager />);

    await submitBaseForm();

    expect(setDocMock.mock.calls[0]?.[1]).toMatchObject({
      eventManagementHelpline: "1800-200-1122",
    });
  });
});
