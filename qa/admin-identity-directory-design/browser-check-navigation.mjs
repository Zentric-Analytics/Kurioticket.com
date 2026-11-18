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
    const workspace = page.getByRole("navigation", { name: "Users subsections" });
    await expect(page.getByRole("complementary", { name: "Users navigation" }).getByRole("heading", { name: "Users", exact: true })).toBeVisible();
    await expect(workspace.getByRole("link", { name: "Users Directory", exact: true })).toBeVisible();
    await expect(workspace.getByRole("link", { name: "Visitor Journeys", exact: true })).toBeVisible();
    await expect(workspace.getByRole("link", { name: "Users Directory", exact: true })).toHaveAttribute("aria-current", "page");
    for (const unrelated of ["Trips", "Support", "Settings", "System"]) {
      await expect(workspace.getByRole("link", { name: unrelated, exact: true })).toHaveCount(0);
    }
    if (width >= 1024) {
      const layout = await page.evaluate(() => {
        const sidebar = document.querySelector('aside[aria-label="Users navigation"]')?.getBoundingClientRect();
        const content = document.querySelector('[data-admin-page-content]')?.getBoundingClientRect();
        return { sideBySide: Boolean(sidebar && content && content.left > sidebar.right
          && Math.abs(sidebar.top - content.top) <= 1) };
      });
      assert.equal(layout.sideBySide, true, "Users workspace stays two-column at 100% desktop zoom");
    }
    if (width >= 1100) {
      const headerNavigation = page.getByRole("navigation", { name: "Admin navigation" });
      await expect(headerNavigation).toBeVisible();
      await expect(headerNavigation.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
      await expect(headerNavigation.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
    } else {
      const toggle = page.getByRole("button", { name: "Open admin navigation" });
      await expect(toggle).toBeVisible();
      await toggle.click();
      const mobileNavigation = page.getByRole("navigation", { name: "Admin navigation" });
      await expect(mobileNavigation).toBeVisible();
      await expect(mobileNavigation.getByRole("link", { name: "Users", exact: true })).toBeVisible();
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

  // All non-Overview routes use white, even when showing the pinned old Users page.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(root + "/before", { waitUntil: "networkidle" });
  const otherBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
  assert.equal(otherBg, "rgb(255, 255, 255)", "Non-Overview pages have a pure-white canvas");
  await page.screenshot({ path: output + "/other-route-navbar-1280.png", fullPage: false });
  checks.push("Other Admin routes have the required white canvas");

  // The sole background exception is the Admin Overview route.
  await page.goto(root + "/admin", { waitUntil: "networkidle" });
  const overviewBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
  assert.equal(overviewBg, "rgb(241, 245, 251)", "Overview retains its original background");
  await page.screenshot({ path: output + "/overview-navbar-1280.png", fullPage: false });
  checks.push("Overview retains its original canvas");
  assert.deepEqual(errors, [], "No browser errors");
  await writeFile(output + "/navigation-browser-results.json", JSON.stringify({ checks, errors }, null, 2));
  console.log("PASS " + checks.length + " navigation visual checks");
} finally {
  await browser.close();
}
