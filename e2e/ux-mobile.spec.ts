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
      const crest = page.locator(".crest").first();
      const box = await crest.boundingBox();
      const score = await crest.locator(".crest-mod").boundingBox();
      expect(box).not.toBeNull();
      expect(score).not.toBeNull();
      expect(score!.x).toBeGreaterThanOrEqual(box!.x - 1);
      expect(score!.x + score!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
      await page.getByRole("tab", { name: "Skills" }).click();
      await expect(page.getByRole("tabpanel", { name: "Overview" })).toBeHidden();
    }
    await page.screenshot({ path: `e2e/screenshots/ux-390-${name}.png`, fullPage: true });
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.screenshot({ path: "e2e/screenshots/ux-390-menu.png", fullPage: true });
});
