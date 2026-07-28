import { ImageResponse } from "next/og";
import { OG_FONT_B64 } from "./og-font";

// Rendered server-side by Vercel — the social card is code, not a binary.
export const runtime = "nodejs";
export const alt = "Yesterday° — Hindsight-first weather";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2F4F8";
const AMBER = "#D97706";
const AMBER_TEXT = "#F0A84B";
const BLUE = "#0284C7";

export default async function OpengraphImage() {
  const grotesk = Buffer.from(OG_FONT_B64, "base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#0A0E15",
          fontFamily: "Space Grotesk",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            background:
              "radial-gradient(circle at 14% 0%, rgba(217,119,6,0.14) 0%, rgba(217,119,6,0) 42%)",
          }}
        />

        {/* The observed→expected curve along the bottom. */}
        <svg
          width="1200"
          height="250"
          viewBox="0 0 1200 250"
          style={{ position: "absolute", bottom: 0, left: 0 }}
        >
          <path
            d="M-20 150 C 120 130, 200 176, 320 166 C 430 157, 500 118, 600 112 L 600 250 L -20 250 Z"
            fill="rgba(217,119,6,0.10)"
          />
          <path
            d="M600 112 C 700 106, 760 60, 860 48 C 980 34, 1060 80, 1230 60 L 1230 250 L 600 250 Z"
            fill="rgba(2,132,199,0.10)"
          />
          <path
            d="M-20 150 C 120 130, 200 176, 320 166 C 430 157, 500 118, 600 112"
            stroke={AMBER}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M600 112 C 700 106, 760 60, 860 48 C 980 34, 1060 80, 1230 60"
            stroke={BLUE}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="16 13"
            fill="none"
          />
          <line
            x1="600"
            y1="8"
            x2="600"
            y2="250"
            stroke="rgba(240,243,248,0.22)"
            strokeWidth={2}
          />
          <circle cx="600" cy="112" r="9" fill={PAPER} stroke="#0A0E15" strokeWidth={4} />
        </svg>

        {/* Frame + copy. */}
        <div
          style={{
            position: "absolute",
            top: "36px",
            left: "36px",
            width: "1128px",
            height: "558px",
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(240,243,248,0.10)",
            borderRadius: "24px",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <span
              style={{
                fontSize: "84px",
                fontWeight: 600,
                letterSpacing: "-2px",
                color: PAPER,
              }}
            >
              Yesterday
            </span>
            <span
              style={{
                fontSize: "84px",
                fontWeight: 600,
                color: AMBER_TEXT,
              }}
            >
              °
            </span>
          </div>
          <div
            style={{
              marginTop: "14px",
              fontSize: "22px",
              fontWeight: 500,
              letterSpacing: "8px",
              color: "rgba(242,244,248,0.55)",
            }}
          >
            HINDSIGHT-FIRST WEATHER
          </div>
          <div
            style={{
              marginTop: "40px",
              display: "flex",
              alignItems: "center",
              fontSize: "30px",
              color: "rgba(242,244,248,0.78)",
            }}
          >
            <span style={{ color: AMBER_TEXT, marginRight: "14px" }}>—</span>
            Forecasts are opinions. Yesterday is a fact.
          </div>
        </div>

        {/* Legend, top right. */}
        <div
          style={{
            position: "absolute",
            top: "92px",
            right: "100px",
            display: "flex",
            alignItems: "center",
            gap: "36px",
            fontSize: "19px",
            color: "rgba(242,244,248,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="34" height="6">
              <line x1="0" y1="3" x2="34" y2="3" stroke={AMBER} strokeWidth={5} strokeLinecap="round" />
            </svg>
            <span>Observed</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="34" height="6">
              <line
                x1="0" y1="3" x2="34" y2="3"
                stroke={BLUE}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="8 7"
              />
            </svg>
            <span>Expected</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: grotesk, weight: 500, style: "normal" },
        { name: "Space Grotesk", data: grotesk, weight: 600, style: "normal" },
      ],
    }
  );
}
