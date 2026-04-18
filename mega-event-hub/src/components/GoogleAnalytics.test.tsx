import type { ReactNode } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GoogleAnalytics } from "./GoogleAnalytics";

vi.mock("next/script", () => ({
  default: function MockScript({
    src,
    id,
    strategy,
    children,
  }: {
    src?: string;
    id?: string;
    strategy?: string;
    children?: ReactNode;
  }) {
    return (
      <div 
        data-testid="next-script" 
        data-src={src ?? ""} 
        data-id={id ?? ""}
        data-strategy={strategy ?? ""}
      >
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

  describe("when NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured", () => {
    it("renders nothing when environment variable is unset", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", undefined);
      const { container } = render(<GoogleAnalytics />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when environment variable is empty string", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
      const { container } = render(<GoogleAnalytics />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when environment variable contains only whitespace", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "   ");
      const { container } = render(<GoogleAnalytics />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when NEXT_PUBLIC_GA_MEASUREMENT_ID is configured", () => {
    const testMeasurementId = "G-TEST123";

    it("renders two script tags when measurement ID is set", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      expect(scripts).toHaveLength(2);
    });

    it("loads gtag.js script with correct source URL", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const gtagScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga-script"
      );
      expect(gtagScript).toBeDefined();
      expect(gtagScript?.getAttribute("data-src")).toBe(
        `https://www.googletagmanager.com/gtag/js?id=${testMeasurementId}`
      );
    });

    it("properly encodes measurement ID in URL", () => {
      const specialId = "G-TEST&123=456";
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", specialId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const gtagScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga-script"
      );
      expect(gtagScript?.getAttribute("data-src")).toBe(
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(specialId)}`
      );
    });

    it("sets afterInteractive strategy on gtag.js script", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const gtagScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga-script"
      );
      expect(gtagScript?.getAttribute("data-strategy")).toBe("afterInteractive");
    });

    it("renders initialization script with correct ID", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript).toBeDefined();
    });

    it("sets afterInteractive strategy on initialization script", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.getAttribute("data-strategy")).toBe("afterInteractive");
    });

    it("includes dataLayer initialization in script content", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("window.dataLayer = window.dataLayer || []");
    });

    it("includes gtag function definition in script content", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("function gtag(){dataLayer.push(arguments);}");
    });

    it("includes gtag js initialization call in script content", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("gtag('js', new Date())");
    });

    it("includes gtag config call with measurement ID", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain(`gtag('config', '${testMeasurementId}'`);
    });

    it("configures anonymize_ip as true", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("anonymize_ip: true");
    });

    it("configures send_page_view as true", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("send_page_view: true");
    });

    it("configures page_path with window.location.pathname", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", testMeasurementId);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const initScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga4-init"
      );
      expect(initScript?.textContent).toContain("page_path: window.location.pathname");
    });

    it("handles measurement ID with leading/trailing whitespace", () => {
      vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", `  ${testMeasurementId}  `);
      const { getAllByTestId } = render(<GoogleAnalytics />);
      const scripts = getAllByTestId("next-script");
      const gtagScript = scripts.find(
        (el) => el.getAttribute("data-id") === "ga-script"
      );
      expect(gtagScript?.getAttribute("data-src")).toContain(testMeasurementId);
      expect(gtagScript?.getAttribute("data-src")).not.toContain("  ");
    });
  });
});
