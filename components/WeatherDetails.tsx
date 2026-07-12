"use client";

import type { CurrentConditions, Units } from "@/lib/weather";
import { formatClock } from "@/lib/weather";
import {
  formatPressure,
  formatVisibility,
  speedUnitLabel,
  uvLabel,
  windDirectionLabel,
  humidityNote,
} from "@/lib/format";
import GlassCard from "./GlassCard";

export default function WeatherDetails({
  current,
  units,
}: {
  current: CurrentConditions;
  units: Units;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <DetailCard label="Feels Like">
        <BigValue>{current.apparentTemperature}°</BigValue>
        <Note>
          {current.apparentTemperature > current.temperature
            ? "Humidity is making it feel warmer."
            : current.apparentTemperature < current.temperature
            ? "Wind is making it feel cooler."
            : "Similar to the actual temperature."}
        </Note>
      </DetailCard>

      <DetailCard label="UV Index">
        <BigValue>{current.uvIndex}</BigValue>
        <Note>{uvLabel(current.uvIndex)}</Note>
      </DetailCard>

      <DetailCard label="Wind">
        <BigValue>
          {current.windSpeed}
          <Unit> {speedUnitLabel(units)}</Unit>
        </BigValue>
        <Note>
          From {windDirectionLabel(current.windDirection)} · Gusts {current.windGusts}
        </Note>
      </DetailCard>

      <DetailCard label="Humidity">
        <BigValue>{current.humidity}%</BigValue>
        <Note>{humidityNote(current.humidity)}</Note>
      </DetailCard>

      <DetailCard label="Sunrise">
        <BigValue>{formatClock(current.sunrise)}</BigValue>
        <Note>Sunset: {formatClock(current.sunset)}</Note>
      </DetailCard>

      <DetailCard label="Sunset">
        <BigValue>{formatClock(current.sunset)}</BigValue>
        <Note>Sunrise: {formatClock(current.sunrise)}</Note>
      </DetailCard>

      <DetailCard label="Visibility">
        <BigValue>{formatVisibility(current.visibility, units)}</BigValue>
        <Note>
          {current.visibility >= 10000
            ? "Perfectly clear view."
            : current.visibility >= 4000
            ? "Reasonably clear."
            : "Reduced visibility."}
        </Note>
      </DetailCard>

      <DetailCard label="Pressure">
        <BigValue className="text-2xl">{formatPressure(current.pressure, units)}</BigValue>
        <Note>Cloud cover {current.cloudCover}%</Note>
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
      <div className="mt-1.5 flex min-h-[64px] flex-col justify-between">
        {children}
      </div>
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
