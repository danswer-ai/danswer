import { test, expect } from "@chromatic-com/playwright";

test("Admin Home", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-admin", "Only chromium-admin");

  // Test simple loading
  await page.goto("http://localhost:3000/admin/indexing/status");
  await expect(page.locator("h1.text-3xl")).toHaveText("Existing Connectors");
});
