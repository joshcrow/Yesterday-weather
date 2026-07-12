// Weather data layer — fetches from Open-Meteo (free, no API key required)
// and normalizes it into a shape the UI can render.
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
  time: string; // ISO local time, e.g. "2026-07-12T13:00"
  label: string; // "Now", "1PM", "Sunrise", ...
  temperature?: number;
  weatherCode?: number;
  icon?: IconKind;
  isDay?: boolean;
  precipitationProbability?: number;
}

export interface DayEntry {
  date: string; // "2026-07-12"
  dayLabel: string; // "Today", "Mon", ...
  weatherCode: number;
  icon: IconKind;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  uvIndexMax: number;
}

export interface CurrentConditions {
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
  current: CurrentConditions;
  todayHigh: number;
  todayLow: number;
  hourly: HourEntry[];
  daily: DayEntry[];
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// WMO weather code interpretation
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
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
      return { description: "Rain Showers", icon: "showers" };
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
// Time helpers — all Open-Meteo times are already in the location's local
// timezone (we request timezone=auto), so we treat them as wall-clock strings
// and never let the browser's own timezone re-interpret them.
// ---------------------------------------------------------------------------

/** The "YYYY-MM-DDTHH" prefix used for safe lexical comparison of local hours. */
function hourKey(iso: string): string {
  return iso.slice(0, 13);
}

/** Format an ISO local time like "2026-07-12T13:00" into "1PM" (or "Now"). */
function formatHourLabel(iso: string): string {
  const hour = parseInt(iso.slice(11, 13), 10);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

/** Format an ISO local time like "2026-07-12T06:41" into "6:41 AM". */
export function formatClock(iso: string): string {
  const hour = parseInt(iso.slice(11, 13), 10);
  const minute = iso.slice(14, 16);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${period}`;
}

/** Weekday label for a "YYYY-MM-DD" date, e.g. "Mon". */
function weekdayLabel(dateStr: string): string {
  // Append midday to avoid any date rollover; interpret as local calendar date.
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// ---------------------------------------------------------------------------
// Fetch + normalize
// ---------------------------------------------------------------------------

const FORECAST_DAYS = 10;
const HOURS_AHEAD = 24;

function unitParams(units: Units): string {
  return units === "imperial"
    ? "temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
    : "temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
}

export async function fetchWeather(
  place: Place,
  units: Units = "metric"
): Promise<WeatherData> {
  const current = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "is_day",
    "precipitation",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
  ].join(",");

  const hourly = [
    "temperature_2m",
    "weather_code",
    "is_day",
    "precipitation_probability",
    "uv_index",
    "visibility",
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
    `&timezone=auto&forecast_days=${FORECAST_DAYS}&${unitParams(units)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather service returned ${res.status}`);
  }
  const raw = await res.json();

  return normalize(raw, place, units);
}

function normalize(raw: any, place: Place, units: Units): WeatherData {
  const nowTime: string = raw.current.time; // local, e.g. "2026-07-12T11:45"
  const nowKey = hourKey(nowTime);

  // --- Locate the CURRENT hour in the hourly arrays. ------------------------
  // This is the core of the "forecast, not history" fix: we start the hourly
  // strip at the current hour instead of at midnight, so users never see hours
  // that have already passed today.
  const hTimes: string[] = raw.hourly.time;
  let startIdx = hTimes.findIndex((t) => hourKey(t) >= nowKey);
  if (startIdx === -1) startIdx = 0;

  const isDayNow = raw.current.is_day === 1;
  const { description, icon } = describeWeather(raw.current.weather_code, isDayNow);

  // Current visibility / UV aren't in the "current" block, so read them from
  // the current hour of the hourly series.
  const visibility = raw.hourly.visibility?.[startIdx] ?? 0;
  const uvIndex = raw.hourly.uv_index?.[startIdx] ?? 0;

  const todaySunrise: string = raw.daily.sunrise[0];
  const todaySunset: string = raw.daily.sunset[0];

  const current: CurrentConditions = {
    temperature: Math.round(raw.current.temperature_2m),
    apparentTemperature: Math.round(raw.current.apparent_temperature),
    weatherCode: raw.current.weather_code,
    description,
    icon,
    isDay: isDayNow,
    humidity: Math.round(raw.current.relative_humidity_2m),
    windSpeed: Math.round(raw.current.wind_speed_10m),
    windDirection: raw.current.wind_direction_10m,
    windGusts: Math.round(raw.current.wind_gusts_10m),
    pressure: Math.round(raw.current.pressure_msl),
    precipitation: raw.current.precipitation,
    cloudCover: Math.round(raw.current.cloud_cover),
    visibility,
    uvIndex: Math.round(uvIndex),
    sunrise: todaySunrise,
    sunset: todaySunset,
  };

  // --- Hourly strip: current hour + next 24 hours. --------------------------
  const hourEntries: HourEntry[] = [];
  const end = Math.min(startIdx + HOURS_AHEAD + 1, hTimes.length);
  for (let i = startIdx; i < end; i++) {
    const t = hTimes[i];
    const isDay = raw.hourly.is_day[i] === 1;
    const code = raw.hourly.weather_code[i];
    hourEntries.push({
      kind: "hour",
      time: t,
      label: i === startIdx ? "Now" : formatHourLabel(t),
      temperature: Math.round(raw.hourly.temperature_2m[i]),
      weatherCode: code,
      icon: describeWeather(code, isDay).icon,
      isDay,
      precipitationProbability: raw.hourly.precipitation_probability?.[i] ?? 0,
    });
  }

  // Splice sunrise/sunset markers into the hourly strip (an Apple Weather
  // signature). Only include sun events that fall inside the visible window.
  const windowStart = hourEntries[0]?.time ?? nowTime;
  const windowEnd = hourEntries[hourEntries.length - 1]?.time ?? nowTime;
  const sunEvents: HourEntry[] = [];
  for (let d = 0; d < 2; d++) {
    const sr: string | undefined = raw.daily.sunrise[d];
    const ss: string | undefined = raw.daily.sunset[d];
    if (sr && sr >= windowStart && sr <= windowEnd) {
      sunEvents.push({ kind: "sunrise", time: sr, label: "Sunrise" });
    }
    if (ss && ss >= windowStart && ss <= windowEnd) {
      sunEvents.push({ kind: "sunset", time: ss, label: "Sunset" });
    }
  }
  const hourlyMerged = [...hourEntries, ...sunEvents].sort((a, b) =>
    a.time < b.time ? -1 : a.time > b.time ? 1 : 0
  );

  // --- Daily forecast: today through day 10. --------------------------------
  const dTimes: string[] = raw.daily.time;
  const daily: DayEntry[] = dTimes.map((date, i) => {
    const code = raw.daily.weather_code[i];
    return {
      date,
      dayLabel: i === 0 ? "Today" : weekdayLabel(date),
      weatherCode: code,
      icon: describeWeather(code, true).icon,
      tempMax: Math.round(raw.daily.temperature_2m_max[i]),
      tempMin: Math.round(raw.daily.temperature_2m_min[i]),
      precipitationProbability: raw.daily.precipitation_probability_max?.[i] ?? 0,
      uvIndexMax: Math.round(raw.daily.uv_index_max?.[i] ?? 0),
    };
  });

  return {
    place,
    units,
    current,
    todayHigh: Math.round(raw.daily.temperature_2m_max[0]),
    todayLow: Math.round(raw.daily.temperature_2m_min[0]),
    hourly: hourlyMerged,
    daily,
    fetchedAt: nowTime,
  };
}
