// ➕ Add this line
import { test, expect } from "@chromatic-com/playwright";

// Then use as normal 👇
test("Homepage", async ({ page }) => {
  await page.goto("http://localhost:3000/search");

  await expect(page).toHaveTitle("Danswer");

  // Take a screenshot of the basic home page
  // page.screenshot({ path: "home.png" });
});
