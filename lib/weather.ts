// Weather data layer for Yesterday° — the weather ledger.
//
// One Open-Meteo request (free, no API key) covers the whole timeline:
// `past_days=10` for hindsight, `forecast_days=8` for foresight. The app leads
// with yesterday (the brand), shows now in passing, and charts a continuous
// 48-hour window — 24h observed behind, 24h expected ahead.
//
// Open-Meteo docs: https://open-meteo.com/en/docs

export type Units = "metric" | "imperial";
export type Phase = "past" | "today" | "future";

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

/** One hourly sample on the 48-hour timeline (or inside a day breakdown). */
export interface TimelinePoint {
  time: string; // ISO local wall-clock, e.g. "2026-07-19T13:00"
  label: string; // "1PM" ("Now" at the pivot)
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  icon: IconKind;
  isDay: boolean;
  observed: boolean; // true = happened; false = expected
}

export interface DayEntry {
  date: string; // "2026-07-19"
  dayLabel: string; // "Yesterday", "Today", "Tomorrow", "Mon", ...
  subLabel: string; // "Jul 19"
  phase: Phase;
  weatherCode: number;
  icon: IconKind;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitationProbability: number;
  precipitationSum: number;
  uvIndexMax: number;
  windMax: number;
  windGustsMax: number;
  windDirDominant: number;
  sunrise: string;
  sunset: string;
  hours: TimelinePoint[]; // full day; for today, only up to "now" is observed
}

