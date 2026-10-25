import { expect, test } from "@playwright/test";

test("barracks shows the company lines", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Build Your Legend. Become the Hero.")).toBeVisible();
  await expect(page.getByText("Train. Record. Advance.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

test("about attributes the SRD and stays clear of invented place copy", async ({ page }) => {
  await page.goto("/about");
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
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a link" })).toBeVisible();
  await expect(page.getByText(/No password is stored/)).toBeVisible();
});

test("the sheet asks you to sign in", async ({ page }) => {
  await page.goto("/character");
  await expect(page.getByText("Sign in to open your sheet.")).toBeVisible();
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

test("the manifest names the company", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.short_name).toBe("EMC");
  expect(body.display).toBe("standalone");
  expect(body.background_color).toBe("#111111");
});
