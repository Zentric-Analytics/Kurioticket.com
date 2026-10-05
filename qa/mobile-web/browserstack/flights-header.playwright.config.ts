import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: "flights.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3011",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3010",
      url: "http://127.0.0.1:3010",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node qa/mobile-web/browserstack/flight-fixture-proxy.mjs",
      url: "http://127.0.0.1:3011",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
