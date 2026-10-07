import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "flights-header.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3010",
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.QA_CHROMIUM_PATH
      ? { executablePath: process.env.QA_CHROMIUM_PATH }
      : undefined,
  },
  webServer: [
    {
      cwd: "../..",
      command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3010",
      url: "http://127.0.0.1:3010/brand/kurioticket-icon-blue.svg",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      cwd: "../..",
      command: "node qa/mobile-web/browserstack/flight-fixture-proxy.mjs",
      url: "http://127.0.0.1:3011/api/flights/search",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
