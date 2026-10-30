import type { ReactNode } from "react";

/**
 * Dark UI uses the transparent white/red mark.
 * Light surfaces keep the wordmark. There is no light-background file yet.
 * The full badge on black is the splash and the About screen.
 * No recolor, no stretch, no glow. Clear space is a quarter of the mark height.
 */
export function Wordmark() {
  return (
    <div className="logo-slot border border-bronze" data-logo-slot="wordmark">
      <p className="wordmark px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-parchment">
        EMPIRE MERCENARY COMPANY
      </p>
    </div>
  );
}

export function LogoSlot({ surface = "dark" }: { surface?: "dark" | "light" }) {
  if (surface === "light") return <Wordmark />;
  return (
    <div className="logo-slot" data-logo-slot="image">
      <Mark src="/brand/emc_logo.png" className="logo-img" />
    </div>
  );
}

export function CompanyBadge() {
  return (
    <div className="logo-badge" data-logo-slot="badge">
      <Mark src="/brand/logo_dark.png" className="logo-badge-img" />
    </div>
  );
}

function Mark({ src, className }: { src: string; className: string }): ReactNode {
  return (
    // The file is already the final artwork. next/image would resample it.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Empire Mercenary Company" className={className} />
  );
}
