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
  const combo = page.getByRole("combobox", { name: label });
  // The server first renders a native fallback; wait for the progressive
  // enhancement before exercising its styled listbox.
  await expect(combo).toHaveAttribute("aria-haspopup", "listbox");
  await combo.click();
  await page.getByRole("listbox", { name: label }).getByRole("option", { name: item, exact: true }).click();
}

try {
  for (const width of [1536, 390]) {
    await check("baseline Activity page before Explorer redesign at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/before", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
      await expect(page.getByRole("heading", { name: "Guest visitor" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Manage guest qa-guest-activity-0001" })).toBeVisible();
      await page.screenshot({ path: output + "/before-view-activity-" + width + ".png", fullPage: true });
    });
  }

  for (const width of [1536, 1280, 1024, 768, 390, 320]) {
    await check("approved Activity Explorer layout at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Visitor", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Activity history" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Manage guest qa-guest-activity-0001" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Identity details" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Explore related records" })).toBeVisible();
      await expect(page.getByRole("link", { name: /View all searches from this identity/ })).toBeVisible();
      await expect(page.getByText("Analytics consent", { exact: true })).toBeVisible();
      await expect(page.getByText("Granted", { exact: true })).toBeVisible();
      assert.equal(await page.getByText("Guest · Not an account").count(), 0, "No repeated guest classification");
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      if (width >= 1280) {
        const bounds = await Promise.all([
          page.getByLabel("Activity start date UTC").boundingBox(),
          page.getByLabel("Activity end date UTC").boundingBox(),
          page.getByRole("combobox", { name: "Activity product" }).boundingBox(),
          page.getByRole("combobox", { name: "Activity event type" }).boundingBox(),
          page.getByRole("textbox", { name: "Search within activity" }).boundingBox(),
          page.getByRole("button", { name: "Apply Filter" }).boundingBox(),
        ]);
        assert.ok(bounds.every(Boolean), "All six filter controls must render");
        const top = bounds.map(box => box.y);
        assert.ok(Math.max(...top) - Math.min(...top) <= 6, "All filter controls align horizontally at desktop width");
        for (let i = 1; i < bounds.length; i++) {
          assert.ok(bounds[i].x >= bounds[i - 1].x + bounds[i - 1].width - 1,
            "Adjacent desktop filters must not overlap");
        }
      }
      await expect(page.getByRole("navigation", { name: "Activity tabs" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Recorded journey qa-journey-repeated" })).toBeVisible();
      assert.equal(await page.locator('main [class*="rounded-2xl"], main [class*="shadow-"]').count(), 0, "No nested card/shadow styling");
      const shellBg = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
      assert.equal(shellBg, "rgb(255, 255, 255)", "Activity routes use the white canvas");
      const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(widths.document <= widths.viewport + 1, "No horizontal document drift: " + JSON.stringify(widths));
      const all = await page.locator("[data-activity-id]").count();
      assert.equal(all, 12, "All 12 synthetic events survive the visual grouping");
      if ([1536, 1280, 390, 320].includes(width)) {
        await page.screenshot({ path: output + "/after-view-activity-" + width + ".png", fullPage: true });
      }
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url + "?directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2", { waitUntil: "domcontentloaded" });
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
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: "Activity tabs" }).getByRole("link", { name: "Searches", exact: true }).click();
    await expect(page).toHaveURL(/tab=searches/);
    await expect(page.getByRole("navigation", { name: "Activity tabs" }).getByRole("link", { name: "Searches", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("textbox", { name: "Search within activity" }).fill("LOS");
    await page.getByLabel("Activity start date UTC").fill("2026-10-22");
    await page.getByLabel("Activity end date UTC").fill("2026-10-22");
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
    await expect(page.getByRole("heading", { name: "Activity history" })).toBeVisible();
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await page.screenshot({ path: output + "/after-filtered-activity-1280.png", fullPage: true });
  });

  await check("older activity, tab switch and safe return context", async () => {
    await page.goto(url + "?directory=sort%3Dname_asc%26page%3D2", { waitUntil: "domcontentloaded" });
    const firstPageIds = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-id")));
    const firstPageTimes = await page.locator("time[dateTime]").evaluateAll(nodes => nodes.map(node => Date.parse(node.getAttribute("dateTime"))));
    await page.getByRole("link", { name: "Older activity" }).click();
    await expect(page).toHaveURL(/cursor=older-qa-page/);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    const olderPageIds = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-id")));
    const olderPageTimes = await page.locator("time[dateTime]").evaluateAll(nodes => nodes.map(node => Date.parse(node.getAttribute("dateTime"))));
    assert.ok(olderPageIds.every(id => !firstPageIds.includes(id)), "Cursor pages must never repeat recorded events");
    assert.ok(olderPageTimes.every(at => at < Math.min(...firstPageTimes)), "Older cursor page must contain strictly earlier records");
    await expect(page.getByRole("link", { name: "Older activity" })).toHaveCount(0);
    await page.getByRole("navigation", { name: "Activity tabs" }).getByRole("link", { name: "Selections", exact: true }).click();
    await expect(page).toHaveURL(/tab=selections/);
    assert.equal(new URL(page.url()).searchParams.has("cursor"), false);
    await expect(page.getByRole("navigation", { name: "Activity tabs" }).getByRole("link", { name: "Selections", exact: true })).toHaveAttribute("aria-current", "page");
  });

  await check("global chronology sorting preserves cursors, tabs, and exact recorded timestamps", async () => {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await choose("Activity order", "Oldest first");
    await expect(page).toHaveURL(/order=oldest/);
    const oldestIds = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-id")));
    assert.equal(oldestIds[0], "j-qa-single");
    assert.equal(oldestIds.at(-1), "j-qa-selection-59");
    await expect(page.getByRole("link", { name: "Newer activity" })).toBeVisible();
    await page.screenshot({ path: output + "/after-oldest-journal-1280.png", fullPage: true });
    await page.getByRole("link", { name: "Newer activity" }).click();
    await expect(page).toHaveURL(/cursor=newer-qa-page/);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    const newerIds = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-activity-id")));
    assert.ok(newerIds.every(id => !oldestIds.includes(id)), "Ascending activity cursor must not duplicate records");
    await page.getByRole("navigation", { name: "Activity tabs" }).getByRole("link", { name: "Searches", exact: true }).click();
    await expect(page).toHaveURL(/order=oldest/);
    assert.equal(new URL(page.url()).searchParams.has("cursor"), false);
  });

  await check("empty activity and invalid cursor are distinct states", async () => {
    await page.goto(base + "/admin/users/guest/qa-no-events-0001/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No activity recorded in this view")).toBeVisible();
    await expect(page.getByText(/No matching recorded activity is currently linked to this identity in staging/)).toBeVisible();
    await expect(page.getByText("Try adjusting your filters or date range.")).toBeVisible();
    await expect(page.getByText("0 recorded events")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visitor" })).toBeVisible();
    await page.setViewportSize({ width: 1536, height: 1024 });
    await page.screenshot({ path: output + "/after-approved-empty-state-1536.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole("link", { name: "Older activity" })).toHaveCount(0);
    await page.goto(url + "?cursor=bad", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Activity page link expired")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to newest activity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage guest qa-guest-activity-0001" })).toBeVisible();
  });

  await check("account management stays reachable when Activity data is unavailable", async () => {
    await page.goto(base + "/admin/users/user/qa-registered-unavailable-0001/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Activity data unavailable", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage account for customer.qa@example.invalid" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to newest activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity history" })).toHaveCount(0);
    await page.screenshot({ path: output + "/after-activity-unavailable-manage-1280.png", fullPage: false });
  });

  await check("registered customer retains title, email and same flat layout", async () => {
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "QA registered customer" })).toBeVisible();
    await expect(page.getByText("customer.qa@example.invalid", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Explore related records" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage account for customer.qa@example.invalid" })).toBeVisible();
    await page.screenshot({ path: output + "/after-registered-activity-1280.png", fullPage: true });
  });

  await check("guest management is in the header, not a destructive guest Delete flow", async () => {
    await page.goto(url + "?directory=identity%3DGUEST%26sort%3Doldest", { waitUntil: "domcontentloaded" });
    const manage = page.getByRole("button", { name: "Manage guest qa-guest-activity-0001" });
    await expect(manage).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Activity product" })).toHaveAttribute("aria-haspopup", "listbox");
    await manage.click();
    const menu = page.getByRole("menu", { name: "Guest management" });
    await expect(menu.getByRole("menuitem", { name: "Disable tracking" })).toBeVisible();
    await expect(menu).not.toContainText("Delete guest data");
    await expect(menu).not.toContainText("Suspend");
    await page.screenshot({ path: output + "/after-guest-manage-open-1280.png", fullPage: false });
    await page.keyboard.press("Escape");
    await expect(manage).toBeFocused();
    await expect(menu).toHaveCount(0);
    const requests = [];
    await page.route("**/api/admin/guests/*/tracking", async route => {
      requests.push({ method: route.request().method(), url: route.request().url() });
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "QA denied tracking update" }) });
    });
    await manage.click();
    let confirmation = "";
    page.once("dialog", async dialog => { confirmation = dialog.message(); await dialog.dismiss(); });
    await menu.getByRole("menuitem", { name: "Disable tracking" }).click();
    assert.match(confirmation, /Historical records remain/);
    assert.deepEqual(requests, [], "Cancel sends no guest mutation");
    await manage.click();
    page.once("dialog", dialog => dialog.accept());
    await menu.getByRole("menuitem", { name: "Disable tracking" }).click();
    await expect(page.getByRole("status").last()).toContainText("QA denied tracking update");
    assert.deepEqual(requests.map(r => r.method), ["PATCH"], "Guest uses scoped PATCH, never account/delete");
    assert.ok(requests[0].url.endsWith("/api/admin/guests/qa-guest-activity-0001/tracking"));
    await page.unroute("**/api/admin/guests/*/tracking");
  });

  await check("registered Manage retains role/status options and recoverable deletion safeguards", async () => {
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity", { waitUntil: "domcontentloaded" });
    const manage = page.getByRole("button", { name: "Manage account for customer.qa@example.invalid" });
    await expect(page.getByRole("combobox", { name: "Activity product" })).toHaveAttribute("aria-haspopup", "listbox");
    await manage.click();
    const menu = page.getByRole("menu", { name: "Account actions for customer.qa@example.invalid" });
    await expect(menu.getByRole("menuitem", { name: "Suspend" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
    await expect(menu).not.toContainText("Soft delete");
    await page.screenshot({ path: output + "/after-registered-manage-open-1280.png", fullPage: false });
    const requests = [];
    await page.route("**/api/admin/users/*/status", async route => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "QA denied account status change" }) });
    });
    let confirmation = "";
    page.once("dialog", async dialog => { confirmation = dialog.message(); await dialog.dismiss(); });
    await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
    assert.match(confirmation, /can be restored/);
    assert.deepEqual(requests, [], "Cancel sends no account mutation");
    await manage.click();
    page.once("dialog", dialog => dialog.accept());
    await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("status").last()).toContainText("QA denied account status change");
    assert.deepEqual(requests, [{ status: "DELETED" }], "Only recoverable account Delete attempted");
    await page.unroute("**/api/admin/users/*/status");
    await page.goto(base + "/admin/users/user/qa-admin/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Current admin", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Manage account/ })).toHaveCount(0);
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
      await expect(tab.getByRole("heading", { name: "Activity history" })).toBeVisible();
      await tab.getByRole("combobox", { name: "Activity order" }).selectOption("oldest");
      await tab.getByRole("button", { name: "Apply sort" }).click();
      await expect(tab).toHaveURL(/order=oldest/);
      await expect(tab).toHaveURL(/product=HOTEL/);
      await expect(tab).toHaveURL(/stage=OFFER_SELECTED/);
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
