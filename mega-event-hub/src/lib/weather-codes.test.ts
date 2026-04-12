import { describe, it, expect } from "vitest";
import { WMO_WEATHER_LABEL, labelForWeatherCode } from "./weather-codes";

describe("labelForWeatherCode", () => {
  it("returns known WMO labels", () => {
    expect(labelForWeatherCode(0)).toBe(WMO_WEATHER_LABEL[0]);
    expect(labelForWeatherCode(95)).toBe(WMO_WEATHER_LABEL[95]);
  });

  it("returns fallback for unknown codes", () => {
    expect(labelForWeatherCode(99999)).toBe("Variable conditions");
  });
});
