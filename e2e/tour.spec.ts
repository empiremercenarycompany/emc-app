import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "test-results/tour-shots";

async function openTour(page: Page) {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Take the tour" }).click();
  await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
}

async function advanceTo(page: Page, name: string) {
  const dialog = page.getByRole("dialog");
  for (let step = 0; step < 24; step += 1) {
    if ((await dialog.getByRole("heading", { name, exact: true }).count()) > 0) return;
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog).toBeVisible();
  }
  throw new Error(`Tour did not reach ${name}`);
}

test("a signed-out visit does not auto-start, and skip then replay works from the menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await openTour(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("1 of 22")).toBeVisible();
  await expect(dialog.getByText("Think of the app as our hall.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Back" })).toBeDisabled();

  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "The Barracks" })).toBeVisible();
  await expect(dialog.getByText("2 of 22")).toBeVisible();
  await dialog.getByRole("button", { name: "Back" }).click();
  await expect(dialog.getByRole("heading", { name: "Welcome" })).toBeVisible();

  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { name: "Recruitment Papers" })).toBeVisible();
  await expect(page).toHaveURL(/\/character\/new$/);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openTour(page);
  await expect(page.getByRole("dialog", { name: "Welcome" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Skip tour" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/profile");
  await expect(page.getByRole("button", { name: "Take the tour" })).toBeVisible();
});

test("larger text keeps the card on a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("emc-text", "large");
  });
  await page.goto("/");
  await openTour(page);
  const dialog = page.getByRole("dialog", { name: "Welcome" });
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  await expect(dialog.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Skip tour" })).toBeVisible();
});

test.describe("tour stills", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("welcome, papers, about you, shieldmate, sign-off, and the menu replay", async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(SHOTS, { recursive: true });

    for (const theme of ["light", "dark"] as const) {
      await page.goto("/");
      await page.evaluate((value) => localStorage.setItem("emc-theme", value), theme);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await openTour(page);
      await page.screenshot({ path: `${SHOTS}/${theme}-welcome.png` });

      await advanceTo(page, "Recruitment Papers");
      await expect(page.locator("[data-tour-spot='recruitment']")).toBeInViewport();
      await page.screenshot({ path: `${SHOTS}/${theme}-recruitment.png` });

      await advanceTo(page, "About you");
      await expect(page.locator("[data-tour-spot='about-you']")).toBeInViewport();
      await page.screenshot({ path: `${SHOTS}/${theme}-about-you.png` });

      await advanceTo(page, "Shieldmate");
      await expect(page.locator("[data-tour-spot='shieldmate']")).toBeInViewport();
      await page.screenshot({ path: `${SHOTS}/${theme}-shieldmate.png` });

      await advanceTo(page, "That's the hall");
      await expect(page.getByRole("dialog").getByText("Build Your Legend. Become the Hero.")).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/${theme}-sign-off.png` });

      await page.getByRole("dialog").getByRole("button", { name: "Skip tour" }).click();
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByRole("button", { name: "Take the tour" }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/${theme}-menu-replay.png` });
      await page.getByRole("button", { name: "Close" }).click();
    }
  });
});
