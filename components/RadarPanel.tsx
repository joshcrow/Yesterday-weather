"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Place, Units } from "@/lib/weather";
import type { RadarChapter, RadarFrame } from "@/lib/radar";
import {
  clockLabel,
  ensureRecolored,
  fetchRainviewerIndex,
  groundMppAt,
  iemFrameUrl,
  inConus,
  latelyIemFrames,
  localHourOf,
  localMinuteOf,
  peekRecolored,
  rvTileUrl,
  worldX,
  worldY,
  yesterdayFrames,
  zoomFor,
} from "@/lib/radar";
import Panel, { SectionLabel } from "./Panel";

// Phase colors — the same validated pair the rest of the ledger uses.
const OBSERVED = "#D97706";
const EXPECTED = "#0284C7";
const SURFACE = "#10151E";

const TILE = 256;
const FRAME_MS = 380; // playback cadence
const HOLD_MS = 1300; // breath on the loop's final frame
const CANVAS_FONT = "600 9.5px -apple-system, 'Segoe UI', Roboto, sans-serif";

type FrameStatus = "pending" | "ready" | "failed";
type ZoomPreset = "near" | "wide";

// Target ground resolution for "near" (m per CSS px), snapped to a tile zoom;
// "wide" is exactly one zoom step out. RainViewer's public tiles end at z=7 —
// above that they serve a "zoom not supported" placeholder — so any timeline
// carrying RainViewer frames is capped there.
const ZOOM_TARGET = 430;
const RV_MAX_ZOOM = 7;

interface Props {
  place: Place;
  yesterdayDate: string; // the place's local "YYYY-MM-DD" for yesterday
  utcOffsetSeconds: number;
  units: Units;
}

interface ViewSize {
  w: number;
  h: number;
}

