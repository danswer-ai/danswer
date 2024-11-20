import { test, expect } from "@chromatic-com/playwright";

test(
  "Admin - Document Management - Feedback",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    // Test simple loading
    await page.goto("http://localhost:3000/admin/documents/feedback");
    await expect(page.locator("h1.text-3xl")).toHaveText("Document Feedback");
  }
);
