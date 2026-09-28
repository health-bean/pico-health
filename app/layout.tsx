import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Fraunces, Oswald, Newsreader } from "next/font/google";
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

// Alternate display faces, used only by the brand treatments under ?brand=.
// preload:false matters — without it Next emits <link rel=preload> for both and
// every production visitor pays for two faces the default theme never renders.
// The files are still self-hosted and fetched the moment a treatment asks.
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display-condensed",
  display: "swap",
  preload: false,
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display-editorial",
  display: "swap",
  preload: false,
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
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable} ${oswald.variable} ${newsreader.variable}`} style={{ colorScheme: "light" }}>
      <body className="font-[family-name:var(--font-body)] bg-[var(--color-surface)] text-[var(--color-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
