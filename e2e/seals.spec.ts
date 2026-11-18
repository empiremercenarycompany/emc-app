import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("a company notice carries Valthar's signature and the company seal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/documents");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const notice = page.getByTestId("sealed-document");
  await expect(notice.getByRole("heading", { name: "From the Company" })).toBeVisible();
  await expect(notice.getByText("Go forth and conquer.")).toBeVisible();
  const signature = notice.getByTestId("signature");
  await expect(signature).toHaveText("Valthar Brightlance");
  await expect(signature).toHaveAttribute("data-signer", "valthar");
  const pixels = await signature.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(pixels).toBeGreaterThanOrEqual(1.35 * 16);
  const seal = notice.getByTestId("wax-seal");
  await expect(seal).toHaveAttribute("aria-label", "Wax seal of Empire Mercenary Company");
  await expect(page.getByRole("heading", { name: "What a genuine seal looks like" })).toBeVisible();
  await expect(page.getByTestId("genuine-seal").getByTestId("wax-seal")).toHaveAttribute("data-size", "reference");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/false seal|not genuine|forged/i);
  const html = await page.content();
  expect(html).not.toContain("data-genuine");
  expect(html).not.toMatch(/genuine=/i);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
});

test("the seal stays visible on the night ledger", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("emc-theme", "dark"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/documents");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("main").first()).toHaveCSS("background-color", "rgb(28, 25, 22)");
  await expect(page.getByTestId("sealed-document").getByTestId("wax-seal")).toBeVisible();
  await expect(page.getByTestId("genuine-seal").getByTestId("wax-seal")).toBeVisible();
});
