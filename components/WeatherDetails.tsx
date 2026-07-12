"use client";

import type { Headline, Units } from "@/lib/weather";
import { formatClock } from "@/lib/weather";
import {
  formatPressure,
  formatVisibility,
  speedUnitLabel,
  uvLabel,
  windDirectionLabel,
} from "@/lib/format";
import GlassCard from "./GlassCard";

export default function WeatherDetails({
  headline,
  units,
}: {
  headline: Headline;
  units: Units;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <DetailCard label="Felt Like">
        <BigValue>{headline.apparentTemperature}°</BigValue>
        <Note>
          {headline.apparentTemperature > headline.temperature
            ? "Muggier than it looked. Was."
            : headline.apparentTemperature < headline.temperature
            ? "The wind made it worse. It's fine now."
            : "About what it looked like."}
        </Note>
      </DetailCard>

      <DetailCard label="UV Index">
        <BigValue>{headline.uvIndex}</BigValue>
        <Note>{uvLabel(headline.uvIndex)} — too late for sunscreen.</Note>
      </DetailCard>

      <DetailCard label="Wind">
        <BigValue>
          {headline.windSpeed}
          <Unit> {speedUnitLabel(units)}</Unit>
        </BigValue>
        <Note>
          Blew from {windDirectionLabel(headline.windDirection)} · gusts {headline.windGusts}
        </Note>
      </DetailCard>

      <DetailCard label="Humidity">
        <BigValue>{headline.humidity}%</BigValue>
        <Note>That's how sticky it was.</Note>
      </DetailCard>

      <DetailCard label="Sunrise">
        <BigValue>{formatClock(headline.sunrise)}</BigValue>
        <Note>The sun already did this.</Note>
      </DetailCard>

      <DetailCard label="Sunset">
        <BigValue>{formatClock(headline.sunset)}</BigValue>
        <Note>And then it did this. Gone.</Note>
      </DetailCard>

      <DetailCard label="Visibility">
        <BigValue>{formatVisibility(headline.visibility, units)}</BigValue>
        <Note>
          {headline.visibility >= 10000
            ? "You could see for miles. Yesterday."
            : "Bit murky, as it turned out."}
        </Note>
      </DetailCard>

      <DetailCard label="Pressure">
        <BigValue className="text-2xl">{formatPressure(headline.pressure, units)}</BigValue>
        <Note>Cloud cover was {headline.cloudCover}%.</Note>
      </DetailCard>
    </div>
  );
}

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-3.5">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </h3>
      <div className="mt-1.5 flex min-h-[64px] flex-col justify-between">{children}</div>
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
    <p className={`text-[28px] font-medium leading-tight text-white ${className}`}>
      {children}
    </p>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-base font-normal text-white/80">{children}</span>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[12px] leading-snug text-white/70">{children}</p>;
}
