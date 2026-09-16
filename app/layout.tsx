import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Fraunces } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Pico Health", template: "%s · Pico Health" },
  description: "Your intelligent protocol coach for chronic illness recovery",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable}`} style={{ colorScheme: "light" }}>
      <body className="font-[family-name:var(--font-body)] bg-[var(--color-surface)] text-[var(--color-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
