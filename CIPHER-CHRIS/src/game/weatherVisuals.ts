import type { Weather } from "./weather";

/** Open-Meteo reports the direction wind comes from. Positive is east on screen. */
export function windDrift(weather: Weather | null): number {
  if (!weather) return 2; // ambient animation while live data is unavailable
  return -Math.sin(weather.windDirection * Math.PI / 180) * weather.windSpeed * 0.16;
}

/** Illustrative effects shared by the rooftop and telescope, using the same current reading. */
export function drawWeatherEffects(g: CanvasRenderingContext2D, weather: Weather | null, t: number, width: number, height: number) {
  if (!weather) return;
  const scale = width / 320;
  const wind = windDrift(weather);
  const rate = weather.precipitationRate;
  g.save();
  if (rate > 0) {
    const count = rate >= 7.6 ? 120 : rate >= 2.5 ? 75 : 35;
    g.strokeStyle = "rgba(185,217,236,0.55)";
    g.lineWidth = scale;
    g.beginPath();
    for (let i = 0; i < count; i++) {
      const x = (((i * 137.3 + t * wind * 8) % 320) + 320) % 320 * scale;
      const y = (((i * 73.9 + t * 60) % 180) / 180) * height;
      g.moveTo(x, y);
      g.lineTo(x + Math.max(-4, Math.min(4, wind * 0.6)) * scale, y + 4 * scale);
    }
    g.stroke();
  }
  // Subtle wind streaks make stronger winds visible even when it is dry.
  if (weather.windSpeed >= 15) {
    g.strokeStyle = "rgba(210,228,238,0.32)";
    g.lineWidth = scale;
    g.beginPath();
    const count = Math.min(12, Math.ceil(weather.windSpeed / 5));
    for (let i = 0; i < count; i++) {
      const x = (((i * 83 + t * wind * 6) % 320) + 320) % 320 * scale;
      const y = ((i * 61) % 180) / 180 * height;
      g.moveTo(x, y);
      g.lineTo(x + Math.sign(wind || 1) * Math.min(15, 4 + weather.windSpeed / 5) * scale, y);
    }
    g.stroke();
  }
  g.restore();
}
