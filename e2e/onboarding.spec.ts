import { expect, test } from "@playwright/test";

test("recruitment papers ask a logged-out visitor to sign in", async ({ page }) => {
  await page.goto("/character/new");
  await expect(page.getByRole("heading", { name: "Recruitment Papers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toHaveCount(0);
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign the Papers" })).toHaveCount(0);
});

test("recruitment papers keep the display face and field type", async ({ page }) => {
  await page.goto("/character/new");
  const heading = page.getByRole("heading", { name: "Recruitment Papers" });
  await expect(heading).toBeVisible();
  const fontFile = await page.request.get("/fonts/corleone/Corleone-Due-Regular.woff2");
  if (fontFile.status() === 200) {
    await page.waitForFunction(() => document.documentElement.dataset.displayFace === "corleone");
  }
  const type = await heading.evaluate((el) => {
    const style = getComputedStyle(el);
    const names = style.fontFamily.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""));
    const probe = (name: string) => document.fonts.check(`${style.fontWeight} ${style.fontSize} "${name}"`);
    return {
      names,
      weight: style.fontWeight,
      transform: style.textTransform,
      corleone: probe(names[0] ?? ""),
      loaded: names.map((name) => ({ name, ok: probe(name) })),
    };
  });
  expect(type.names[0]).toBe("Bebas Neue");
  expect(type.names.join(" ")).not.toMatch(/Corleone/);
  expect(type.weight).toBe("400");
  expect(type.transform).toBe("uppercase");
  const spacing = await heading.evaluate((el) => getComputedStyle(el).letterSpacing);
  expect(spacing === "0.02em" || Number.parseFloat(spacing) > 0).toBe(true);

  const prompt = page.getByRole("link", { name: "Sign in to continue" });
  const buttonType = await prompt.evaluate((el) => {
    const style = getComputedStyle(el);
    return { family: style.fontFamily, weight: style.fontWeight, transform: style.textTransform };
  });
  expect(buttonType.family).not.toContain("Corleone");
  expect(buttonType.family).toMatch(/Bebas Neue/i);
  expect(buttonType.weight).toBe("400");
  expect(buttonType.transform).toBe("uppercase");

  await page.goto("/sign-in");
  const input = page.getByLabel("Email");
  const inputType = await input.evaluate((el) => {
    const style = getComputedStyle(el);
    return { family: style.fontFamily, size: style.fontSize, transform: style.textTransform, weight: style.fontWeight };
  });
  expect(inputType.size).toBe("16px");
  expect(inputType.transform).toBe("none");
  expect(inputType.weight).toBe("400");
  expect(inputType.family).toMatch(/Nunito Sans/i);
});
