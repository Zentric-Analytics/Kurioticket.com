import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: "cookie-consent.spec.ts",
  timeout: 60_000,
  use: {
    baseURL: process.env.QA_BASE_URL ?? "https://staging.kurioticket.com",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "desktop-firefox", use: { browserName: "firefox", viewport: { width: 1280, height: 800 } } },
    { name: "mobile-webkit", use: { browserName: "webkit", viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } },
    { name: "mobile-chromium", use: { browserName: "chromium", viewport: { width: 393, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "small-mobile-webkit", use: { browserName: "webkit", viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  ],
});
