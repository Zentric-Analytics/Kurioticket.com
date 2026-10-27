import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
const browserName = process.env.QA_RENDER_BROWSER === "webkit" ? "webkit" : "chromium";
export default defineConfig({
  testDir: ".", testMatch: ["return.spec.ts", "virtual-results.spec.ts"], workers: 1,
  outputDir: join(tmpdir(), "kurioticket-web-rendering-tests"),
  timeout: 30_000, expect: { timeout: 10_000 },
  // The return/virtual-results specs exercise search UI, not consent workflows.
  // Start synthetic browser sessions with optional analytics declined, so the
  // first-visit consent dialog cannot cover controls under test.
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    storageState: {
      cookies: [{ name: "kt_analytics_denied", value: "1", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
  },
  webServer: { command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100", timeout: 120_000, reuseExistingServer: false,
    env: { NEXTAUTH_SECRET: randomBytes(32).toString("hex"), NEXTAUTH_URL: "http://127.0.0.1:3100", DATABASE_URL: "postgresql://local_test:local_test@127.0.0.1:1/local_test?connect_timeout=1" },
  },
  projects: [
    { name: "mobile", use: { browserName, viewport: { width: 393, height: 852 } } },
    { name: "desktop", use: { browserName, viewport: { width: 1365, height: 900 } } },
  ],
});
