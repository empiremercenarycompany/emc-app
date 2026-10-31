import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { CodexProviders } from "@/components/codex-provider";
import { DisplayFace } from "@/components/display-face";
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
  themeColor: "#1A1613",
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
        <DisplayFace />
        <CodexProviders beginner={viewer.beginner} userId={viewer.userId}>
          <SiteNav
            signedIn={Boolean(viewer.userId)}
            role={viewer.role}
            displayName={viewer.displayName}
            avatarUrl={viewer.avatarUrl}
            roleLabel={roleLabel}
          />
          {children}
        </CodexProviders>
      </body>
    </html>
  );
}
