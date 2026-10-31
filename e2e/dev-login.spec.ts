import { expect, test } from "@playwright/test";

test("dev login stays hidden without the flag", async ({ page, request }) => {
  test.skip(process.env.E2E_DEV_LOGIN === "1", "This server was started with dev login on.");
  await page.goto("/sign-in");
  await expect(page.getByText("Pick a test account")).toHaveCount(0);
  const response = await request.post("/api/dev-login", { data: { email: "alexandria@example.test" } });
  expect(response.status()).toBe(404);
  await page.goto("/character?preview=Alexandria");
  await expect(page.getByRole("heading", { name: "Alexandria", exact: true })).toHaveCount(0);
});

test("dev login opens Alexandria's sheet", async ({ page }) => {
  test.skip(process.env.E2E_DEV_LOGIN !== "1", "Start the server with NEXT_PUBLIC_DEV_LOGIN=1 on 127.0.0.1.");
  await page.goto("/sign-in");
  await expect(page.getByText("Pick a test account", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Alexandria" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Melichar" })).toHaveCount(0);
  await page.goto("/character?preview=Alexandria");
  await expect(page.getByRole("heading", { name: "Alexandria", exact: true }).first()).toBeVisible();
  await expect(page.getByText("HP 13")).toBeVisible();
  await expect(page.getByText("AC 14")).toBeVisible();
  await expect(page.getByText("Speed 35")).toBeVisible();
  await expect(page.getByRole("button", { name: "Alchemy" })).toBeVisible();
  await expect(page.getByText("Druidcraft")).toBeVisible();
  await expect(page.getByText("Recorded conflicts")).toHaveCount(0);
});
