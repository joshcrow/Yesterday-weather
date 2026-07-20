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
import Panel, { SectionLabel } from "./Panel";

const OBSERVED = "#D97706";
const EXPECTED = "#0284C7";

interface Props {
  hindsight: DayEntry[];
  foresight: DayEntry[];
  tempDomain: { min: number; max: number };
  currentTemp: number;
  units: Units;
}

/**
 * The ledger: a week of hindsight beside a week of foresight.
 * Every row expands into the full day — observed or expected.
 */
export default function Ledger({
  hindsight,
  foresight,
  tempDomain,
  currentTemp,
  units,
}: Props) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <Panel>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-ink-line">
        <LedgerColumn
          title="Hindsight"
          note="what actually happened"
          accent={OBSERVED}
          days={hindsight}
          tempDomain={tempDomain}
          currentTemp={currentTemp}
          units={units}
          openDate={openDate}
          onToggle={(d) => setOpenDate(openDate === d ? null : d)}
        />
        <div className="border-t border-ink-line lg:border-t-0">
          <LedgerColumn
            title="Foresight"
            note="fine, here's the future"
            accent={EXPECTED}
            days={foresight}
            tempDomain={tempDomain}
            currentTemp={currentTemp}
            units={units}
            openDate={openDate}
            onToggle={(d) => setOpenDate(openDate === d ? null : d)}
          />
        </div>
      </div>
    </Panel>
  );
}

function LedgerColumn({
  title,
  note,
  accent,
  days,
  tempDomain,
  currentTemp,
  units,
  openDate,
  onToggle,
}: {
  title: string;
  note: string;
  accent: string;
  days: DayEntry[];
  tempDomain: { min: number; max: number };
  currentTemp: number;
  units: Units;
  openDate: string | null;
  onToggle: (date: string) => void;
}) {
  return (
    <div className="px-2 pb-2 sm:px-3">
      <div className="flex items-baseline gap-2.5 px-2 pb-1 pt-4">
        <span
          aria-hidden="true"
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: accent }}
        />
        <SectionLabel>{title}</SectionLabel>
        <span className="text-[11px] italic text-paper-faint">{note}</span>
      </div>
      <ul>
        {days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            tempDomain={tempDomain}
            currentTemp={currentTemp}
            units={units}
            open={openDate === day.date}
            onToggle={() => onToggle(day.date)}
          />
        ))}
      </ul>
    </div>
  );
}

function DayRow({
  day,
  tempDomain,
  currentTemp,
  units,
  open,
  onToggle,
}: {
  day: DayEntry;
  tempDomain: { min: number; max: number };
  currentTemp: number;
  units: Units;
  open: boolean;
  onToggle: () => void;
}) {
  const span = Math.max(tempDomain.max - tempDomain.min, 1);
  const leftPct = ((day.tempMin - tempDomain.min) / span) * 100;
  const widthPct = Math.max(((day.tempMax - day.tempMin) / span) * 100, 5);
  const isToday = day.phase === "today";
  const nowPct = isToday
    ? Math.min(
        Math.max(((currentTemp - day.tempMin) / Math.max(day.tempMax - day.tempMin, 1)) * 100, 0),
        100
      )
    : null;

  // Phase-coded range bar: solid amber = observed, dashed blue = expected,
  // paper = today (the one day that's both).
  const barStyle: React.CSSProperties =
    day.phase === "past"
      ? { background: OBSERVED, opacity: 0.9 }
      : day.phase === "future"
      ? {
          backgroundImage: `repeating-linear-gradient(90deg, ${EXPECTED} 0 7px, transparent 7px 11px)`,
        }
      : { background: "rgba(242,244,248,0.92)" };

  return (
    <li className="border-t border-ink-line first:border-t-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[74px_30px_1fr_64px_14px] items-center gap-x-2 rounded-lg px-2 py-[9px] text-left transition-colors hover:bg-white/[0.045]"
      >
        <span className="min-w-0">
          <span
            className={`block truncate font-display text-[14px] leading-tight ${
              isToday ? "font-semibold text-paper" : "font-medium text-paper"
            }`}
          >
            {day.dayLabel}
          </span>
          <span className="block text-[10.5px] leading-tight text-paper-faint">
            {day.subLabel}
          </span>
        </span>

        <span className="flex flex-col items-center">
          <WeatherIcon icon={day.icon} title="" className="h-[26px] w-[26px]" />
          {day.precipitationProbability >= 30 && (
            <span className="mt-px text-[9.5px] font-semibold leading-none text-future-text">
              {day.precipitationProbability}%
            </span>
          )}
        </span>

        <span className="relative mx-1 block h-[6px] rounded-full bg-white/[0.08]">
          <span
            className="absolute top-0 block h-[6px] overflow-hidden rounded-full"
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, ...barStyle }}
          />
          {nowPct !== null && (
            <span
              className="absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-raised bg-paper"
              style={{ left: `calc(${leftPct}% + ${(nowPct / 100) * widthPct}%)` }}
            />
          )}
        </span>

        <span
          className="text-right font-display text-[13.5px] font-medium text-paper"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span className="text-paper-dim">{day.tempMin}°</span>
          <span className="text-paper-faint"> / </span>
          {day.tempMax}°
        </span>

        <Chevron open={open} />
      </button>

      {open && <DayDetail day={day} units={units} />}
    </li>
  );
}

