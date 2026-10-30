"use client";

import { useState } from "react";

/**
 * Dark-background mark only. The file is gitignored at /brand/local/logo.png.
 * No recolor, no stretch, no glow. Clear space is a quarter of the mark height.
 * The wordmark shows until that file loads.
 */
export function LogoSlot() {
  const [ready, setReady] = useState(false);

  return (
    <div className="logo-slot border border-bronze" data-logo-slot={ready ? "image" : "wordmark"}>
      {ready ? null : (
        <p className="wordmark px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-parchment">
          EMPIRE MERCENARY COMPANY
        </p>
      )}
      {/* Optional local mark. next/image would require the file at build time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/local/logo.png"
        alt={ready ? "Empire Mercenary Company" : ""}
        className={ready ? "logo-img" : "logo-probe"}
        onLoad={() => setReady(true)}
        onError={() => setReady(false)}
      />
    </div>
  );
}
