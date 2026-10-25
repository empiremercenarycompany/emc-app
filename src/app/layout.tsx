import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { loadViewer } from "@/lib/company";
import "./globals.css";

const spartan = localFont({
  src: [
    { path: "../../public/fonts/LeagueSpartan-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/LeagueSpartan-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-spartan",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Empire Mercenary Company", template: "%s · EMC" },
  description: "Train. Record. Advance.",
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
    <html lang="en" className={spartan.variable}>
      <body>
        <RegisterSw />
        {children}
        <SiteNav signedIn={Boolean(viewer.userId)} />
      </body>
    </html>
  );
}
