import type { ReactNode } from "react";
import { CompanyBadge, LogoSlot } from "@/components/logo-slot";
import type { Impact } from "@/lib/types";

export { LogoSlot };

export function Page({
  title,
  lede,
  badge = false,
  hero = false,
  mark = false,
  children,
}: {
  title?: string;
  lede?: string;
  /** Larger mark on sign-in and About. The title under it is live type. */
  badge?: boolean;
  /** Centered hero band. Body under it stays left aligned. */
  hero?: boolean;
  /** The app header already carries the mark. Sign-in and About pass a badge instead. */
  mark?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="page-pad page-wrap px-4 pt-4">
      {badge ? <CompanyBadge /> : mark ? <LogoSlot /> : null}
      {hero ? (
        <header className="hero-band">
          {lede ? <p className="eyebrow hero-kicker">{lede}</p> : null}
          {title ? <h1>{title}</h1> : null}
        </header>
      ) : (
        <>
          {title ? <h1 className="mt-4 text-4xl">{title}</h1> : null}
          {lede ? <p className="mt-2 text-left">{lede}</p> : null}
        </>
      )}
      <div className="page-grid mt-4">{children}</div>
      <p className="signoff">Go forth and conquer.</p>
    </main>
  );
}

export function Panel({
  title,
  children,
  paper = false,
  wide = false,
}: {
  title?: string;
  children: ReactNode;
  paper?: boolean;
  wide?: boolean;
}) {
  return (
    <section className={`${paper ? "paper" : "card"} ${wide ? "span-all" : ""}`}>
      {title ? <h2 className="mb-3">{title}</h2> : null}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>;
}

const POOL_LABEL: Record<string, string> = {
  physical: "Workouts",
  constitution: "Nutrition and sleep",
  mental: "Mental",
  social: "Social",
  free: "Attendance",
};

export function ImpactCard({ impact }: { impact: Impact }) {
  const delta = impact.points_delta ?? 0;
  const pool = impact.pool ? POOL_LABEL[impact.pool] ?? impact.pool : null;
  let headline = "Saved.";
  if (impact.replayed) headline = "This log was already saved.";
  else if (impact.status === "pending") headline = "Saved. Waiting for staff.";
  else if (impact.status === "awarded" && delta > 0 && pool) {
    headline = `Saved. ${pool} is ready to place.`;
  } else if (impact.status === "none") headline = "Saved. Nothing new is ready to place.";

  return (
    <div className="border border-steel bg-iron p-3" data-testid="impact">
      <p className="font-bold">{headline}</p>
      {impact.unspent_after ? (
        <p className="text-mute">
          Ready to place · Workouts {impact.unspent_after.physical} · Nutrition and sleep{" "}
          {impact.unspent_after.constitution} · Mental {impact.unspent_after.mental}
          {impact.unspent_after.social != null ? ` · Social ${impact.unspent_after.social}` : ""}
          {impact.unspent_after.free != null ? ` · Attendance ${impact.unspent_after.free}` : ""}
        </p>
      ) : null}
      {impact.objective_progress?.current_value != null ? (
        <p className="text-mute">
          Objective {impact.objective_progress.current_value}
          {impact.objective_progress.target_value != null ? ` / ${impact.objective_progress.target_value}` : ""}
        </p>
      ) : null}
    </div>
  );
}
