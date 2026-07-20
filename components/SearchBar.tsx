"use client";

import { useEffect, useRef, useState } from "react";
import type { Place, Units } from "@/lib/weather";
import { searchPlaces } from "@/lib/geocode";

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
    <div className="relative z-30 flex items-center gap-2">
      <div ref={boxRef} className="relative flex-1">
        <div className="flex items-center gap-2.5 rounded-xl border border-ink-line bg-white/[0.05] px-3.5 py-2.5 transition-colors focus-within:border-past-text/50">
          <SearchGlyph className="h-4 w-4 shrink-0 text-paper-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Search for a city"
            className="w-full bg-transparent text-[15px] text-paper placeholder-paper-faint outline-none"
            aria-label="Search for a city"
          />
          {searching && <Spinner className="h-4 w-4 shrink-0 text-paper-faint" />}
        </div>

        {open && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-ink-line bg-[#0E1219]/95 shadow-2xl backdrop-blur-sm">
            {results.map((p, i) => (
              <li key={`${p.latitude},${p.longitude},${i}`}>
                <button
                  onClick={() => choose(p)}
                  className="flex w-full items-center justify-between border-b border-ink-line px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.06]"
                >
                  <span className="text-[14px] font-medium text-paper">{p.name}</span>
                  <span className="ml-3 truncate text-xs text-paper-faint">
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
        className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-ink-line bg-white/[0.05] transition-colors hover:bg-white/[0.1] disabled:opacity-50"
      >
        <LocationGlyph className="h-[17px] w-[17px] text-paper-dim" />
      </button>

      <button
        onClick={onToggleUnits}
        title="Toggle temperature units"
        aria-label="Toggle temperature units"
        className="grid h-[42px] shrink-0 place-items-center rounded-xl border border-ink-line bg-white/[0.05] px-3 font-display text-sm font-semibold text-paper transition-colors hover:bg-white/[0.1]"
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
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
