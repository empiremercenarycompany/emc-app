import type { ReactNode } from "react";

/**
 * Dark UI uses the transparent white/red badge.
 * A light screen does not get a new logo. The same mark sits on an Iron Black panel.
 * The full badge on black is the splash and the About screen.
 * No recolor, no stretch, no glow. Clear space is a quarter of the mark height.
 */
export function LogoSlot({ surface = "dark" }: { surface?: "dark" | "light" }) {
  if (surface === "light") {
    return (
      <div className="logo-on-iron" data-logo-slot="iron-panel">
        <Mark src="/brand/emc_logo.png" className="logo-img" />
      </div>
    );
  }
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
