"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Place, Units, WeatherData } from "@/lib/weather";
import { fetchWeather } from "@/lib/weather";
import { formatPrecip } from "@/lib/format";
import { reverseGeocode } from "@/lib/geocode";
import { themeFor } from "@/lib/theme";
import SearchBar from "./SearchBar";
import CurrentWeather from "./CurrentWeather";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import WeatherDetails from "./WeatherDetails";

const DEFAULT_PLACE: Place = {
  name: "New York",
  admin1: "New York",
  country: "United States",
  latitude: 40.7128,
  longitude: -74.006,
};

const PLACE_KEY = "yw:place";
const UNITS_KEY = "yw:units";

export default function WeatherApp() {
  const [units, setUnits] = useState<Units>("imperial");
  const [place, setPlace] = useState<Place | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);
  const placeRef = useRef<Place | null>(null);

  const load = useCallback(async (p: Place, u: Units) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchWeather(p, u);
      setData(d);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the forecast. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPlace = useCallback(
    (p: Place, u: Units) => {
      placeRef.current = p;
      setPlace(p);
      try {
        localStorage.setItem(PLACE_KEY, JSON.stringify(p));
      } catch {
        /* ignore storage errors (private mode, etc.) */
      }
      load(p, u);
    },
    [load]
  );

  const geolocate = useCallback(
    (u: Units) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        selectPlace(DEFAULT_PLACE, u);
        return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const p = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          selectPlace(p, u);
        },
        () => {
          // Permission denied or unavailable — fall back so the app still works.
          if (placeRef.current) setLoading(false);
          else selectPlace(DEFAULT_PLACE, u);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
      );
    },
    [selectPlace]
  );

  // Bootstrap once: restore saved prefs, else geolocate, else default city.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let initialUnits: Units = "imperial";
    try {
      const su = localStorage.getItem(UNITS_KEY);
      if (su === "metric" || su === "imperial") initialUnits = su;
    } catch {
      /* ignore */
    }
    setUnits(initialUnits);

    try {
      const sp = localStorage.getItem(PLACE_KEY);
      if (sp) {
        const p = JSON.parse(sp) as Place;
        placeRef.current = p;
        setPlace(p);
        load(p, initialUnits);
        return;
      }
    } catch {
      /* ignore */
    }
    geolocate(initialUnits);
  }, [geolocate, load]);

  const toggleUnits = useCallback(() => {
    const next: Units = units === "metric" ? "imperial" : "metric";
    setUnits(next);
    try {
      localStorage.setItem(UNITS_KEY, next);
    } catch {
      /* ignore */
    }
    if (place) load(place, next);
  }, [units, place, load]);

  const theme = useMemo(() => {
    if (data) return themeFor(data.headline.icon, data.headline.isDay);
    return { gradient: "from-slate-800 via-slate-900 to-slate-950", dark: true };
  }, [data]);

  const summary = useMemo(
    () => (data ? hourlySummary(data.past24Precip, units) : undefined),
    [data, units]
  );

  return (
    <main
      className={`bg-transition min-h-screen w-full bg-gradient-to-b ${theme.gradient}`}
    >
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10 pt-5">
        <SearchBar
          onSelect={(p) => selectPlace(p, units)}
          onUseLocation={() => geolocate(units)}
          units={units}
          onToggleUnits={toggleUnits}
          busy={loading}
        />

        <p className="mt-3 text-center text-[13px] font-medium text-white/70">
          The weather report that&apos;s always a day too late.
        </p>

        {loading && !data && <LoadingScreen />}

        {error && !data && (
          <ErrorScreen message={error} onRetry={() => place && load(place, units)} />
        )}

        {data && (
          <div className="animate-slide-up">
            <CurrentWeather data={data} />
            <TomorrowCard />
            <HourlyForecast hours={data.hourly} summary={summary} />
            <DailyForecast days={data.daily} currentTemp={data.currentTemp} units={units} />
            <WeatherDetails
              headline={data.headline}
              units={units}
              precipTotal={data.yesterdayPrecipTotal}
              precipProb={data.yesterdayPrecipProb}
            />

            {error && (
              <p className="mt-4 text-center text-sm text-amber-200/90">
                Couldn&apos;t refresh yesterday: {error}
              </p>
            )}

            <footer className="mt-8 text-center text-xs text-white/50">
              Hindsight is 20/20. Data (from the past) by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/30 underline-offset-2 hover:text-white/70"
              >
                Open-Meteo
              </a>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}

/** An informative recap of precipitation over the last 24 hours. */
function hourlySummary(past24Precip: number, units: Units): string {
  if (past24Precip > 0) {
    return `${formatPrecip(past24Precip, units)} of precipitation over the last 24 hours.`;
  }
  return "No precipitation in the last 24 hours.";
}

/** The punchline: a forecast card that refuses to forecast. */
function TomorrowCard() {
  return (
    <div className="mt-4 overflow-hidden rounded-3xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-white/60">
        <span aria-hidden="true">🔮</span>
        Tomorrow&apos;s Forecast
      </div>
      <p className="mt-2 text-[22px] font-medium text-white">Unavailable.</p>
      <p className="mt-1 text-[13px] leading-snug text-white/70">
        We only report weather that has already happened. For the future, try
        literally any other weather app.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-white/80">
      <svg viewBox="0 0 24 24" className="h-10 w-10 animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <p className="text-sm">Rewinding the weather…</p>
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center text-white">
      <p className="max-w-xs text-sm text-white/80">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold ring-1 ring-white/25 transition-colors hover:bg-white/30"
      >
        Try again
      </button>
    </div>
  );
}
