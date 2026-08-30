import { defineConfig } from "@playwright/test";

const widths = [320, 375, 393, 430];
const engines = ["chromium", "webkit", "firefox"] as const;

export default defineConfig({
  testDir: "../tests",
  testMatch: "local-responsive.spec.ts",
  outputDir: "../test-results/local",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["line"], ["json", { outputFile: "../artifacts/local-results.json" }]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "https://staging.kurioticket.com",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    isMobile: true,
    hasTouch: true,
  },
  projects: engines.flatMap((browserName) => widths.map((width) => ({
    name: `${browserName}-${width}`,
    use: {
      browserName,
      viewport: { width, height: width === 320 ? 568 : width >= 430 ? 932 : 844 },
    },
  }))),
});
