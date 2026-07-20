"use client";

import type { WaterLedger as WaterLedgerData, WaterState, Units } from "@/lib/weather";
import { formatPrecip } from "@/lib/format";
import Panel, { SectionLabel } from "./Panel";

const RAIN = "#0284C7"; // water in
const DRAWN = "#D97706"; // drawn back out by sun + wind (ET₀)

/**
 * Rain in, evaporation out, and whether the sky has the next round covered.
 * The panel answers one question: is the ground still holding water?
 */
export default function WaterLedger({
  water,
  units,
}: {
  water: WaterLedgerData;
  units: Units;
}) {
  const net7 = water.rain7 - water.et7;
  const maxVal = Math.max(
    ...water.days.map((d) => Math.max(d.rain, d.et0)),
    0.001
  );

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <SectionLabel>Water ledger</SectionLabel>
        <StateChip state={water.state} />
      </div>

      <p className="px-4 pt-2 text-[13.5px] leading-snug text-paper sm:px-5">
        {verdict(water, units)}
      </p>

      {/* In above the line, out below it. */}
      <div className="mt-3 px-4 sm:px-5">
        <div className="flex items-stretch justify-between gap-[3px]">
          {water.days.map((d) => {
            const up = d.rain > 0 ? Math.max((d.rain / maxVal) * 56, 3) : 0;
            const down = d.et0 > 0 ? Math.max((d.et0 / maxVal) * 34, 2) : 0;
            const expected = d.phase !== "past";
            return (
              <div
                key={d.date}
                className="group flex min-w-0 flex-1 flex-col items-center"
                title={`${d.label === "Tdy" ? "Today" : d.label === "Tmw" ? "Tomorrow" : d.date}: ${
                  expected
                    ? `${formatPrecip(d.rain, units)} expected`
                    : `${formatPrecip(d.rain, units)} in · ${formatPrecip(d.et0, units)} out`
                }`}
              >
                <div className="flex h-[58px] w-full items-end justify-center">
                  {up > 0 && (
                    <div
                      className="w-[70%] max-w-[18px] rounded-t-[3px]"
                      style={
                        expected
                          ? {
                              height: up,
                              border: `1.5px dashed ${RAIN}`,
                              borderBottom: "none",
                              background: "rgba(2,132,199,0.16)",
                            }
                          : { height: up, background: RAIN }
                      }
                    />
                  )}
                </div>
                <div className="h-px w-full bg-white/[0.14]" />
                <div className="flex h-[36px] w-full items-start justify-center">
                  {down > 0 && (
                    <div
                      className="w-[70%] max-w-[18px] rounded-b-[3px]"
                      style={{ height: down, background: DRAWN, opacity: 0.85 }}
                    />
                  )}
                </div>
                <span
                  className={`mt-1 text-[9.5px] font-semibold uppercase tracking-wide ${
                    d.phase === "past" ? "text-paper-faint" : "text-paper-dim"
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-paper-faint">
          <LegendKey swatch={<span className="h-2 w-2 rounded-[2px]" style={{ background: RAIN }} />}>
            Rain in
          </LegendKey>
          <LegendKey
            swatch={<span className="h-2 w-2 rounded-[2px]" style={{ background: DRAWN, opacity: 0.85 }} />}
          >
            Drawn out (sun, wind)
          </LegendKey>
          <LegendKey
            swatch={
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ border: `1.5px dashed ${RAIN}`, background: "rgba(2,132,199,0.16)" }}
              />
            }
          >
            Expected
          </LegendKey>
        </div>
      </div>

      <dl className="mt-3.5 grid grid-cols-3 gap-px border-t border-ink-line bg-ink-line">
        <Stat label="In · 7 days" value={formatPrecip(water.rain7, units)} />
        <Stat label="Out · 7 days" value={formatPrecip(water.et7, units)} />
        <Stat
          label="Net · 7 days"
          value={`${net7 > 0 ? "+" : net7 < 0 ? "−" : ""}${formatPrecip(Math.abs(net7), units)}`}
        />
      </dl>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function verdict(w: WaterLedgerData, units: Units): string {
  const f = (v: number) => formatPrecip(v, units);
  const since =
    w.daysSinceRain === 1
      ? "it last rained yesterday"
      : w.daysSinceRain === null
      ? "no real rain in the last 10 days"
      : `${w.daysSinceRain} days since real rain`;

  switch (w.state) {
    case "soaked":
      return `The sky took care of it — ${f(w.rain24)} in the last 24 hours.`;
    case "holding":
      return `${f(w.rain3)} fell over the last three days against ${f(
        w.et3
      )} drawn back out. The ground is still ahead.`;
    case "rain-soon": {
      const upMm = units === "imperial" ? w.upcomingRain * 25.4 : w.upcomingRain;
      const due =
        upMm >= 4
          ? `${f(w.upcomingRain)} is due by tomorrow`
          : `there's a ${Math.round(w.upcomingMaxProb)}% chance of rain by tomorrow`;
      return `Running dry — ${since}. But ${due}, so the sky may cover this round.`;
    }
    case "steady":
      return `Quiet on both sides of the ledger — almost nothing in, almost nothing out.`;
    case "parched":
      return `${capitalize(since)}, and the week's tab is ${f(
        w.et7
      )} drawn out against almost nothing in. If it depends on you, it's on you.`;
    case "drying":
    default:
      return `${capitalize(since)}, while sun and wind drew out ${f(
        w.et3
      )} over three days. ${
        w.nextWetLabel ? `Next real chance: ${w.nextWetLabel}.` : "Nothing promising on the board."
      }`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CHIP: Record<WaterState, { label: string; cls: string }> = {
  soaked: { label: "Soaked", cls: "border-future-text/45 text-future-text bg-future-soft" },
  holding: { label: "Holding", cls: "border-future-text/45 text-future-text bg-future-soft" },
  "rain-soon": { label: "Rain soon", cls: "border-future-text/45 text-future-text bg-future-soft" },
  steady: { label: "Steady", cls: "border-white/25 text-paper-dim bg-white/[0.04]" },
  drying: { label: "Drying", cls: "border-past-text/45 text-past-text bg-past-soft" },
  parched: { label: "Parched", cls: "border-past-text/45 text-past-text bg-past-soft" },
};

function StateChip({ state }: { state: WaterState }) {
  const c = CHIP[state];
  return (
    <span
      className={`rounded-md border px-2 py-[3px] font-display text-[10px] font-bold uppercase tracking-[0.18em] ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

function LegendKey({
  swatch,
  children,
}: {
  swatch: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-raised px-4 py-3 sm:px-5">
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-paper-faint">
        {label}
      </dt>
      <dd
        className="mt-0.5 font-display text-[16px] font-medium text-paper"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </dd>
    </div>
  );
}
