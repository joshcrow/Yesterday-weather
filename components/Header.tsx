"use client";

import type { Place, Units } from "@/lib/weather";
import SearchBar from "./SearchBar";

interface Props {
  onSelect: (place: Place) => void;
  onUseLocation: () => void;
  units: Units;
  onToggleUnits: () => void;
  busy?: boolean;
}

export default function Header(props: Props) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="shrink-0">
        <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-paper">
          Yesterday<span className="text-past-text">°</span>
        </p>
        <p className="mt-1.5 font-display text-[10px] font-medium uppercase tracking-[0.28em] text-paper-faint">
          Hindsight-first weather
        </p>
      </div>
      <div className="w-full md:max-w-xl">
        <SearchBar {...props} />
      </div>
    </header>
  );
}
