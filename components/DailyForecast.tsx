"use client";

import { useState } from "react";
import type { DayEntry, Units } from "@/lib/weather";
import { formatClock } from "@/lib/weather";
import {
  formatPrecip,
  speedUnitLabel,
  uvLabel,
  windDirectionLabel,
} from "@/lib/format";
import WeatherIcon from "./WeatherIcon";
import GlassCard from "./GlassCard";

export default function DailyForecast({
  days,
  currentTemp,
  units,
}: {
  days: DayEntry[];
  currentTemp: number;
  units: Units;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const overallMin = Math.min(...days.map((d) => d.tempMin));
  const overallMax = Math.max(...days.map((d) => d.tempMax));
  const span = Math.max(overallMax - overallMin, 1);

  return (
    <GlassCard className="mt-4">
      <h2 className="flex items-center gap-1.5 px-4 pt-3.5 pb-1 text-[13px] font-semibold uppercase tracking-wide text-white/85">
        <span aria-hidden="true">🕰️</span>
        10-Day Hindsight
      </h2>
      <p className="px-4 pb-1 text-[12px] text-white/70">Tap a day for the full breakdown.</p>
      <ul className="px-2 pb-2">
        {days.map((day, i) => {
          const open = openIdx === i;
          const leftPct = ((day.tempMin - overallMin) / span) * 100;
          const widthPct = ((day.tempMax - day.tempMin) / span) * 100;
          const nowPct =
            i === 0
              ? Math.min(
                  Math.max(
                    ((currentTemp - day.tempMin) / Math.max(day.tempMax - day.tempMin, 1)) * 100,
                    0
                  ),
                  100
                )
              : null;

          return (
            <li key={day.date} className="border-b border-white/10 last:border-b-0">
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                <span className="w-[68px] shrink-0 text-[16px] font-semibold text-white">
                  {day.dayLabel}
                </span>

                <div className="flex w-8 shrink-0 flex-col items-center">
                  <WeatherIcon icon={day.icon} title="" className="h-7 w-7 drop-shadow" />
                  {day.precipitationProbability >= 30 && (
                    <span className="text-[10px] font-semibold leading-none text-sky-200">
                      {day.precipitationProbability}%
                    </span>
                  )}
                </div>

                <span className="w-7 shrink-0 text-right text-[15px] font-medium text-white/80">
                  {day.tempMin}°
                </span>

                <div className="relative h-1.5 flex-1 rounded-full bg-white/20">
                  <div
                    className="absolute top-0 h-1.5 rounded-full bg-gradient-to-r from-sky-300 via-yellow-300 to-orange-400"
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 6)}%` }}
                  />
                  {nowPct !== null && (
                    <span
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/90 shadow"
                      style={{ left: `calc(${leftPct}% + ${(nowPct / 100) * Math.max(widthPct, 6)}%)` }}
                    />
                  )}
                </div>

                <span className="w-7 shrink-0 text-right text-[15px] font-semibold text-white">
                  {day.tempMax}°
                </span>

                <Chevron open={open} />
              </button>

              {open && <DayDetail day={day} units={units} />}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

function DayDetail({ day, units }: { day: DayEntry; units: Units }) {
  return (
    <div className="animate-slide-up rounded-2xl bg-black/20 px-3 pb-3 pt-2.5 mx-1 mb-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="Precipitation"
          value={formatPrecip(day.precipitationSum, units)}
          sub={`${day.precipitationProbability}% chance`}
        />
        <Stat
          label="Wind"
          value={`${day.windMax}`}
          unit={` ${speedUnitLabel(units)}`}
          sub={`${windDirectionLabel(day.windDirDominant)} · gust ${day.windGustsMax}`}
        />
        <Stat label="UV Index" value={`${day.uvIndexMax}`} sub={uvLabel(day.uvIndexMax)} />
        <Stat
          label="Feels Like"
          value={`${day.apparentMax}°`}
          sub={`Low ${day.apparentMin}°`}
        />
        <Stat label="Sunrise" value={formatClock(day.sunrise)} />
        <Stat label="Sunset" value={formatClock(day.sunset)} />
      </div>

      <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto pb-1">
        {day.hours.map((hr) => {
          const showPrecip = hr.precipitationProbability >= 20;
          return (
            <div
              key={hr.time}
              className="flex w-[52px] shrink-0 flex-col items-center gap-1 py-1"
            >
              <span
                className={`text-[12px] font-semibold ${
                  hr.label === "Now" ? "text-white" : "text-white/85"
                }`}
              >
                {hr.label}
              </span>
              <WeatherIcon icon={hr.icon} title="" className="h-6 w-6" />
              <span className="h-3 text-[10px] font-semibold leading-none text-sky-200">
                {showPrecip ? `${hr.precipitationProbability}%` : ""}
              </span>
              <span className="text-[14px] font-medium text-white">{hr.temperature}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold leading-tight text-white">
        {value}
        {unit && <span className="text-[12px] font-normal text-white/75">{unit}</span>}
      </p>
      {sub && <p className="text-[11px] leading-snug text-white/75">{sub}</p>}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
