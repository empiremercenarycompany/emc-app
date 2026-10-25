import type { ReactNode } from "react";
import type { Impact } from "@/lib/types";

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-mute">Empire Mercenary Company</p>
      <h1 className="mt-1 text-4xl">{title}</h1>
      {lede ? <p className="mt-2 text-mute">{lede}</p> : null}
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </main>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="border border-steel p-4">
      {title ? <h2 className="mb-3">{title}</h2> : null}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="border border-steel p-3 text-mute">{children}</p>;
}

const POOL_LABEL: Record<string, string> = {
  physical: "Physical",
  constitution: "Constitution",
  mental: "Mental",
};

export function ImpactCard({ impact }: { impact: Impact }) {
  const delta = impact.points_delta ?? 0;
  const pool = impact.pool ? POOL_LABEL[impact.pool] ?? impact.pool : null;
  let headline = "Saved.";
  if (impact.replayed) headline = "This log was already saved.";
  else if (impact.status === "pending") headline = "Saved. Waiting for staff.";
  else if (impact.status === "awarded" && delta > 0 && pool) headline = `Saved. +${delta} ${pool}.`;
  else if (impact.status === "none") headline = "Saved. No automatic points for this log.";

  return (
    <div className="border border-steel bg-iron p-3" data-testid="impact">
      <p className="font-bold">{headline}</p>
      {impact.build_total != null ? (
        <p className="mt-1 text-mute">Build total {impact.build_total}</p>
      ) : null}
      {impact.unspent_after ? (
        <p className="text-mute">
          Unspent Physical {impact.unspent_after.physical}, Constitution {impact.unspent_after.constitution}, Mental{" "}
          {impact.unspent_after.mental}
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
