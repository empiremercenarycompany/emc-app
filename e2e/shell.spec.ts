import { expect, test } from "@playwright/test";

test("barracks shows the company lines", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("A squad, a story, and a reason to keep showing up.")).toBeVisible();
  await expect(page.getByText("Train. Record. Advance.")).toHaveCount(0);
  await expect(page.getByText("Your week shapes your character and the story.")).toHaveCount(0);
  await expect(page.getByText("Go forth and conquer.")).toBeVisible();
  await expect(page.locator("img[src='/brand/emc_mark.png']").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the Company" })).toBeVisible();
});

test("about attributes the SRD and stays clear of invented place copy", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("img[src='/brand/emc_mark.png']").first()).toBeVisible();
  await expect(page.getByText("Bleakspire is a fortress with a small city around it.")).toBeVisible();
  await expect(page.getByText(/Creative Commons Attribution 4\.0/)).toBeVisible();
  await expect(page.getByText(/System Reference Document 5\.2/)).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body.toLowerCase()).not.toContain("fortress city");
  expect(body).not.toMatch(/\bGods?\b/);
});

test("dice roller keeps a total", async ({ page }) => {
  await page.goto("/dice");
  await page.getByLabel("Dice expression").fill("2d6+1");
  await page.getByRole("button", { name: "Roll" }).click();
  const total = page.getByTestId("dice-result").locator("p").first();
  await expect(total).toBeVisible();
  const value = Number(await total.textContent());
  expect(value).toBeGreaterThanOrEqual(3);
  expect(value).toBeLessThanOrEqual(13);
});

test("sign-in asks for an email link", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Join the Company" })).toBeVisible();
  await expect(page.locator("img[src='/brand/emc_mark.png']").first()).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send my sign-in link" })).toBeVisible();
  await expect(page.getByText("Already with the Company? The same link brings you back.")).toBeVisible();
  await expect(page.getByText("Signed up on empiremercenarycompany.com? Use the same email.")).toBeVisible();
  await expect(page.getByRole("link", { name: "empiremercenarycompany.com" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Feedback" })).toHaveCount(0);
  await expect(page.getByText(/No password is stored/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Discord" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Google" })).toHaveCount(0);
  await expect(page.getByText(/stay off until the Company configures them/)).toHaveCount(0);
  await page.goto("/sign-in?error=link");
  await expect(
    page.getByText("That link has to be opened in the same browser that asked for it. Request another below."),
  ).toBeVisible();
});

test("confirm waits for Continue and the old callback still answers", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=example-token&type=email&next=//evil.com");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(page.getByText("That link did not sign you in. Request another.")).toHaveCount(0);
  await expect(page.locator("input[name=next]")).toHaveValue("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("That link did not sign you in. Request another.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/sign-in");

  await page.goto("/auth/confirm");
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();

  await page.goto("/auth/callback?next=//evil.com");
  await expect(page).toHaveURL(/\/sign-in\?error=link$/);
});

test("table muster is closed to a player", async ({ page }) => {
  await page.goto("/muster");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Approve all" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finalize all" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send back" })).toHaveCount(0);
});

test("the buff menu names the temporary awards", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "Buff menu" })).toBeVisible();
  await expect(page.getByText("Heroic inspiration")).toBeVisible();
  await expect(page.getByText("+2 damage on one attack")).toBeVisible();
  await expect(page.getByText("Advantage on one check")).toBeVisible();
});

