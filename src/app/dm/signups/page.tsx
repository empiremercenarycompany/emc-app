import { redirect } from "next/navigation";
import { Notice, Page, Panel } from "@/components/ui";
import { loadViewer } from "@/lib/company";
import { SIGNUP_COLUMNS } from "@/lib/notify/signup-fields";
import { loadSignups } from "@/lib/signups";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types";

export const metadata = { title: "Sign-ups" };

export default async function SignupsPage() {
  const viewer = await loadViewer();
  if (!viewer.userId) redirect("/sign-in");
  if (!isStaff(viewer.role)) redirect("/");
  const supabase = await createClient();
  const loaded = supabase ? await loadSignups(supabase) : { rows: [], error: "Sign-ups could not be loaded." };

  return (
    <Page title="Sign-ups" lede="Accounts and enlist details. Players do not see this page.">
      <a className="button primary" href="/dm/signups/export">
        Download CSV
      </a>
      {loaded.error ? <Notice>{loaded.error}</Notice> : null}
      {!loaded.error && loaded.rows.length === 0 ? <p>No accounts yet.</p> : null}
      {loaded.rows.map((row) => (
        <Panel key={row.userId || row.email} title={row.displayName || row.email || "Account"}>
          <dl className="signup-fields">
            {SIGNUP_COLUMNS.filter((column) => column.key !== "displayName").map((column) => (
              <div key={column.key} className="contents">
                <dt>{column.label}</dt>
                <dd>{row[column.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
    </Page>
  );
}
