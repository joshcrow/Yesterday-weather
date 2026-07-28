import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (app/fonts, OFL licensed) so builds need no network.
const grotesk = localFont({
  src: "./fonts/SpaceGrotesk-var.woff2",
  weight: "300 700",
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yesterday-weather-gamma.vercel.app"),
  title: "Yesterday° — Hindsight-First Weather",
  description:
    "The weather ledger: yesterday's conditions first, a 48-hour observed-to-expected timeline, a water ledger, radar on the record, and a week of hindsight beside a week of foresight.",
  openGraph: {
    title: "Yesterday° — Hindsight-First Weather",
    description:
      "Forecasts are opinions. Yesterday is a fact. The weather ledger leads with what the sky actually did.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yesterday° — Hindsight-First Weather",
    description:
      "Forecasts are opinions. Yesterday is a fact. The weather ledger leads with what the sky actually did.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E15",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
