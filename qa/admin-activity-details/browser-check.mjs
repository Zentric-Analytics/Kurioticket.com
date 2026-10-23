import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
page.setDefaultTimeout(25_000);
const failures = [];
page.on("pageerror", err => failures.push(err.message));
const url = base + "/admin/users/guest/qa-guest-activity-0001/activity";
const checks = [];
async function check(name, task) { await task(); checks.push(name); console.log("PASS", name); }
async function choose(label, item) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("listbox", { name: label }).getByRole("option", { name: item, exact: true }).click();
}

try {
  for (const width of [1280, 390]) {
    await check("baseline Activity page before design at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/before", { waitUntil: "networkidle" });
      await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
      await expect(page.getByRole("heading", { name: "Guest visitor" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
      await expect(page.locator("main .rounded-2xl").first()).toBeVisible();
      await page.screenshot({ path: output + "/before-view-activity-" + width + ".png", fullPage: true });
    });
  }

  for (const width of [1280, 1440, 768, 390, 320]) {
    await check("flat Activity layout at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Guest visitor" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Identity details" })).toBeVisible();
      await expect(page.getByRole("link", { name: "View all searches" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Activity tabs" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Recorded journey qa-journey-repeated" })).toBeVisible();
      assert.equal(await page.locator('main [class*="rounded-2xl"], main [class*="shadow-"]').count(), 0, "No nested card/shadow styling");
      const shellBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
      assert.equal(shellBg, "rgb(255, 255, 255)", "Activity routes use the white canvas");
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(widths.document <= widths.viewport + 1, "No horizontal document drift: " + JSON.stringify(widths));
      const all = await page.locator("[data-activity-id]").count();
      assert.equal(all, 12, "All 12 synthetic events survive the visual grouping");
      if ([1280, 390, 320].includes(width)) {
        await page.screenshot({ path: output + "/after-view-activity-" + width + ".png", fullPage: true });
      }
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url + "?directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2", { waitUntil: "networkidle" });
  await check("same-journey grouping and full event disclosure", async () => {
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-flight" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-hotel" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Other recorded activity" })).toHaveCount(1);
    const repeated = page.getByRole("region", { name: "Recorded journey qa-journey-repeated" });
    await expect(repeated).toContainText("4 recorded events");
    const details = repeated.getByTestId("selection-run");
    await expect(details).toHaveCount(1);
    await expect(details.locator("summary")).toContainText("Offer selected · 4 events");
    await expect(details).not.toHaveAttribute("open");
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open");
    await expect(repeated.locator("[data-activity-id]")).toHaveCount(4);
    await expect(repeated.locator("time")).toHaveCount(4);
    await expect(repeated.getByRole("link", { name: "Open journey" })).toHaveCount(4);
    for (const stamp of ["5:59", "5:58", "5:57", "5:56"]) await expect(repeated).toContainText(stamp);
    await page.screenshot({ path: output + "/after-expanded-selections-1280.png", fullPage: true });
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(details).not.toHaveAttribute("open");
    await details.locator("summary").focus();
    await page.keyboard.press("Space");
    await expect(details).toHaveAttribute("open");
    const allIds = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-id")));
    assert.equal(allIds.length, new Set(allIds).size, "No duplicate or dropped records");
    const href = await page.getByRole("link", { name: "Users", exact: true }).last().getAttribute("href");
    assert.ok(href.includes("sort=name_asc") && href.includes("identity=GUEST") && href.includes("page=2"), "Back to Users retains directory context");
  });

  await check("single-event grammar and accessible copy control", async () => {
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-single" })).toContainText("1 recorded event");
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-single" })).not.toContainText("1 recorded events");
    const copy = page.getByRole("button", { name: /Copy guest ID:/ });
    await copy.click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "qa-guest-activity-0001");
    const brand = page.getByRole("link", { name: "Kurioticket Admin overview" });
    await expect(brand.locator('img[src="/brand/kurioticket-icon-blue.svg"]')).toBeVisible();
  });

  await check("date, product, stage and text filtering preserve GET semantics", async () => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Searches", exact: true }).click();
    await expect(page).toHaveURL(/tab=searches/);
    await expect(page.getByRole("link", { name: "Searches", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("textbox", { name: "Search within activity" }).fill("LOS");
    await page.getByRole("textbox", { name: "Activity start date UTC" }).fill("2026-10-22");
    await page.getByRole("textbox", { name: "Activity end date UTC" }).fill("2026-10-22");
    await choose("Activity product", "Flights");
    await choose("Activity event type", "Search completed");
    const unsubmitted = page.url();
    await expect(page.getByRole("combobox", { name: "Activity product" })).toContainText("Flights");
    assert.equal(page.url(), unsubmitted, "No navigation before Apply Filter");
    await page.getByRole("button", { name: "Apply Filter" }).click();
    await expect(page).toHaveURL(/product=FLIGHT/);
    await expect(page).toHaveURL(/stage=SEARCH_COMPLETED/);
    await expect(page).toHaveURL(/q=LOS/);
    await expect(page).toHaveURL(/from=2026-10-22/);
    await expect(page).toHaveURL(/to=2026-10-22/);
    await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await page.screenshot({ path: output + "/after-filtered-activity-1280.png", fullPage: true });
  });

  await check("older activity, tab switch and safe return context", async () => {
    await page.goto(url + "?directory=sort%3Dname_asc%26page%3D2", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Older activity" }).click();
    await expect(page).toHaveURL(/cursor=older-qa-page/);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Older activity" })).toHaveCount(0);
    await page.getByRole("link", { name: "Selections", exact: true }).click();
    await expect(page).toHaveURL(/tab=selections/);
    assert.equal(new URL(page.url()).searchParams.has("cursor"), false);
    await expect(page.getByRole("link", { name: "Selections", exact: true })).toHaveAttribute("aria-current", "page");
  });

  await check("empty activity and invalid cursor are distinct states", async () => {
    await page.goto(base + "/admin/users/guest/qa-no-events-0001/activity", { waitUntil: "networkidle" });
    await expect(page.getByText("No recorded activity matches these filters.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Older activity" })).toHaveCount(0);
    await page.goto(url + "?cursor=bad", { waitUntil: "networkidle" });
    await expect(page.getByText("Activity page link expired")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to newest activity" })).toBeVisible();
  });

  await check("registered customer retains title, email and same flat layout", async () => {
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "QA registered customer" })).toBeVisible();
    await expect(page.getByText("customer.qa@example.invalid", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related records" })).toBeVisible();
    await page.screenshot({ path: output + "/after-registered-activity-1280.png", fullPage: true });
  });

  await check("filters and sorting work without JavaScript", async () => {
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    try {
      const tab = await noJs.newPage();
      await tab.goto(url, { waitUntil: "domcontentloaded" });
      await tab.getByRole("combobox", { name: "Activity product" }).selectOption("HOTEL");
      await tab.getByRole("combobox", { name: "Activity event type" }).selectOption("OFFER_SELECTED");
      await tab.getByRole("button", { name: "Apply Filter" }).click();
      await expect(tab).toHaveURL(/product=HOTEL/);
      await expect(tab).toHaveURL(/stage=OFFER_SELECTED/);
      await expect(tab.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
    } finally {
      await noJs.close();
    }
  });

  assert.deepEqual(failures, [], "No uncaught browser errors");
  await writeFile(output + "/report.json", JSON.stringify({ checks, browserErrors: failures, screenshotData: "synthetic fixtures only" }, null, 2));
  console.log("PASS " + checks.length + " Admin Activity browser checks; synthetic before-after screenshots saved.");
} finally {
  await browser.close();
}
