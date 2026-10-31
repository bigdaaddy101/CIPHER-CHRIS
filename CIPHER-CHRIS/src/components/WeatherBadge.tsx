import { CloudSun } from "lucide-react";
import { precipitationLabel, useIliganWeather, weatherLabel } from "../game/weather";

export function WeatherBadge({ detailed = false }: { detailed?: boolean }) {
  const { status, weather } = useIliganWeather();
  const text = status === "loading" ? "Loading weather…" : weather
    ? `${Math.round(weather.temperature)}°C · ${weatherLabel(weather.code)}`
    : "Weather unavailable";
  const observed = weather ? ` · model time ${weather.observedAt.replace("T", " ")} PHT` : "";
  return (
    <div className="font-term text-lg text-cyan-neon leading-tight" title={`Iligan City weather from Open-Meteo${observed}. Updated every 15 minutes.`}>
      <span className="inline-flex items-center gap-1.5">
        <CloudSun size={15} aria-hidden="true" />
        <span>ILIGAN · {text}</span>
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-dim text-sm underline" aria-label="Weather data by Open-Meteo">Open-Meteo</a>
      </span>
      {weather && (
        <div className={detailed ? "text-bone" : "text-dim text-base"}>
          {precipitationLabel(weather.precipitationRate)} · {weather.precipitationRate.toFixed(1)} mm/h · Wind {Math.round(weather.windSpeed)} km/h{detailed && ` · Gusts ${Math.round(weather.windGusts)} km/h · Clouds ${Math.round(weather.cloudCover)}%`}
        </div>
      )}
      {detailed && (
        <div className="text-dim text-base">
          {weather ? `Model time: ${weather.observedAt.replace("T", " ")} PHT. Precipitation is an hourly rate estimated from the model interval.` : status === "loading" ? "Loading current conditions." : "Live conditions could not be loaded; the illustrated sky is a fallback."} Not an official warning. For safety alerts, check <a href="https://www.pagasa.dost.gov.ph/" target="_blank" rel="noreferrer" className="text-cyan-neon underline">PAGASA</a>.
        </div>
      )}
    </div>
  );
}