function DayDetail({ day, units }: { day: DayEntry; units: Units }) {
  const observedDay = day.phase === "past";
  return (
    <div className="animate-slide-up mx-1 mb-2 rounded-xl border border-ink-line bg-black/25 p-3">
      <div className="flex items-center gap-2">
        <span
          className="rounded px-1.5 py-[2px] font-display text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{
            color: observedDay ? "#F0A84B" : day.phase === "future" ? "#53B2E8" : "#F2F4F8",
            border: `1px solid ${
              observedDay
                ? "rgba(240,168,75,0.45)"
                : day.phase === "future"
                ? "rgba(83,178,232,0.45)"
                : "rgba(242,244,248,0.4)"
            }`,
          }}
        >
          {observedDay ? "Observed" : day.phase === "future" ? "Expected" : "In progress"}
        </span>
        <span className="text-[11px] text-paper-faint">
          feels {day.apparentMin}°–{day.apparentMax}°
        </span>
      </div>

      <dl className="mt-2.5 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-ink-line">
        <MiniStat
          label="Precip"
          value={formatPrecip(day.precipitationSum, units)}
          sub={`${day.precipitationProbability}% chance`}
        />
        <MiniStat
          label="Wind"
          value={`${day.windMax} ${speedUnitLabel(units)}`}
          sub={`${windDirectionLabel(day.windDirDominant)} · gust ${day.windGustsMax}`}
        />
        <MiniStat label="UV" value={`${day.uvIndexMax}`} sub={uvLabel(day.uvIndexMax)} />
        <MiniStat label="Sunrise" value={formatClock(day.sunrise)} />
        <MiniStat label="Sunset" value={formatClock(day.sunset)} />
        <MiniStat label="High / Low" value={`${day.tempMax}° / ${day.tempMin}°`} />
      </dl>

      {day.hours.length > 0 && (
        <div className="no-scrollbar mt-2.5 flex gap-0.5 overflow-x-auto">
          {day.hours.map((hr) => (
            <div
              key={hr.time}
              className="flex w-[46px] shrink-0 flex-col items-center gap-[3px] py-1"
            >
              <span
                className={`text-[10px] font-semibold ${
                  hr.label === "Now" ? "text-paper" : "text-paper-faint"
                }`}
              >
                {hr.label}
              </span>
              <WeatherIcon icon={hr.icon} title="" className="h-[22px] w-[22px]" />
              <span
                className="h-[11px] text-[9px] font-semibold leading-none text-future-text"
              >
                {hr.precipitationProbability >= 20 ? `${hr.precipitationProbability}%` : ""}
              </span>
              <span
                className="font-display text-[12.5px] font-medium text-paper"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {hr.temperature}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-ink-raised px-2.5 py-2">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-[13.5px] font-medium leading-tight text-paper">
        {value}
      </dd>
      {sub && <dd className="text-[10px] leading-snug text-paper-faint">{sub}</dd>}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 text-paper-faint transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
