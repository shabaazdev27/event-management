import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import axe from "axe-core";
import Chatbot from "./Chatbot";

vi.mock("@/context/VenueContext", () => ({
  useVenue: () => ({
    venue: {
      id: "test-venue-1",
      name: "Test Arena",
      city: "Test City",
    },
  }),
}));

global.fetch = vi.fn();

describe("Chatbot accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("has no critical accessibility violations", async () => {
    render(<Chatbot />);

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
