import { NextRequest, NextResponse } from "next/server";
import { ApiValidationError, parseLatLon } from "@/lib/api-validation";
import { labelForWeatherCode } from "@/lib/weather-codes";

export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lonRaw = req.nextUrl.searchParams.get("lon");
  const timezone = req.nextUrl.searchParams.get("timezone") || "auto";

  let lat: number;
  let lon: number;
  try {
    ({ lat, lon } = parseLatLon(latRaw, lonRaw));
  } catch (e: unknown) {
    if (e instanceof ApiValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code");
  url.searchParams.set("daily", "precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Weather provider returned an error." },
        { status: 502 }
      );
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
      return NextResponse.json(
        { error: "Unexpected weather response." },
        { status: 502 }
      );
    }

    const tempC = Math.round(t * 10) / 10;
    const tempF = Math.round(((t * 9) / 5 + 32) * 10) / 10;

    return NextResponse.json({
      tempC,
      tempF,
      condition: labelForWeatherCode(code),
      humidityPercent: typeof humidity === "number" ? humidity : null,
      rainChancePercent:
        typeof rainPct === "number" ? Math.round(rainPct) : null,
      weatherCode: code,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load weather data." },
      { status: 500 }
    );
  }
}
