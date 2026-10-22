import { defineConfig } from "@playwright/test";
import headerConfig from "./playwright.config";

export default defineConfig({
  ...headerConfig,
  testMatch: "flights-surfaces.spec.ts",
  use: { ...headerConfig.use, baseURL: "http://127.0.0.1:3020" },
  webServer: [
    {
      cwd: "../..",
      command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3020",
      url: "http://127.0.0.1:3020/brand/kurioticket-icon-blue.svg",
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
