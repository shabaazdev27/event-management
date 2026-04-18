import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

import SosHelplinesCard from "./SosHelplinesCard";

vitestExpect.extend(matchers);

const { mockUseVenue } = vi.hoisted(() => ({
  mockUseVenue: vi.fn(),
}));

vi.mock("@/context/VenueContext", () => ({
  useVenue: mockUseVenue,
}));

describe("SosHelplinesCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders static India emergency helplines", () => {
    mockUseVenue.mockReturnValue({
      venue: { eventManagementHelpline: "1800-999-1234" },
    });

    render(<SosHelplinesCard />);

    expect(screen.getByText("National emergency")).toBeInTheDocument();
    expect(screen.getByText("Police")).toBeInTheDocument();
    expect(screen.getByText("Ambulance")).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "112" })).toHaveAttribute("href", "tel:112");
    expect(screen.getByRole("link", { name: "100" })).toHaveAttribute("href", "tel:100");
    expect(screen.getByRole("link", { name: "108" })).toHaveAttribute("href", "tel:108");
    expect(screen.getByRole("link", { name: "101" })).toHaveAttribute("href", "tel:101");
  });

  it("renders venue-specific event management helpline and sanitized dial link", () => {
    mockUseVenue.mockReturnValue({
      venue: { eventManagementHelpline: "+91 1800-200-1122" },
    });

    render(<SosHelplinesCard />);

    const eventLink = screen.getByRole("link", { name: "+91 1800-200-1122" });
    expect(eventLink).toHaveAttribute("href", "tel:+9118002001122");
  });

  it("falls back to default event management helpline when venue value is empty", () => {
    mockUseVenue.mockReturnValue({
      venue: { eventManagementHelpline: "" },
    });

    render(<SosHelplinesCard />);

    const fallbackLink = screen.getByRole("link", { name: "1800-200-1122" });
    expect(fallbackLink).toHaveAttribute("href", "tel:18002001122");
  });
});