/** The headline snapshot — yesterday, at this same hour. */
export interface Headline {
  date: string;
  atHourLabel: string;
  temperature: number;
  apparentTemperature: number;
  description: string;
  icon: IconKind;
  isDay: boolean;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  pressure: number;
  cloudCover: number;
  visibility: number; // meters
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

/** Right now — rendered small, on purpose. */
export interface NowConditions {
  temperature: number;
  apparentTemperature: number;
  description: string;
  icon: IconKind;
  isDay: boolean;
  humidity: number;
  windSpeed: number;
}

/** A local night interval [sunset, next sunrise] for chart shading. */
export interface NightSpan {
  start: string;
  end: string;
}

// ---------------------------------------------------------------------------
// The water ledger — rain in, evaporation out, and whether the sky's got the
// next round covered. ET₀ (FAO-56 reference evapotranspiration) folds heat,
// sun, wind, and humidity into one "water drawn back out" number.
// ---------------------------------------------------------------------------

export type WaterState =
  | "soaked" // real rain in the last 24h
  | "holding" // recent rain still outweighs what evaporated
  | "rain-soon" // dry, but meaningful rain expected by tomorrow
  | "steady" // little in, little out
  | "drying" // deficit building
  | "parched"; // long dry stretch, big deficit

export interface WaterDay {
  date: string;
  label: string; // "M", "T", ... then "Tdy", "Tmw"
  phase: Phase;
  rain: number; // observed for past; expected sum for today/tomorrow
  et0: number; // drawn out (0 for today/tomorrow — day isn't done)
}

/** A mark yesterday left behind — rendered only when it actually happened. */
export interface ConsequenceFlag {
  kind: "froze" | "scorcher" | "gusty" | "snowed";
  label: string; // "Froze overnight"
  detail: string; // "L 28°"
}

export interface WaterLedger {
  days: WaterDay[]; // last 7 days + today + tomorrow
  rain24: number; // rolling last 24h (hourly)
  rain3: number; // last 3 calendar days
  rain7: number;
  et3: number;
  et7: number;
  daysSinceRain: number | null; // 1 = yesterday; null = none in 10 days
  upcomingRain: number; // expected today + tomorrow
  upcomingMaxProb: number;
  nextWetLabel: string | null; // first foresight day with a real chance
  state: WaterState;
}

export interface WeatherData {
  place: Place;
  units: Units;
  headline: Headline;
  now: NowConditions;
  yesterdayHigh: number;
  yesterdayLow: number;
  yesterdayPrecipTotal: number;
  yesterdayPrecipProb: number;
  past24Precip: number;
  timeline: TimelinePoint[]; // -24h .. +24h, chronological
  nowIndex: number; // index of the pivot inside `timeline`
  nights: NightSpan[]; // night intervals overlapping the timeline window
  hindsight: DayEntry[]; // yesterday .. -7, most recent first
  foresight: DayEntry[]; // today .. +7, chronological
  tempDomain: { min: number; max: number }; // across every ledger day
  water: WaterLedger;
  flags: ConsequenceFlag[]; // yesterday's notable marks (often empty)
  utcOffsetSeconds: number; // the place's offset (timezone=auto), for the radar clock
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
// Time helpers — Open-Meteo returns the location's local wall-clock times
// (timezone=auto). We never let the browser's own timezone reinterpret them:
// comparisons are lexical, arithmetic uses a wall-clock pseudo-epoch.
// ---------------------------------------------------------------------------

function hourKey(iso: string): string {
  return iso.slice(0, 13);
}

export function formatHourLabel(iso: string): string {
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

/** Minutes since a fixed origin, treating the ISO string as wall-clock. */
export function wallMinutes(iso: string): number {
  const y = +iso.slice(0, 4);
  const mo = +iso.slice(5, 7);
  const d = +iso.slice(8, 10);
  const h = +iso.slice(11, 13);
  const mi = +(iso.slice(14, 16) || 0);
  return Date.UTC(y, mo - 1, d, h, mi) / 60000;
}

function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export function monthDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Fetch + normalize
// ---------------------------------------------------------------------------

const PAST_DAYS = 10;
const FORECAST_DAYS = 8;
const CHART_HOURS = 24; // each side of "now"

function unitParams(units: Units): string {
  return units === "imperial"
    ? "temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
    : "temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
}

export async function fetchWeather(
  place: Place,
  units: Units = "imperial"
): Promise<WeatherData> {
  const current = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "weather_code",
    "is_day",
    "wind_speed_10m",
  ].join(",");

  const hourly = [
    "temperature_2m",
    "weather_code",
    "is_day",
    "precipitation_probability",
    "precipitation",
    "relative_humidity_2m",
    "apparent_temperature",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "pressure_msl",
    "cloud_cover",
    "visibility",
    "uv_index",
  ].join(",");

  const daily = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "uv_index_max",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
    "et0_fao_evapotranspiration",
    "snowfall_sum",
  ].join(",");

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
    `&longitude=${place.longitude}` +
    `&current=${current}` +
    `&hourly=${hourly}` +
    `&daily=${daily}` +
    `&timezone=auto&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}` +
    `&${unitParams(units)}`;

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

  const todayDate = raw.current.time.slice(0, 10);
  let todayD = dTimes.indexOf(todayDate);
  if (todayD === -1) todayD = PAST_DAYS; // structural fallback
  const yesterdayD = Math.max(todayD - 1, 0);

  const point = (i: number, observed: boolean, label?: string): TimelinePoint => {
    const isDay = h.is_day[i] === 1;
    const code = h.weather_code[i];
    return {
      time: hTimes[i],
      label: label ?? formatHourLabel(hTimes[i]),
      temperature: Math.round(h.temperature_2m[i]),
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
      weatherCode: code,
      icon: describeWeather(code, isDay).icon,
      isDay,
      observed,
    };
  };

