"use client";

import type { WeatherData, IconKind } from "@/lib/weather";
import { formatLongDate } from "@/lib/weather";
import { formatPlaceLabel } from "@/lib/geocode";
import { glowFor } from "@/lib/theme";
import WeatherIcon from "./WeatherIcon";
import Panel from "./Panel";

export default function YesterdayHero({ data }: { data: WeatherData }) {
  const { place, headline, yesterdayHigh, yesterdayLow } = data;
  const glow = glowFor(headline.icon, headline.isDay);

  return (
    <Panel className="relative animate-fade-in">
      {/* The one place the condition is allowed to tint the surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(560px 300px at 18% -8%, ${glow}, transparent 68%)`,
        }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-past-text/45 px-2 py-[3px] font-display text-[10.5px] font-semibold uppercase tracking-[0.22em] text-past-text">
            <RewindGlyph className="h-3 w-3" />
            Yesterday
          </span>
          <span className="text-[13px] text-paper-dim">
            {formatLongDate(headline.date)} · at {headline.atHourLabel}
          </span>
        </div>

        <h1 className="mt-4 font-display text-[17px] font-medium tracking-tight text-paper">
          {formatPlaceLabel(place)}
        </h1>

        <div className="mt-1 flex items-end justify-between gap-4">
          <div className="flex items-start">
            <span className="font-display text-[92px] font-medium leading-[0.9] tracking-[-0.04em] text-paper">
              {headline.temperature}
            </span>
            <span className="mt-1 font-display text-[34px] font-light text-past-text">°</span>
          </div>
          <div className="flex flex-col items-end pb-1 text-right">
            <WeatherIcon
              icon={headline.icon}
              title={headline.description}
              className="h-14 w-14 drop-shadow"
            />
            <p className="mt-1.5 font-display text-[15px] font-medium text-paper">
              {headline.description}
            </p>
            <p className="mt-0.5 text-[13px] text-paper-dim">
              H {yesterdayHigh}° · L {yesterdayLow}° · felt {headline.apparentTemperature}°
            </p>
          </div>
        </div>

        <p className="mt-5 border-t border-ink-line pt-4 font-quip text-[15px] italic leading-snug text-paper-dim">
          <span className="not-italic text-past-text">— </span>
          {quip(headline.icon)}
        </p>
      </div>
    </Panel>
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
      <path d="M11 6 3 12l8 6V6zm10 0-8 6 8 6V6z" />
    </svg>
  );
}
