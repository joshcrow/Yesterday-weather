"use client";

import { useId } from "react";
import type { IconKind } from "@/lib/weather";

interface Props {
  icon: IconKind;
  className?: string;
  title?: string;
}

/**
 * Colorful, self-contained SVG weather glyphs (no external icon library).
 * All icons share a 0 0 24 24 viewBox so they scale cleanly at any size.
 */
export default function WeatherIcon({ icon, className, title }: Props) {
  // useId keeps gradient/mask ids unique + stable across SSR and hydration,
  // even when many icons render on the same page.
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={title ?? icon}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`sun-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE259" />
          <stop offset="100%" stopColor="#FFA751" />
        </linearGradient>
        <linearGradient id={`moon-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEFCE8" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
        <linearGradient id={`cloud-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D7DEE8" />
        </linearGradient>
        <linearGradient id={`cloud-dark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B9C2CF" />
          <stop offset="100%" stopColor="#8A96A6" />
        </linearGradient>
        <linearGradient id={`drop-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id={`bolt-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {renderIcon(icon, uid)}
    </svg>
  );
}

function Sun({ uid, cx = 12, cy = 12, r = 5 }: { uid: string; cx?: number; cy?: number; r?: number }) {
  const rayLen = r * 0.85;
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const inner = r + 1.5;
    const outer = inner + rayLen;
    rays.push(
      <line
        key={i}
        x1={cx + Math.cos(angle) * inner}
        y1={cy + Math.sin(angle) * inner}
        x2={cx + Math.cos(angle) * outer}
        y2={cy + Math.sin(angle) * outer}
      />
    );
  }
  return (
    <g>
      <g
        stroke={`url(#sun-${uid})`}
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        {rays}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#sun-${uid})`} />
    </g>
  );
}

function Moon({ uid, cx = 12, cy = 12, r = 6 }: { uid: string; cx?: number; cy?: number; r?: number }) {
  const maskId = `moonmask-${uid}-${cx}-${cy}`;
  return (
    <g>
      <mask id={maskId}>
        <rect x="0" y="0" width="24" height="24" fill="black" />
        <circle cx={cx} cy={cy} r={r} fill="white" />
        <circle cx={cx + r * 0.55} cy={cy - r * 0.45} r={r * 0.95} fill="black" />
      </mask>
      <circle cx={cx} cy={cy} r={r} fill={`url(#moon-${uid})`} mask={`url(#${maskId})`} />
    </g>
  );
}

function Cloud({
  uid,
  dark = false,
  translateX = 0,
  translateY = 0,
  scale = 1,
}: {
  uid: string;
  dark?: boolean;
  translateX?: number;
  translateY?: number;
  scale?: number;
}) {
  const fill = dark ? `url(#cloud-dark-${uid})` : `url(#cloud-${uid})`;
  return (
    <g transform={`translate(${translateX} ${translateY}) scale(${scale})`} fill={fill}>
      <circle cx="8.5" cy="14" r="4.6" />
      <circle cx="14" cy="11.5" r="6" />
      <circle cx="18" cy="15" r="4.4" />
      <rect x="7.5" y="14.4" width="11" height="5.2" rx="2.6" />
    </g>
  );
}

function Drops({ uid, slant = false }: { uid: string; slant?: boolean }) {
  const dx = slant ? 1.6 : 0;
  const xs = [9.5, 13, 16.5];
  return (
    <g stroke={`url(#drop-${uid})`} strokeWidth={1.8} strokeLinecap="round">
      {xs.map((x, i) => (
        <line key={i} x1={x} y1={19.5} x2={x - dx} y2={22.5} />
      ))}
    </g>
  );
}

function Snowflakes({ uid }: { uid: string }) {
  const xs = [9.5, 13, 16.5];
  return (
    <g fill="#FFFFFF">
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={i === 1 ? 22 : 21} r={1.1} />
      ))}
    </g>
  );
}

function Bolt({ uid }: { uid: string }) {
  return (
    <path
      d="M13 18.5l-4 0 3-5.5 -3 0 4.5-7 -1.5 5 3.5 0z"
      fill={`url(#bolt-${uid})`}
    />
  );
}

function FogLines() {
  return (
    <g stroke="#E2E8F0" strokeWidth={1.6} strokeLinecap="round" opacity={0.9}>
      <line x1="6" y1="19.5" x2="18" y2="19.5" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </g>
  );
}

function renderIcon(icon: IconKind, uid: string) {
  switch (icon) {
    case "clear-day":
      return <Sun uid={uid} r={6} />;
    case "clear-night":
      return <Moon uid={uid} r={6.5} />;
    case "partly-day":
      return (
        <g>
          <Sun uid={uid} cx={9} cy={8.5} r={3.6} />
          <Cloud uid={uid} translateX={2} translateY={2} />
        </g>
      );
    case "partly-night":
      return (
        <g>
          <Moon uid={uid} cx={9} cy={8} r={4} />
          <Cloud uid={uid} translateX={2} translateY={2} />
        </g>
      );
    case "cloudy":
      return (
        <g>
          <Cloud uid={uid} dark translateX={-2} translateY={0.5} scale={0.82} />
          <Cloud uid={uid} translateX={2} translateY={1} />
        </g>
      );
    case "fog":
      return (
        <g>
          <Cloud uid={uid} translateY={-1.5} />
          <FogLines />
        </g>
      );
    case "drizzle":
      return (
        <g>
          <Cloud uid={uid} translateY={-2} />
          <Drops uid={uid} />
        </g>
      );
    case "rain":
      return (
        <g>
          <Cloud uid={uid} dark translateY={-2} />
          <Drops uid={uid} />
        </g>
      );
    case "showers":
      return (
        <g>
          <Cloud uid={uid} dark translateY={-2} />
          <Drops uid={uid} slant />
        </g>
      );
    case "freezing-rain":
      return (
        <g>
          <Cloud uid={uid} dark translateY={-2} />
          <Drops uid={uid} />
          <Snowflakes uid={uid} />
        </g>
      );
    case "snow":
      return (
        <g>
          <Cloud uid={uid} translateY={-2} />
          <Snowflakes uid={uid} />
        </g>
      );
    case "thunderstorm":
      return (
        <g>
          <Cloud uid={uid} dark translateY={-2.5} />
          <Bolt uid={uid} />
        </g>
      );
    default:
      return <Sun uid={uid} r={6} />;
  }
}
