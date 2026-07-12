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
import GlassCard from "./GlassCard";

export default function WeatherDetails({
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
    <div className="mt-4 grid grid-cols-2 gap-3">
      <DetailCard label="Precipitation">
        <BigValue>{formatPrecip(precipTotal, units)}</BigValue>
        <Note>{precipProb}% chance · all day yesterday</Note>
      </DetailCard>

      <DetailCard label="Feels Like">
        <BigValue>{headline.apparentTemperature}°</BigValue>
        <Note>Actual was {headline.temperature}°.</Note>
      </DetailCard>

      <DetailCard label="Wind">
        <BigValue>
          {headline.windSpeed}
          <Unit> {speedUnitLabel(units)}</Unit>
        </BigValue>
        <Note>
          From {windDirectionLabel(headline.windDirection)} · gusts {headline.windGusts}
        </Note>
      </DetailCard>

      <DetailCard label="Humidity">
        <BigValue>{headline.humidity}%</BigValue>
        <Note>Cloud cover was {headline.cloudCover}%.</Note>
      </DetailCard>

      <DetailCard label="UV Index">
        <BigValue>{headline.uvIndex}</BigValue>
        <Note>{uvLabel(headline.uvIndex)}</Note>
      </DetailCard>

      <DetailCard label="Sun">
        <div className="flex items-baseline gap-1.5">
          <ArrowUp />
          <span className="text-[22px] font-medium leading-tight text-white">
            {formatClock(headline.sunrise)}
          </span>
        </div>
        <Note className="flex items-center gap-1.5">
          <ArrowDown />
          {formatClock(headline.sunset)}
        </Note>
      </DetailCard>

      <DetailCard label="Visibility">
        <BigValue>{formatVisibility(headline.visibility, units)}</BigValue>
        <Note>
          {headline.visibility >= 10000 ? "Clear as far as the eye saw." : "A little hazy."}
        </Note>
      </DetailCard>

      <DetailCard label="Pressure">
        <BigValue className="text-2xl">{formatPressure(headline.pressure, units)}</BigValue>
        <Note>At sea level.</Note>
      </DetailCard>
    </div>
  );
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-3.5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-white/80">{label}</h3>
      <div className="mt-1.5 flex min-h-[62px] flex-col justify-between">{children}</div>
    </GlassCard>
  );
}

function BigValue({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[28px] font-medium leading-tight text-white ${className}`}>{children}</p>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-base font-normal text-white/80">{children}</span>;
}

function Note({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`mt-1 text-[12px] leading-snug text-white/85 ${className}`}>{children}</p>;
}

function ArrowUp() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-200" fill="none" aria-hidden="true">
      <path d="M12 19V7m0 0l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-200/80" fill="none" aria-hidden="true">
      <path d="M12 5v12m0 0l5-5m-5 5l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
