import { test, expect } from "./fixtures/auth";
import type { Page } from "@playwright/test";

const sessionBar = (page: Page) => page.getByTestId("session-bar");

// Remove today's gym session so each test starts from "Not started"
async function removeGymTime(page: Page) {
  await page.getByRole("button", { name: "Edit gym time" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(sessionBar(page).getByText("Not started")).toBeVisible();
}

test.describe("Workout Timing", () => {
  test("gym session can be started and ended, and shows on the dashboard", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");
    await expect(sessionBar(page).getByText("Not started")).toBeVisible();

    await page.getByRole("button", { name: "Start workout" }).click();
    await expect(sessionBar(page).getByText(/At the gym/)).toBeVisible();
    // Live timer renders as m:ss
    await expect(page.getByTestId("gym-time")).toHaveText(/^\d+:\d{2}$/);

    await page.getByRole("button", { name: "End workout" }).click();
    await expect(sessionBar(page).getByText(/Gym time ·/)).toBeVisible();
    await expect(page.getByTestId("gym-time")).toHaveText("<1m");

    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-gym-time")).toContainText("Time at gym");

    await page.goto("/dashboard/workout");
    await removeGymTime(page);
  });

  test("exercise timer starts, and stops when the exercise is marked done", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");

    await page.getByRole("button", { name: "Log Exercise" }).click();
    await page.getByPlaceholder("e.g. Bench Press").fill("E2E Test Bench");
    await page.getByPlaceholder("Reps").fill("8");
    await page.getByPlaceholder("kg").fill("50");
    await page.getByRole("dialog").locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());

    const card = page.locator("[data-slot='card']").filter({
      has: page.locator("[data-slot='card-title']", { hasText: "E2E Test Bench" }),
    });
    await card.getByRole("button", { name: "Start E2E Test Bench" }).click();
    await expect(card.getByTestId("exercise-timer")).toHaveText(/^\d+:\d{2}$/);

    await card.getByRole("button", { name: "Mark E2E Test Bench as done" }).click();
    await expect(card.getByTestId("exercise-timer")).toHaveText("<1m");
    await expect(page.getByTestId("exercise-time")).toHaveText("<1m");

    // Delete button is the last one in the card (set-row actions)
    await card.getByRole("button").last().click();
    await expect(page.locator("[data-slot='card-title']", { hasText: "E2E Test Bench" })).not.toBeVisible();
  });

  test("gym time can be entered manually and appears in reports", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");

    await page.getByRole("button", { name: "Add gym time manually" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Start").fill("18:00");
    await dialog.getByLabel("End").fill("19:15");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(page.getByTestId("gym-time")).toHaveText("1h 15m");

    await page.getByRole("tab", { name: "Reports" }).click();
    await expect(page.getByTestId("gym-avg")).toContainText("avg 1h 15m");

    await page.getByRole("tab", { name: "Exercise Log" }).click();
    await removeGymTime(page);
  });
});
