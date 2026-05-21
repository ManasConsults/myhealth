import { test as base, type Page } from "@playwright/test";

export type AuthFixtures = {
  memberPage: Page;
};

export const test = base.extend<AuthFixtures>({
  memberPage: async ({ page }, use) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("member@demo.com");
    await page.getByLabel("Password", { exact: true }).fill("member123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
    await use(page);
  },
});

export { expect } from "@playwright/test";
