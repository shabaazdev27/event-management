import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  type ExtendedMatchers<T = unknown> = TestingLibraryMatchers<typeof expect.stringContaining, T>;
  interface Assertion<T = unknown> extends ExtendedMatchers<T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