test("logged-out pages offer a sign-in button", async ({ page }) => {
  for (const path of ["/missions", "/squad", "/library", "/journal", "/goals", "/check-in", "/profile"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
  }
  await page.goto("/journal");
  await expect(page.getByRole("button", { name: "Save exercise" })).toHaveCount(0);
  await page.goto("/check-in");
  await expect(page.getByRole("button", { name: "File your check-in" })).toHaveCount(0);
  await page.goto("/character/new");
  await expect(page.getByRole("button", { name: "Sign the Papers" })).toHaveCount(0);
});

test("weekly check-in explains the Friday cutoff", async ({ page }) => {
  await page.goto("/check-in");
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible();
  await expect(page.getByText(/Friday at 11:59 PM/)).toBeVisible();
  await expect(page.getByText("Known · week 4")).toBeVisible();
  await expect(page.getByText("Vouched For · week 20")).toBeVisible();
  await expect(page.getByText("Esteemed of Bleakspire · week 52")).toBeVisible();
  await expect(page.getByText(/Pillar of Bleakspire II/)).toBeVisible();
});

test("work stays closed until you sign in", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What do you want to log?" })).toHaveCount(0);
  await expect(page.getByLabel("What you did")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record work" })).toHaveCount(0);
});

test("shieldmate choices stay hidden until asked", async ({ page }) => {
  await page.goto("/character");
  const box = page.getByRole("checkbox", { name: "Signing up with a friend? Get the Shieldmate bonus" });
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  await expect(page.getByLabel("Their character or name")).toHaveCount(0);
  await expect(page.getByLabel("Proficiency")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Request the bonus" })).toHaveCount(0);
  await box.check();
  const partner = page.getByLabel("Their character or name");
  await expect(partner).toBeVisible();
  await expect(page.getByLabel("Proficiency")).toBeVisible();
  await partner.fill("A friend");
  await box.uncheck();
  await expect(page.getByLabel("Their character or name")).toHaveCount(0);
  await expect(page.getByLabel("Proficiency")).toHaveCount(0);
  await box.check();
  await expect(page.getByLabel("Their character or name")).toHaveValue("");
});

test("the sheet asks you to sign in", async ({ page }) => {
  await page.goto("/character");
  await expect(page.getByText("Sign in to open your sheet.")).toBeVisible();
  await expect(page.locator("img[src='/portraits/fallback.svg']").first()).toBeVisible();
  await page.getByRole("tab", { name: "Progress" }).click();
  await expect(page.getByText("Not final yet: see your DM or trainer to lock these in")).toBeVisible();
  await expect(page.getByText("Ready to move")).toBeVisible();
  await expect(page.getByText("Locked")).toBeVisible();
  await expect(page.getByText(/Build \d+ of 27/)).toHaveCount(0);
});

test("trainer check-in is closed to a player", async ({ page }) => {
  await page.goto("/trainer");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Finalize stats" })).toHaveCount(0);
});

test("the old calendar route opens the schedule", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Calendar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Next session" })).toBeVisible();
  await expect(page.getByText("Next session: Not posted yet. Sessions are every other Saturday.")).toBeVisible();
  await expect(page.getByText(/^Today,/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Times" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company calendar" })).toBeVisible();
  await expect(page.getByText("9 AM–12 PM")).toBeVisible();
  await expect(page.getByText("2–5 PM")).toBeVisible();
  await expect(page.getByText("7–10 PM (18+)")).toBeVisible();
  await expect(page.getByText("Nothing else marked.")).toBeVisible();
  await expect(page.getByText("This sample is not the company schedule")).toHaveCount(0);
  await expect(page.getByText("America/Denver")).toHaveCount(0);
  await expect(page.getByText("America/Boise")).toHaveCount(0);
});

test("staff notes are not on the player sheet", async ({ page }) => {
  await page.goto("/notes");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/character");
  await expect(page.getByRole("button", { name: "Set level" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record milestone" })).toHaveCount(0);
});

test("the sheet sections swipe", async ({ page }) => {
  await page.goto("/character");
  const skills = page.getByRole("tab", { name: "Skills" });
  await skills.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Gear" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Skills" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Unarmed strike/ })).toBeVisible();
});

test("the dice roller keeps a d20", async ({ page }) => {
  await page.goto("/dice");
  await page.getByRole("button", { name: "d20" }).click();
  await page.getByRole("button", { name: "Roll" }).click();
  await expect(page.getByTestId("dice-result")).toBeVisible();
});

