import { expect, test, type Page } from "@playwright/test";

async function openMenu(page: Page) {
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  const theme = page.getByRole("radiogroup", { name: "Theme" });
  await menu.click();
  if (!(await theme.isVisible())) await menu.click();
  await expect(theme).toBeVisible();
}

test("dark mode applies from the toggle and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("main").first()).toHaveCSS("background-color", "rgb(244, 235, 216)");

  await openMenu(page);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme-choice", "dark");
  await expect(page.locator("main").first()).toHaveCSS("background-color", "rgb(28, 25, 22)");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#1C1916");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("main").first()).toHaveCSS("background-color", "rgb(28, 25, 22)");
});

test("system follows the device color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme-choice", "system");

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await openMenu(page);
  await page.getByRole("radio", { name: "Light" }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
