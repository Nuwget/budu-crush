import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Instrument_Serif, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { artCss } from "@/game/tiles/art";
import { asset } from "@/lib/asset";

const sans = Geist({ variable: "--f-sans", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--f-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const pixel = Pixelify_Sans({ variable: "--f-pixel", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dudu & Bubu",
  description: "A cozy midnight match-3 puzzle with Dudu and Bubu. Um puzzle aconchegante da madrugada.",
  icons: { icon: asset("/icon.svg") },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06051a",
  colorScheme: "dark",
};

// Runs before first paint: copies the saved language and motion preference onto <html> so
// the page never flashes the wrong language.
const BOOT = `try{var s=JSON.parse(localStorage.getItem("budu:v1")||"null");if(s){var d=document.documentElement;if(s.lang==="en")d.lang="en";else if(s.lang==="pt")d.lang="pt-BR";if(s.settings&&s.settings.motion)d.dataset.motion=s.settings.motion}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${pixel.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <style dangerouslySetInnerHTML={{ __html: artCss() }} />
      </head>
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
