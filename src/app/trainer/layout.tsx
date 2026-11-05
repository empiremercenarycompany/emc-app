import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trainer" };

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