  // --- Headline: yesterday at this hour. -----------------------------------
  const yIdx = Math.max(nowIdx - 24, 0);
  const yIsDay = h.is_day[yIdx] === 1;
  const yInfo = describeWeather(h.weather_code[yIdx], yIsDay);
  const headline: Headline = {
    date: dTimes[yesterdayD],
    atHourLabel: formatHourLabel(raw.current.time),
    temperature: Math.round(h.temperature_2m[yIdx]),
    apparentTemperature: Math.round(h.apparent_temperature[yIdx]),
    description: yInfo.description,
    icon: yInfo.icon,
    isDay: yIsDay,
    humidity: Math.round(h.relative_humidity_2m[yIdx]),
    windSpeed: Math.round(h.wind_speed_10m[yIdx]),
    windDirection: h.wind_direction_10m[yIdx],
    windGusts: Math.round(h.wind_gusts_10m[yIdx]),
    pressure: Math.round(h.pressure_msl[yIdx]),
    cloudCover: Math.round(h.cloud_cover[yIdx]),
    visibility: h.visibility?.[yIdx] ?? 0,
    uvIndex: Math.round(h.uv_index?.[yIdx] ?? 0),
    sunrise: d.sunrise[yesterdayD],
    sunset: d.sunset[yesterdayD],
  };

  // --- Now (kept modest by design). -----------------------------------------
  const nowIsDay = raw.current.is_day === 1;
  const nowInfo = describeWeather(raw.current.weather_code, nowIsDay);
  const now: NowConditions = {
    temperature: Math.round(raw.current.temperature_2m),
    apparentTemperature: Math.round(raw.current.apparent_temperature),
    description: nowInfo.description,
    icon: nowInfo.icon,
    isDay: nowIsDay,
    humidity: Math.round(raw.current.relative_humidity_2m),
    windSpeed: Math.round(raw.current.wind_speed_10m),
  };

  // --- 48h timeline: 24 observed + now + 24 expected. -----------------------
  const start = Math.max(nowIdx - CHART_HOURS, 0);
  const end = Math.min(nowIdx + CHART_HOURS, hTimes.length - 1);
  const timeline: TimelinePoint[] = [];
  let past24Precip = 0;
  for (let i = start; i <= end; i++) {
    timeline.push(point(i, i <= nowIdx, i === nowIdx ? "Now" : undefined));
    if (i <= nowIdx && i > nowIdx - 24) past24Precip += h.precipitation?.[i] ?? 0;
  }
  const nowIndex = nowIdx - start;

  // Night spans (sunset -> next day's sunrise) clipped to the chart window.
  const windowStart = hTimes[start];
  const windowEnd = hTimes[end];
  const nights: NightSpan[] = [];
  for (let di = 0; di < dTimes.length - 1; di++) {
    const dusk: string | undefined = d.sunset[di];
    const dawn: string | undefined = d.sunrise[di + 1];
    if (!dusk || !dawn) continue;
    if (dawn <= windowStart || dusk >= windowEnd) continue;
    nights.push({
      start: dusk < windowStart ? windowStart : dusk,
      end: dawn > windowEnd ? windowEnd : dawn,
    });
  }

  // --- The ledger: hindsight (yesterday back) + foresight (today forward). --
  const byDate: Record<string, number[]> = {};
  for (let i = 0; i < hTimes.length; i++) {
    const day = hTimes[i].slice(0, 10);
    (byDate[day] ||= []).push(i);
  }

  const buildDay = (di: number): DayEntry => {
    const dateStr = dTimes[di];
    const phase: Phase = di < todayD ? "past" : di === todayD ? "today" : "future";
    const label =
      di === todayD
        ? "Today"
        : di === todayD - 1
        ? "Yesterday"
        : di === todayD + 1
        ? "Tomorrow"
        : weekdayLabel(dateStr);
    const code = d.weather_code[di];
    const hours = (byDate[dateStr] || []).map((k) =>
      point(k, k <= nowIdx, k === nowIdx ? "Now" : undefined)
    );
    return {
      date: dateStr,
      dayLabel: label,
      subLabel: monthDayLabel(dateStr),
      phase,
      weatherCode: code,
      icon: describeWeather(code, true).icon,
      tempMax: Math.round(d.temperature_2m_max[di]),
      tempMin: Math.round(d.temperature_2m_min[di]),
      apparentMax: Math.round(d.apparent_temperature_max?.[di] ?? d.temperature_2m_max[di]),
      apparentMin: Math.round(d.apparent_temperature_min?.[di] ?? d.temperature_2m_min[di]),
      precipitationProbability: d.precipitation_probability_max?.[di] ?? 0,
      precipitationSum: d.precipitation_sum?.[di] ?? 0,
      uvIndexMax: Math.round(d.uv_index_max?.[di] ?? 0),
      windMax: Math.round(d.wind_speed_10m_max?.[di] ?? 0),
      windGustsMax: Math.round(d.wind_gusts_10m_max?.[di] ?? 0),
      windDirDominant: d.wind_direction_10m_dominant?.[di] ?? 0,
      sunrise: d.sunrise[di],
      sunset: d.sunset[di],
      hours,
    };
  };

