import { test, expect } from "./fixtures/auth";
import type { Page } from "@playwright/test";

// Programmatically submit the ad-hoc log dialog form, bypassing button-click
// instability caused by the exercise name input's 150ms onBlur re-render.
async function submitLogDialog(page: Page) {
  await page.getByRole("dialog").locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
}

// Find the card for a given exercise and click its delete (trash) button.
async function deleteExerciseCard(page: Page, exerciseName: string) {
  const card = page.locator("[data-slot='card']").filter({
    has: page.locator("[data-slot='card-title']", { hasText: exerciseName }),
  });
  // Buttons per set-0 row: Edit (Pencil) then Delete (Trash2) — .last() gives Delete
  await card.getByRole("button").last().click();
  await expect(page.locator("[data-slot='card-title']", { hasText: exerciseName })).not.toBeVisible();
}

test.describe("Workout Logging", () => {
  test("user can log an exercise with sets", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");

    await page.getByRole("button", { name: "Log Exercise" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByPlaceholder("e.g. Bench Press").fill("E2E Test Squat");
    await page.getByPlaceholder("Reps").fill("8");
    await page.getByPlaceholder("kg").fill("60");

    await submitLogDialog(page);

    await expect(page.locator("[data-slot='card-title']", { hasText: "E2E Test Squat" })).toBeVisible();
    await deleteExerciseCard(page, "E2E Test Squat");
  });

  test("user can add multiple sets to an exercise", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");

    await page.getByRole("button", { name: "Log Exercise" }).click();
    await page.getByPlaceholder("e.g. Bench Press").fill("E2E Test Deadlift");

    await page.getByPlaceholder("Reps").first().fill("5");
    await page.getByPlaceholder("kg").first().fill("100");

    // "Add Set" button adds a new set row
    await page.getByRole("button", { name: "Add Set" }).click();
    await page.getByPlaceholder("Reps").last().fill("5");
    await page.getByPlaceholder("kg").last().fill("100");

    await submitLogDialog(page);

    await expect(page.locator("[data-slot='card-title']", { hasText: "E2E Test Deadlift" })).toBeVisible();
    // Table should have 2 data rows (set 1 and set 2) plus 1 header row
    const card = page.locator("[data-slot='card']").filter({
      has: page.locator("[data-slot='card-title']", { hasText: "E2E Test Deadlift" }),
    });
    await expect(card.getByRole("row")).toHaveCount(3);

    await deleteExerciseCard(page, "E2E Test Deadlift");
  });

  test("logged exercise appears on the dashboard", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");

    await page.getByRole("button", { name: "Log Exercise" }).click();
    await page.getByPlaceholder("e.g. Bench Press").fill("E2E Test OHP");
    await page.getByPlaceholder("Reps").fill("10");
    await page.getByPlaceholder("kg").fill("40");
    await submitLogDialog(page);

    await expect(page.locator("[data-slot='card-title']", { hasText: "E2E Test OHP" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("E2E Test OHP", { exact: true })).toBeVisible();

    await page.goto("/dashboard/workout");
    await deleteExerciseCard(page, "E2E Test OHP");
  });
});
