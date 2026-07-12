# Yesterday 🌦️⏪

**A weather app in reverse.** It shows you *yesterday's* weather — presented with
a completely straight face, exactly like a real weather app. Current conditions
from 24 hours ago. An hourly strip that runs backward into the past. A "10-day
hindsight" instead of a forecast. Utterly useless. Beautifully designed.

> Tomorrow's forecast? **Unavailable.** We only report weather that has already
> happened. For the future, try literally any other weather app.

## The joke

Every element of a normal weather app, pointed the wrong way through time:

| Normal weather app        | Yesterday                                   |
| ------------------------- | ------------------------------------------- |
| Current conditions        | **Yesterday**, at this same hour            |
| Next 24 hours (forward)   | **Past 24 Hours** (runs backward from *Now*) |
| 10-day forecast           | **10-Day Hindsight** (today → back in time) |
| Tomorrow's outlook        | **"Unavailable."**                          |
| "Rain expected at 3 PM"   | "It rained at some point back there. Old news." |
| "Sunset 8:32 PM"          | "And then it did this. Gone."               |

It's a real, working weather app built on live data — it just insists on telling
you things you can no longer do anything about.

## Features

- 🕰️ **Yesterday, in full** — the headline is the weather from 24 hours ago, with
  a deadpan one-liner about the conditions you missed.
- ⏪ **Past 24 hours**, most-recent-first, with sunrise/sunset markers and the
  precipitation chances that already came and went.
- 📉 **10-day hindsight** with Apple-style temperature range bars.
- 🔮 **A "Tomorrow" card that proudly refuses to forecast.**
- 📍 **Geolocation** + worldwide **city search** (find out what you missed anywhere).
- 🌡️ **°C / °F toggle**, remembered between visits.
- 🎨 **Dynamic background** that shifts with yesterday's weather and time of day.
- 🔑 **No API key required** — powered by the free [Open-Meteo](https://open-meteo.com/) API.

## How it works

Open-Meteo's forecast endpoint accepts a [`past_days`](https://open-meteo.com/en/docs)
parameter, so the app requests the last 10 days (plus today) and then reverses
everything in [`lib/weather.ts`](lib/weather.ts):

- the hourly strip is built from the **current hour going backward** 24 hours;
- the headline reads the hourly series at **now minus 24 hours** (yesterday, this hour);
- the daily list is **today → previous days**, labelled *Today, Yesterday, …*.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo](https://open-meteo.com/) for past weather & geocoding (no key)
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

Because all data comes from key-less public APIs, the deployment works with zero
configuration.

> Tip: for accurate "use my location", the site must be served over HTTPS — which
> Vercel provides automatically. Search works everywhere regardless.

## Project structure

```
app/
  layout.tsx        Root layout + metadata
  page.tsx          Renders <WeatherApp/>
  globals.css       Tailwind + small utilities
components/
  WeatherApp.tsx    State, geolocation, data fetching, the "Tomorrow" gag (client)
  SearchBar.tsx     City search + location + units toggle
  CurrentWeather.tsx   The "Yesterday" headline + quips
  HourlyForecast.tsx   Past-24-hours strip (backward)
  DailyForecast.tsx    10-day hindsight
  WeatherDetails.tsx   Deadpan detail cards
  WeatherIcon.tsx      Colorful SVG weather glyphs
  GlassCard.tsx        Frosted-glass panel
lib/
  weather.ts        Fetch past data + reverse it into the app's shape
  geocode.ts        Forward + reverse geocoding
  theme.ts          Condition → background gradient
  format.ts         Unit & label formatting
```

Weather data (from the past) by [Open-Meteo](https://open-meteo.com/).
