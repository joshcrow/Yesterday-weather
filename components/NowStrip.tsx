"use client";

import type { NowConditions, Units } from "@/lib/weather";
import { speedUnitLabel } from "@/lib/format";
import WeatherIcon from "./WeatherIcon";
import Panel from "./Panel";
import { SectionLabel } from "./Panel";

/**
 * The present, kept deliberately modest. Other apps lead with this;
 * we mention it.
 */
export default function NowStrip({
  now,
  units,
}: {
  now: NowConditions;
  units: Units;
}) {
  return (
    <Panel className="p-4 sm:px-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <SectionLabel>Meanwhile, now</SectionLabel>
            <span className="text-[10.5px] italic text-paper-faint">(fleeting)</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <WeatherIcon icon={now.icon} title={now.description} className="h-9 w-9" />
            <span className="font-display text-[34px] font-medium leading-none tracking-tight text-paper">
              {now.temperature}°
            </span>
            <span className="min-w-0 text-[14px] font-medium leading-tight text-paper-dim">
              {now.description}
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-paper-faint sm:hidden">
            feels {now.apparentTemperature}° · wind {now.windSpeed} {speedUnitLabel(units)} ·{" "}
            {now.humidity}% humidity
          </p>
        </div>
        <dl className="hidden shrink-0 grid-cols-3 gap-x-5 text-right sm:grid">
          <MiniStat label="Feels" value={`${now.apparentTemperature}°`} />
          <MiniStat label="Wind" value={`${now.windSpeed} ${speedUnitLabel(units)}`} />
          <MiniStat label="Humidity" value={`${now.humidity}%`} />
        </dl>
      </div>
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-[15px] font-medium text-paper">{value}</dd>
    </div>
  );
}
