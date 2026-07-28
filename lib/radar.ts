// Radar data layer for Yesterday° — precipitation, on the record.
//
// Three keyless sources, one ledger:
//   • Iowa Environmental Mesonet (NOAA NEXRAD mosaic, public domain) — CONUS.
//     A WMS with a TIME parameter whose archive reaches back years, which is
//     the whole point: it can replay *yesterday's* radar, not just teasers of
//     the next storm. One GetMap request per frame. 5-minute granularity —
//     off-cadence times return blank images, so timestamps are always floored.
//     Docs: https://mesonet.agron.iastate.edu/ogc/
//   • RainViewer public API — global-ish composite, the past 2 hours in
//     10-minute frames plus (when they feel like providing it) a short
//     nowcast. Standard XYZ tiles. The free API is officially deprecated, so
//     everything here treats it as a guest that may leave without saying
//     goodbye. Docs: https://www.rainviewer.com/api.html
//   • IEM again for the Ahead chapter (CONUS): NOAA HRRR simulated
//     reflectivity by forecast lead — the radar image the model expects,
//     out to +12 hours.
//
// No source is displayed in its own colors. Every palette follows the
// meteorological cool→warm convention, so one classifier maps any pixel to a
// 0..1 intensity, which is then re-inked in the ledger's single amber ramp —
// intensity always reads the same way, chapter to chapter. Whether a frame
// is record or forecast is the chrome's job (scrubber, tabs, frame chip).

export type RadarChapter = "yesterday" | "lately" | "ahead";
export type RadarPhase = "past" | "future";

export interface RadarFrame {
  time: number; // unix seconds, UTC (approximate for model frames)
  observed: boolean;
  kind: "iem" | "rv" | "hrrr";
  rvPath?: string; // RainViewer tile path for kind "rv"
  leadMin?: number; // forecast lead in minutes for kind "hrrr"
}

export interface RainviewerIndex {
  host: string;
  past: { time: number; path: string }[];
  nowcast: { time: number; path: string }[];
}

// ---------------------------------------------------------------------------
// Coverage & timelines
// ---------------------------------------------------------------------------

/** The IEM NEXRAD mosaic covers the continental US (roughly). */
export function inConus(lat: number, lon: number): boolean {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66.5;
}

const IEM_STEP = 300; // the mosaic's native cadence, seconds

/**
 * Yesterday, hour by half-hour: 48 archived frames spanning the place's local
 * calendar day. `date` is the local "YYYY-MM-DD"; the offset converts local
 * midnight to a UTC instant. (On a DST-change day the current offset is an
 * hour off for part of the replay — a cosmetic wobble the archive forgives.)
 */
export function yesterdayFrames(date: string, utcOffsetSeconds: number): RadarFrame[] {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`) / 1000 - utcOffsetSeconds;
  return Array.from({ length: 48 }, (_, i) => ({
    time: midnightUtc + i * 1800,
    observed: true,
    kind: "iem" as const,
  }));
}

/** The last two hours from the IEM mosaic, 10-minute steps, newest ~6m old. */
export function latelyIemFrames(nowMs: number): RadarFrame[] {
  const end = Math.floor((nowMs / 1000 - 360) / IEM_STEP) * IEM_STEP;
  return Array.from({ length: 13 }, (_, i) => ({
    time: end - (12 - i) * 600,
    observed: true,
    kind: "iem" as const,
  }));
}

/**
 * The Ahead chapter (CONUS): NOAA HRRR *simulated* reflectivity — what the
 * radar is expected to show — served by IEM per forecast lead from the latest
 * model run. Half-hour steps out to +12h. Labeled by lead ("in 3 h") rather
 * than wall clock, since the run's exact age isn't advertised.
 */
export function aheadFrames(nowMs: number): RadarFrame[] {
  const nowSec = Math.floor(nowMs / 1000);
  return Array.from({ length: 25 }, (_, i) => ({
    time: nowSec + i * 1800,
    observed: false,
    kind: "hrrr" as const,
    leadMin: i * 30,
  }));
}

const HRRR_WMS = "https://mesonet.agron.iastate.edu/cgi-bin/wms/hrrr/refd.cgi";

/** One HRRR simulated-reflectivity frame covering the viewport, by lead time.
 * The hour bucket busts caches when a newer model run supersedes the frames. */
export function hrrrFrameUrl(
  centerLat: number,
  centerLon: number,
  zoom: number,
  cssWidth: number,
  cssHeight: number,
  leadMin: number
): string {
  const mpp = mercMppAt(zoom);
  const cx = mercX(centerLon);
  const cy = mercY(centerLat);
  const halfW = (mpp * cssWidth) / 2;
  const halfH = (mpp * cssHeight) / 2;
  const w = Math.max(Math.round(cssWidth / 2), 320);
  const h = Math.max(Math.round(cssHeight / 2), 160);
  const bbox = [cx - halfW, cy - halfH, cx + halfW, cy + halfH]
    .map((v) => v.toFixed(0))
    .join(",");
  const layer = `refd_${String(leadMin).padStart(4, "0")}`;
  const runBucket = Math.floor(Date.now() / 3600000);
  return (
    `${HRRR_WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
    `&LAYERS=${layer}&SRS=EPSG:3857&FORMAT=image/png&TRANSPARENT=true` +
    `&BBOX=${bbox}&WIDTH=${w}&HEIGHT=${h}&_run=${runBucket}`
  );
}

