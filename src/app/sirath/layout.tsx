import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "@/components/sirath/sirath.css";

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Sirath",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SirathLayout({ children }: { children: React.ReactNode }) {
  return <div className={garamond.variable}>{children}</div>;
}
