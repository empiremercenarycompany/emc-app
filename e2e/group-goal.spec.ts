import { expect, test } from "@playwright/test";

const RBM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

test("a group goal posts the typed title and the chosen squad", async ({ page }) => {
  await page.goto("/preview/group-goal");
  await page.getByLabel("Title").fill("Keep the Scholar Breathing");
  await page.getByLabel("Squad").selectOption({ label: "RBM" });
  await page.getByLabel("Description").fill("Breathing room");
  await page.getByLabel("Objective").fill("Breaths");
  await page.getByLabel("Target").fill("3");
  await page.getByLabel("Unit").fill("sessions");
  await page.getByRole("button", { name: "Post group goal" }).click();
  const saved = page.getByTestId("goal-saved");
  await expect(saved).toContainText("Keep the Scholar Breathing");
  await expect(saved).toContainText("RBM");
  await expect(saved).toHaveAttribute("data-squad-id", RBM);
});
