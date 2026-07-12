# Weather

A clean, **Apple Weather–style** forecast web app built with Next.js. It shows the
**actual upcoming forecast** — current conditions, an hourly strip that starts at
*Now*, and a 10-day outlook — not yesterday's weather.

<p align="center">
  <em>Current conditions · Hourly · 10-day · UV, wind, humidity, sunrise/sunset, visibility &amp; pressure</em>
</p>

## Why this exists

A common bug in weather apps is showing the **hourly list starting at midnight**, so
you see hours that have already passed instead of what's coming. This app fixes that:
the hourly strip is sliced to begin at the **current hour** and runs 24 hours forward,
and the daily list always starts with **Today**. See
[`lib/weather.ts`](lib/weather.ts) (the `normalize` function) for the logic.

## Features

- 🌤 **Live current conditions** with a big temperature, description, and H/L.
- 🕐 **Hourly forecast** starting at *Now*, with sunrise/sunset markers and precip %.
- 📅 **10-day forecast** with Apple-style temperature range bars.
- 📍 **Geolocation** ("use my location") plus **city search** worldwide.
- 🌡 **°C / °F toggle**, remembered between visits.
- 🎨 **Dynamic background** that shifts with the weather and time of day.
- 🔑 **No API key required** — powered by the free [Open-Meteo](https://open-meteo.com/) API.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo](https://open-meteo.com/) for forecasts & geocoding (no key)
- [BigDataCloud](https://www.bigdatacloud.com/) for reverse geocoding (no key)

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), **Import** the repository.
3. Vercel auto-detects Next.js — no environment variables or build settings needed.
4. Click **Deploy**.

That's it. Because all data comes from key-less public APIs, the deployment works
with zero configuration.

> Tip: for accurate "use my location", the site must be served over HTTPS — which
> Vercel provides automatically. Search works everywhere regardless.

## Project structure

```
app/
  layout.tsx        Root layout + metadata
  page.tsx          Renders <WeatherApp/>
  globals.css       Tailwind + small utilities
components/
  WeatherApp.tsx    State, geolocation, data fetching (client)
  SearchBar.tsx     City search + location + units toggle
  CurrentWeather.tsx
  HourlyForecast.tsx
  DailyForecast.tsx
  WeatherDetails.tsx
  WeatherIcon.tsx   Colorful SVG weather glyphs
  GlassCard.tsx     Frosted-glass panel
lib/
  weather.ts        Fetch + normalize Open-Meteo data (the forecast fix lives here)
  geocode.ts        Forward + reverse geocoding
  theme.ts          Condition → background gradient
  format.ts         Unit & label formatting
```

Weather data by [Open-Meteo](https://open-meteo.com/).
