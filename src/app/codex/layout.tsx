import type { Metadata } from "next";

export const metadata: Metadata = { title: "Codex" };

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
