import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recruitment Papers" };

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
