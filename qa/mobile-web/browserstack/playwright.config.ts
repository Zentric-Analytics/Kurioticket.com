import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  outputDir: "../test-results",
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["line"], ["json", { outputFile: "../artifacts/results.json" }]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "https://staging.kurioticket.com",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
});
