import { test, expect, type Page } from "@playwright/test";
import {
  E2E_ONBOARD_EMAIL,
  E2E_ONBOARD_PASSWORD,
  E2E_ONBOARD_USERNAME,
} from "./global-setup";

async function signInAsOnboardUser(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(E2E_ONBOARD_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(E2E_ONBOARD_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Label → parent div → [data-slot="select-trigger"] within that div
async function selectOption(page: Page, labelText: string, optionText: string) {
  await page
    .locator("label", { hasText: labelText })
    .locator("xpath=..")
    .locator('[data-slot="select-trigger"]')
    .click();
  // Anchored regex avoids "Male" matching "Female" while still matching "Moderate (3–5x/week)"
  await page.getByRole("option").filter({ hasText: new RegExp("^" + optionText) }).click();
}

test.describe("Onboarding", () => {
  test("new approved user is redirected to /onboarding on login", async ({ page }) => {
    await signInAsOnboardUser(page);
    // Wait for automatic login redirect to /dashboard (ensures JWT cookie is set).
    // Then wait for the dashboard useEffect to detect onboardingComplete:false
    // and call router.replace("/onboarding").
    await page.waitForURL(/\/(dashboard|onboarding)/);
    await page.waitForURL(/\/onboarding/);
  });

  test("user can complete guided onboarding and reach dashboard", async ({ page }) => {
    await signInAsOnboardUser(page);
    await page.waitForURL("**/onboarding");

    // Step 1: choose mode — Smart Engine is default
    await page.getByRole("button", { name: /Continue with Smart Engine/i }).click();

    // Step 2: fill in the guided setup form
    await page.getByLabel("Weight (kg)").fill("75");
    await page.getByLabel("Height (cm)").fill("175");
    await page.getByLabel("Age").fill("28");

    await selectOption(page, "Biological Sex", "Male");
    await selectOption(page, "Goal", "Maintenance");
    await selectOption(page, "Activity Level", "Moderate");

    // TDEE preview should appear with calculated targets
    await expect(page.getByText("Calculated Targets")).toBeVisible();

    await page.getByRole("button", { name: "Save & Continue" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard shows the user's username
    await expect(page.getByText(E2E_ONBOARD_USERNAME).first()).toBeVisible();
  });

  test("registration creates account and shows pending approval message", async ({ page }) => {
    await page.goto("/register");

    const uniqueEmail = `e2e-reg-${Date.now()}@test.local`;

    await page.getByLabel("Display name").fill("E2E Tester");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password", { exact: true }).fill("testpass123");
    await page.getByLabel("Confirm password", { exact: true }).fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Shows pending approval screen — can't sign in until approved
    await expect(page.getByText(/pending|waiting|approved|review/i).first()).toBeVisible();
  });

  test("unapproved user cannot sign in", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("nonexistent@test.local");
    await page.getByLabel("Password", { exact: true }).fill("somepassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("p[role='alert']")).toContainText("Invalid credentials");
    await expect(page).toHaveURL("/");
  });
});
