import { defineConfig } from "@playwright/test";

export default defineConfig({
  // Other Playwright config options
  testDir: "./tests/e2e", // Folder for test files
  // Configure paths for screenshots
  expect: {
    toMatchSnapshot: {
      threshold: 0.2, // Adjust the threshold for visual diffs
      outputDir: "tests/e2e/screenshots", // Where to save baseline screenshots
    },
  },
  reporter: [["html", { outputFolder: "test-results/output/report" }]], // HTML report location
  screenshot: "only-on-failure", // Capture screenshots for failed tests only
  outputDir: "test-results/output/screenshots", // Set output folder for test artifacts
  trace: "retain-on-failure", // Keep trace for failed tests
});
