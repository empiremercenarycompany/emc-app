import type { ReactNode } from "react";

/**
 * FINAL logo, 13 Nov 2026. The master is the full badge at about 128px and up.
 * The small mark is everything under that. Nothing is recolored, filtered, or stretched.
 * Clear space is a quarter of the mark height.
 */
export const MASTER_LOGO = "/brand/EMC_logo_master-app-mark-dark_2026-11-13_FINAL.svg";
export const SMALL_LOGO = "/brand/EMC_logo_small-mark_2026-11-13_FINAL.svg";

/** In-app mark under 128px. Not-found and other small slots. */
export function LogoSlot() {
  return (
    <div className="logo-slot" data-logo-slot="image">
      <Mark src={SMALL_LOGO} className="logo-img" />
    </div>
  );
}

/** Full logo on sign-in, About, and the confirm step. */
export function CompanyBadge() {
  return (
    <div className="logo-badge" data-logo-slot="badge">
      <Mark src={MASTER_LOGO} className="logo-mark-splash" />
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
