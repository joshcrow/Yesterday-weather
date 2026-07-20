// Condition accents for the flat ink canvas.
//
// Unlike Apple Weather, the page background never becomes a sky. The condition
// tints exactly one thing: a soft radial glow behind the Yesterday hero, so the
// weather still registers emotionally without the app wearing it everywhere.

import type { IconKind } from "./weather";

/** rgba() color for the hero's radial glow. Keep alphas low — it's an accent. */
export function glowFor(icon: IconKind, isDay: boolean): string {
  switch (icon) {
    case "clear-day":
      return "rgba(245, 158, 11, 0.20)";
    case "partly-day":
      return "rgba(245, 158, 11, 0.15)";
    case "clear-night":
    case "partly-night":
      return "rgba(99, 102, 241, 0.16)";
    case "cloudy":
      return isDay ? "rgba(148, 163, 184, 0.14)" : "rgba(100, 116, 139, 0.12)";
    case "fog":
      return "rgba(148, 163, 184, 0.12)";
    case "drizzle":
    case "rain":
    case "showers":
      return "rgba(14, 116, 233, 0.16)";
    case "freezing-rain":
    case "snow":
      return "rgba(186, 210, 235, 0.14)";
    case "thunderstorm":
      return "rgba(139, 92, 246, 0.18)";
    default:
      return "rgba(148, 163, 184, 0.12)";
  }
}
