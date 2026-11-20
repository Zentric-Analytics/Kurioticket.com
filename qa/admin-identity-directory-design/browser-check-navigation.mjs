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
    await expect(workspace.getByRole("link", { name: "Platforms & Devices", exact: true })).toBeVisible();
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
    const headerNavigation = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(headerNavigation).toBeVisible();
    await expect(headerNavigation.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
    await expect(headerNavigation.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open admin navigation" })).toHaveCount(0);
    const navGeometry = await headerNavigation.evaluate(node => {
      const links = [...node.querySelectorAll("a")];
      const first = links[0]?.getBoundingClientRect();
      return {
        rowCount: new Set(links.map(link => Math.round(link.getBoundingClientRect().top))).size,
        firstLeft: first?.left || 0,
      };
    });
    assert.equal(navGeometry.rowCount, 1, "Admin navigation remains a single horizontal row at " + width + "px");
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

  // The real Visitor Journeys page uses synthetic QA-only rows; preserve
  // all eight data fields and keep each Action visible at 100% zoom.
  for (const width of [1024, 1280, 1366, 1440, 1920, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(root + "/admin/journeys", { waitUntil: "networkidle" });
    const journeyFilters = page.getByRole("form", { name: "Filter visitor journeys" });
    await expect(journeyFilters).toBeVisible();
    await expect(journeyFilters.getByRole("button", { name: "Date range: Today" })).toBeVisible();
    await expect(journeyFilters.getByRole("button", { name: "Provider: All providers" })).toBeVisible();
    await expect(journeyFilters.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(journeyFilters.getByRole("button", { name: /Environment/ })).toHaveCount(0);
    const filterLayout = await journeyFilters.evaluate(form => {
      const select = [...form.querySelectorAll('button')];
      const heading = form.querySelector('h2');
      const date = select.find(button => button.getAttribute('aria-label')?.startsWith('Date range:'));
      const toolbar = select.filter(button => /^(Product:|Identity:|Observed stage:|Provider:)/.test(button.getAttribute('aria-label') || ''));
      const apply = select.find(button => button.textContent?.trim() === 'Apply filters');
      return {
        dateRight: date?.getBoundingClientRect().right || 0,
        formRight: form.getBoundingClientRect().right,
        headingTop: heading?.getBoundingClientRect().top || 0,
        dateTop: date?.getBoundingClientRect().top || 0,
        filterTops: toolbar.map(button => Math.round(button.getBoundingClientRect().top)),
        applyTop: Math.round(apply?.getBoundingClientRect().top || 0),
        controls: [...toolbar, apply].filter(Boolean).map(button => {
          const rect = button.getBoundingClientRect();
          return {
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            height: rect.height, width: rect.width,
            scrollWidth: button.scrollWidth, clientWidth: button.clientWidth,
          };
        }),
        formLeft: form.getBoundingClientRect().left,
      };
    });
    assert.ok(filterLayout.dateRight <= filterLayout.formRight + 1, "Date control stays inside content");
    assert.equal(filterLayout.controls.length, 5, "All four dropdowns and Apply filters are rendered");
    assert.ok(filterLayout.controls.every(control =>
      control.width > 0 && Math.abs(control.height - 40) < 1 &&
      control.left >= filterLayout.formLeft - 1 &&
      control.right <= filterLayout.formRight + 1 &&
      control.scrollWidth <= control.clientWidth + 1
    ), "Every Journeys filter must be visible with no horizontal scrolling or clipped labels at " + width + "px: " + JSON.stringify(filterLayout));
    // On narrow screens the controls can wrap, but only into distinct rows:
    // controls sharing a row may not overlap or extend outside the form.
    assert.ok(filterLayout.controls.every((control, index) =>
      index === 0 || control.top > filterLayout.controls[index - 1].top + 1 ||
      control.left >= filterLayout.controls[index - 1].right + 1
    ), "Journey filters must wrap without overlap at " + width + "px: " + JSON.stringify(filterLayout));

    if (width >= 1280) {
      assert.equal(new Set(filterLayout.filterTops.concat(filterLayout.applyTop)).size, 1,
        "Four dropdowns and Apply filters stay on one row at " + width + "px");
      assert.equal(filterLayout.controls.length, 5, "All five controls are rendered");
      assert.ok(filterLayout.controls.every(control =>
        control.width > 0 && Math.abs(control.height - 40) < 1 &&
        control.left >= filterLayout.formLeft - 1 && control.right <= filterLayout.formRight + 1 &&
        control.scrollWidth <= control.clientWidth + 1
      ), "All controls stay fully inside the filter row without clipped or overflowing buttons: " + JSON.stringify(filterLayout));
      assert.ok(filterLayout.controls.every((control, index) =>
        index === 0 || control.left >= filterLayout.controls[index - 1].right + 1
      ), "Dropdowns and Apply filters must not overlap: " + JSON.stringify(filterLayout));
      assert.ok(filterLayout.controls[4].width <= 140,
        "Apply filters must remain compact at " + width + "px");
      assert.ok(Math.abs(filterLayout.dateTop - filterLayout.filterTops[0]) < 2,
        "Date range stays on the same horizontal filter row at " + width + "px");
    }
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
  const expectedLabels = ["Overview", "Users", "Search Activity", "Trips", "Support", "Providers", "Content", "System", "Platform Health", "Settings"];
  for (const width of [1280, 1366, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(root + "/admin", { waitUntil: "networkidle" });
    const overviewNav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(overviewNav).toBeVisible();
    for (const label of expectedLabels) {
      await expect(overviewNav.getByRole("link", { name: label, exact: true })).toHaveCount(1);
    }
    await expect(page.getByRole("button", { name: "Open admin navigation" })).toHaveCount(0);
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Admin navigation"]');
      const region = document.querySelector('[aria-label="Admin navigation links"]');
      const links = [...nav.querySelectorAll("a")];
      return {
        tops: links.map(link => Math.round(link.getBoundingClientRect().top)),
        firstLeft: links[0].getBoundingClientRect().left,
        regionWidth: region.clientWidth,
        regionScrollWidth: region.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    assert.equal(new Set(geometry.tops).size, 1, "All ten links must remain on one row at " + width + "px");
    assert.ok(geometry.firstLeft >= 0 && geometry.firstLeft <= 32, "Overview starts close to the left at " + width + "px");
    if (width >= 1280) {
      assert.ok(geometry.regionScrollWidth <= geometry.regionWidth + 1, "Desktop nav cannot scroll at " + width + "px and 100% zoom");
    }
    assert.ok(geometry.documentWidth <= geometry.viewportWidth + 1, "Navbar cannot overflow the page at " + width + "px");
    await page.screenshot({ path: output + "/overview-navbar-" + width + ".png", fullPage: false });
    checks.push("All ten links remain horizontal at " + width + "px");
  }
  assert.deepEqual(errors, [], "No browser errors");
  await writeFile(output + "/navigation-browser-results.json", JSON.stringify({ checks, errors }, null, 2));
  console.log("PASS " + checks.length + " navigation visual checks");
} finally {
  await browser.close();
}
