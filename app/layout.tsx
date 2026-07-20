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
  title: "Yesterday° — Hindsight-First Weather",
  description:
    "The weather ledger: yesterday's conditions first, a 48-hour observed-to-expected timeline, and a week of hindsight beside a week of foresight.",
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
