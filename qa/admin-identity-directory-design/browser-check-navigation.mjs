import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// Navbar-specific browser QA against the CURRENT Admin shell and Users
// components. This replaces the obsolete pre-Activity-page fixture.
const root = process.env.ADMIN_DIRECTORY_QA_URL;
const output = process.env.ADMIN_DIRECTORY_QA_OUTPUT;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20_000);
const checks = [];
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  for (const width of [1280, 1366, 1440, 1920, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(root + "/admin/users", { waitUntil: "networkidle" });
    const logo = page.getByRole("link", { name: "Kurioticket Admin overview" });
    await expect(logo).toHaveCount(1);
    await expect(logo).toBeVisible();
    await expect(logo.locator("img,svg").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Users directory" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Users directory" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "User types" }).getByRole("link", { name: "All (30)" })).toBeVisible();
    if (width >= 1100) {
      await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Users", exact: true })).toBeVisible();
    } else {
      const toggle = page.getByRole("button", { name: "Open admin navigation" });
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Users", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close admin navigation" }).click();
    }
    const dimensions = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, "Navigation causes horizontal drift: " + JSON.stringify(dimensions));
    const shellBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
    assert.equal(shellBg, "rgb(255, 255, 255)", "Users directory is white");
    await page.screenshot({ path: output + "/users-navbar-" + width + ".png", fullPage: false });
    checks.push("Admin navbar responsive at " + width + "px");
  }

  // The new Users-only canvas must not alter the background on other routes.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(root + "/before", { waitUntil: "networkidle" });
  const otherBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
  assert.equal(otherBg, "rgb(241, 245, 251)", "Other Admin routes retain the original canvas");
  await page.screenshot({ path: output + "/other-route-navbar-1280.png", fullPage: false });
  checks.push("Other Admin routes preserve their canvas");
  assert.deepEqual(errors, [], "No browser errors");
  await writeFile(output + "/navigation-browser-results.json", JSON.stringify({ checks, errors }, null, 2));
  console.log("PASS " + checks.length + " navigation visual checks");
} finally {
  await browser.close();
}
