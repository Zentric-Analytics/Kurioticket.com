import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "kayak-fare-information.spec.ts", workers: 1,
  timeout: 90000, expect: { timeout: 15000 },
  outputDir: "../../work/kayak-flight-implementation/browser-results",
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3000",
    launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH, args: ["--no-sandbox"] } : undefined,
    screenshot: "only-on-failure", trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { viewport: { width: 390, height: 844 } } }, { name: "desktop", use: { viewport: { width: 1440, height: 900 } } }],
});