const RV_INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchRainviewerIndex(): Promise<RainviewerIndex> {
  const res = await fetch(RV_INDEX_URL);
  if (!res.ok) throw new Error(`RainViewer index returned ${res.status}`);
  const raw = await res.json();
  const list = (xs: any): { time: number; path: string }[] =>
    Array.isArray(xs)
      ? xs
          .filter((f: any) => typeof f?.time === "number" && typeof f?.path === "string")
          .map((f: any) => ({ time: f.time, path: f.path }))
      : [];
  return {
    host: typeof raw?.host === "string" ? raw.host : "https://tilecache.rainviewer.com",
    past: list(raw?.radar?.past),
    nowcast: list(raw?.radar?.nowcast),
  };
}

// ---------------------------------------------------------------------------
// Web Mercator plumbing — enough map math to not need a map library.
// ---------------------------------------------------------------------------

const MERC_ORIGIN = 20037508.342789244; // half the world, in meters
const BASE_MPP = 156543.03392804097; // meters per pixel at z0, 256px tiles

export function mercX(lon: number): number {
  return (lon / 180) * MERC_ORIGIN;
}

export function mercY(lat: number): number {
  const clamped = Math.max(-85.05, Math.min(85.05, lat));
  return (Math.log(Math.tan(((90 + clamped) * Math.PI) / 360)) / Math.PI) * MERC_ORIGIN;
}

/** Fractional world position in [0,1) for tile addressing. */
export function worldX(lon: number): number {
  return (lon + 180) / 360;
}

export function worldY(lat: number): number {
  const clamped = Math.max(-85.05, Math.min(85.05, lat));
  const rad = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}

/**
 * Integer tile zoom whose scale best matches a target *ground* resolution
 * (meters per CSS pixel) at this latitude. Both sources render at the same
 * zoom so the view never breathes when frames switch source.
 */
export function zoomFor(targetGroundMpp: number, lat: number): number {
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  const z = Math.round(Math.log2((BASE_MPP * cos) / targetGroundMpp));
  return Math.max(4, Math.min(10, z));
}

/** Mercator meters per CSS pixel at an integer zoom. */
export function mercMppAt(zoom: number): number {
  return BASE_MPP / 2 ** zoom;
}

/** True ground meters per CSS pixel (mercator scale corrected for latitude). */
export function groundMppAt(zoom: number, lat: number): number {
  return mercMppAt(zoom) * Math.cos((lat * Math.PI) / 180);
}

// ---------------------------------------------------------------------------
// Frame asset URLs
// ---------------------------------------------------------------------------

const IEM_WMS = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi";

/** One archived mosaic image covering the whole viewport, at a given moment. */
export function iemFrameUrl(
  centerLat: number,
  centerLon: number,
  zoom: number,
  cssWidth: number,
  cssHeight: number,
  timeSec: number
): string {
  const mpp = mercMppAt(zoom);
  const cx = mercX(centerLon);
  const cy = mercY(centerLat);
  const halfW = (mpp * cssWidth) / 2;
  const halfH = (mpp * cssHeight) / 2;
  // Half-resolution request: NEXRAD is ~1 km data, so full CSS resolution is
  // oversampling — and 48 archive frames at half size stay light in memory.
  const w = Math.max(Math.round(cssWidth / 2), 320);
  const h = Math.max(Math.round(cssHeight / 2), 160);
  const t = new Date(Math.floor(timeSec / IEM_STEP) * IEM_STEP * 1000)
    .toISOString()
    .slice(0, 19);
  const bbox = [cx - halfW, cy - halfH, cx + halfW, cy + halfH]
    .map((v) => v.toFixed(0))
    .join(",");
  return (
    `${IEM_WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap` +
    `&LAYERS=nexrad-n0q-wmst&SRS=EPSG:3857&FORMAT=image/png&TRANSPARENT=true` +
    `&BBOX=${bbox}&WIDTH=${w}&HEIGHT=${h}&TIME=${t}Z`
  );
}

