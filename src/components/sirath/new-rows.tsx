import Link from "next/link";
import type { SirathView } from "@/lib/sirath/types";
import "./sirath.css";

export function SirathNewRows({
  view,
  as,
}: {
  view: SirathView | null;
  as?: string | null;
}) {
  if (!view) return null;
  const session = view.home.latest_session;
  const sid = session ? encodeURIComponent(session.id) : "";
  const query = new URLSearchParams();
  if (as) query.set("as", as);
  if (sid) query.set("session", session?.id ?? "");
  const row = (id: string, from: string) => {
    const item = view.entries.find((entry) => entry.id === id);
    if (!item) return null;
    const params = new URLSearchParams(query);
    params.set("from", from);
    return (
      <Link key={`${from}-${id}`} className="sirath-new" href={`/sirath/${id}?${params.toString()}`}>
        <span>
          <span className="t">New in The Sirath</span>
          <br />
          {item.display_name}
        </span>
        <span aria-hidden="true">›</span>
      </Link>
    );
  };
  const recap = view.home.new_from_session_ids.map((id) => row(id, "session"));
  const check = view.home.new_from_checkin_ids.map((id) => row(id, "check-in"));
  return (
    <div className="span-all">
      <section className="sirath-leather">
        <h2>Session recap{view.home.last_session ? ` · ${view.home.last_session.session.label}${view.home.last_session.session.date ? ` ${view.home.last_session.session.date}` : ""}` : ""}</h2>
        <p>{view.home.last_session?.summary ?? "No sessions yet. Your first muster is coming."}</p>
        {recap.some(Boolean) ? recap : <p>Nothing new in The Sirath from this session.</p>}
      </section>
      <section className="sirath-leather">
        <h2>Check-in</h2>
        <p>Knowledge rolls the DM recorded with your check-in.</p>
        {check.some(Boolean) ? check : <p>Nothing new in The Sirath from check-ins.</p>}
      </section>
    </div>
  );
}
