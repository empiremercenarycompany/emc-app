import { expect, test } from "@playwright/test";

test("barracks shows the company lines", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("A squad, a story, and a reason to keep showing up.")).toBeVisible();
  await expect(page.getByText("Train. Record. Advance.").first()).toBeVisible();
  await expect(page.getByText("Your week shapes your character and the story.")).toBeVisible();
  await expect(page.getByText("Go forth and conquer.")).toBeVisible();
  await expect(page.locator("img[src='/brand/emc_logo.png']")).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the Company" })).toBeVisible();
});

test("about attributes the SRD and stays clear of invented place copy", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("img[src='/brand/logo_dark.png']")).toBeVisible();
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
  await expect(page.locator("img[src='/brand/logo_dark.png']")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the Company" })).toBeVisible();
  await expect(page.getByText(/No password is stored/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Discord" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Google" })).toBeDisabled();
});

test("table muster lists the roster columns", async ({ page }) => {
  await page.goto("/muster");
  await expect(page.getByRole("heading", { name: "Table Muster" })).toBeVisible();
  await expect(page.getByText("Nutrition and sleep").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve all" })).toBeVisible();
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
});

test("work opens on one record form", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Record work" })).toBeVisible();
  await expect(page.getByLabel("What you did")).toBeVisible();
  await expect(page.getByLabel("This counts toward")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record work" })).toBeVisible();
});

test("the sheet asks you to sign in", async ({ page }) => {
  await page.goto("/character");
  await expect(page.getByText("Sign in to open your sheet.")).toBeVisible();
  await expect(page.getByText("Not final yet: see your DM or trainer to lock these in")).toBeVisible();
  await expect(page.getByText("Ready to move")).toBeVisible();
  await expect(page.getByText("Locked")).toBeVisible();
});

test("trainer check-in shows the finalize step", async ({ page }) => {
  await page.goto("/trainer");
  await expect(page.getByRole("heading", { name: "Trainer" })).toBeVisible();
  await expect(page.getByText("Not final yet: see your DM or trainer to lock these in")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalize stats" })).toBeVisible();
});

test("table muster can finalize the squad", async ({ page }) => {
  await page.goto("/muster");
  await expect(page.getByRole("button", { name: "Finalize stats" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalize all" })).toBeVisible();
});

test("the calendar shows off-weeks and three-parters", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByText("America/Denver")).toBeVisible();
  await expect(page.getByText("Three-parter 1 · 2027-01-04 to 2027-01-31")).toBeVisible();
  await expect(page.getByText("Off-week · 2027-02-01 to 2027-02-14")).toBeVisible();
});

test("staff notes are not on the player sheet", async ({ page }) => {
  await page.goto("/notes");
  await expect(page.getByText("Players do not see these notes.")).toBeVisible();
  await page.goto("/character");
  await expect(page.getByRole("button", { name: "Set level" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record milestone" })).toHaveCount(0);
});

test("the sheet sections swipe", async ({ page }) => {
  await page.goto("/character");
  const skills = page.getByRole("tab", { name: "Skills" });
  await skills.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Attacks" })).toHaveAttribute("aria-selected", "true");
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
  await page.getByRole("tab", { name: "NPCs" }).click();
  await page.getByLabel("Name").fill("Mara");
  await page.getByLabel("Relationship to me").fill("Sister");
  await expect(page.getByTestId("npc-counter")).toHaveText("6 / 500");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Pending: your DM will review this")).toBeVisible();
});

test("the muster queue can approve or send a note back", async ({ page }) => {
  await page.goto("/muster");
  await expect(page.getByRole("heading", { name: "NPC review" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send back" })).toBeVisible();
});

test("the manifest names the company", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.short_name).toBe("EMC");
  expect(body.display).toBe("standalone");
  expect(body.background_color).toBe("#111111");
  expect(body.icons.some((icon: { src: string }) => icon.src === "/brand/emc_mark_helm_square.png")).toBe(true);
});
