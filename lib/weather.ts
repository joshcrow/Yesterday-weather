// Weather data layer for *Yesterday* — a weather app in reverse.
//
// Instead of a forecast, this fetches the RECENT PAST from Open-Meteo (free, no
// API key) using its `past_days` parameter, and presents it as if it were a
// normal weather app: a "current conditions" hero that's actually *yesterday*,
// an hourly strip that runs backward into the past, and a "last 10 days" list.
//
// Open-Meteo docs: https://open-meteo.com/en/docs

export type Units = "metric" | "imperial";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place extends Coordinates {
  name: string;
  admin1?: string;
  country?: string;
  timezone?: string;
}

export type IconKind =
  | "clear-day"
  | "clear-night"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "freezing-rain"
  | "snow"
  | "thunderstorm";

export interface HourEntry {
  kind: "hour" | "sunrise" | "sunset";
  time: string; // ISO local time, e.g. "2026-07-11T13:00"
  label: string; // "Now", "1PM", "Sunrise", ...
  temperature?: number;
  weatherCode?: number;
  icon?: IconKind;
  isDay?: boolean;
  precipitationProbability?: number;
}

export interface DayEntry {
  date: string; // "2026-07-11"
  dayLabel: string; // "Today", "Yesterday", "Mon", ...
  weatherCode: number;
  icon: IconKind;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  uvIndexMax: number;
}

