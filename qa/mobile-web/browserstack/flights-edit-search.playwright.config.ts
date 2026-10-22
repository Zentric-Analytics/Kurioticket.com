import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests", testMatch: "flights-edit-search.spec.ts", workers: 1,
  outputDir: "../../../work/flight-results-stability/browser-results",
  timeout: 180_000, expect: { timeout: 15_000 },
  use: { baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3051", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    ...[320, 390].map(width => ({ name: `chromium-mobile-${width}`, use: { browserName: "chromium" as const, viewport: { width, height: 844 }, isMobile: true, hasTouch: true, launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH, args: ["--no-sandbox"] } : undefined } })),
    { name: "webkit-mobile-390", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, launchOptions: process.env.QA_WEBKIT_PATH ? { executablePath: process.env.QA_WEBKIT_PATH } : undefined } },
    ...[768, 1440].map(width => ({ name: `chromium-desktop-${width}`, use: { browserName: "chromium" as const, viewport: { width, height: 900 }, launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH, args: ["--no-sandbox"] } : undefined } })),
  ],
});