/** RainViewer XYZ tile (256px, "Universal Blue" scheme, smoothed, no snow split). */
export function rvTileUrl(host: string, path: string, z: number, x: number, y: number): string {
  const n = 2 ** z;
  const wrappedX = ((x % n) + n) % n;
  return `${host}${path}/256/${z}/${wrappedX}/${y}/2/1_0.png`;
}

// ---------------------------------------------------------------------------
// Recoloring — the radar obeys the time system.
// ---------------------------------------------------------------------------

/**
 * Any radar pixel → intensity 0..1. Both source palettes follow the
 * cool-is-light / warm-is-heavy convention, so hue (with lightness breaking
 * ties among the blues) orders precipitation without knowing either colormap
 * exactly. This is a stylized ledger, not a calibrated dBZ readout.
 */
export function intensityOf(r: number, g: number, b: number, a: number): number {
  if (a < 8) return 0;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;
  const chroma = max - min;
  // Desaturated pixels sit at both ends of the NEXRAD scale: pale gray-blue
  // is barely-anything, but near-white is the very top (75+ dBZ hail cores).
  if (chroma < 0.09) return light > 0.72 ? 0.97 : 0.06;

  let hue: number;
  if (max === rn) hue = 60 * (((gn - bn) / chroma + 6) % 6);
  else if (max === gn) hue = 60 * ((bn - rn) / chroma + 2);
  else hue = 60 * ((rn - gn) / chroma + 4);

  if (hue >= 260 && hue < 345) return 0.94; // magenta/purple — extreme
  if (hue < 15 || hue >= 345) return 0.84; // red — very heavy
  if (hue < 45) return 0.72; // orange — heavy
  if (hue < 70) return 0.6; // yellow — moderate-heavy
  if (hue < 170) {
    // greens: yellow-green reads heavier than teal
    return 0.3 + (1 - (hue - 70) / 100) * 0.18;
  }
  // blues & cyans: darker blue carries more than pale cyan
  return 0.13 + (1 - Math.min(Math.max(light, 0), 1)) * 0.24;
}

type RampStop = [t: number, r: number, g: number, b: number, a: number];

// One amber ledger ink for every chapter — usability first: intensity always
// reads the same way, whether the frame is record or forecast. Observed vs
// expected is carried by the chrome instead (solid-vs-dashed scrubber, the
// chapter tabs, the "in 3 h" frame chip), never by the echo color.
const RAMP: RampStop[] = [
  [0.0, 170, 85, 12, 0.1],
  [0.1, 200, 103, 8, 0.3],
  [0.3, 217, 119, 6, 0.52],
  [0.5, 240, 150, 26, 0.7],
  [0.7, 255, 191, 82, 0.85],
  [0.9, 255, 226, 166, 0.94],
  [1.0, 255, 245, 218, 0.98],
];

function rampColor(ramp: RampStop[], t: number): [number, number, number, number] {
  if (t <= ramp[0][0]) {
    const [, r, g, b, a] = ramp[0];
    return [r, g, b, a];
  }
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const lo = ramp[i - 1];
      const hi = ramp[i];
      const f = (t - lo[0]) / (hi[0] - lo[0]);
      return [
        lo[1] + (hi[1] - lo[1]) * f,
        lo[2] + (hi[2] - lo[2]) * f,
        lo[3] + (hi[3] - lo[3]) * f,
        lo[4] + (hi[4] - lo[4]) * f,
      ];
    }
  }
  const last = ramp[ramp.length - 1];
  return [last[1], last[2], last[3], last[4]];
}

export interface RecoloredImage {
  canvas: HTMLCanvasElement;
  hasEcho: boolean;
  bytes: number;
}

/** Re-ink a fetched radar image into the phase's ramp. */
export function recolor(img: HTMLImageElement, phase: RadarPhase): RecoloredImage {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { canvas, hasEcho: false, bytes: w * h * 4 };
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  // `phase` intentionally unused for color — one ramp for all chapters.
  void phase;
  const ramp = RAMP;
  let visible = 0;
  for (let i = 0; i < px.length; i += 4) {
    const t = intensityOf(px[i], px[i + 1], px[i + 2], px[i + 3]);
    if (t <= 0) {
      px[i + 3] = 0;
      continue;
    }
    const srcA = px[i + 3] / 255;
    const [r, g, b, a] = rampColor(ramp, t);
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = Math.round(a * srcA * 255);
    if (px[i + 3] > 20) visible++;
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, hasEcho: visible > 30, bytes: w * h * 4 };
}

