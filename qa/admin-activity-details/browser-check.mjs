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

try {
  for (const width of [1280, 1366, 1440, 1920, 768, 390, 320]) {
    await check("activity layout at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });
      await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
      await expect(page.getByRole("heading", { name: "Guest visitor" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Identity details" })).toBeVisible();
      await expect(page.getByRole("link", { name: "View all searches" })).toBeVisible();
      assert.equal(await page.locator('[role="dialog"][aria-label="Identity activity"]').count(), 0);
      const widths = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      assert.ok(widths.document <= widths.viewport + 1, "No page overflow: " + JSON.stringify(widths));
      await page.screenshot({ path: output + "/after-guest-activity-" + width + ".png", fullPage: true });
    });
  }
  await check("group same-journey events under one heading", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle" });
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-flight" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Recorded journey qa-journey-hotel" })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Other recorded activity" })).toHaveCount(1);
  });
  await check("guest ID copy and official Admin logo", async () => {
    const brand = page.getByRole("link", { name: "Kurioticket Admin overview" });
    await expect(brand).toBeVisible();
    const logo = brand.locator('img[src="/brand/kurioticket-icon-blue.svg"]');
    await expect(logo).toBeVisible();
    assert.equal(await logo.evaluate(img => img.complete && img.naturalWidth > 0), true);
    const copy = page.getByRole("button", { name: /Copy guest ID:/ });
    await copy.click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "qa-guest-activity-0001");
  });
  await check("tabs and URL-backed filters remain usable", async () => {
    await page.getByRole("link", { name: "Selections", exact: true }).click();
    await expect(page).toHaveURL(/tab=selections/);
    await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
    await expect(page.getByText("Offer selected", { exact: true })).toHaveCount(1);
    await page.getByRole("combobox", { name: "Activity product" }).selectOption("FLIGHT");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/product=FLIGHT/);
    await page.screenshot({ path: output + "/after-filtered-activity-1280.png", fullPage: true });
  });
  await check("registered identity uses the same full-page design", async () => {
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "QA registered customer" })).toBeVisible();
    await expect(page.getByText("customer.qa@example.invalid", { exact: true })).toBeVisible();
    await page.screenshot({ path: output + "/after-registered-activity-1280.png", fullPage: true });
  });
  assert.deepEqual(failures, [], "No uncaught browser errors");
  await writeFile(output + "/report.json", JSON.stringify({ checks, browserErrors: failures }, null, 2));
  console.log("PASS " + checks.length + " Admin Activity browser checks; fixture screenshots saved.");
} finally {
  await browser.close();
}
