"use client";

import type { DayEntry } from "@/lib/weather";
import WeatherIcon from "./WeatherIcon";
import GlassCard from "./GlassCard";

export default function DailyForecast({
  days,
  currentTemp,
}: {
  days: DayEntry[];
  currentTemp: number;
}) {
  // Range across the whole period, used to scale each day's bar.
  const overallMin = Math.min(...days.map((d) => d.tempMin));
  const overallMax = Math.max(...days.map((d) => d.tempMax));
  const span = Math.max(overallMax - overallMin, 1);

  return (
    <GlassCard className="mt-4">
      <h2 className="px-4 pt-3.5 pb-1 text-[13px] font-semibold uppercase tracking-wide text-white/70">
        10-Day Forecast
      </h2>
      <ul className="px-2 pb-2">
        {days.map((day, i) => {
          const leftPct = ((day.tempMin - overallMin) / span) * 100;
          const widthPct = ((day.tempMax - day.tempMin) / span) * 100;
          // Marker for "now" only on today's row.
          const nowPct =
            i === 0
              ? Math.min(
                  Math.max(((currentTemp - day.tempMin) / Math.max(day.tempMax - day.tempMin, 1)) * 100, 0),
                  100
                )
              : null;

          return (
            <li
              key={day.date}
              className="flex items-center gap-3 border-b border-white/10 px-2 py-2.5 last:border-b-0"
            >
              <span className="w-11 shrink-0 text-[16px] font-semibold text-white">
                {day.dayLabel}
              </span>

              <div className="flex w-9 shrink-0 flex-col items-center">
                <WeatherIcon icon={day.icon} title="" className="h-7 w-7 drop-shadow" />
                {day.precipitationProbability >= 30 && (
                  <span className="text-[10px] font-semibold leading-none text-sky-200">
                    {day.precipitationProbability}%
                  </span>
                )}
              </div>

              <span className="w-8 shrink-0 text-right text-[16px] font-medium text-white/70">
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

              <span className="w-8 shrink-0 text-right text-[16px] font-semibold text-white">
                {day.tempMax}°
              </span>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
