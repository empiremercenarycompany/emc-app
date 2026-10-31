import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile shots of the recruit path", async ({ page }) => {
  const shots: [string, string][] = [
    ["/", "home"],
    ["/character", "character"],
    ["/character/new", "recruitment-papers"],
    ["/check-in", "check-in"],
  ];
  for (const [path, name] of shots) {
    await page.goto(path);
    if (path === "/character") {
      await page.getByRole("tab", { name: "Attacks" }).click();
      await expect(page.getByRole("tabpanel", { name: "Skills" })).toBeHidden();
      const pill = page.locator(".ability-pill").first();
      const box = await pill.boundingBox();
      const score = await pill.locator(".ability-score").boundingBox();
      expect(box).not.toBeNull();
      expect(score).not.toBeNull();
      expect(score!.x).toBeGreaterThanOrEqual(box!.x - 1);
      expect(score!.x + score!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
    }
    await page.screenshot({ path: `e2e/screenshots/ux-390-${name}.png`, fullPage: true });
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/ux-390-menu.png", fullPage: true });
});
