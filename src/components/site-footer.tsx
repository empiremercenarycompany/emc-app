import { headers } from "next/headers";
import { johnChoices } from "@/config/johnChoices";
import { discordInviteUrl, discordProgramForPath } from "@/lib/rules/discord-invite";

/** Player footer. Hidden on DM pages. Discord is omitted when that program's invite is unset. */
export async function SiteFooter() {
  const path = (await headers()).get("x-emc-path") ?? "";
  if (path === "/dm" || path.startsWith("/dm/")) return null;
  const href = discordInviteUrl(discordProgramForPath(path));
  return (
    <footer className="site-footer">
      <p className="signoff">Go forth and conquer.</p>
      <p className="site-footer-links">
        {href ? (
          <a href={href} rel="noreferrer">
            Discord
          </a>
        ) : null}
        <a href="/privacy">Privacy</a>
        <a href="/terms">
          Terms
          <span className="sr-only">, effective {johnChoices.termsEffectiveDate}</span>
        </a>
      </p>
    </footer>
  );
}