export default function RadarPanel({ place, yesterdayDate, utcOffsetSeconds, units }: Props) {
  const conus = inConus(place.latitude, place.longitude);

  const [chapter, setChapter] = useState<RadarChapter>(conus ? "yesterday" : "lately");
  const [zoom, setZoom] = useState<ZoomPreset>("near");
  const [size, setSize] = useState<ViewSize | null>(null);
  const [frames, setFrames] = useState<RadarFrame[] | null>(null);
  const [status, setStatus] = useState<FrameStatus[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [anyEcho, setAnyEcho] = useState(false);
  const [failedAll, setFailedAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const genRef = useRef(0);
  const framesRef = useRef<RadarFrame[] | null>(null);
  const statusRef = useRef<FrameStatus[]>([]);
  const frameIndexRef = useRef(0);
  const rvHostRef = useRef("https://tilecache.rainviewer.com");
  const draggingRef = useRef(false);

  const nearZoom = useMemo(() => zoomFor(ZOOM_TARGET, place.latitude), [place.latitude]);
  // The zoom actually in use — set with the frame list, since the RainViewer
  // cap depends on which sources ended up in the timeline.
  const [effZoom, setEffZoom] = useState(nearZoom);

  // The archive only covers the continental US — demote gracefully elsewhere.
  useEffect(() => {
    if (!conus && chapter === "yesterday") setChapter("lately");
  }, [conus, chapter]);

  // Respect reduced motion: no autoplay, manual scrubbing still works.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = (matches: boolean) => {
      setReduced(matches);
      if (matches) setPlaying(false);
    };
    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Measure the canvas well; ignore sub-24px wiggles so frames aren't refetched.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width ?? 0;
      if (cw < 120) return;
      setSize((prev) => {
        if (prev && Math.abs(prev.w - cw) < 24) return prev;
        const w = Math.round(cw);
        const h = Math.round(Math.min(Math.max(w * 0.42, 250), 430));
        return { w, h };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  frameIndexRef.current = frameIndex;

  const setFrameStatus = useCallback((i: number, s: FrameStatus) => {
    statusRef.current = statusRef.current.slice();
    statusRef.current[i] = s;
    setStatus(statusRef.current);
  }, []);

  // -------------------------------------------------------------------------
  // Assemble the frame list for the chapter, then load + recolor each frame.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!size) return;
    const gen = ++genRef.current;
    const { latitude: lat, longitude: lon } = place;
    setFrames(null);
    framesRef.current = null;
    statusRef.current = [];
    setStatus([]);
    setFailedAll(false);
    setAnyEcho(false);

    (async () => {
      let list: RadarFrame[] = [];
      if (chapter === "yesterday") {
        list = yesterdayFrames(yesterdayDate, utcOffsetSeconds);
      } else if (conus) {
        // Observed frames from the national archive; if RainViewer still has
        // a nowcast to offer, append it as the dashed-blue epilogue.
        list = latelyIemFrames(Date.now());
        try {
          const idx = await fetchRainviewerIndex();
          rvHostRef.current = idx.host;
          list = list.concat(
            idx.nowcast.map((f) => ({
              time: f.time,
              observed: false,
              kind: "rv" as const,
              rvPath: f.path,
            }))
          );
        } catch {
          /* the future declined to comment */
        }
      } else {
        try {
          const idx = await fetchRainviewerIndex();
          rvHostRef.current = idx.host;
          list = idx.past
            .map((f) => ({ time: f.time, observed: true, kind: "rv" as const, rvPath: f.path }))
            .concat(
              idx.nowcast.map((f) => ({
                time: f.time,
                observed: false,
                kind: "rv" as const,
                rvPath: f.path,
              }))
            );
        } catch {
          list = [];
        }
      }
      if (genRef.current !== gen) return;
      if (list.length === 0) {
        setFailedAll(true);
        return;
      }

      const zoomCap = list.some((f) => f.kind === "rv") ? RV_MAX_ZOOM : 10;
      const nearEff = Math.min(nearZoom, zoomCap);
      const z = zoom === "near" ? nearEff : Math.max(nearEff - 1, 4);
      setEffZoom(z);

      framesRef.current = list;
      statusRef.current = list.map(() => "pending" as FrameStatus);
      setFrames(list);
      setStatus(statusRef.current);
      const start =
        chapter === "lately" && reduced ? lastObservedIndex(list) : 0;
      setFrameIndex(start);

      // Load frames starting at the playhead, a few at a time.
      const order: number[] = [];
      for (let i = start; i < list.length; i++) order.push(i);
      for (let i = 0; i < start; i++) order.push(i);
      const queue = order.slice();
      const host = rvHostRef.current;
      const ensureFrame = async (f: RadarFrame): Promise<boolean> => {
        const phase = f.observed ? "past" : "future";
        if (f.kind === "iem") {
          const url = iemFrameUrl(lat, lon, z, size.w, size.h, f.time);
          return (await ensureRecolored(url, phase)).hasEcho;
        }
        const tiles = tilesForViewport(lat, lon, z, size);
        const results = await Promise.all(
          tiles.map((t) =>
            ensureRecolored(rvTileUrl(host, f.rvPath as string, z, t.x, t.y), phase)
          )
        );
        return results.some((r) => r.hasEcho);
      };
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          while (queue.length > 0 && genRef.current === gen) {
            const i = queue.shift() as number;
            try {
              const echo = await ensureFrame(list[i]);
              if (genRef.current !== gen) return;
              setFrameStatus(i, "ready");
              if (echo) setAnyEcho(true);
            } catch {
              if (genRef.current !== gen) return;
              setFrameStatus(i, "failed");
            }
          }
        })
      );
      if (genRef.current === gen && statusRef.current.every((s) => s === "failed")) {
        setFailedAll(true);
      }
    })();
  }, [
    place,
    chapter,
    conus,
    zoom,
    nearZoom,
    size,
    yesterdayDate,
    utcOffsetSeconds,
    reduced,
    reloadKey,
    setFrameStatus,
  ]);

  // -------------------------------------------------------------------------
  // Playback: advance to the next loaded frame; hold a beat at the loop end.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!playing || !frames) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const list = framesRef.current;
      const st = statusRef.current;
      if (!list) return;
      const n = list.length;
      let j = (frameIndexRef.current + 1) % n;
      let hops = 0;
      while (hops < n && st[j] === "failed") {
        j = (j + 1) % n;
        hops++;
      }
      if (hops < n && st[j] === "ready") {
        setFrameIndex(j);
        timer = setTimeout(tick, j === n - 1 ? HOLD_MS : FRAME_MS);
      } else {
        timer = setTimeout(tick, 180); // still recalling — check back shortly
      }
    };
    timer = setTimeout(tick, FRAME_MS);
    return () => clearTimeout(timer);
  }, [playing, frames]);

  // -------------------------------------------------------------------------
  // Draw the current frame plus the instrument overlay (rings, marker).
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const list = frames;
    if (list && list.length > 0) {
      // If the playhead's frame is still loading, show the nearest loaded
      // frame dimmed — hindsight momentarily out of focus.
      let drawIdx = -1;
      if (status[frameIndex] === "ready") drawIdx = frameIndex;
      else {
        let best = Infinity;
        for (let i = 0; i < list.length; i++) {
          if (status[i] === "ready" && Math.abs(i - frameIndex) < best) {
            best = Math.abs(i - frameIndex);
            drawIdx = i;
          }
        }
      }
      if (drawIdx >= 0) {
        ctx.globalAlpha = drawIdx === frameIndex ? 1 : 0.45;
        drawRadarFrame(ctx, list[drawIdx], place, effZoom, size, rvHostRef.current);
        ctx.globalAlpha = 1;
      }
    }
    drawOverlay(ctx, size, effZoom, place.latitude, units);
  }, [frames, status, frameIndex, size, place, effZoom, units]);

  // -------------------------------------------------------------------------
  // Scrubber interactions
  // -------------------------------------------------------------------------
  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      const list = framesRef.current;
      if (!el || !list || list.length < 2) return;
      const rect = el.getBoundingClientRect();
      const f = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      setFrameIndex(Math.round(f * (list.length - 1)));
    },
    []
  );

  function onTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    setPlaying(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  }

  function onTrackPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggingRef.current) seekFromClientX(e.clientX);
  }

  function onTrackPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onTrackKeyDown(e: React.KeyboardEvent) {
    const list = framesRef.current;
    if (!list) return;
    const n = list.length;
    if (e.key === "ArrowRight") {
      setPlaying(false);
      setFrameIndex((i) => Math.min(i + 1, n - 1));
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      setPlaying(false);
      setFrameIndex((i) => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === "Home") {
      setPlaying(false);
      setFrameIndex(0);
      e.preventDefault();
    } else if (e.key === "End") {
      setPlaying(false);
      setFrameIndex(n - 1);
      e.preventDefault();
    } else if (e.key === " " || e.key === "Enter") {
      setPlaying((p) => !p);
      e.preventDefault();
    }
  }

  // -------------------------------------------------------------------------
  // Derived presentation
  // -------------------------------------------------------------------------
  const n = frames?.length ?? 0;
  const nowIdx = frames ? lastObservedIndex(frames) : 0;
  const hasFuture = !!frames && nowIdx < n - 1;
  const allSettled = status.length > 0 && status.every((s) => s !== "pending");
  const quietRecord = allSettled && !failedAll && !anyEcho;
  const current = frames?.[frameIndex] ?? null;
  const loadedPct = frames
    ? (leadingReadyCount(status) / Math.max(n, 1)) * 100
    : 0;
  const pct = n > 1 ? (frameIndex / (n - 1)) * 100 : 0;
  const nowPct = n > 1 ? (nowIdx / (n - 1)) * 100 : 100;

  const caption = failedAll
    ? "The archive is unavailable."
    : !frames
      ? "Consulting the archive…"
      : chapter === "yesterday"
        ? `Yesterday's precipitation over ${place.name}, replayed from the archive.`
        : hasFuture
          ? "The last two hours, on the record — plus a few minutes of speculation."
          : "The last two hours, on the record. The future declined to comment.";

  const ticks = useMemo(() => {
    if (!frames || frames.length < 2) return [];
    return chapter === "yesterday"
      ? yesterdayTicks(frames, utcOffsetSeconds)
      : latelyTicks(frames, nowIdx);
  }, [frames, chapter, utcOffsetSeconds, nowIdx]);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <SectionLabel>Radar — on the record</SectionLabel>
        <div className="flex items-center gap-2">
          {conus && (
            <Segmented
              label="Radar chapter"
              value={chapter}
              onChange={(v) => setChapter(v)}
              options={[
                { value: "yesterday" as const, label: "Yesterday" },
                { value: "lately" as const, label: "Lately" },
              ]}
            />
          )}
          <Segmented
            label="Radar range"
            value={zoom}
            onChange={(v) => setZoom(v)}
            options={[
              { value: "near" as const, label: "Near" },
              { value: "wide" as const, label: "Wide" },
            ]}
          />
        </div>
      </div>
      <p className="px-4 pt-1 text-[12.5px] text-paper-dim sm:px-5">{caption}</p>

      <div ref={wrapRef} className="relative mt-3 border-y border-ink-line bg-[#0C1019]">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ height: size?.h ?? 320 }}
          role="img"
          aria-label={
            current
              ? `Radar over ${place.name}, ${current.observed ? "observed" : "expected"} at ${clockLabel(current.time, utcOffsetSeconds)}`
              : `Radar over ${place.name}`
          }
        />

        {frames && status[frameIndex] === "pending" && !failedAll && (
          <Spinner className="absolute right-2.5 top-2.5 h-4 w-4 text-paper-faint" />
        )}

        {!frames && !failedAll && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="font-quip text-[15px] italic text-paper-faint">
              Rewinding the sky…
            </p>
          </div>
        )}

        {quietRecord && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-quip text-[15.5px] italic text-paper-dim">
                Nothing on the record.
              </p>
              <p className="mt-1 text-[11.5px] text-paper-faint">
                Clear skies — or beyond the radar&apos;s memory.
              </p>
            </div>
          </div>
        )}

        {failedAll && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-quip text-[15.5px] italic text-paper-dim">
                The radar declined to comment.
              </p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-3 rounded-lg border border-ink-line bg-white/[0.06] px-4 py-1.5 font-display text-[12px] font-semibold text-paper transition-colors hover:bg-white/[0.1]"
              >
                Ask again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 px-4 pb-2.5 pt-3 sm:px-5">
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={!frames}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-ink-line bg-white/[0.05] text-paper-dim transition-colors hover:bg-white/[0.1] hover:text-paper disabled:opacity-40"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.7L9.52 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Radar replay position"
          aria-valuemin={0}
          aria-valuemax={Math.max(n - 1, 0)}
          aria-valuenow={frameIndex}
          aria-valuetext={
            current
              ? `${clockLabel(current.time, utcOffsetSeconds)}, ${current.observed ? "observed" : "expected"}`
              : "loading"
          }
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onKeyDown={onTrackKeyDown}
          className="relative h-9 flex-1 cursor-pointer touch-none select-none"
        >
          {/* Track: solid amber for the record, dashed blue for speculation.
              The dimmed layer is the full route; the bright layer is what's
              loaded so far. */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <TrackLine nowPct={nowPct} hasFuture={hasFuture} className="opacity-30" />
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - loadedPct}% 0 0)` }}
            >
              <TrackLine nowPct={nowPct} hasFuture={hasFuture} />
            </div>
          </div>

          {hasFuture && (
            <div
              className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-paper/25"
              style={{ left: `${nowPct}%` }}
            />
          )}

          {ticks.map((t) => (
            <span
              key={t.pct}
              className={`absolute top-[26px] text-[9px] font-semibold tracking-[0.08em] ${
                t.strong ? "text-paper-dim" : "text-paper-faint"
              } ${t.minor ? "hidden sm:inline-block" : ""}`}
              style={{
                left: `${t.pct}%`,
                transform:
                  t.pct < 4 ? "none" : t.pct > 96 ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t.label}
            </span>
          ))}

          {n > 0 && (
            <div
              className="pointer-events-none absolute top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full border-2"
              style={{
                left: `calc(${pct}% - 5.5px)`,
                background: current?.observed === false ? EXPECTED : OBSERVED,
                borderColor: SURFACE,
              }}
            />
          )}
        </div>

        <div className="w-[104px] shrink-0 text-right sm:w-[118px]">
          <div
            className="font-display text-[16px] font-semibold leading-tight text-paper"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {current ? clockLabel(current.time, utcOffsetSeconds) : "—:—"}
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[10.5px] text-paper-faint">
            <svg width="12" height="2" aria-hidden="true">
              <line
                x1="0"
                y1="1"
                x2="12"
                y2="1"
                stroke={current?.observed === false ? EXPECTED : OBSERVED}
                strokeWidth="2"
                strokeDasharray={current?.observed === false ? "3 2" : undefined}
              />
            </svg>
            {current ? frameChip(current, chapter) : "…"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-ink-line px-4 py-2 text-[10.5px] text-paper-faint sm:px-5">
        <span>
          {ringNote(effZoom, place.latitude, units, size)}
        </span>
        <span>
          Radar:{" "}
          {chapter === "yesterday" || (conus && chapter === "lately") ? (
            <>
              <a
                href="https://mesonet.agron.iastate.edu/docs/nexrad_mosaic/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
              >
                NOAA NEXRAD via IEM
              </a>
              {hasFuture && chapter === "lately" && (
                <>
                  {" · nowcast by "}
                  <RvLink />
                </>
              )}
            </>
          ) : (
            <RvLink />
          )}
        </span>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawRadarFrame(
  ctx: CanvasRenderingContext2D,
  frame: RadarFrame,
  place: Place,
  zoomLevel: number,
  size: ViewSize,
  host: string
) {
  ctx.imageSmoothingEnabled = true;
  if (frame.kind === "iem") {
    const url = iemFrameUrl(
      place.latitude,
      place.longitude,
      zoomLevel,
      size.w,
      size.h,
      frame.time
    );
    const rec = peekRecolored(url, frame.observed ? "past" : "future");
    if (rec) ctx.drawImage(rec.canvas, 0, 0, size.w, size.h);
    return;
  }
  const tiles = tilesForViewport(place.latitude, place.longitude, zoomLevel, size);
  for (const t of tiles) {
    const url = rvTileUrl(host, frame.rvPath as string, zoomLevel, t.x, t.y);
    const rec = peekRecolored(url, frame.observed ? "past" : "future");
    if (rec) ctx.drawImage(rec.canvas, t.screenX, t.screenY, TILE, TILE);
  }
}

/** Range rings, distance labels, and the "you are here" mark — the base map.
 * No borrowed basemap tiles; the ledger stays ink. */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  size: ViewSize,
  zoomLevel: number,
  lat: number,
  units: Units
) {
  const cx = size.w / 2;
  const cy = size.h / 2;
  const rings = ringRadii(zoomLevel, lat, units, size);

  ctx.strokeStyle = "rgba(240,243,248,0.10)";
  ctx.fillStyle = "rgba(242,244,248,0.42)";
  ctx.lineWidth = 1;
  ctx.font = CANVAS_FONT;
  ctx.textAlign = "center";
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.px, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(ring.label, cx, cy - ring.px - 5);
  }

  // Center mark: a paper dot with a surface ring, echoing the chart markers.
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "#F2F4F8";
  ctx.strokeStyle = SURFACE;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(242,244,248,0.30)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

interface Ring {
  px: number;
  label: string;
}

function ringRadii(
  zoomLevel: number,
  lat: number,
  units: Units,
  size: ViewSize
): Ring[] {
  const imperial = units === "imperial";
  const candidates = imperial
    ? [5, 10, 25, 50, 100, 150, 250, 400, 600]
    : [10, 20, 50, 100, 200, 300, 500, 800, 1000];
  const unitMeters = imperial ? 1609.34 : 1000;
  const unitLabel = imperial ? "MI" : "KM";
  const ground = groundMppAt(zoomLevel, lat);
  const maxPx = Math.min(size.w, size.h) / 2 - 16;
  const pxOf = (d: number) => (d * unitMeters) / ground;

  let outer: number | null = null;
  for (const d of candidates) if (pxOf(d) <= maxPx) outer = d;
  if (outer === null) return [];
  let inner: number | null = null;
  for (const d of candidates) {
    if (d < outer && pxOf(d) <= pxOf(outer) * 0.58 && pxOf(d) >= 34) inner = d;
  }
  const rings: Ring[] = [];
  if (inner !== null) rings.push({ px: pxOf(inner), label: `${inner} ${unitLabel}` });
  rings.push({ px: pxOf(outer), label: `${outer} ${unitLabel}` });
  return rings;
}

function ringNote(
  zoomLevel: number,
  lat: number,
  units: Units,
  size: ViewSize | null
): string {
  if (!size) return "";
  const rings = ringRadii(zoomLevel, lat, units, size);
  if (rings.length === 0) return "";
  return `Rings at ${rings.map((r) => r.label.toLowerCase()).join(" and ")} from here.`;
}

interface ViewTile {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
}

function tilesForViewport(
  lat: number,
  lon: number,
  zoomLevel: number,
  size: ViewSize
): ViewTile[] {
  const scale = 2 ** zoomLevel * TILE;
  const cx = worldX(lon) * scale;
  const cy = worldY(lat) * scale;
  const left = cx - size.w / 2;
  const top = cy - size.h / 2;
  const maxTile = 2 ** zoomLevel - 1;
  const tiles: ViewTile[] = [];
  for (let tx = Math.floor(left / TILE); tx * TILE < left + size.w; tx++) {
    for (let ty = Math.floor(top / TILE); ty * TILE < top + size.h; ty++) {
      if (ty < 0 || ty > maxTile) continue;
      tiles.push({ x: tx, y: ty, screenX: tx * TILE - left, screenY: ty * TILE - top });
    }
  }
  return tiles;
}

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------

function lastObservedIndex(frames: RadarFrame[]): number {
  for (let i = frames.length - 1; i >= 0; i--) if (frames[i].observed) return i;
  return frames.length - 1;
}

function leadingReadyCount(status: FrameStatus[]): number {
  let i = 0;
  while (i < status.length && status[i] !== "pending") i++;
  return i;
}

// Terse — the swatch line beside it already says observed/expected.
function frameChip(frame: RadarFrame, chapter: RadarChapter): string {
  if (chapter === "yesterday") return "Yesterday";
  const rel = Math.round((Date.now() / 1000 - frame.time) / 60);
  if (!frame.observed) return `+${Math.max(-rel, 0)} min`;
  if (rel <= 1) return "just now";
  return `${rel} min ago`;
}

interface Tick {
  pct: number;
  label: string;
  strong: boolean;
  minor?: boolean; // hidden on narrow screens
}

function yesterdayTicks(frames: RadarFrame[], utcOffsetSeconds: number): Tick[] {
  const ticks: Tick[] = [];
  const n = frames.length;
  frames.forEach((f, i) => {
    const hr = localHourOf(f.time, utcOffsetSeconds);
    const min = localMinuteOf(f.time, utcOffsetSeconds);
    if (min !== 0 || hr % 6 !== 0) return;
    const label = hr === 0 ? "12 AM" : hr === 12 ? "12 PM" : hr < 12 ? `${hr} AM` : `${hr - 12} PM`;
    ticks.push({ pct: (i / (n - 1)) * 100, label, strong: hr === 0, minor: hr % 12 !== 0 });
  });
  return ticks;
}

function latelyTicks(frames: RadarFrame[], nowIdx: number): Tick[] {
  const n = frames.length;
  const ticks: Tick[] = [
    { pct: 0, label: "−2H", strong: false },
    { pct: (nowIdx / (n - 1)) * 100, label: "NOW", strong: true },
  ];
  // The frame closest to one hour before the newest observation.
  const target = frames[nowIdx].time - 3600;
  let best = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(frames[i].time - target) < Math.abs(frames[best].time - target)) best = i;
  }
  if (best > 0 && best < nowIdx) {
    ticks.splice(1, 0, { pct: (best / (n - 1)) * 100, label: "−1H", strong: false, minor: true });
  }
  if (nowIdx < n - 1) ticks.push({ pct: 100, label: `+${Math.round((frames[n - 1].time - frames[nowIdx].time) / 60)}M`, strong: false });
  return ticks;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function TrackLine({
  nowPct,
  hasFuture,
  className = "",
}: {
  nowPct: number;
  hasFuture: boolean;
  className?: string;
}) {
  return (
    <div className={`relative h-[2px] w-full ${className}`}>
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${nowPct}%`, background: OBSERVED }}
      />
      {hasFuture && (
        <div
          className="absolute inset-y-0 right-0"
          style={{
            width: `${100 - nowPct}%`,
            background: `repeating-linear-gradient(90deg, ${EXPECTED} 0 6px, transparent 6px 11px)`,
          }}
        />
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-hidden rounded-lg border border-ink-line"
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
            value === o.value
              ? "bg-white/[0.09] text-paper"
              : "text-paper-faint hover:text-paper-dim"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RvLink() {
  return (
    <a
      href="https://www.rainviewer.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
    >
      RainViewer
    </a>
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
