// ➕ Add this line
import { test, expect, takeSnapshot } from "@chromatic-com/playwright";

// Then use as normal 👇
test("Homepage", async ({ page }, testInfo) => {
  // Test redirect to login, and redirect to search after login

  // move these into a constants file or test fixture soon
  let email = "admin_user@test.com";
  let password = "test";

  await page.goto("http://localhost:3000/search");

  await page.waitForURL("http://localhost:3000/auth/login?next=%2Fsearch");

  await expect(page).toHaveTitle("Danswer");

  await takeSnapshot(page, "Before login", testInfo);

  await page.fill("#email", email);
  await page.fill("#password", password);

  // Click the login button
  await page.click('button[type="submit"]');

  await page.waitForURL("http://localhost:3000/search");
});
