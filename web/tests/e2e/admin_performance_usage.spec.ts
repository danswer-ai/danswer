import { test, expect } from "@chromatic-com/playwright";

test(
  "Admin - Performance - Usage Statistics",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    // Test simple loading
    await page.goto("http://localhost:3000/admin/performance/usage");
    await expect(page.locator("h1.text-3xl")).toHaveText("Usage Statistics");
    await expect(page.locator("h1.text-lg").nth(0)).toHaveText("Usage");
    await expect(page.locator("h1.text-lg").nth(1)).toHaveText("Feedback");
  }
);
