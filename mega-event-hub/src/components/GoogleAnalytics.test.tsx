import type { ReactNode } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GoogleAnalytics } from "./GoogleAnalytics";

vi.mock("next/script", () => ({
  default: function MockScript({
    src,
    id,
    children,
  }: {
    src?: string;
    id?: string;
    children?: ReactNode;
  }) {
    return (
      <div data-testid="next-script" data-src={src ?? ""} data-id={id ?? ""}>
        {children}
      </div>
    );
  },
}));

describe("GoogleAnalytics", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const { container } = render(<GoogleAnalytics />);
    expect(container.firstChild).toBeNull();
  });

  it("injects gtag scripts when measurement id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    const { getAllByTestId } = render(<GoogleAnalytics />);
    const scripts = getAllByTestId("next-script");
    expect(scripts.length).toBeGreaterThanOrEqual(1);
    expect(
      scripts.some((el) =>
        (el.getAttribute("data-src") ?? "").includes("G-TEST123")
      )
    ).toBe(true);
  });
});