/** The headline snapshot — yesterday, at this same hour. */
export interface Headline {
  dayLabel: string; // "Yesterday"
  date: string; // yesterday's date
  atHourLabel: string; // the current hour, e.g. "1PM"
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  description: string;
  icon: IconKind;
  isDay: boolean;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  pressure: number;
  precipitation: number;
  cloudCover: number;
  visibility: number; // meters
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  place: Place;
  units: Units;
  headline: Headline;
  yesterdayHigh: number;
  yesterdayLow: number;
  currentTemp: number; // today, right now — used only for the "Today" bar marker
  hourly: HourEntry[]; // past 24 hours, most-recent first
  daily: DayEntry[]; // today + previous days, most-recent first
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// WMO weather code interpretation
// ---------------------------------------------------------------------------

export function describeWeather(
  code: number,
  isDay: boolean
): { description: string; icon: IconKind } {
  const day = isDay;
  switch (code) {
    case 0:
      return { description: day ? "Sunny" : "Clear", icon: day ? "clear-day" : "clear-night" };
    case 1:
      return { description: "Mostly Clear", icon: day ? "partly-day" : "partly-night" };
    case 2:
      return { description: "Partly Cloudy", icon: day ? "partly-day" : "partly-night" };
    case 3:
      return { description: "Cloudy", icon: "cloudy" };
    case 45:
      return { description: "Fog", icon: "fog" };
    case 48:
      return { description: "Rime Fog", icon: "fog" };
    case 51:
      return { description: "Light Drizzle", icon: "drizzle" };
    case 53:
      return { description: "Drizzle", icon: "drizzle" };
    case 55:
      return { description: "Heavy Drizzle", icon: "drizzle" };
    case 56:
    case 57:
      return { description: "Freezing Drizzle", icon: "freezing-rain" };
    case 61:
      return { description: "Light Rain", icon: "rain" };
    case 63:
      return { description: "Rain", icon: "rain" };
    case 65:
      return { description: "Heavy Rain", icon: "rain" };
    case 66:
    case 67:
      return { description: "Freezing Rain", icon: "freezing-rain" };
    case 71:
      return { description: "Light Snow", icon: "snow" };
    case 73:
      return { description: "Snow", icon: "snow" };
    case 75:
      return { description: "Heavy Snow", icon: "snow" };
    case 77:
      return { description: "Snow Grains", icon: "snow" };
    case 80:
    case 81:
      return { description: "Rain Showers", icon: "showers" };
    case 82:
      return { description: "Heavy Showers", icon: "showers" };
    case 85:
    case 86:
      return { description: "Snow Showers", icon: "snow" };
    case 95:
      return { description: "Thunderstorms", icon: "thunderstorm" };
    case 96:
    case 99:
      return { description: "Thunderstorms", icon: "thunderstorm" };
    default:
      return { description: "—", icon: day ? "clear-day" : "clear-night" };
  }
}

// ---------------------------------------------------------------------------
// Time helpers — Open-Meteo times are already in the location's local timezone
// (timezone=auto), so we treat them as wall-clock strings.
// ---------------------------------------------------------------------------

function hourKey(iso: string): string {
  return iso.slice(0, 13);
}

function formatHourLabel(iso: string): string {
  const hour = parseInt(iso.slice(11, 13), 10);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function formatClock(iso: string): string {
  const hour = parseInt(iso.slice(11, 13), 10);
  const minute = iso.slice(14, 16);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${period}`;
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Fetch + normalize
// ---------------------------------------------------------------------------

const PAST_DAYS = 10;
const HOURS_BACK = 24;

function unitParams(units: Units): string {
  return units === "imperial"
    ? "temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
    : "temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
}

export async function fetchWeather(
  place: Place,
  units: Units = "metric"
): Promise<WeatherData> {
  // We still read `current` to locate "now" and to place the Today marker.
  const current = ["temperature_2m", "weather_code", "is_day"].join(",");

  const hourly = [
    "temperature_2m",
    "weather_code",
    "is_day",
    "precipitation_probability",
    "relative_humidity_2m",
    "apparent_temperature",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "pressure_msl",
    "cloud_cover",
    "precipitation",
    "visibility",
    "uv_index",
  ].join(",");

  const daily = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_probability_max",
  ].join(",");

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
    `&longitude=${place.longitude}` +
    `&current=${current}` +
    `&hourly=${hourly}` +
    `&daily=${daily}` +
    `&timezone=auto&past_days=${PAST_DAYS}&forecast_days=1&${unitParams(units)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather service returned ${res.status}`);
  }
  const raw = await res.json();
  return normalize(raw, place, units);
}

function normalize(raw: any, place: Place, units: Units): WeatherData {
  const h = raw.hourly;
  const d = raw.daily;
  const hTimes: string[] = h.time;
  const dTimes: string[] = d.time;

  // Locate "now" in the hourly series.
  const nowKey = hourKey(raw.current.time);
  let nowIdx = hTimes.findIndex((t) => hourKey(t) >= nowKey);
  if (nowIdx === -1) nowIdx = hTimes.length - 1;

  // Yesterday, at this same hour.
  const yIdx = Math.max(nowIdx - 24, 0);
  const yIsDay = h.is_day[yIdx] === 1;
  const yInfo = describeWeather(h.weather_code[yIdx], yIsDay);

  // Daily indices: with past_days + forecast_days=1, the last daily entry is today.
  const todayD = dTimes.length - 1;
  const yesterdayD = Math.max(dTimes.length - 2, 0);

  const headline: Headline = {
    dayLabel: "Yesterday",
    date: dTimes[yesterdayD],
    atHourLabel: formatHourLabel(raw.current.time),
    temperature: Math.round(h.temperature_2m[yIdx]),
    apparentTemperature: Math.round(h.apparent_temperature[yIdx]),
    weatherCode: h.weather_code[yIdx],
    description: yInfo.description,
    icon: yInfo.icon,
    isDay: yIsDay,
    humidity: Math.round(h.relative_humidity_2m[yIdx]),
    windSpeed: Math.round(h.wind_speed_10m[yIdx]),
    windDirection: h.wind_direction_10m[yIdx],
    windGusts: Math.round(h.wind_gusts_10m[yIdx]),
    pressure: Math.round(h.pressure_msl[yIdx]),
    precipitation: h.precipitation?.[yIdx] ?? 0,
    cloudCover: Math.round(h.cloud_cover[yIdx]),
    visibility: h.visibility?.[yIdx] ?? 0,
    uvIndex: Math.round(h.uv_index?.[yIdx] ?? 0),
    sunrise: d.sunrise[yesterdayD],
    sunset: d.sunset[yesterdayD],
  };

  // Hourly strip: the past 24 hours, most-recent first (so it reads backward).
  const stop = Math.max(nowIdx - HOURS_BACK, 0);
  const hourEntries: HourEntry[] = [];
  for (let i = nowIdx; i >= stop; i--) {
    const isDay = h.is_day[i] === 1;
    const code = h.weather_code[i];
    hourEntries.push({
      kind: "hour",
      time: hTimes[i],
      label: i === nowIdx ? "Now" : formatHourLabel(hTimes[i]),
      temperature: Math.round(h.temperature_2m[i]),
      weatherCode: code,
      icon: describeWeather(code, isDay).icon,
      isDay,
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
    });
  }

  // Splice in sunrise/sunset markers that fall inside the visible window.
  const windowStart = hTimes[stop];
  const windowEnd = hTimes[nowIdx];
  const sunEvents: HourEntry[] = [];
  for (const di of [todayD, yesterdayD]) {
    const sr: string | undefined = d.sunrise[di];
    const ss: string | undefined = d.sunset[di];
    if (sr && sr >= windowStart && sr <= windowEnd)
      sunEvents.push({ kind: "sunrise", time: sr, label: "Sunrise" });
    if (ss && ss >= windowStart && ss <= windowEnd)
      sunEvents.push({ kind: "sunset", time: ss, label: "Sunset" });
  }
  const hourly = [...hourEntries, ...sunEvents].sort((a, b) =>
    a.time > b.time ? -1 : a.time < b.time ? 1 : 0
  );

  // Daily list: today + previous days, most-recent first.
  const daily: DayEntry[] = [];
  for (let i = dTimes.length - 1; i >= 0; i--) {
    const code = d.weather_code[i];
    const label =
      i === todayD ? "Today" : i === todayD - 1 ? "Yesterday" : weekdayLabel(dTimes[i]);
    daily.push({
      date: dTimes[i],
      dayLabel: label,
      weatherCode: code,
      icon: describeWeather(code, true).icon,
      tempMax: Math.round(d.temperature_2m_max[i]),
      tempMin: Math.round(d.temperature_2m_min[i]),
      precipitationProbability: d.precipitation_probability_max?.[i] ?? 0,
      uvIndexMax: Math.round(d.uv_index_max?.[i] ?? 0),
    });
  }

  return {
    place,
    units,
    headline,
    yesterdayHigh: Math.round(d.temperature_2m_max[yesterdayD]),
    yesterdayLow: Math.round(d.temperature_2m_min[yesterdayD]),
    currentTemp: Math.round(raw.current.temperature_2m),
    hourly,
    daily,
    fetchedAt: raw.current.time,
  };
}
