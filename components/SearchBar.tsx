"use client";

import { useEffect, useRef, useState } from "react";
import type { Place, Units } from "@/lib/weather";
import { searchPlaces, formatPlaceLabel } from "@/lib/geocode";

interface Props {
  onSelect: (place: Place) => void;
  onUseLocation: () => void;
  units: Units;
  onToggleUnits: () => void;
  busy?: boolean;
}

export default function SearchBar({
  onSelect,
  onUseLocation,
  units,
  onToggleUnits,
  busy,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await searchPlaces(q);
        if (!cancelled) {
          setResults(found);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(place: Place) {
    onSelect(place);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative z-20 flex items-center gap-2">
      <div ref={boxRef} className="relative flex-1">
        <div className="flex items-center gap-2 rounded-full bg-black/25 px-4 py-2.5 backdrop-blur-md ring-1 ring-white/20">
          <SearchGlyph className="h-4 w-4 shrink-0 text-white/85" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Search for a city"
            className="w-full bg-transparent text-[15px] text-white placeholder-white/75 outline-none"
            aria-label="Search for a city"
          />
          {searching && <Spinner className="h-4 w-4 shrink-0 text-white/85" />}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/15 shadow-2xl">
            {results.map((p, i) => (
              <li key={`${p.latitude},${p.longitude},${i}`}>
                <button
                  onClick={() => choose(p)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  <span className="text-[15px] font-medium">{p.name}</span>
                  <span className="ml-3 truncate text-xs text-white/70">
                    {[p.admin1, p.country].filter(Boolean).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onUseLocation}
        disabled={busy}
        title="Use my location"
        aria-label="Use my location"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/25 backdrop-blur-md ring-1 ring-white/20 transition-colors hover:bg-black/40 disabled:opacity-50"
      >
        <LocationGlyph className="h-[18px] w-[18px] text-white" />
      </button>

      <button
        onClick={onToggleUnits}
        title="Toggle temperature units"
        aria-label="Toggle temperature units"
        className="grid h-10 shrink-0 place-items-center rounded-full bg-black/25 px-3 text-sm font-semibold text-white backdrop-blur-md ring-1 ring-white/20 transition-colors hover:bg-black/40"
      >
        {units === "imperial" ? "°F" : "°C"}
      </button>
    </div>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocationGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2v2.05A8 8 0 0 0 4.05 12H2v0h2.05A8 8 0 0 0 12 19.95V22h0v-2.05A8 8 0 0 0 19.95 12H22h-2.05A8 8 0 0 0 12 4.05V2z"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className ?? ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
