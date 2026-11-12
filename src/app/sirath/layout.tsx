import type { Metadata } from "next";
import "@/components/sirath/sirath.css";

export const metadata: Metadata = {
  title: "The Sirath",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SirathLayout({ children }: { children: React.ReactNode }) {
  return children;
}
