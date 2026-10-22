import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: "flight-price-alert-target.spec.ts",
  outputDir: "../test-results/flight-price-alert-target",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3040",
    launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
