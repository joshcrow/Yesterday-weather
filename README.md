# Yesterday° ⏪

**Hindsight-first weather.** A weather site that leads with *yesterday* — reported
with a completely straight face — then concedes the present, and, fine, the future
too. Built as a professional dark-ink dashboard, deliberately unlike the
immersive-sky weather apps.

> — Grey. Like your memory of it.

Live: deployed on Vercel (zero config, no API keys).

## The idea

Every weather product races to tell you what's next. **Yesterday°** is a ledger:
it records what the sky *actually did*, puts the present in a modest strip
("Meanwhile, now — fleeting"), and files the forecast under *Foresight — fine,
here's the future*.

Time is the color system:

| Phase | Encoding |
| --- | --- |
| **Observed** (past) | amber `#D97706`, solid line, solid range bars |
| **Now** | paper white — a divider, a dot, one modest strip |
| **Expected** (future) | blue `#0284C7`, dashed line, dashed range bars |

Both accents are validated for colorblind separation and contrast against the
dark surface (OKLab ΔE ≥ 8, ≥3:1).

## What's on the page

- **Yesterday hero** — yesterday at this exact hour: temperature, conditions,
  H/L, and a deadpan editorial quip. A soft radial glow tints the panel by
  condition — the one place weather is allowed to color the UI.
- **48-hour timeline** — the centerpiece chart: 24h of observed temperature
  (solid amber) flowing into 24h of expected (dashed blue) across a "NOW"
  divider, with night shading, a precipitation-chance strip below (its own
  scale — no dual axes), pinned axis labels, and a crosshair tooltip that works
  by mouse, touch, and keyboard (arrow keys).
- **The ledger** — a week of **Hindsight** ("what actually happened") beside a
  week of **Foresight**, every row expandable into a full day: precipitation
  total, wind, UV, feels-like, sun times, and that day's hourly breakdown,
  each stamped **Observed** or **Expected**.
- **Yesterday, by the numbers** — a hairline stat grid: precipitation, felt
  like, wind, humidity, UV, sun, visibility, pressure.

## Design notes

- Flat ink canvas (`#0A0E15`), hairline-bordered panels — no frosted glass, no
  condition-gradient sky.
- [Space Grotesk](https://github.com/floriankarsten/space-grotesk) (self-hosted,
  OFL) for display type and numerals; Georgia italic for the editorial quips.
- Custom colorful SVG weather glyphs (no icon library).
- Chart built per a strict dataviz spec: 2px lines, solid hairline gridlines,
  surface-ringed markers, sparse direct labels ("Now" + the window extreme),
  legend for the two phases, tooltips that enhance but never gate (every value
  is also in the expanded day rows).

## Tech

- [Next.js 14](https://nextjs.org/) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo](https://open-meteo.com/) — one request covers `past_days=10` +
  `forecast_days=8`; no API key
- [BigDataCloud](https://www.bigdatacloud.com/) reverse geocoding for
  "use my location"; no key
- Hand-rolled SVG chart — no chart library

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy to Vercel

Import the repo at [vercel.com/new](https://vercel.com/new) — Next.js is
auto-detected, there are no environment variables, and the font is self-hosted,
so it builds with zero configuration.

## Project structure

```
app/
  layout.tsx           Root layout, self-hosted font, metadata
  page.tsx             Renders <WeatherApp/>
  fonts/               Space Grotesk variable (OFL.txt included)
components/
  WeatherApp.tsx       State, geolocation, fetching, page grid
  Header.tsx           Wordmark + search row
  SearchBar.tsx        City search, location, °F/°C
  YesterdayHero.tsx    Yesterday-at-this-hour + quip
  NowStrip.tsx         The present, kept modest
  TimelineChart.tsx    48h observed→expected chart (SVG, hand-rolled)
  Ledger.tsx           Hindsight | Foresight, expandable days
  NumbersGrid.tsx      Yesterday's stat grid
  WeatherIcon.tsx      Colorful SVG weather glyphs
  Panel.tsx            Hairline panel + section label
lib/
  weather.ts           Fetch + normalize past/now/future into the ledger model
  geocode.ts           Forward + reverse geocoding
  theme.ts             Condition → hero glow accent
  format.ts            Units & label formatting
```

Hindsight is 20/20. Foresight now included, reluctantly.
Weather data by [Open-Meteo](https://open-meteo.com/).