// ---------------------------------------------------------------------------
// Basemap — Carto's dark, label-free OSM render: geography without chatter.
// Drawn beneath the echoes and dimmed toward ink so the weather stays the star.
// Attribution (© OpenStreetMap contributors © CARTO) rendered in the panel.
// ---------------------------------------------------------------------------

export function basemapTileUrl(z: number, x: number, y: number): string {
  const n = 2 ** z;
  const wx = ((x % n) + n) % n;
  const sub = "abcd"[(wx + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/dark_nolabels/${z}/${wx}/${y}.png`;
}

const BASEMAP_CAP = 160; // ~40MB decoded worst case
const basemapTiles = new Map<string, HTMLImageElement>();
const basemapPending = new Set<string>();
const basemapFailed = new Set<string>();

export function peekBasemap(url: string): HTMLImageElement | undefined {
  const hit = basemapTiles.get(url);
  if (hit) {
    basemapTiles.delete(url); // refresh recency
    basemapTiles.set(url, hit);
  }
  return hit;
}

/** Load-and-cache a basemap tile; resolves true when a NEW tile arrived. */
export function ensureBasemap(url: string): Promise<boolean> {
  if (basemapTiles.has(url) || basemapFailed.has(url) || basemapPending.has(url)) {
    return Promise.resolve(false);
  }
  basemapPending.add(url);
  return loadImage(url)
    .then((img) => {
      basemapPending.delete(url);
      basemapTiles.set(url, img);
      while (basemapTiles.size > BASEMAP_CAP) {
        const oldest = basemapTiles.keys().next().value as string;
        basemapTiles.delete(oldest);
      }
      return true;
    })
    .catch(() => {
      basemapPending.delete(url);
      basemapFailed.add(url);
      return false;
    });
}

/** CORS-enabled image load (needed for canvas readback), with one retry —
 * freshly generated frames occasionally 404 for a beat at the CDN edge. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  const attempt = () =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  return attempt().catch(
    () => new Promise((r) => setTimeout(r, 1400)).then(attempt)
  );
}

// ---------------------------------------------------------------------------
// A small byte-budgeted cache of recolored frames, shared across chapters.
// ---------------------------------------------------------------------------

const STORE_BUDGET = 120 * 1024 * 1024;

class RecoloredStore {
  private map = new Map<string, RecoloredImage>();
  private bytes = 0;

  get(key: string): RecoloredImage | undefined {
    const hit = this.map.get(key);
    if (hit) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, hit);
    }
    return hit;
  }

  set(key: string, value: RecoloredImage): void {
    const prior = this.map.get(key);
    if (prior) this.bytes -= prior.bytes;
    this.map.set(key, value);
    this.bytes += value.bytes;
    for (const [k, v] of this.map) {
      if (this.bytes <= STORE_BUDGET) break;
      this.map.delete(k);
      this.bytes -= v.bytes;
    }
  }
}

export const radarStore = new RecoloredStore();

/** Fetch-and-recolor with cache; returns the cached entry when present. */
export async function ensureRecolored(
  url: string,
  phase: RadarPhase
): Promise<RecoloredImage> {
  const key = `${phase}|${url}`;
  const hit = radarStore.get(key);
  if (hit) return hit;
  const img = await loadImage(url);
  const out = recolor(img, phase);
  radarStore.set(key, out);
  return out;
}

/** Synchronous cache peek for draw paths (no fetch, no recolor). */
export function peekRecolored(url: string, phase: RadarPhase): RecoloredImage | undefined {
  return radarStore.get(`${phase}|${url}`);
}

// ---------------------------------------------------------------------------
// Clock labels — frame instants rendered in the place's local time.
// ---------------------------------------------------------------------------

export function clockLabel(timeSec: number, utcOffsetSeconds: number): string {
  const d = new Date((timeSec + utcOffsetSeconds) * 1000);
  let hr = d.getUTCHours();
  const min = d.getUTCMinutes();
  const suffix = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${hr}:${String(min).padStart(2, "0")} ${suffix}`;
}

export function localHourOf(timeSec: number, utcOffsetSeconds: number): number {
  return new Date((timeSec + utcOffsetSeconds) * 1000).getUTCHours();
}

export function localMinuteOf(timeSec: number, utcOffsetSeconds: number): number {
  return new Date((timeSec + utcOffsetSeconds) * 1000).getUTCMinutes();
}
