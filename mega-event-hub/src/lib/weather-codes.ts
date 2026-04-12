/** WMO Weather interpretation codes (Open-Meteo). */
export const WMO_WEATHER_LABEL: Record<number, string> = {
  0: "Clear skies",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export function labelForWeatherCode(code: number): string {
  return WMO_WEATHER_LABEL[code] ?? "Variable conditions";
}
