import { type Page } from "@playwright/test";
import { test, expect } from "./fixtures/auth";

// Navigate from a meal name <p> to its header + button via XPath:
// <p>Breakfast</p> → parent info-div → parent justify-between-div → sibling <button>
async function openMealDialog(page: Page, mealName: string) {
  await page.locator("p", { hasText: mealName }).locator("xpath=../../button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// Labels in the food dialog lack htmlFor — navigate label → parent div → sibling input
async function fillDialogField(page: Page, labelText: string, value: string) {
  const dialog = page.getByRole("dialog");
  await dialog.locator("label", { hasText: labelText }).locator("xpath=../input").fill(value);
}

test.describe("Food Logging", () => {
  test("user can add a food entry to a meal", async ({ memberPage: page }) => {
    await page.goto("/dashboard/nutrition");
    await openMealDialog(page, "Breakfast");

    await page.getByPlaceholder("e.g. Chicken breast", { exact: true }).fill("E2E Test Chicken");
    await fillDialogField(page, "Calories", "300");
    await fillDialogField(page, "Protein (g)", "40");
    await fillDialogField(page, "Carbs (g)", "5");
    await fillDialogField(page, "Fat (g)", "8");
    await page.getByRole("button", { name: "Add Entry" }).click();

    await expect(page.getByText("E2E Test Chicken", { exact: true })).toBeVisible();

    // Cleanup: food entry <p> → info-div → entry-row → sibling <button>
    await page.locator("p", { hasText: "E2E Test Chicken" }).locator("xpath=../../button").click();
    await expect(page.getByText("E2E Test Chicken", { exact: true })).not.toBeVisible();
  });

  test("meal header shows calorie badge after logging food", async ({ memberPage: page }) => {
    await page.goto("/dashboard/nutrition");
    await openMealDialog(page, "Dinner");

    await page.getByPlaceholder("e.g. Chicken breast", { exact: true }).fill("E2E Test Steak");
    await fillDialogField(page, "Calories", "500");
    await fillDialogField(page, "Protein (g)", "50");
    await fillDialogField(page, "Carbs (g)", "0");
    await fillDialogField(page, "Fat (g)", "30");
    await page.getByRole("button", { name: "Add Entry" }).click();

    await expect(page.getByText("E2E Test Steak", { exact: true })).toBeVisible();
    // Meal header badge appears once mealCal > 0
    await expect(page.getByText("500 kcal", { exact: true })).toBeVisible();

    // Cleanup
    await page.locator("p", { hasText: "E2E Test Steak" }).locator("xpath=../../button").click();
  });

  test("water intake can be logged via quick-add button", async ({ memberPage: page }) => {
    await page.goto("/dashboard/nutrition");

    // fmtWater(200) = "200ml"; QUICK_WATER includes 200
    await page.getByRole("button", { name: "+200ml" }).click();

    // Water entry span has exactly "200ml" as text content
    await expect(page.getByText("200ml", { exact: true }).first()).toBeVisible();

    // Cleanup: entry row is  <div> > <span>200ml</span> + <button>
    await page.getByText("200ml", { exact: true }).first().locator("xpath=../button").click();
    await expect(page.getByText("200ml", { exact: true }).first()).not.toBeVisible();
  });
});
