"use client";

import type { HourEntry } from "@/lib/weather";
import { formatClock } from "@/lib/weather";
import WeatherIcon from "./WeatherIcon";
import GlassCard from "./GlassCard";

export default function HourlyForecast({
  hours,
  summary,
}: {
  hours: HourEntry[];
  summary?: string;
}) {
  return (
    <GlassCard className="mt-4">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-white/70">
          <RewindGlyph className="h-3.5 w-3.5" />
          <span>Past 24 Hours</span>
        </div>
        <span className="text-[11px] font-medium lowercase tracking-normal text-white/45">
          now → 24h ago
        </span>
      </div>
      {summary && (
        <p className="px-4 pt-1 text-[13px] leading-snug text-white/85">{summary}</p>
      )}
      <div className="no-scrollbar mt-1 flex gap-1 overflow-x-auto px-2 pb-4 pt-2">
        {hours.map((h, i) => (
          <HourCell key={`${h.time}-${h.kind}-${i}`} hour={h} />
        ))}
      </div>
    </GlassCard>
  );
}

function RewindGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11 6 3 12l8 6V6zm10 0-8 6 8 6V6z" />
    </svg>
  );
}

function HourCell({ hour }: { hour: HourEntry }) {
  if (hour.kind !== "hour") {
    // Sunrise / sunset marker inserted into the strip.
    return (
      <div className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 py-1">
        <span className="text-[13px] font-semibold text-white/90">
          {hour.label}
        </span>
        <SunEventGlyph kind={hour.kind} />
        <span className="text-[13px] font-medium text-white/90">
          {formatClock(hour.time).replace(" ", "")}
        </span>
      </div>
    );
  }

  const showPrecip =
    (hour.precipitationProbability ?? 0) >= 20;

  return (
    <div className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 py-1">
      <span
        className={`text-[13px] font-semibold ${
          hour.label === "Now" ? "text-white" : "text-white/90"
        }`}
      >
        {hour.label}
      </span>
      <WeatherIcon
        icon={hour.icon!}
        title=""
        className="h-8 w-8 drop-shadow"
      />
      <span className="h-4 text-[11px] font-semibold leading-none text-sky-200">
        {showPrecip ? `${hour.precipitationProbability}%` : ""}
      </span>
      <span className="text-[17px] font-medium text-white">
        {hour.temperature}°
      </span>
    </div>
  );
}

function SunEventGlyph({ kind }: { kind: "sunrise" | "sunset" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id={`sunev-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE259" />
          <stop offset="100%" stopColor="#FFA751" />
        </linearGradient>
      </defs>
      {/* horizon line */}
      <line x1="3" y1="18.5" x2="21" y2="18.5" stroke="#FFE9B0" strokeWidth="1.4" strokeLinecap="round" />
      {/* half-sun sitting on the horizon */}
      <path d="M7.5 18.5 a4.5 4.5 0 0 1 9 0 Z" fill={`url(#sunev-${kind})`} />
      {/* up/down arrow indicating rise vs set */}
      {kind === "sunrise" ? (
        <path d="M9 8.5 l3-3 3 3" fill="none" stroke="#FFD27A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 5.5 l3 3 3-3" fill="none" stroke="#FFB27A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
