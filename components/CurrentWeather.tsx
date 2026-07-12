"use client";

import type { WeatherData } from "@/lib/weather";
import { formatPlaceLabel } from "@/lib/geocode";
import WeatherIcon from "./WeatherIcon";

export default function CurrentWeather({ data }: { data: WeatherData }) {
  const { place, current, todayHigh, todayLow } = data;

  return (
    <section className="flex flex-col items-center pt-8 pb-6 text-center text-white animate-fade-in">
      <h1 className="text-[26px] font-semibold tracking-tight drop-shadow-sm">
        {formatPlaceLabel(place)}
      </h1>

      <WeatherIcon
        icon={current.icon}
        title={current.description}
        className="mt-3 h-24 w-24 drop-shadow-lg"
      />

      <div className="mt-1 flex items-start">
        <span className="text-[88px] font-thin leading-none tracking-tighter drop-shadow-md">
          {current.temperature}
        </span>
        <span className="mt-2 text-4xl font-thin">°</span>
      </div>

      <p className="-mt-1 text-xl font-medium drop-shadow-sm">
        {current.description}
      </p>

      <p className="mt-1 text-[15px] font-medium text-white/90">
        H:{todayHigh}°&nbsp;&nbsp;L:{todayLow}°
      </p>

      <p className="mt-0.5 text-sm text-white/80">
        Feels like {current.apparentTemperature}°
      </p>
    </section>
  );
}
