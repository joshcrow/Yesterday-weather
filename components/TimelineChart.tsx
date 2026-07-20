"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelinePoint, NightSpan, Units } from "@/lib/weather";
import { wallMinutes, formatLongDate } from "@/lib/weather";
import { formatPrecip } from "@/lib/format";
import Panel, { SectionLabel } from "./Panel";
import WeatherIcon from "./WeatherIcon";

// Phase colors — validated (CVD + contrast) against the dark surface.
const OBSERVED = "#D97706";
const EXPECTED = "#0284C7";
const SURFACE = "#10151E"; // panel color, used for marker rings ("surface ring")

// Geometry (pixels; the SVG renders 1:1, horizontally scrollable).
const HW = 21; // px per hour
const PAD_L = 40;
const PAD_R = 18;
const PAD_T = 30; // room for the "Now" direct label
const TEMP_H = 138;
const GAP = 22; // between temp plot and precip strip
const P_H = 32;
const AXIS_H = 30;
const SVG_H = PAD_T + TEMP_H + GAP + P_H + AXIS_H;

interface Props {
  timeline: TimelinePoint[];
  nowIndex: number;
  nights: NightSpan[];
  units: Units;
  past24Precip: number;
}

export default function TimelineChart({
  timeline,
  nowIndex,
  nights,
  units,
  past24Precip,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const width = PAD_L + HW * (timeline.length - 1) + PAD_R;
  const plotBottom = PAD_T + TEMP_H;
  const stripTop = plotBottom + GAP;
  const stripBottom = stripTop + P_H;

  const { yFor, ticks } = useMemo(() => tempScale(timeline), [timeline]);
  const xFor = (i: number) => PAD_L + i * HW;

  // Wall-clock x for arbitrary ISO times (night band edges).
  const originMin = wallMinutes(timeline[0].time);
  const xForTime = (iso: string) =>
    PAD_L + ((wallMinutes(iso) - originMin) / 60) * HW;

  // Smooth path segments: observed [0..now], expected [now..end].
  const pastPts = timeline.slice(0, nowIndex + 1).map((p, i) => [xFor(i), yFor(p.temperature)] as const);
  const futPts = timeline.slice(nowIndex).map((p, i) => [xFor(nowIndex + i), yFor(p.temperature)] as const);
  const pastPath = smoothPath(pastPts);
  const futPath = smoothPath(futPts);
  const pastArea = `${pastPath} L ${pastPts[pastPts.length - 1][0]} ${plotBottom} L ${pastPts[0][0]} ${plotBottom} Z`;
  const futArea = `${futPath} L ${futPts[futPts.length - 1][0]} ${plotBottom} L ${futPts[0][0]} ${plotBottom} Z`;

  // Direct labels: the pivot ("Now") plus the window's extreme (if distinct).
  const maxIdx = timeline.reduce((m, p, i) => (p.temperature > timeline[m].temperature ? i : m), 0);
  const showMaxLabel = Math.abs(maxIdx - nowIndex) > 2;

  // Initial scroll: put "now" ~42% from the left edge.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(xFor(nowIndex) - el.clientWidth * 0.42, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowIndex, timeline[0]?.time]);

  const maxFutureProb = Math.max(
    0,
    ...timeline.slice(nowIndex + 1).map((p) => p.precipitationProbability)
  );

  function pointFromEvent(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.round((x - PAD_L) / HW);
    setHover(Math.min(Math.max(i, 0), timeline.length - 1));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      setHover((h) => Math.min((h ?? nowIndex) + 1, timeline.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      setHover((h) => Math.max((h ?? nowIndex) - 1, 0));
      e.preventDefault();
    } else if (e.key === "Home") {
      setHover(0);
      e.preventDefault();
    } else if (e.key === "End") {
      setHover(timeline.length - 1);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setHover(null);
    }
  }

  const hovered = hover !== null ? timeline[hover] : null;

  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4 sm:px-5">
        <SectionLabel>48-hour timeline</SectionLabel>
        <div className="flex items-center gap-4 text-[11px] text-paper-dim">
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="18" y2="1" stroke={OBSERVED} strokeWidth="2" />
            </svg>
            Observed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="18" y2="1" stroke={EXPECTED} strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Expected
          </span>
        </div>
      </div>
      <p className="px-4 pt-1 text-[12.5px] text-paper-dim sm:px-5">
        {formatPrecip(past24Precip, units)} of precipitation in the last 24h
        {" · "}
        {maxFutureProb >= 5
          ? `up to ${Math.round(maxFutureProb)}% chance ahead`
          : "nothing expected in the next 24h"}
      </p>

      <div className="relative mt-1">
        <div
          ref={scrollRef}
          className="no-scrollbar relative overflow-x-auto pb-1"
          onPointerLeave={() => setHover(null)}
        >
          <div className="relative" style={{ width }}>
          <svg
            width={width}
            height={SVG_H}
            role="application"
            aria-label={`Temperature timeline: 24 hours observed, 24 hours expected. Use arrow keys to read values.`}
            tabIndex={0}
            className="block select-none outline-none focus-visible:outline-none"
            onPointerMove={pointFromEvent}
            onPointerDown={pointFromEvent}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
          >
            {/* Night shading — recessive context bands. */}
            {nights.map((n, i) => {
              const x1 = Math.max(xForTime(n.start), 0);
              const x2 = Math.min(xForTime(n.end), width);
              if (x2 <= x1) return null;
              return (
                <rect
                  key={i}
                  x={x1}
                  y={PAD_T - 10}
                  width={x2 - x1}
                  height={stripBottom - PAD_T + 10}
                  fill="rgba(0,0,0,0.22)"
                />
              );
            })}

            {/* Horizontal gridlines (solid hairlines; labels live in the
                sticky overlay so they survive horizontal scrolling). */}
            {ticks.map((t) => (
              <line
                key={t}
                x1={PAD_L - 6}
                y1={yFor(t)}
                x2={width - PAD_R + 6}
                y2={yFor(t)}
                stroke="rgba(240,243,248,0.07)"
                strokeWidth={1}
              />
            ))}

            {/* Now divider. */}
            <line
              x1={xFor(nowIndex)}
              y1={PAD_T - 10}
              x2={xFor(nowIndex)}
              y2={stripBottom}
              stroke="rgba(240,243,248,0.22)"
              strokeWidth={1}
            />

            {/* Area washes (~9% of the series hue). */}
            <path d={pastArea} fill={OBSERVED} opacity={0.09} />
            <path d={futArea} fill={EXPECTED} opacity={0.09} />

            {/* Temperature line: solid observed, dashed expected (projection). */}
            <path d={pastPath} fill="none" stroke={OBSERVED} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={futPath} fill="none" stroke={EXPECTED} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 5" />

            {/* Endpoint + pivot markers, each with a surface ring. */}
            <circle cx={pastPts[0][0]} cy={pastPts[0][1]} r={4} fill={OBSERVED} stroke={SURFACE} strokeWidth={2} />
            <circle cx={futPts[futPts.length - 1][0]} cy={futPts[futPts.length - 1][1]} r={4} fill={EXPECTED} stroke={SURFACE} strokeWidth={2} />
            <circle cx={xFor(nowIndex)} cy={yFor(timeline[nowIndex].temperature)} r={5} fill="#F2F4F8" stroke={SURFACE} strokeWidth={2} />

            {/* Direct labels: Now, and the window extreme. */}
            <text
              x={xFor(nowIndex)}
              y={PAD_T - 16}
              textAnchor="middle"
              className="fill-paper-faint"
              style={{ fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 600 }}
            >
              NOW
            </text>
            <text
              x={xFor(nowIndex)}
              y={yFor(timeline[nowIndex].temperature) - 12}
              textAnchor="middle"
              className="fill-paper"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {timeline[nowIndex].temperature}°
            </text>
            {showMaxLabel && (
              <text
                x={xFor(maxIdx)}
                y={yFor(timeline[maxIdx].temperature) - 9}
                textAnchor="middle"
                className="fill-paper-dim"
                style={{ fontSize: 11.5, fontWeight: 600 }}
              >
                {timeline[maxIdx].temperature}°
              </text>
            )}

            {/* Precipitation-chance strip (own scale — a small multiple). */}
            <line
              x1={PAD_L - 6}
              y1={stripBottom + 0.5}
              x2={width - PAD_R + 6}
              y2={stripBottom + 0.5}
              stroke="rgba(240,243,248,0.10)"
              strokeWidth={1}
            />
            {timeline.map((p, i) => {
              if (p.precipitationProbability < 4) return null;
              const bh = Math.max((p.precipitationProbability / 100) * P_H, 2);
              return (
                <rect
                  key={p.time}
                  x={xFor(i) - (HW - 4) / 2}
                  y={stripBottom - bh}
                  width={HW - 4}
                  height={bh}
                  rx={2}
                  fill={p.observed ? OBSERVED : EXPECTED}
                  opacity={0.5}
                />
              );
            })}

            {/* X axis: ticks every 6 hours; weekday at midnight. */}
            {timeline.map((p, i) => {
              const hr = parseInt(p.time.slice(11, 13), 10);
              if (hr % 6 !== 0) return null;
              const isMidnight = hr === 0;
              return (
                <text
                  key={p.time}
                  x={xFor(i)}
                  y={stripBottom + 19}
                  textAnchor="middle"
                  className={isMidnight ? "fill-paper-dim" : "fill-paper-faint"}
                  style={{
                    fontSize: 10,
                    fontWeight: isMidnight ? 700 : 500,
                    letterSpacing: isMidnight ? "0.1em" : undefined,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isMidnight
                    ? new Date(`${p.time.slice(0, 10)}T12:00:00`)
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase()
                    : p.label}
                </text>
              );
            })}

            {/* Hover/focus crosshair + marker. */}
            {hovered && hover !== null && (
              <g pointerEvents="none">
                <line
                  x1={xFor(hover)}
                  y1={PAD_T - 6}
                  x2={xFor(hover)}
                  y2={stripBottom}
                  stroke="rgba(240,243,248,0.35)"
                  strokeWidth={1}
                />
                <circle
                  cx={xFor(hover)}
                  cy={yFor(hovered.temperature)}
                  r={4.5}
                  fill={hovered.observed ? OBSERVED : EXPECTED}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>

          {/* Tooltip (scrolls with the plot; values lead, labels follow). */}
          {hovered && hover !== null && (
            <div
              className="pointer-events-none absolute z-10 w-[168px] rounded-lg border border-ink-line bg-[#0D1118]/95 px-3 py-2.5 shadow-xl"
              style={{
                left: Math.min(Math.max(xFor(hover) - 84, 6), width - 174),
                top: -2,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[19px] font-semibold leading-none text-paper">
                  {hovered.temperature}°
                </span>
                <WeatherIcon icon={hovered.icon} title="" className="h-6 w-6" />
              </div>
              <p className="mt-1 text-[11.5px] leading-tight text-paper-dim">
                {describeShort(hovered)}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-paper-faint">
                <svg width="12" height="2" aria-hidden="true">
                  <line
                    x1="0" y1="1" x2="12" y2="1"
                    stroke={hovered.observed ? OBSERVED : EXPECTED}
                    strokeWidth="2"
                    strokeDasharray={hovered.observed ? undefined : "3 2"}
                  />
                </svg>
                {hovered.observed ? "Observed" : "Expected"} · {hovered.label},{" "}
                {formatLongDate(hovered.time.slice(0, 10)).split(",")[0]}
              </div>
              {hovered.precipitationProbability >= 4 && (
                <p className="mt-1 text-[10.5px] text-paper-faint">
                  {hovered.precipitationProbability}% precip chance
                </p>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Sticky axis labels — pinned while the plot scrolls beneath. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: PAD_L + 8,
            height: SVG_H,
            background:
              "linear-gradient(90deg, #10151E 58%, rgba(16,21,30,0) 100%)",
          }}
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-3 text-[10.5px] leading-none text-paper-faint"
              style={{ top: yFor(t) - 5, fontVariantNumeric: "tabular-nums" }}
            >
              {t}°
            </span>
          ))}
          <span
            className="absolute right-3 text-[8.5px] font-semibold leading-none tracking-[0.12em] text-paper-faint"
            style={{ top: stripBottom - 9 }}
          >
            PRECIP
          </span>
        </div>
      </div>
    </Panel>
  );
}

// Cosmetic helper — TimelinePoint has no description field; derive from icon.
function describeShort(p: TimelinePoint): string {
  const map: Record<string, string> = {
    "clear-day": "Sunny",
    "clear-night": "Clear",
    "partly-day": "Partly cloudy",
    "partly-night": "Partly cloudy",
    cloudy: "Cloudy",
    fog: "Fog",
    drizzle: "Drizzle",
    rain: "Rain",
    showers: "Showers",
    "freezing-rain": "Freezing rain",
    snow: "Snow",
    thunderstorm: "Thunderstorms",
  };
  return map[p.icon] ?? "";
}

/** Clean y scale: padded domain, three round ticks. */
function tempScale(timeline: TimelinePoint[]) {
  const temps = timeline.map((p) => p.temperature);
  let lo = Math.min(...temps);
  let hi = Math.max(...temps);
  if (hi - lo < 6) {
    const mid = (hi + lo) / 2;
    lo = mid - 3;
    hi = mid + 3;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.14;
  const yFor = (t: number) => PAD_T + TEMP_H * (1 - (t - lo) / (hi - lo));
  const tickLo = Math.ceil(lo / 5) * 5;
  const tickHi = Math.floor(hi / 5) * 5;
  const tickMid = Math.round((tickLo + tickHi) / 10) * 5;
  const ticks = Array.from(new Set([tickLo, tickMid, tickHi])).filter(
    (t) => t >= lo && t <= hi
  );
  return { yFor, ticks };
}

/** Catmull-Rom → cubic Bézier smoothing. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
