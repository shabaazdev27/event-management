import { ApiValidationError, parseLatLon } from "@/lib/api-validation";
import { labelForWeatherCode } from "@/lib/weather-codes";
import { createErrorResponse, createSuccessResponse, validateGetRequest } from "@/lib/security";

export async function GET(req: Request) {
  const validation = validateGetRequest(req);
  if (!validation.valid) return validation.error!;
  const urlParams = new URL(req.url).searchParams;
  const latRaw = urlParams.get("lat");
  const lonRaw = urlParams.get("lon");
  const timezone = urlParams.get("timezone") || "auto";

  let lat: number;
  let lon: number;
  try {
    ({ lat, lon } = parseLatLon(latRaw, lonRaw));
  } catch (e: unknown) {
    if (e instanceof ApiValidationError) {
      return createErrorResponse(e.message, e.status);
    }
    return createErrorResponse("Invalid coordinates.", 400);
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("daily", "precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(url.toString(), { 
      next: { revalidate: 600 },
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ArenaLink/1.0'
      }
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Weather API returned status ${res.status}`);
      // Return fallback data instead of error
      return createSuccessResponse({
        tempC: 20,
        tempF: 68,
        condition: "Clear",
        humidityPercent: 50,
        rainChancePercent: 10,
        weatherCode: 0,
        isFallback: true
      });
    }

    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        relative_humidity_2m?: number;
      };
      daily?: { precipitation_probability_max?: number[] };
    };
    
    const t = data.current?.temperature_2m;
    const code = data.current?.weather_code ?? 0;
    const humidity = data.current?.relative_humidity_2m;
    const rainPct = Array.isArray(data.daily?.precipitation_probability_max)
      ? data.daily!.precipitation_probability_max![0]
      : null;

    if (typeof t !== "number") {
      console.warn("Weather API returned invalid temperature");
      // Return fallback data
      return createSuccessResponse({
        tempC: 20,
        tempF: 68,
        condition: "Clear",
        humidityPercent: 50,
        rainChancePercent: 10,
        weatherCode: 0,
        isFallback: true
      });
    }

    const tempC = Math.round(t * 10) / 10;
    const tempF = Math.round(((t * 9) / 5 + 32) * 10) / 10;

    return createSuccessResponse({
      tempC,
      tempF,
      condition: labelForWeatherCode(code),
      humidityPercent: typeof humidity === "number" ? humidity : null,
      rainChancePercent:
        typeof rainPct === "number" ? Math.round(rainPct) : null,
      weatherCode: code,
      isFallback: false
    });
  } catch (error: unknown) {
    // Check if it's a timeout/abort error
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn("Weather API request timed out");
    } else {
      console.error("Weather API error:", error);
    }
    
    // Always return fallback data instead of 500 error
    return createSuccessResponse({
      tempC: 20,
      tempF: 68,
      condition: "Clear",
      humidityPercent: 50,
      rainChancePercent: 10,
      weatherCode: 0,
      isFallback: true
    });
  }
}
