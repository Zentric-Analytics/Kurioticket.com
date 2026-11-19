import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "compare-deals-layout.spec.ts",
  outputDir: "../../work/compare-deals-inline/browser-results",
  projects: [320, 375, 390, 640, 1440].map(width => ({ name: `${width}px`, use: { viewport: { width, height: 844 } } })),
});