  const hindsight: DayEntry[] = [];
  for (let di = yesterdayD; di >= Math.max(yesterdayD - 6, 0); di--) {
    hindsight.push(buildDay(di));
  }
  const foresight: DayEntry[] = [];
  for (let di = todayD; di <= Math.min(todayD + 7, dTimes.length - 1); di++) {
    foresight.push(buildDay(di));
  }

  const everyDay = [...hindsight, ...foresight];
  const tempDomain = {
    min: Math.min(...everyDay.map((x) => x.tempMin)),
    max: Math.max(...everyDay.map((x) => x.tempMax)),
  };

  const water = buildWaterLedger(d, dTimes, todayD, units, past24Precip, foresight);
  const flags = buildFlags(d, yesterdayD, units);

  return {
    place,
    units,
    headline,
    now,
    yesterdayHigh: Math.round(d.temperature_2m_max[yesterdayD]),
    yesterdayLow: Math.round(d.temperature_2m_min[yesterdayD]),
    yesterdayPrecipTotal: d.precipitation_sum?.[yesterdayD] ?? 0,
    yesterdayPrecipProb: d.precipitation_probability_max?.[yesterdayD] ?? 0,
    past24Precip,
    timeline,
    nowIndex,
    nights,
    hindsight,
    foresight,
    tempDomain,
    water,
    flags,
    utcOffsetSeconds: raw.utc_offset_seconds ?? 0,
    fetchedAt: raw.current.time,
  };
}

// ---------------------------------------------------------------------------
// Consequence flags — the marks yesterday left behind. Thresholds convert to
// fixed physical units so the °F/°C toggle never changes what qualifies.
// ---------------------------------------------------------------------------

function buildFlags(d: any, yesterdayD: number, units: Units): ConsequenceFlag[] {
  const flags: ConsequenceFlag[] = [];
  const toC = (v: number) => (units === "imperial" ? ((v - 32) * 5) / 9 : v);
  const toMph = (v: number) => (units === "imperial" ? v : v / 1.609);

  const tMin = d.temperature_2m_min?.[yesterdayD];
  const feltMax = d.apparent_temperature_max?.[yesterdayD];
  const gusts = d.wind_gusts_10m_max?.[yesterdayD];
  const snow = d.snowfall_sum?.[yesterdayD] ?? 0;
  // snowfall_sum: inches when imperial, centimeters when metric.
  const snowNotable = units === "imperial" ? snow >= 0.1 : snow >= 0.25;

  if (typeof tMin === "number" && toC(tMin) <= 0) {
    flags.push({
      kind: "froze",
      label: "Froze overnight",
      detail: `low ${Math.round(tMin)}°`,
    });
  }
  if (snowNotable) {
    flags.push({
      kind: "snowed",
      label: "It snowed",
      detail: `${snow.toFixed(1)} ${units === "imperial" ? "in" : "cm"}`,
    });
  }
  if (typeof feltMax === "number" && toC(feltMax) >= 35) {
    flags.push({
      kind: "scorcher",
      label: "Scorcher",
      detail: `felt ${Math.round(feltMax)}°`,
    });
  }
  if (typeof gusts === "number" && toMph(gusts) >= 35) {
    flags.push({
      kind: "gusty",
      label: "Gusty",
      detail: `gusts ${Math.round(gusts)} ${units === "imperial" ? "mph" : "km/h"}`,
    });
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Water ledger computation. Threshold logic runs in millimeters regardless of
// display units, so the verdict doesn't shift when the user toggles °F/°C.
// ---------------------------------------------------------------------------

function buildWaterLedger(
  d: any,
  dTimes: string[],
  todayD: number,
  units: Units,
  past24Precip: number,
  foresight: DayEntry[]
): WaterLedger {
  const toMm = (v: number) => (units === "imperial" ? v * 25.4 : v);
  const rainAt = (i: number): number => d.precipitation_sum?.[i] ?? 0;
  const et0At = (i: number): number => d.et0_fao_evapotranspiration?.[i] ?? 0;

  // Last 7 days + today + tomorrow.
  const days: WaterDay[] = [];
  for (let i = Math.max(todayD - 7, 0); i <= Math.min(todayD + 1, dTimes.length - 1); i++) {
    const phase: Phase = i < todayD ? "past" : i === todayD ? "today" : "future";
    const label =
      i === todayD
        ? "Tdy"
        : i === todayD + 1
        ? "Tmw"
        : new Date(`${dTimes[i]}T12:00:00`)
            .toLocaleDateString("en-US", { weekday: "narrow" });
    days.push({
      date: dTimes[i],
      label,
      phase,
      rain: rainAt(i),
      et0: phase === "past" ? et0At(i) : 0,
    });
  }

  let rain3 = 0, rain7 = 0, et3 = 0, et7 = 0;
  for (let k = 1; k <= 7; k++) {
    const i = todayD - k;
    if (i < 0) break;
    rain7 += rainAt(i);
    et7 += et0At(i);
    if (k <= 3) {
      rain3 += rainAt(i);
      et3 += et0At(i);
    }
  }

  // Days since a day with ≥1mm of rain (1 = yesterday).
  let daysSinceRain: number | null = null;
  for (let k = 1; k <= 10; k++) {
    const i = todayD - k;
    if (i < 0) break;
    if (toMm(rainAt(i)) >= 1) {
      daysSinceRain = k;
      break;
    }
  }

  const upcomingRain = rainAt(todayD) + rainAt(todayD + 1);
  const upcomingMaxProb = Math.max(
    d.precipitation_probability_max?.[todayD] ?? 0,
    d.precipitation_probability_max?.[todayD + 1] ?? 0
  );

  // First foresight day beyond tomorrow with a real chance of rain.
  let nextWetLabel: string | null = null;
  for (const day of foresight.slice(2)) {
    if (toMm(day.precipitationSum) >= 2 || day.precipitationProbability >= 60) {
      nextWetLabel = day.dayLabel;
      break;
    }
  }

  const rain24mm = toMm(past24Precip);
  const rain3mm = toMm(rain3);
  const et3mm = toMm(et3);
  const et7mm = toMm(et7);
  const net3mm = rain3mm - et3mm;
  const net7mm = toMm(rain7) - et7mm;
  const upcomingMm = toMm(upcomingRain);

  let state: WaterState;
  if (rain24mm >= 4) state = "soaked";
  else if (net3mm > 0 || (rain3mm >= 5 && net3mm > -3)) state = "holding";
  else if ((upcomingMm >= 4 && upcomingMaxProb >= 55) || upcomingMaxProb >= 80)
    state = "rain-soon";
  else if (rain3mm < 1 && et3mm < 4 && upcomingMm < 4) state = "steady";
  else if ((daysSinceRain === null || daysSinceRain >= 5) && net7mm < -15) state = "parched";
  else state = "drying";

  return {
    days,
    rain24: past24Precip,
    rain3,
    rain7,
    et3,
    et7,
    daysSinceRain,
    upcomingRain,
    upcomingMaxProb,
    nextWetLabel,
    state,
  };
}
