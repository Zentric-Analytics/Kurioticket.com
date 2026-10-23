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

async function chooseOption(label, optionName) {
  const combo = page.getByRole("combobox", { name: label });
  await combo.click();
  const list = page.getByRole("listbox", { name: label });
  await expect(list).toBeVisible();
  await list.getByRole("option", { name: optionName, exact: true }).click();
  await expect(list).toHaveCount(0);
}

try {
  await check("original directory screenshot uses real baseline", async () => {
    await page.goto(base + "/before", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Identities (30)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filter", exact: true })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(15);
    await page.screenshot({ path: output + "/before-identity-directory-1280.png", fullPage: true });
  });

  for (const width of [1280, 1366, 390, 320]) {
    await check("card-free directory and refined controls at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(after, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Users: 30" })).toBeVisible();
      await expect(page.getByText("2 registered · 28 guest")).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(30);
      await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");
      await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
      for (const label of ["Identity type", "Account role", "Account status"]) {
        const control = page.getByRole("combobox", { name: label });
        await expect(control).toBeVisible();
        await expect(control).toHaveAttribute("aria-haspopup", "listbox");
      }
      await expect(page.getByRole("region", { name: "Users: 30" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Kurioticket Admin overview" })).toBeVisible();
      const shellColor = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
      assert.equal(shellColor, "rgb(255, 255, 255)");
      assert.equal(await page.locator("main [class*='shadow-']").count(), 0);
      const placeholderColor = await page.locator('input[name="q"]').evaluate(input => getComputedStyle(input, "::placeholder").color);
      assert.equal(placeholderColor, "rgb(100, 116, 139)", "Placeholder is muted and meets desktop text contrast");
      const metrics = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        table: document.querySelector('[role="region"]')?.scrollWidth,
        region: document.querySelector('[role="region"]')?.clientWidth,
      }));
      assert.ok(metrics.document <= metrics.viewport + 1, "No horizontal document drift: " + JSON.stringify(metrics));
      if (width >= 1280) assert.ok(metrics.table <= metrics.region + 1, "Desktop table fits: " + JSON.stringify(metrics));
      const view = page.getByRole("link", { name: /View Activity for/ }).first();
      const style = await view.evaluate(link => ({
        border: getComputedStyle(link).borderWidth,
        background: getComputedStyle(link).backgroundColor,
      }));
      assert.equal(style.border, "0px", "Activity is a borderless internal link");
      assert.equal(style.background, "rgba(0, 0, 0, 0)", "Activity has no button background");
      await page.screenshot({ path: output + "/after-identity-directory-" + width + ".png", fullPage: true });

      const statuses = page.getByRole("combobox", { name: "Account status" });
      await statuses.click();
      const popup = page.getByRole("listbox", { name: "Account status" });
      await expect(popup).toBeVisible();
      await expect(popup.getByRole("option")).toHaveCount(5);
      await expect(popup.getByRole("option", { name: "All statuses" })).toHaveAttribute("aria-selected", "true");
      const box = await popup.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, "Menu must fit the viewport");
      if (width === 1280 || width === 320) {
        await page.screenshot({ path: output + "/after-status-dropdown-" + width + ".png", fullPage: false });
      }
      await page.keyboard.press("Escape");
      await expect(statuses).toBeFocused();
      await expect(popup).toHaveCount(0);
    });
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await check("keyboard navigation, selected-state feedback and pending filters", async () => {
    await page.goto(after, { waitUntil: "networkidle" });
    const status = page.getByRole("combobox", { name: "Account status" });
    await status.focus();
    await page.keyboard.press("ArrowDown");
    const list = page.getByRole("listbox", { name: "Account status" });
    await expect(list).toBeVisible();
    await page.keyboard.press("End");
    assert.match(await list.getAttribute("aria-activedescendant"), /option-4$/);
    await page.keyboard.press("Home");
    assert.match(await list.getAttribute("aria-activedescendant"), /option-0$/);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(status).toContainText("Active");
    assert.equal(new URL(page.url()).searchParams.get("status"), null, "Filters are pending until Apply Filter");
    await status.click();
    await page.keyboard.press("Tab");
    await expect(list).toHaveCount(0);
  });

  await check("all four sort choices apply immediately and keep filtered context", async () => {
    await page.goto(after + "?page=2", { waitUntil: "networkidle" });
    for (const [label, value, first] of [
      ["Oldest first", "oldest", "Zara Example"],
      ["Name: A–Z", "name_asc", "Alana Example"],
      ["Name: Z–A", "name_desc", "Zara Example"],
      ["Newest first", "newest", "qa-guest-001"],
    ]) {
      await chooseOption("Sort by", label);
      await expect(page).toHaveURL(new RegExp("sort=" + value));
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText(label);
      await expect(page.locator("tbody tr").first()).toContainText(first);
      assert.equal(new URL(page.url()).searchParams.get("page"), null);
    }
    await page.screenshot({ path: output + "/after-identity-directory-sorted-1280.png", fullPage: true });
  });

  await check("filters submit only on Apply Filter and preserve sorting", async () => {
    const originalUrl = page.url();
    await chooseOption("Identity type", "Guests");
    assert.equal(page.url(), originalUrl, "Changing an unsubmitted filter must not navigate");
    await expect(page.getByRole("combobox", { name: "Identity type" })).toContainText("Guests");
    await expect(page.locator('form').filter({ has: page.getByRole("button", { name: "Apply Filter" }) }).locator('input[name="identity"]')).toHaveValue("GUEST");
    await page.getByRole("button", { name: "Apply Filter" }).click();
    await expect(page).toHaveURL(/identity=GUEST/);
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page.getByRole("heading", { name: "Users: 28" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(28);
    await expect(page.getByText("0 registered · 28 guest")).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get("page"), null);
  });

  await check("role and status filter options work together", async () => {
    await page.goto(after, { waitUntil: "networkidle" });
    await chooseOption("Identity type", "Registered");
    await chooseOption("Account role", "Support");
    await chooseOption("Account status", "Active");
    const pending = page.locator("form").filter({ has: page.getByRole("button", { name: "Apply Filter" }) });
    await expect(pending.locator('input[name="identity"]')).toHaveValue("REGISTERED");
    await expect(pending.locator('input[name="role"]')).toHaveValue("SUPPORT");
    await expect(pending.locator('input[name="status"]')).toHaveValue("ACTIVE");
    await page.getByRole("button", { name: "Apply Filter" }).click();
    await expect(page).toHaveURL(/identity=REGISTERED/);
    await expect(page).toHaveURL(/role=SUPPORT/);
    await expect(page).toHaveURL(/status=ACTIVE/);
    await expect(page.getByRole("heading", { name: "Users: 1" })).toBeVisible();
    await expect(page.getByText("1 registered · 0 guest")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Zara Example");
  });

  await check("without JavaScript, native filters and manual sort still work", async () => {
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    try {
      const fallback = await noJS.newPage();
      await fallback.goto(after, { waitUntil: "domcontentloaded" });
      const identity = fallback.getByRole("combobox", { name: "Identity type" });
      await expect(identity).toBeVisible();
      await identity.selectOption("GUEST");
      await fallback.getByRole("button", { name: "Apply Filter" }).click();
      await expect(fallback).toHaveURL(/identity=GUEST/);
      await expect(fallback.getByRole("heading", { name: "Users: 28" })).toBeVisible();

      await fallback.getByRole("combobox", { name: "Sort by" }).selectOption("oldest");
      await fallback.getByRole("button", { name: "Apply sort" }).click();
      await expect(fallback).toHaveURL(/sort=oldest/);
      await expect(fallback).toHaveURL(/identity=GUEST/);
      await expect(fallback.getByRole("heading", { name: "Users: 28" })).toBeVisible();
      await fallback.screenshot({ path: output + "/after-native-fallback-no-js.png", fullPage: false });
    } finally {
      await noJS.close();
    }
  });

  await check("Manage menu has Delete, no Soft delete, and recoverable confirmation", async () => {
    await page.goto(after, { waitUntil: "networkidle" });
    const row = page.getByRole("row").filter({ hasText: "Zara Example" });
    const manage = row.getByRole("button", { name: /Manage account/ });
    await manage.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Suspend" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
    await expect(menu).not.toContainText("Soft delete");
    await page.screenshot({ path: output + "/after-manage-dropdown-1280.png", fullPage: false });

    const requests = [];
    await page.route("**/api/admin/users/*/status", async route => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "QA denied status change" }) });
    });
    let confirmation = "";
    page.once("dialog", async dialog => {
      confirmation = dialog.message();
      await dialog.dismiss();
    });
    await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
    assert.match(confirmation, /can be restored/);
    assert.match(confirmation, /does not permanently erase/);
    assert.deepEqual(requests, [], "Cancel never changes the account");

    await manage.click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(row.getByRole("status")).toContainText("QA denied status change");
    assert.deepEqual(requests, [{ status: "DELETED" }], "Delete retains recoverable status update, never permanent-delete endpoint");
    await page.unroute("**/api/admin/users/*/status");
  });

  assert.deepEqual(errors, [], "No uncaught errors in the browser fixture");
  await writeFile(output + "/browser-results.json", JSON.stringify({ checks, errors, baseline: "e5009cea40495ebfb8d45f8d0f51a201d72b7301" }, null, 2));
  console.log("PASS " + checks.length + " Admin directory browser checks and fixture screenshots.");
} finally {
  await browser.close();
}
