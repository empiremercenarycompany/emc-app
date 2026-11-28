import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("emc-theme", "light");
  });
});

test("a recruit can pick a Saturday table from the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/intake");
  const friend = page.getByRole("checkbox", { name: "Joining with a friend?" });
  const hall = page.getByRole("radiogroup", { name: "Pick your first choice" });
  const friendBox = await friend.boundingBox();
  const hallBox = await hall.boundingBox();
  expect(friendBox).not.toBeNull();
  expect(hallBox).not.toBeNull();
  expect(friendBox!.y).toBeLessThan(hallBox!.y);

  const first = page.getByRole("radio", { name: /first game Jan 2, 2027/ }).first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  const selected = page.locator("[role=radio][aria-checked=true]");
  await expect(selected).toHaveCount(1);
  const height = await selected.evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText(/You asked for Saturday/)).toBeVisible();
  await expect(page.getByText("Staff confirm every seat.", { exact: true })).toBeVisible();
  await friend.check();
  await expect(page.getByText("You'll sit together at this table. Your friend has 14 days to ENLIST.")).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/saturday-hall-phone.png", fullPage: true });
  await page.getByRole("button", { name: "Under 16" }).click();
  await expect(hall).toBeHidden();
  await expect(page.getByText("we'll add you to the teen waitlist")).toBeVisible();
});

test("the desktop hall shows all six tables", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/schedule");
  await expect(page.getByRole("link", { name: /first game Jan 2, 2027/ })).toHaveCount(3);
  await expect(page.getByRole("link", { name: /first game Jan 9, 2027/ })).toHaveCount(3);
  await expect(page.getByText("9 AM to 12 PM").first()).toBeVisible();
  await expect(page.getByText("Jan 2, 2027").first()).toBeVisible();
  const card = page.getByRole("link", { name: /Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027/ });
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: "e2e/screenshots/saturday-hall-desktop.png", fullPage: true });
});
