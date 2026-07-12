import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yesterday — Weather in Reverse",
  description:
    "The weather app that shows you yesterday. Current conditions from 24 hours ago, an hourly strip that runs into the past, and a 10-day hindsight — completely useless, beautifully presented.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
