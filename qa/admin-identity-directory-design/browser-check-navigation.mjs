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
  for (const width of [1280, 1366, 1440, 1920, 1024, 1200, 1279, 768, 390, 320]) {
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
      const sidebarWidth = await page.locator('aside[aria-label="Users navigation"]').evaluate(node => node.getBoundingClientRect().width);
      assert.ok(sidebarWidth >= 190 && sidebarWidth <= 201, "Compact sidebar must retain readable labels at " + width + "px: " + sidebarWidth);
      const contentWidth = await page.locator('[data-admin-page-content]').evaluate(node => node.getBoundingClientRect().width);
      assert.ok(contentWidth > sidebarWidth * 2, "Content workspace must receive the larger share at " + width + "px");
    }
    if (width >= 1280) {
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

  // Exercise the full ten-module header on Overview, where the full navigation
  // is intentionally visible. Other workspace pages keep their Overview-only top bar.
  const expectedHeader = ["Overview", "Users", "Search Activity", "Trips", "Support",
    "Providers", "Content", "System", "Platform Health", "Settings"];
  for (const width of [1280, 1366, 1440, 1536, 1920, 1024, 1100, 1200, 1279, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(root + "/admin", { waitUntil: "networkidle" });
    const headerNavigation = page.getByRole("navigation", { name: "Admin navigation" });
    if (width >= 1280) {
      await expect(headerNavigation).toBeVisible();
      await expect(page.getByRole("button", { name: "Open admin navigation" })).toHaveCount(0);
      const links = headerNavigation.locator("a");
      await expect(links).toHaveCount(10);
      const metrics = await headerNavigation.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const links = Array.from(element.querySelectorAll("a")).map(link => {
          const box = link.getBoundingClientRect();
          const label = link.querySelector("span");
          return {
            label: label?.textContent?.trim(), href: link.getAttribute("href"),
            left: box.left, right: box.right, top: box.top, height: box.height,
            labelClipped: !!label && label.scrollWidth > label.clientWidth + 1,
          };
        });
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: rect.left, right: rect.right, links,
        };
      });
      assert.deepEqual(metrics.links.map(link => link.label), expectedHeader,
        "Full Admin navigation must retain all ten modules in order");
      assert.equal(metrics.links[8].href, "/admin/platform-health",
        "Platform Health must appear between System and Settings");
      assert.ok(metrics.links.every(link => Math.abs(link.top - metrics.links[0].top) < 1),
        "All ten links must stay on one horizontal line at " + width + "px: " + JSON.stringify(metrics));
      assert.ok(metrics.links.every(link => link.height >= 39 && !link.labelClipped),
        "Navbar links must remain legible at " + width + "px: " + JSON.stringify(metrics));
      assert.ok(metrics.links.every(link => link.left >= metrics.left - 1 && link.right <= metrics.right + 1),
        "All links must fit inside the navigation container at " + width + "px: " + JSON.stringify(metrics));
      assert.ok(metrics.links.every((link, index) => !index || link.left >= metrics.links[index - 1].right),
        "Navbar links must not overlap at " + width + "px: " + JSON.stringify(metrics));
      assert.ok(metrics.scrollWidth <= metrics.width + 1 && metrics.documentWidth <= metrics.viewport + 1,
        "No scrollable or clipped header allowed at " + width + "px: " + JSON.stringify(metrics));
    } else {
      await expect(page.getByRole("button", { name: "Open admin navigation" })).toBeVisible();
      await expect(headerNavigation).toHaveCount(0);
      await page.getByRole("button", { name: "Open admin navigation" }).click();
      await expect(headerNavigation).toBeVisible();
      const labels = await headerNavigation.locator("a span").allTextContents();
      assert.deepEqual(labels.map(value => value.trim()), expectedHeader,
        "Compact menu must preserve all ten modules");
      await page.getByRole("button", { name: "Close admin navigation" }).click();
      await expect(headerNavigation).toHaveCount(0);
    }
    await page.screenshot({ path: output + "/overview-navbar-" + width + ".png", fullPage: false });
    checks.push("Ten-module Admin navbar without wrapping at " + width + "px");
  }

  // Platform Health is a distinct module even when its System subsection shortcut
  // remains present. In the compact menu only Platform Health may be selected.
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(root + "/admin/platform-health", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Platform Health QA" })).toBeVisible();
  await page.getByRole("button", { name: "Open admin navigation" }).click();
  const compactNav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(compactNav.getByRole("link", { name: "Platform Health", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(compactNav.getByRole("link", { name: "System", exact: true })).not.toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Close admin navigation" }).click();
  checks.push("Platform Health has a distinct selected state, without stealing System active state");

  // The real Visitor Journeys page uses synthetic QA-only rows; preserve
  // all eight data fields and keep each Action visible at 100% zoom.
  for (const width of [1024, 1280, 1366, 1440, 1920, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(root + "/admin/journeys", { waitUntil: "networkidle" });
    const journeys = page.getByRole("region", { name: "Journey records" });
    await expect(journeys).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Users subsections" })
      .getByRole("link", { name: "Visitor Journeys", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(journeys.locator("thead th")).toHaveCount(8);
    await expect(journeys.locator("tbody tr")).toHaveCount(4);
    await expect(journeys.locator("tbody tr:first-child td")).toHaveCount(8);
    const actionLinks = journeys.locator("tbody tr > td:last-child a");
    await expect(actionLinks).toHaveCount(4);
    const dims = await journeys.evaluate(element => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      regionWidth: element.clientWidth,
      regionScrollWidth: element.scrollWidth,
      regionRight: element.getBoundingClientRect().right,
      actions: Array.from(element.querySelectorAll("tbody tr > td:last-child a")).map(link => {
        const {left,right} = link.getBoundingClientRect();
        return {left,right,href:link.getAttribute("href")};
      }),
    }));
    assert.ok(dims.documentWidth <= dims.viewportWidth + 1, "Journeys page must fit viewport: " + JSON.stringify(dims));
    assert.ok(dims.regionScrollWidth <= dims.regionWidth + 1, "Journeys table must fit records region: " + JSON.stringify(dims));
    assert.ok(dims.actions.every(a => a.left >= 0 && a.right <= Math.min(dims.viewportWidth, dims.regionRight) + 1),
      "Each Journey Action must remain visible: " + JSON.stringify(dims));
    assert.ok(dims.actions.every(a => a.href?.startsWith("/admin/journeys/qa-journey-000")),
      "Journey Actions must still open scoped journey details");
    await journeys.scrollIntoViewIfNeeded();
    await page.screenshot({ path: output + "/visitor-journeys-" + width + ".png", fullPage: false });
    checks.push("Visitor Journeys Action visibility at " + width + "px");
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
