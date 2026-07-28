"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Place, Units, WeatherData } from "@/lib/weather";
import { fetchWeather } from "@/lib/weather";
import { reverseGeocode } from "@/lib/geocode";
import Header from "./Header";
import YesterdayHero from "./YesterdayHero";
import NowStrip from "./NowStrip";
import WaterLedger from "./WaterLedger";
import TimelineChart from "./TimelineChart";
import Ledger from "./Ledger";
import NumbersGrid from "./NumbersGrid";
import RadarPanel from "./RadarPanel";

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
        e instanceof Error ? e.message : "Could not load the weather. Please try again."
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
      // Keep the URL shareable: ?lat=…&lon=…&name=… mirrors the current place.
      try {
        const q = new URLSearchParams({
          lat: p.latitude.toFixed(4),
          lon: p.longitude.toFixed(4),
          name: p.name,
        });
        if (p.admin1) q.set("admin1", p.admin1);
        if (p.country) q.set("country", p.country);
        window.history.replaceState(null, "", `?${q.toString()}`);
      } catch {
        /* ignore */
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

    // A shared link wins over everything: ?lat&lon&name pins the place.
    try {
      const q = new URLSearchParams(window.location.search);
      const lat = parseFloat(q.get("lat") ?? "");
      const lon = parseFloat(q.get("lon") ?? "");
      const name = q.get("name");
      if (Number.isFinite(lat) && Number.isFinite(lon) && name) {
        selectPlace(
          {
            name,
            latitude: lat,
            longitude: lon,
            admin1: q.get("admin1") ?? undefined,
            country: q.get("country") ?? undefined,
          },
          initialUnits
        );
        return;
      }
    } catch {
      /* ignore */
    }

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
  }, [geolocate, load, selectPlace]);

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

  return (
    <main className="min-h-screen w-full">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-12 pt-6 sm:px-6">
        <Header
          onSelect={(p) => selectPlace(p, units)}
          onUseLocation={() => geolocate(units)}
          units={units}
          onToggleUnits={toggleUnits}
          busy={loading}
        />

        {loading && !data && <LoadingScreen />}

        {error && !data && (
          <ErrorScreen message={error} onRetry={() => place && load(place, units)} />
        )}

        {data && (
          // On refetch, hold the previous render at reduced opacity — no flash.
          <div
            className={`animate-slide-up mt-6 transition-opacity duration-300 ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="flex flex-col gap-4 lg:col-span-5">
                <YesterdayHero data={data} />
                <NowStrip now={data.now} units={units} />
                <WaterLedger water={data.water} units={units} />
              </div>

              <div className="flex flex-col gap-4 lg:col-span-7">
                <TimelineChart
                  timeline={data.timeline}
                  nowIndex={data.nowIndex}
                  nights={data.nights}
                  units={units}
                  past24Precip={data.past24Precip}
                />
                <Ledger
                  hindsight={data.hindsight}
                  foresight={data.foresight}
                  tempDomain={data.tempDomain}
                  currentTemp={data.now.temperature}
                  units={units}
                />
              </div>
            </div>

            <div className="mt-4">
              <RadarPanel
                place={data.place}
                yesterdayDate={data.headline.date}
                utcOffsetSeconds={data.utcOffsetSeconds}
                units={units}
              />
            </div>

            <div className="mt-4">
              <NumbersGrid
                headline={data.headline}
                units={units}
                precipTotal={data.yesterdayPrecipTotal}
                precipProb={data.yesterdayPrecipProb}
              />
            </div>

            {error && (
              <p className="mt-4 text-center text-sm text-past-text">
                Couldn&apos;t refresh: {error}
              </p>
            )}

            <footer className="mt-10 border-t border-ink-line pt-5 text-center text-[11.5px] text-paper-faint">
              <a
                href="/about"
                className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
              >
                Why yesterday?
              </a>{" "}
              · Hindsight is 20/20. Foresight now included, reluctantly. Data by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
              >
                Open-Meteo
              </a>
              . Radar by{" "}
              <a
                href="https://mesonet.agron.iastate.edu/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
              >
                NOAA/IEM
              </a>{" "}
              &amp;{" "}
              <a
                href="https://www.rainviewer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
              >
                RainViewer
              </a>
              .
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-28 text-paper-dim">
      <svg viewBox="0 0 24 24" className="h-9 w-9 animate-spin" aria-hidden="true">
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-28 text-center">
      <p className="max-w-xs text-sm text-paper-dim">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-xl border border-ink-line bg-white/[0.06] px-5 py-2 font-display text-sm font-semibold text-paper transition-colors hover:bg-white/[0.1]"
      >
        Try again
      </button>
    </div>
  );
}
