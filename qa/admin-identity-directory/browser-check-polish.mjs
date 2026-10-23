import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.ADMIN_DIRECTORY_QA_URL;
const output = process.env.ADMIN_DIRECTORY_QA_OUTPUT;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(25_000);
const errors = [];
const checks = [];
page.on("pageerror", error => errors.push(error.message));
const after = base + "/admin/users";

async function check(name, assertion) {
  await assertion();
  checks.push(name);
  console.log("PASS", name);
}

try {
  await check("before screenshot is the real baseline component at 1280", async () => {
    await page.goto(base + "/before", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Identities (30)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter", exact: true })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(15);
    await page.screenshot({ path: output + "/before-identity-directory-1280.png", fullPage: true });
  });

  for (const width of [1280, 1366, 390, 320]) {
    await check("refined directory layout at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(after, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Identities (30)" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(30);
      await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");
      await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Identities (30)" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Kurioticket Admin overview" })).toBeVisible();
      const metrics = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        table: document.querySelector('[role="region"]')?.scrollWidth,
        region: document.querySelector('[role="region"]')?.clientWidth,
      }));
      assert.ok(metrics.document <= metrics.viewport + 1, "Document does not drift horizontally: " + JSON.stringify(metrics));
      if (width >= 1280) assert.ok(metrics.table <= metrics.region + 1, "Desktop table fits: " + JSON.stringify(metrics));
      await page.screenshot({ path: output + "/after-identity-directory-" + width + ".png", fullPage: true });
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await check("all four sort options apply immediately and reset pagination", async () => {
    await page.goto(after + "?page=2", { waitUntil: "networkidle" });
    for (const [value, expected] of [
      ["oldest", "Zara Example"],
      ["name_asc", "Alana Example"],
      ["name_desc", "Zara Example"],
      ["newest", "qa-guest-001"],
    ]) {
      await page.getByRole("combobox", { name: "Sort by" }).selectOption(value);
      await expect(page).toHaveURL(new RegExp("sort=" + value));
      await expect(page.locator("tbody tr").first()).toContainText(expected);
      assert.equal(new URL(page.url()).searchParams.get("page"), null);
    }
    await page.screenshot({ path: output + "/after-identity-directory-sorted-1280.png", fullPage: true });
  });
  await check("filters retain selected sorting and drop old page offset", async () => {
    await page.getByRole("combobox", { name: "Identity type" }).selectOption("GUEST");
    await page.getByRole("button", { name: "Apply Filter" }).click();
    await expect(page).toHaveURL(/identity=GUEST/);
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page.getByRole("heading", { name: "Identities (28)" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(28);
    assert.equal(new URL(page.url()).searchParams.get("page"), null);
  });
  assert.deepEqual(errors, [], "No uncaught errors in the browser fixture");
  await writeFile(output + "/browser-results.json", JSON.stringify({ checks, errors, baseline: "e5009cea40495ebfb8d45f8d0f51a201d72b7301" }, null, 2));
  console.log("PASS " + checks.length + " Admin directory browser checks and synthetic screenshots.");
} finally {
  await browser.close();
}
