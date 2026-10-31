import { expect, test } from "@playwright/test";

test("recruitment papers walk one decision at a time", async ({ page }) => {
  await page.goto("/character/new");
  await expect(page.getByRole("heading", { name: "Recruitment Papers" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  const heading = page.getByRole("heading", { name: "Recruitment Papers" });
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
  expect(type.names[0]).toBe("Corleone");
  expect(type.names.join(" ")).toMatch(/Barlow/i);
  expect(type.weight).toBe("800");
  expect(type.transform).toBe("uppercase");
  expect(type.corleone).toBe(false);
  expect(type.loaded.some((face) => /barlow/i.test(face.name) && face.ok)).toBe(true);

  const input = page.getByLabel("Name");
  const inputType = await input.evaluate((el) => {
    const style = getComputedStyle(el);
    return { family: style.fontFamily, size: style.fontSize, transform: style.textTransform, weight: style.fontWeight };
  });
  expect(inputType.size).toBe("16px");
  expect(inputType.transform).toBe("none");
  expect(inputType.weight).toBe("400");
  expect(inputType.family).toMatch(/Barlow/i);
  expect(inputType.family).not.toContain("Condensed");

  await input.fill("Recruit");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Background").selectOption("farmer");
  await expect(page.getByText("Animal Handling")).toBeVisible();
  await expect(page.getByText("Nature")).toBeVisible();
  await expect(page.getByText("Carpenter's tools")).toBeVisible();
  await expect(page.getByText("Tough")).toBeVisible();
  await expect(page.getByLabel("Artisan's tools")).toHaveCount(0);
  await page.getByLabel("Background").selectOption("artisan");
  await expect(page.getByLabel("Artisan's tools")).toBeVisible();
  await page.getByLabel("Background").selectOption("farmer");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Not sure? Pick for me" }).click();
  await expect(page.getByRole("button", { name: /Human/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("+1 to all three").check();
  await expect(page.getByText("These three start one step higher.")).toBeVisible();
  await expect(page.getByTestId("score-preview").getByText("STR 9")).toBeVisible();
  await page.getByLabel("+2 to one, +1 to another").check();
  await expect(page.getByRole("group", { name: "+1" }).getByRole("button", { name: "STR" })).toBeDisabled();
  await expect(page.getByTestId("score-preview").getByText("STR 10")).toBeVisible();
  await expect(page.getByText("Pick two different abilities.")).toHaveCount(0);
  await page.getByRole("button", { name: "Next" }).click();

  const button = page.getByRole("button", { name: "Sign the Papers" });
  await expect(button).toBeVisible();
  const buttonType = await button.evaluate((el) => {
    const style = getComputedStyle(el);
    return { family: style.fontFamily, weight: style.fontWeight, transform: style.textTransform };
  });
  expect(buttonType.family).not.toContain("Corleone");
  expect(buttonType.family).toMatch(/Barlow/i);
  expect(buttonType.weight).toBe("700");
  expect(buttonType.transform).toBe("uppercase");
});
