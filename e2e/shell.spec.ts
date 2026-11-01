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
  await expect(page.getByText(/No password is stored/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Discord" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Google" })).toBeDisabled();
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

test("weekly check-in explains the Friday cutoff", async ({ page }) => {
  await page.goto("/check-in");
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible();
  await expect(page.getByText(/Friday at 11:59 PM/)).toBeVisible();
  await expect(page.getByText("Known · week 4")).toBeVisible();
  await expect(page.getByText("Vouched For · week 20")).toBeVisible();
  await expect(page.getByText("Esteemed of Bleakspire · week 52")).toBeVisible();
  await expect(page.getByText(/Pillar of Bleakspire II/)).toBeVisible();
});

test("work opens on one record form", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Record work" })).toBeVisible();
  await expect(page.getByLabel("What you did")).toBeVisible();
  await expect(page.getByLabel("What kind of work?")).toBeVisible();
  await expect(page.getByText("Counts toward Strength or Dexterity.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record work" })).toBeVisible();
});

test("the sheet asks you to sign in", async ({ page }) => {
  await page.goto("/character");
  await expect(page.getByText("Sign in to open your sheet.")).toBeVisible();
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
  await expect(page.getByText(/Today, [A-Za-z]+, [A-Za-z]+ \d{1,2}/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Times" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company calendar" })).toBeVisible();
  await expect(page.getByText("9–12")).toBeVisible();
  await expect(page.getByText("2–5")).toBeVisible();
  await expect(page.getByText("7–10 PM")).toBeVisible();
  await expect(page.getByText("(18+)")).toBeVisible();
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
