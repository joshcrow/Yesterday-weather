import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why yesterday? — Yesterday°",
  description:
    "The case for hindsight-first weather: forecasts are opinions, yesterday is fact.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen w-full">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <a
          href="/"
          className="text-[13px] text-paper-faint underline decoration-white/25 underline-offset-2 transition-colors hover:text-paper-dim"
        >
          ← Back to the weather
        </a>

        <h1 className="mt-8 font-display text-[34px] font-semibold tracking-tight text-paper">
          Why yesterday<span className="text-past-text">?</span>
        </h1>

        <div className="mt-6 space-y-5 text-[15.5px] leading-relaxed text-paper-dim">
          <p>
            Every weather app races to tell you what&apos;s next, and most of them are
            wrong by dinnertime. A forecast is an opinion. Yesterday is a fact.
            <span className="font-quip italic"> Yesterday°</span> leads with the fact.
          </p>
          <p>
            It turns out the recent past is quietly useful. Whether the ground is
            still holding water, what the sun and wind drew back out, whether last
            night froze, how the week actually went versus how it was supposed to go
            — none of that is in a forecast, and all of it is on the record.
          </p>
          <p>
            So this is a ledger, not a crystal ball. What fell is a credit. What
            evaporated is a debit. The verdict is written in plain language, and
            the future — fine — is included. Reluctantly. Clearly marked as
            <span className="text-future-text"> expected</span>, never confused with
            what has been <span className="text-past-text">observed</span>.
          </p>
          <p className="font-quip italic">
            Hindsight is 20/20. Everything else is a dashed line.
          </p>
        </div>

        <div className="mt-10 border-t border-ink-line pt-5 text-[12px] leading-relaxed text-paper-faint">
          <p>
            Weather data by Open-Meteo. Radar by NOAA/IEM &amp; RainViewer. Type set
            in Space Grotesk (OFL). Built as a website that answers one question
            honestly: what did the sky actually do?
          </p>
        </div>
      </div>
    </main>
  );
}
