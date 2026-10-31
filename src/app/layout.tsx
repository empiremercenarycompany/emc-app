import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { loadViewer, sessionRoleLabel } from "@/lib/company";
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
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "EMC",
    statusBarStyle: "black",
    startupImage: "/icons/apple-splash.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await loadViewer();
  const roleLabel = sessionRoleLabel(viewer.role, viewer.canApproveLore);
  return (
    <html lang="en" data-font="barlow" className={`${barlow.variable} ${condensed.variable}`}>
      <body>
        <RegisterSw />
        {viewer.userId ? (
          <div className="identity-bar">
            <Link href="/profile" className="identity">
              {viewer.avatarUrl ? (
                // The portrait is the recruit's own mark. next/image would resample a remote file we do not host.
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src={viewer.avatarUrl} alt="" />
              ) : (
                <span className="avatar" aria-hidden="true">
                  {(viewer.displayName?.trim().charAt(0) || "R").toUpperCase()}
                </span>
              )}
              <span>
                {viewer.displayName?.trim() || "Recruit"}
                {roleLabel ? ` · ${roleLabel}` : ""}
              </span>
            </Link>
          </div>
        ) : null}
        {children}
        <SiteNav signedIn={Boolean(viewer.userId)} role={viewer.role} />
      </body>
    </html>
  );
}
