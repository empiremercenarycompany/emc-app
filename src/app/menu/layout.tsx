import type { Metadata } from "next";

export const metadata: Metadata = { title: "Menu" };

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
