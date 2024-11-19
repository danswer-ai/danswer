import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Other Playwright config options
  testDir: "./tests/e2e", // Folder for test files
  // Configure paths for screenshots
  // expect: {
  //   toMatchSnapshot: {
  //     threshold: 0.2, // Adjust the threshold for visual diffs
  //   },
  // },
  // reporter: [["html", { outputFolder: "test-results/output/report" }]], // HTML report location
  // outputDir: "test-results/output/screenshots", // Set output folder for test artifacts
  projects: [
    // Setup project
    {
      name: "admin_setup",
      testMatch: /.*\admin_auth.setup\.ts/,
    },
    {
      name: "chromium-admin",
      use: {
        ...devices["Desktop Chrome"],
        // Use prepared auth state.
        storageState: "admin_auth.json",
      },
      dependencies: ["admin_setup"],
    },
    {
      name: "chromium-logged-out",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
