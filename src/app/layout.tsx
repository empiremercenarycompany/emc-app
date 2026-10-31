import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { loadViewer } from "@/lib/company";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-barlow",
  display: "swap",
});

const condensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
  return (
    <html lang="en" data-font="barlow" className={`${barlow.variable} ${condensed.variable}`}>
      <body>
        <RegisterSw />
        {children}
        <SiteNav signedIn={Boolean(viewer.userId)} />
      </body>
    </html>
  );
}
