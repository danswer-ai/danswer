import { test, expect } from "@playwright/test";
import { loginAs } from "../utils/auth";

test("update search settings", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("http://localhost:3000/admin/indexing/status");
  await page.getByRole("button", { name: "Search Settings" }).click();
  await page.getByRole("button", { name: "Update Search Settings" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Self-hosted" }).click();
  await page.getByText("MixedBread XSmallFastest,").click();
  await page.getByRole("button", { name: "Update Search" }).click();
  await expect(page.locator("body")).toContainText(
    "mixedbread-ai/mxbai-rerank-xsmall-v1"
  );
});
