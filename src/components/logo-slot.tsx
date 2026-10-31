import type { ReactNode } from "react";

/**
 * Header, sign-in, and About use the transparent v2 mark. The heading is live type.
 * A light surface uses the parchment badge. Nothing is recolored or stretched.
 * Clear space is a quarter of the mark height.
 */
export function LogoSlot({ surface = "dark" }: { surface?: "dark" | "light" }) {
  if (surface === "light") {
    return (
      <div className="logo-on-parchment" data-logo-slot="light">
        <Mark src="/brand/emc_badge_light.png" className="logo-badge-img" />
      </div>
    );
  }
  return (
    <div className="logo-slot" data-logo-slot="image">
      <Mark src="/brand/emc_mark.png" className="logo-img" />
    </div>
  );
}

export function CompanyBadge() {
  return (
    <div className="logo-badge" data-logo-slot="badge">
      <Mark src="/brand/emc_mark.png" className="logo-mark-splash" />
    </div>
  );
}

function Mark({ src, className }: { src: string; className: string }): ReactNode {
  return (
    // The file is the approved artwork. next/image would resample it.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Empire Mercenary Company" className={className} />
  );
}
