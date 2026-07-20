"use client";

import type { Headline, Units } from "@/lib/weather";
import { formatClock } from "@/lib/weather";
import {
  formatPressure,
  formatVisibility,
  formatPrecip,
  speedUnitLabel,
  uvLabel,
  windDirectionLabel,
} from "@/lib/format";
import Panel, { SectionLabel } from "./Panel";

export default function NumbersGrid({
  headline,
  units,
  precipTotal,
  precipProb,
}: {
  headline: Headline;
  units: Units;
  precipTotal: number;
  precipProb: number;
}) {
  return (
    <Panel>
      <div className="px-4 pt-4 sm:px-5">
        <SectionLabel>Yesterday, by the numbers</SectionLabel>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-px border-t border-ink-line bg-ink-line sm:grid-cols-4 lg:grid-cols-2">
        <Cell
          label="Precipitation"
          value={formatPrecip(precipTotal, units)}
          sub={`peak chance ${precipProb}%`}
        />
        <Cell
          label="Felt like"
          value={`${headline.apparentTemperature}°`}
          sub={`actual ${headline.temperature}°`}
        />
        <Cell
          label="Wind"
          value={`${headline.windSpeed} ${speedUnitLabel(units)}`}
          sub={`${windDirectionLabel(headline.windDirection)} · gusts ${headline.windGusts}`}
        />
        <Cell label="Humidity" value={`${headline.humidity}%`} sub={`cloud ${headline.cloudCover}%`} />
        <Cell label="UV index" value={`${headline.uvIndex}`} sub={uvLabel(headline.uvIndex)} />
        <Cell
          label="Sun"
          value={formatClock(headline.sunrise)}
          sub={`set ${formatClock(headline.sunset)}`}
        />
        <Cell
          label="Visibility"
          value={formatVisibility(headline.visibility, units)}
          sub={headline.visibility >= 10000 ? "clear as it got" : "a little hazy"}
        />
        <Cell label="Pressure" value={formatPressure(headline.pressure, units)} sub="at sea level" />
      </dl>
    </Panel>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-ink-raised px-4 py-3.5 sm:px-5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-faint">
        {label}
      </dt>
      <dd className="mt-1 font-display text-[20px] font-medium leading-tight text-paper">
        {value}
      </dd>
      {sub && <dd className="mt-0.5 text-[11px] text-paper-faint">{sub}</dd>}
    </div>
  );
}
