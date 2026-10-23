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
  await expect(combo).toHaveAttribute("aria-haspopup", "listbox");
  await combo.click();
  const list = page.getByRole("listbox", { name: label });
  await expect(list).toBeVisible();
  await list.getByRole("option", { name: optionName, exact: true }).click();
  await expect(list).toHaveCount(0);
}
const tabs = () => page.getByRole("navigation", { name: "User types" });
const filterForm = () => page.locator("form").filter({ has: page.getByRole("button", { name: "Apply Filter" }) });
const expectedLabels = ["Identity", "Type", "Status", "Joined / First Seen", "Activity", "Actions"];

try {
  for (const width of [1280, 390]) {
    await check("capture unmodified latest-dev Users page at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/before", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Users: 30" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Identity type" })).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(30);
      await page.screenshot({ path: output + "/before-users-directory-" + width + ".png", fullPage: true });
    });
  }

  for (const width of [1280, 1366, 390, 320]) {
    await check("six-column flat directory and underline-only tab hierarchy at " + width + "px", async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(after, { waitUntil: "domcontentloaded" });
      await expect(tabs().getByRole("link", { name: "All (30)" })).toBeVisible();
      await expect(tabs().getByRole("link", { name: "Registered (2)" })).toBeVisible();
      await expect(tabs().getByRole("link", { name: "Guests (28)" })).toBeVisible();
      await expect(tabs().getByRole("link", { name: "All (30)" })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: "Users directory" })).toHaveCount(1);
      await expect(page.getByRole("region", { name: "Users directory" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Account role" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Account status" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Identity type" })).toHaveCount(0);
      await expect(filterForm().locator('input[name="identity"]')).toHaveValue("ALL");
      await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");
      await expect(page.locator("tbody tr")).toHaveCount(30);
      const actualHeaders = await page.locator("thead th").allTextContents();
      assert.deepEqual(actualHeaders.map(text => text.trim()), expectedLabels);

      const colors = await tabs().getByRole("link").evaluateAll(links =>
        links.map(link => {
          const style = getComputedStyle(link);
          return { selected: link.getAttribute("aria-current") === "page", color: style.color,
            fontSize: style.fontSize, fontWeight: style.fontWeight, border: style.borderBottomColor };
        }));
      assert.equal(colors.length, 3);
      assert.deepEqual(new Set(colors.map(item => item.color)).size, 1, "All tab text colors must match");
      assert.deepEqual(new Set(colors.map(item => item.fontWeight)).size, 1, "Only underline distinguishes selected tab");
      assert.deepEqual(new Set(colors.map(item => item.fontSize)).size, 1);
      assert.equal(colors.filter(item => item.selected).length, 1);
      assert.notEqual(colors[0].border, colors[1].border, "Selected tab uses blue underline");

      const shellColor = await page.locator("main").evaluate(main => getComputedStyle(main.parentElement).backgroundColor);
      assert.equal(shellColor, "rgb(255, 255, 255)");
      assert.equal(await page.locator("main [class*='shadow-'], main [class*='rounded-2xl']").count(), 0);
      const placeholderColor = await page.locator('input[name="q"]').evaluate(input => getComputedStyle(input, "::placeholder").color);
      assert.equal(placeholderColor, "rgb(100, 116, 139)");
      const metrics = await page.evaluate(() => {
        const region = document.querySelector('[role="region"][aria-labelledby="identity-directory-title"]');
        return { viewport: innerWidth, document: document.documentElement.scrollWidth,
          regionWidth: region?.clientWidth, tableWidth: region?.scrollWidth };
      });
      assert.ok(metrics.document <= metrics.viewport + 1, "No horizontal page drift: " + JSON.stringify(metrics));
      if (width >= 1280) assert.ok(metrics.tableWidth <= metrics.regionWidth + 1, "All six columns fit on desktop: " + JSON.stringify(metrics));
      if (width <= 390) assert.ok(metrics.tableWidth > metrics.regionWidth, "Only table scrolls horizontally on narrow viewports");
      await expect(page.getByRole("link", { name: "Kurioticket Admin overview" })).toBeVisible();
      await page.screenshot({ path: output + "/after-users-directory-" + width + ".png", fullPage: true });
    });
  }

  await check("registered and guest rows are readable and keep their actions/IDs", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(after, { waitUntil: "domcontentloaded" });
    const guest = page.locator("tbody tr").filter({ hasText: "qa-guest-001" });
    const registered = page.locator("tbody tr").filter({ hasText: "Zara Example" });
    await expect(guest).toContainText("Guest visitor");
    await expect(guest).toContainText("Guest");
    await expect(guest.getByLabel("No account status for guest visitor")).toBeVisible();
    await expect(guest.getByLabel("No account actions for guests")).toBeVisible();
    await expect(guest.getByRole("button", { name: "Copy guest ID: qa-guest-001" })).toBeVisible();
    await expect(guest.getByRole("link", { name: /View Activity for Guest visitor/ })).toBeVisible();
    await expect(registered).toContainText("Registered · Support");
    await expect(registered).toContainText("Active");
    await expect(registered.getByRole("button", { name: /Manage account/ })).toBeVisible();
    await expect(registered.getByRole("button", { name: "Copy user ID: qa-support-001" })).toBeVisible();
    const protectedAdmin = page.locator("tbody tr").filter({ hasText: "Alana Example" });
    await expect(protectedAdmin).toContainText("Protected admin");
    await expect(protectedAdmin.getByRole("button", { name: /Manage account/ })).toHaveCount(0);
    const date = await guest.locator("time").first().getAttribute("dateTime");
    assert.ok(date?.startsWith("2026-10-22T"), "Full date/time remains available in semantic time element");
  });

  await check("identity-type tabs update only cohort, preserve applied filters/sort and reset page", async () => {
    await page.goto(after + "?sort=name_asc&page=2", { waitUntil: "domcontentloaded" });
    await tabs().getByRole("link", { name: "Registered (2)" }).click();
    await expect(page).toHaveURL(/identity=REGISTERED/);
    await expect(page).toHaveURL(/sort=name_asc/);
    assert.equal(new URL(page.url()).searchParams.get("page"), "1");
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect(tabs().getByRole("link", { name: "Registered (2)" })).toHaveAttribute("aria-current", "page");
    await expect(tabs().getByRole("link", { name: "All (30)" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "Guests (28)" })).toBeVisible();
    await expect(filterForm().locator('input[name="identity"]')).toHaveValue("REGISTERED");
    await tabs().getByRole("link", { name: "Guests (28)" }).click();
    await expect(page).toHaveURL(/identity=GUEST/);
    await expect(page.locator("tbody tr")).toHaveCount(28);
    await expect(tabs().getByRole("link", { name: "Guests (28)" })).toHaveAttribute("aria-current", "page");
    await expect(tabs().getByRole("link", { name: "All (30)" })).toBeVisible();
    await expect(filterForm().locator('input[name="identity"]')).toHaveValue("GUEST");
    const link = page.locator("tbody tr").first().getByRole("link", { name: /View Activity/ });
    const href = await link.getAttribute("href");
    assert.ok(href.includes("identity%3DGUEST") && href.includes("sort%3Dname_asc"), "Activity URL retains selected identity and sort");
    await page.screenshot({ path: output + "/after-guests-tab-1280.png", fullPage: true });
    await tabs().getByRole("link", { name: "All (30)" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  await check("status/role filtering stays pending until Apply Filter and updates tab counts honestly", async () => {
    const original = page.url();
    await chooseOption("Account role", "Support");
    await chooseOption("Account status", "Active");
    assert.equal(page.url(), original, "Pending control changes do not navigate");
    await expect(filterForm().locator('input[name="role"]')).toHaveValue("SUPPORT");
    await expect(filterForm().locator('input[name="status"]')).toHaveValue("ACTIVE");
    await page.getByRole("button", { name: "Apply Filter" }).click();
    await expect(page).toHaveURL(/role=SUPPORT/);
    await expect(page).toHaveURL(/status=ACTIVE/);
    await expect(page).toHaveURL(/identity=ALL/);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText("Zara Example");
    await expect(tabs().getByRole("link", { name: "All (1)" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "Registered (1)" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "Guests (0)" })).toBeVisible();
    await tabs().getByRole("link", { name: "Guests (0)" }).click();
    await expect(page).toHaveURL(/role=SUPPORT/);
    await expect(page).toHaveURL(/identity=GUEST/);
    await expect(page.getByText("No users match these filters.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");
  });

  await check("sort choices apply immediately and preserve active cohort", async () => {
    await page.goto(after + "?identity=REGISTERED", { waitUntil: "domcontentloaded" });
    for (const [name, value, first] of [
      ["Oldest first", "oldest", "Zara Example"],
      ["Name: A–Z", "name_asc", "Alana Example"],
      ["Name: Z–A", "name_desc", "Zara Example"],
      ["Newest first", "newest", "Alana Example"],
    ]) {
      await chooseOption("Sort by", name);
      await expect(page).toHaveURL(new RegExp("sort=" + value));
      await expect(page).toHaveURL(/identity=REGISTERED/);
      await expect(page.locator("tbody tr").first()).toContainText(first);
      await expect(tabs().getByRole("link", { name: "Registered (2)" })).toHaveAttribute("aria-current", "page");
      assert.equal(new URL(page.url()).searchParams.get("page"), null);
    }
  });

  await check("custom dropdown keyboard and focus behaviors remain accessible", async () => {
    const status = page.getByRole("combobox", { name: "Account status" });
    await status.focus();
    await page.keyboard.press("ArrowDown");
    const list = page.getByRole("listbox", { name: "Account status" });
    await expect(list).toBeVisible();
    await page.keyboard.press("End");
    assert.match(await list.getAttribute("aria-activedescendant"), /option-4$/);
    await page.keyboard.press("Home");
    assert.match(await list.getAttribute("aria-activedescendant"), /option-0$/);
    await page.keyboard.press("Escape");
    await expect(status).toBeFocused();
    await expect(list).toHaveCount(0);
  });

  await check("no-JavaScript filter, user-type tabs, and manual sorting all remain functional", async () => {
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    try {
      const tab = await noJS.newPage();
      await tab.goto(after, { waitUntil: "domcontentloaded" });
      await tab.getByRole("navigation", { name: "User types" }).getByRole("link", { name: "Guests (28)" }).click();
      await expect(tab).toHaveURL(/identity=GUEST/);
      await expect(tab.locator("tbody tr")).toHaveCount(28);
      await tab.getByRole("combobox", { name: "Sort by" }).selectOption("oldest");
      await tab.getByRole("button", { name: "Apply sort" }).click();
      await expect(tab).toHaveURL(/sort=oldest/);
      await expect(tab).toHaveURL(/identity=GUEST/);
      await tab.getByRole("navigation", { name: "User types" }).getByRole("link", { name: "All (30)" }).click();
      await tab.getByRole("combobox", { name: "Account role" }).selectOption("SUPPORT");
      await tab.getByRole("button", { name: "Apply Filter" }).click();
      await expect(tab).toHaveURL(/role=SUPPORT/);
      await expect(tab.locator("tbody tr")).toHaveCount(1);
      await expect(tab.getByRole("navigation", { name: "User types" }).getByRole("link", { name: "Guests (0)" })).toBeVisible();
      await tab.screenshot({ path: output + "/after-users-no-js-1280.png", fullPage: false });
    } finally {
      await noJS.close();
    }
  });

  await check("Manage still requires confirmation and never invokes permanent deletion", async () => {
    await page.goto(after, { waitUntil: "domcontentloaded" });
    const row = page.getByRole("row").filter({ hasText: "Zara Example" });
    const manage = row.getByRole("button", { name: /Manage account/ });
    await manage.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Suspend" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
    await expect(menu).not.toContainText("Soft delete");
    await page.screenshot({ path: output + "/after-users-manage-1280.png", fullPage: false });
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
    assert.deepEqual(requests, [], "Cancelling never mutates a user");
    await manage.click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(row.getByRole("status").last()).toContainText("QA denied status change");
    assert.deepEqual(requests, [{ status: "DELETED" }], "Only the recoverable DELETED status was attempted");
    await page.unroute("**/api/admin/users/*/status");
  });

  assert.deepEqual(errors, [], "No uncaught browser errors");
  await writeFile(output + "/browser-results.json", JSON.stringify({
    checks, errors, baseline: "80ddd69f2d7c108cc0b13b20b6d8af02c159f140", synthetic: true,
  }, null, 2));
  console.log("PASS " + checks.length + " Users directory regression and visual checks.");
} finally {
  await browser.close();
}
