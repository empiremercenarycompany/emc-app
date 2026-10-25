import type { Metadata, Viewport } from "next";
import { Cinzel, Lato, League_Spartan } from "next/font/google";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { FONT_PAIR } from "@/lib/brand";
import { loadViewer } from "@/lib/company";
import "./globals.css";

const spartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-spartan",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
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
    <html lang="en" data-font={FONT_PAIR} className={`${spartan.variable} ${cinzel.variable} ${lato.variable}`}>
      <body>
        <RegisterSw />
        {children}
        <SiteNav signedIn={Boolean(viewer.userId)} />
      </body>
    </html>
  );
}
