import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { CodexProviders } from "@/components/codex-provider";
import { DisplayFace } from "@/components/display-face";
import { FeedbackDock } from "@/components/feedback-dock";
import { SiteNav } from "@/components/nav";
import { RegisterSw } from "@/components/register-sw";
import { TEXT_SIZE_KEY } from "@/lib/text-size";
import { loadViewer, sessionRoleLabel } from "@/lib/company";
import { loadSirathBadge } from "@/lib/sirath/load";
import { recruitName } from "@/lib/recruit-name";
import "./globals.css";
import "@/components/sirath/sirath.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-nunito",
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
  const sirathNew = await loadSirathBadge(viewer.character?.id ?? null);
  return (
    <html lang="en" data-font="body" className={nunito.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400;1,600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})==="large")document.documentElement.dataset.font="large"}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <RegisterSw />
        <DisplayFace />
        <CodexProviders beginner={viewer.beginner} userId={viewer.userId}>
          <SiteNav
            signedIn={Boolean(viewer.userId)}
            role={viewer.role}
            displayName={recruitName({
              characterName: viewer.character?.name,
              displayName: viewer.displayName,
              email: viewer.email,
            })}
            roleLabel={roleLabel}
            sirathNew={sirathNew}
          />
          {children}
          <FeedbackDock />
        </CodexProviders>
      </body>
    </html>
  );
}
