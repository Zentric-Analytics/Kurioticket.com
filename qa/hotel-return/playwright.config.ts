import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "return.spec.ts", workers: 1,
  timeout: 30_000, expect: { timeout: 10_000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: { command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100", timeout: 120_000, reuseExistingServer: false },
  projects: [
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 393, height: 852 } } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1365, height: 900 } } },
  ],
});
