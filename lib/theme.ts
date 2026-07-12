// Maps the current conditions to a full-screen background gradient, mirroring
// the way Apple Weather tints the whole screen by weather + time of day.

import type { IconKind } from "./weather";

export interface Theme {
  // Tailwind gradient utility classes for the page background.
  gradient: string;
  // Whether foreground text should assume a dark backdrop (it always does here,
  // but this keeps the door open for light themes later).
  dark: boolean;
}

export function themeFor(icon: IconKind, isDay: boolean): Theme {
  switch (icon) {
    case "clear-day":
      return { gradient: "from-sky-400 via-sky-500 to-blue-600", dark: true };
    case "partly-day":
      return { gradient: "from-sky-400 via-blue-500 to-blue-700", dark: true };
    case "clear-night":
      return { gradient: "from-slate-900 via-indigo-950 to-slate-950", dark: true };
    case "partly-night":
      return { gradient: "from-slate-800 via-slate-900 to-indigo-950", dark: true };
    case "cloudy":
      return isDay
        ? { gradient: "from-slate-400 via-slate-500 to-slate-700", dark: true }
        : { gradient: "from-slate-700 via-slate-800 to-slate-950", dark: true };
    case "fog":
      return isDay
        ? { gradient: "from-slate-400 via-slate-500 to-slate-600", dark: true }
        : { gradient: "from-slate-700 via-slate-800 to-slate-900", dark: true };
    case "drizzle":
    case "rain":
    case "showers":
      return isDay
        ? { gradient: "from-slate-500 via-slate-600 to-blue-900", dark: true }
        : { gradient: "from-slate-800 via-slate-900 to-blue-950", dark: true };
    case "freezing-rain":
    case "snow":
      return isDay
        ? { gradient: "from-slate-400 via-slate-500 to-blue-600", dark: true }
        : { gradient: "from-slate-600 via-slate-700 to-slate-900", dark: true };
    case "thunderstorm":
      return { gradient: "from-slate-700 via-slate-900 to-indigo-950", dark: true };
    default:
      return { gradient: "from-sky-500 to-blue-700", dark: true };
  }
}