test("an NPC note can be submitted for review", async ({ page }) => {
  await page.goto("/character");
  await page.getByRole("tab", { name: "Story" }).click();
  await page.getByLabel("Name").fill("Mara");
  await page.getByLabel("Relationship to me").fill("Sister");
  await expect(page.getByTestId("npc-counter")).toHaveText("6 / 500");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Pending: your DM will review this")).toBeVisible();
});

test("the menu opens an overlay and does not 404", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toHaveAttribute("type", "button");
  await menu.click();
  const overlay = page.getByRole("dialog", { name: "Menu" });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole("link", { name: "Schedule", exact: true })).toHaveCount(1);
  await expect(overlay.getByRole("link", { name: "Calendar", exact: true })).toHaveCount(0);
  await expect(overlay.getByRole("link", { name: "Table Muster" })).toHaveCount(0);
  await expect(overlay.getByRole("link", { name: "Trainer" })).toHaveCount(0);
  await expect(overlay.getByRole("link", { name: "Notes" })).toHaveCount(0);
  await expect(overlay.getByRole("link", { name: "Help & FAQ" })).toHaveAttribute("href", "/codex#faq");
  const background = await overlay.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(background).toBe("rgb(26, 22, 19)");
  await page.goto("/menu");
  await expect(page).not.toHaveURL(/\/menu$/);
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
});

test("home content clears the bottom nav", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  const nav = page.locator("nav");
  const pad = await main.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom));
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  expect(pad).toBeGreaterThan(navBox!.height);
});

test("help mode outlines a term and the codex stays on the page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explain words" }).click();
  await expect(page.getByText("Explain words is on.")).toBeVisible();
  const term = page.getByRole("button", { name: "muster" }).first();
  await expect(term).toBeVisible();
  const outline = await term.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await term.click();
  await page.getByRole("button", { name: "Open in the Codex" }).click();
  await expect(page).toHaveURL("/");
  const codex = page.getByRole("dialog", { name: "Codex" });
  await expect(codex).toBeVisible();
  await codex.getByRole("button", { name: "Back" }).click();
  await expect(codex).toHaveCount(0);
  await expect(page).toHaveURL("/");
});

test("a term sheet button stays readable on the cream sheet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "muster" }).first().click();
  const got = page.getByRole("button", { name: "Got it" });
  await expect(got).toBeVisible();
  const color = await got.evaluate((element) => getComputedStyle(element).color);
  expect(color).toBe("rgb(33, 27, 21)");
});

test("goals stays closed until a player opens a sheet", async ({ page }) => {
  await page.goto("/goals");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
});

test("feedback opens from the button and from the menu", async ({ page }) => {
  await page.goto("/goals");
  await page.getByRole("button", { name: "Feedback" }).click();
  const dialog = page.getByRole("dialog", { name: "Send feedback" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("dialog", { name: "Send feedback" })).toBeVisible();
  await page.getByLabel("Note").fill("The goals sheet closed.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("dialog", { name: "Send feedback" }).getByRole("alert")).toContainText(
    "Supabase is not configured",
  );
});

test("pages name themselves and offer a skip link", async ({ page }) => {
  await page.goto("/missions");
  await expect(page).toHaveTitle("Missions · EMC");
  await expect(page.locator("a.skip")).toHaveAttribute("href", "#main");
  await expect(page.locator("main#main")).toBeVisible();
});

test("empty boards name a next step, and the app can be installed", async ({ page }) => {
  await page.goto("/missions");
  await expect(page.getByRole("link", { name: "See the schedule" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Larger text" })).toBeVisible();
  await expect(page.getByText("On iPhone: Share, then Add to Home Screen.")).toBeVisible();
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "Offline" })).toBeVisible();
});

test("the manifest names the company", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.short_name).toBe("EMC");
  expect(body.display).toBe("standalone");
  expect(body.background_color).toBe("#111111");
  expect(body.icons.some((icon: { src: string }) => icon.src === "/brand/emc_app_icon.png")).toBe(true);
  expect(body.icons.some((icon: { src: string; purpose?: string }) => icon.src === "/icons/icon-maskable-512.png" && icon.purpose === "maskable")).toBe(true);
  expect(body.theme_color).toBe("#111111");
});
