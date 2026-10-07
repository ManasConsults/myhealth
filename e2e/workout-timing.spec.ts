import { test, expect } from "./fixtures/auth";
import type { Page } from "@playwright/test";

const exerciseCard = (page: Page, name: string) =>
  page.locator("[data-slot='card']").filter({ has: page.locator("[data-slot='card-title']", { hasText: name }) });

async function logExercise(page: Page, name: string) {
  await page.getByRole("button", { name: "Log Exercise" }).click();
  await page.getByPlaceholder("e.g. Bench Press").fill(name);
  await page.getByPlaceholder("Reps").fill("8");
  await page.getByPlaceholder("kg").fill("50");
  await page.getByRole("dialog").locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(page.locator("[data-slot='card-title']", { hasText: name })).toBeVisible();
}

async function deleteExercise(page: Page, name: string) {
  // Delete button is the last one in the card (set-row actions)
  await exerciseCard(page, name).getByRole("button").last().click();
  await expect(page.locator("[data-slot='card-title']", { hasText: name })).not.toBeVisible();
}

async function setTimes(page: Page, start: string, end: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Start").fill(start);
  if (end) await dialog.getByLabel("End").fill(end);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).not.toBeVisible();
}

const CLOCK_RANGE = /^\d{1,2}:\d{2} [AP]M – \d{1,2}:\d{2} [AP]M$/;

test.describe("Workout Timing", () => {
  test("starting an exercise starts gym time; marking it done stops both", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");
    await logExercise(page, "E2E Test Bench");
    await expect(page.getByTestId("gym-range")).toHaveText("Start an exercise to track your time");

    const card = exerciseCard(page, "E2E Test Bench");
    await card.getByRole("button", { name: "Start E2E Test Bench" }).click();
    await expect(card.getByTestId("exercise-timer")).toHaveText(/^\d+:\d{2}$/);
    await expect(page.getByTestId("gym-time")).toHaveText(/^\d+:\d{2}$/);
    await expect(page.getByTestId("gym-range")).toContainText("in progress");

    await card.getByRole("button", { name: "Mark E2E Test Bench as done" }).click();
    await expect(card.getByTestId("exercise-timer")).toHaveText("<1m");
    await expect(page.getByTestId("gym-time")).toHaveText("<1m");
    await expect(page.getByTestId("gym-range")).toHaveText(CLOCK_RANGE);

    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-gym-time")).toContainText("Time at gym");

    await page.goto("/dashboard/workout");
    await deleteExercise(page, "E2E Test Bench");
  });

  test("gym time is the total of exercise times, from first start to last end", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");
    await logExercise(page, "E2E Test Squat Timed");
    await logExercise(page, "E2E Test Lunge Timed");

    for (const [name, start, end] of [
      ["E2E Test Squat Timed", "18:00", "18:20"],
      ["E2E Test Lunge Timed", "18:30", "19:00"],
    ]) {
      const card = exerciseCard(page, name);
      await card.getByRole("button", { name: `Start ${name}` }).click();
      await card.getByRole("button", { name: new RegExp(`^${name} time .*, edit$`) }).click();
      await setTimes(page, start, end);
    }

    // 20m + 30m — the 10m rest between them isn't counted
    await expect(page.getByTestId("gym-time")).toHaveText("50m");
    await expect(page.getByTestId("gym-range")).toHaveText("6:00 PM – 7:00 PM");

    await page.getByRole("tab", { name: "Reports" }).click();
    await expect(page.getByTestId("gym-avg")).toContainText("avg 50m");

    await page.getByRole("tab", { name: "Exercise Log" }).click();
    await deleteExercise(page, "E2E Test Squat Timed");
    await deleteExercise(page, "E2E Test Lunge Timed");
  });

  test("an exercise timer left running from a previous day can be stopped", async ({ memberPage: page }) => {
    await page.goto("/dashboard/workout");
    await expect(page.getByTestId("forgotten-banner")).not.toBeVisible();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (yesterday.getMonth() !== today.getMonth()) await page.getByRole("button", { name: "Previous month" }).click();
    await page.getByRole("button", {
      name: yesterday.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      exact: true,
    }).click();

    // Yesterday's exercise with a start and no end — the forgotten state
    await logExercise(page, "E2E Test Forgotten");
    await exerciseCard(page, "E2E Test Forgotten").getByRole("button", { name: "Add time for E2E Test Forgotten" }).click();
    await setTimes(page, "18:00", "");

    const banner = page.getByTestId("forgotten-banner");
    await expect(banner).toContainText("is still running");
    await banner.getByRole("button", { name: "Choose end time" }).click();
    await page.getByRole("dialog").getByLabel("End time").fill("19:30");
    await page.getByRole("dialog").getByRole("button", { name: "Stop timers" }).click();

    await expect(banner).not.toBeVisible();
    await expect(exerciseCard(page, "E2E Test Forgotten").getByTestId("exercise-timer")).toHaveText("1h 30m");
    await expect(page.getByTestId("gym-time")).toHaveText("1h 30m");

    await deleteExercise(page, "E2E Test Forgotten");
  });
});
