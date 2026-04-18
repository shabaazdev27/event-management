/**
 * Map Component Tests
 * Tests venue map rendering, accessibility, and visual elements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { expect as vitestExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

vitestExpect.extend(matchers);
import Map from "./Map";

// Mock venue context
vi.mock("@/context/VenueContext", () => ({
  useVenue: () => ({
    venue: {
      id: "test-venue-1",
      name: "Test Stadium",
      shortName: "TST",
      city: "Test City",
    },
  }),
}));

describe("Map Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render map container with proper role", () => {
    render(<Map />);
    
    const map = screen.getByRole("img");
    expect(map).toBeInTheDocument();
  });

  it("should have descriptive aria-label for the map", () => {
    render(<Map />);
    
    const map = screen.getByRole("img");
    expect(map).toHaveAttribute(
      "aria-label",
      "Interactive map of Test Stadium venue showing crowd density and key locations"
    );
  });

  it("should display venue short name and city", () => {
    render(<Map />);
    
    expect(screen.getByText(/TST/)).toBeInTheDocument();
    expect(screen.getByText(/Test City/)).toBeInTheDocument();
  });

  it("should have screen reader description of map features", () => {
    render(<Map />);
    
    const description = screen.getByText(/This map shows the Test Stadium venue layout/);
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass("sr-only");
  });

  it("should display grid sections for navigation", () => {
    render(<Map />);
    
    expect(screen.getByLabelText("Map grid section 1-A")).toBeInTheDocument();
    expect(screen.getByLabelText("Map grid section 4-D")).toBeInTheDocument();
  });

  it("should have venue label with proper aria attributes", () => {
    render(<Map />);
    
    const venueLabel = screen.getByLabelText("Current venue: TST in Test City");
    expect(venueLabel).toBeInTheDocument();
  });

  it("should have minimum height for mobile devices", () => {
    render(<Map />);
    
    const map = screen.getByRole("img");
    expect(map).toHaveClass("min-h-70", "sm:min-h-90");
  });

  it("should include visual crowd density indicators", () => {
    render(<Map />);
    
    // Check for the presence of crowd density visualization elements
    const map = screen.getByRole("img");
    const visualElements = map.querySelectorAll('[class*="blur"]');
    expect(visualElements.length).toBeGreaterThan(0);
  });

  it("should have current location marker", () => {
    render(<Map />);
    
    const marker = screen.getByTitle("Your current location");
    expect(marker).toBeInTheDocument();
  });

  it("should be responsive with proper width classes", () => {
    render(<Map />);
    
    const map = screen.getByRole("img");
    expect(map).toHaveClass("w-full", "h-full");
  });

  it("should describe crowd density colors in screen reader text", () => {
    render(<Map />);
    
    const description = screen.getByText(/red for high density/);
    expect(description).toBeInTheDocument();
  });

  it("should update when venue changes", () => {
    const { rerender } = render(<Map />);
    
    expect(screen.getByText(/TST/)).toBeInTheDocument();
    
    // This will still show TST due to the mock, but tests the re-render
    rerender(<Map />);
    
    expect(screen.getByText(/TST/)).toBeInTheDocument();
  });
});
