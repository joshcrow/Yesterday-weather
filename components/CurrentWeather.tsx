"use client";

import type { WeatherData, IconKind } from "@/lib/weather";
import { formatLongDate } from "@/lib/weather";
import { formatPlaceLabel } from "@/lib/geocode";
import WeatherIcon from "./WeatherIcon";

export default function CurrentWeather({ data }: { data: WeatherData }) {
  const { place, headline, yesterdayHigh, yesterdayLow } = data;

  return (
    <section className="flex flex-col items-center pt-7 pb-5 text-center text-white animate-fade-in">
      <h1 className="text-[26px] font-semibold tracking-tight drop-shadow-sm">
        {formatPlaceLabel(place)}
      </h1>

      {/* The whole gag: a "yesterday" badge where "now" would normally be. */}
      <div className="mt-2 flex items-center gap-2 rounded-full bg-black/20 px-3.5 py-1 ring-1 ring-white/20">
        <RewindGlyph className="h-3.5 w-3.5 text-white/80" />
        <span className="text-[13px] font-semibold uppercase tracking-widest text-white/90">
          Yesterday
        </span>
      </div>
      <p className="mt-1 text-[13px] text-white/85">
        {formatLongDate(headline.date)} · at {headline.atHourLabel}
      </p>

      <WeatherIcon
        icon={headline.icon}
        title={headline.description}
        className="mt-3 h-24 w-24 drop-shadow-lg"
      />

      <div className="mt-1 flex items-start">
        <span className="text-[88px] font-thin leading-none tracking-tighter drop-shadow-md">
          {headline.temperature}
        </span>
        <span className="mt-2 text-4xl font-thin">°</span>
      </div>

      <p className="-mt-1 text-xl font-medium drop-shadow-sm">{headline.description}</p>

      <p className="mt-1 text-[15px] font-medium text-white/90">
        H:{yesterdayHigh}°&nbsp;&nbsp;L:{yesterdayLow}°
      </p>

      <p className="mt-2 max-w-[16rem] text-sm italic text-white/90">
        “{quip(headline.icon)}”
      </p>
    </section>
  );
}

/** A deadpan one-liner about weather you can no longer use. */
function quip(icon: IconKind): string {
  switch (icon) {
    case "clear-day":
      return "It was gorgeous. You probably stayed inside.";
    case "clear-night":
      return "A beautiful clear night. It's gone now.";
    case "partly-day":
    case "partly-night":
      return "Some clouds happened. Riveting stuff.";
    case "cloudy":
      return "Grey. Like your memory of it.";
    case "fog":
      return "Foggy — but that's all behind you now.";
    case "drizzle":
      return "It drizzled. You survived. Congratulations.";
    case "rain":
    case "showers":
      return "It rained. Hope you didn't need to know that today.";
    case "freezing-rain":
      return "Freezing rain. Yesterday's problem, literally.";
    case "snow":
      return "It snowed. You're finding out now. You're welcome.";
    case "thunderstorm":
      return "Thunderstorms! Dramatic. And completely over.";
    default:
      return "Weather occurred. As it tends to.";
  }
}

function RewindGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 4v4l-5-4v12l5-4v4l1.2.9V3.1L12 4z" opacity="0" />
      <path d="M11 6 3 12l8 6V6zm10 0-8 6 8 6V6z" />
    </svg>
  );
}
