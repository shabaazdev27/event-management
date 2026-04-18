import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import axe from "axe-core";
import Map from "./Map";

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

describe("Map accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("has no critical accessibility violations", async () => {
    render(<Map />);

    const results = await axe.run(document.body, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(violations).toHaveLength(0);
  });
});
