import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("user can sign in with valid credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("member@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("member123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("member").first()).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("member@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Target only the <p role="alert"> error message, not the Next.js route announcer
    await expect(page.locator("p[role='alert']")).toContainText("Invalid credentials");
    await expect(page).toHaveURL("/");
  });

  test("authenticated user is redirected away from login page", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("member@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("member123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("user can log out", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("member@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("member123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("admin user can sign in and sees Admin nav item", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("admin@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");

    // exact: true avoids matching the profile link that shows "admin" username
    await expect(page.getByRole("link", { name: "Admin", exact: true })).toBeVisible();
  });
});
