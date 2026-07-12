// Small presentation helpers for units and labels.

import type { Units } from "./weather";

export function degrees(n: number): string {
  return `${Math.round(n)}°`;
}

export function tempUnitLabel(units: Units): string {
  return units === "imperial" ? "°F" : "°C";
}

export function speedUnitLabel(units: Units): string {
  return units === "imperial" ? "mph" : "km/h";
}

export function formatVisibility(meters: number, units: Units): string {
  if (units === "imperial") {
    const miles = meters / 1609.34;
    return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatPressure(hPa: number, units: Units): string {
  if (units === "imperial") {
    return `${(hPa * 0.02953).toFixed(2)} inHg`;
  }
  return `${Math.round(hPa)} hPa`;
}

export function precipUnitLabel(units: Units): string {
  return units === "imperial" ? "in" : "mm";
}

export function formatPrecip(value: number, units: Units): string {
  const unit = precipUnitLabel(units);
  if (!value || value <= 0) return `0 ${unit}`;
  return units === "imperial"
    ? `${value.toFixed(2)} ${unit}`
    : `${value.toFixed(1)} ${unit}`;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function windDirectionLabel(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

export function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function humidityNote(humidity: number): string {
  if (humidity >= 80) return "Very humid right now.";
  if (humidity >= 60) return "Fairly humid.";
  if (humidity <= 30) return "The air is dry.";
  return "Comfortable humidity.";
}
