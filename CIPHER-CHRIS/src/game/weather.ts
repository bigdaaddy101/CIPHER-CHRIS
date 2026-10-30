import { useEffect, useState } from "react";

// Open-Meteo's nearest forecast grid point to Iligan City, Philippines.
const URL = "https://api.open-meteo.com/v1/forecast?latitude=8.228&longitude=124.245&current=temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=Asia%2FManila";
const REFRESH_MS = 15 * 60 * 1000;

export type Weather = { temperature: number; code: number; cloudCover: number; precipitationRate: number; windSpeed: number; windGusts: number; windDirection: number; observedAt: string };
type WeatherState = { status: "loading" | "ready" | "unavailable"; weather: Weather | null };
let latest: WeatherState = { status: "loading", weather: null };
const listeners = new Set<(state: WeatherState) => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;

export function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return code === 3 ? "Overcast" : "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Snow";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Cloudy";
}

/** Estimated intensity, not an official weather warning. */
export function precipitationLabel(rate: number): string {
  if (rate >= 7.6) return "Heavy precipitation";
  if (rate >= 2.5) return "Moderate precipitation";
  if (rate > 0) return "Light precipitation";
  return "No precipitation reported";
}

export function getLiveWeather(): Weather | null {
  return latest.status === "ready" ? latest.weather : null;
}

async function refresh() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  const timeout = setTimeout(() => request.abort(), 12000);
  try {
    const response = await fetch(URL, { signal: request.signal });
    if (!response.ok) throw new Error("Weather request failed");
    const data = await response.json();
    const current = data.current;
    if (!current || typeof current.temperature_2m !== "number" || !Number.isFinite(current.temperature_2m) || !Number.isInteger(current.weather_code) || typeof current.cloud_cover !== "number" || !Number.isFinite(current.cloud_cover) || current.cloud_cover < 0 || current.cloud_cover > 100 || typeof current.time !== "string") throw new Error("Invalid weather data");
    const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (!nonnegative(current.precipitation) || !nonnegative(current.wind_speed_10m) || !nonnegative(current.wind_gusts_10m) || !nonnegative(current.wind_direction_10m) || current.wind_direction_10m > 360 || !nonnegative(current.interval) || current.interval === 0) throw new Error("Invalid weather measurements");
    latest = { status: "ready", weather: { temperature: current.temperature_2m, code: current.weather_code, cloudCover: current.cloud_cover, precipitationRate: current.precipitation * 3600 / current.interval, windSpeed: current.wind_speed_10m, windGusts: current.wind_gusts_10m, windDirection: current.wind_direction_10m, observedAt: current.time } };
  } catch {
    if (controller !== request) return;
    latest = { status: "unavailable", weather: null };
  } finally {
    clearTimeout(timeout);
  }
  listeners.forEach((listener) => listener(latest));
}

export function useIliganWeather(): WeatherState {
  const [state, setState] = useState(latest);
  useEffect(() => {
    listeners.add(setState);
    setState(latest);
    if (!timer) {
      void refresh();
      timer = setInterval(refresh, REFRESH_MS);
    }
    return () => {
      listeners.delete(setState);
      if (listeners.size === 0) {
        clearInterval(timer);
        timer = undefined;
        controller?.abort();
        controller = undefined;
      }
    };
  }, []);
  return state;
}
