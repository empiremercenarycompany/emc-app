import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { headingFace } from "@/lib/brand";
import { loadViewer } from "@/lib/company";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Empire Mercenary Company", template: "%s · EMC" },
  description: "A squad, a story, and a reason to keep showing up.",
  applicationName: "EMC",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "EMC",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await loadViewer();
  const corleone = headingFace() === "Corleone";
  return (
    <html lang="en" data-font={corleone ? "corleone" : "barlow"} className={`${barlow.variable} ${condensed.variable}`}>
      <body>
        {corleone ? (
          <style>{`@font-face{font-family:Corleone;src:url("/brand/local/Corleone.woff2") format("woff2");font-weight:700;font-style:normal;font-display:swap;}`}</style>
        ) : null}
        <RegisterSw />
        {children}
        <SiteNav signedIn={Boolean(viewer.userId)} />
      </body>
    </html>
  );
}
