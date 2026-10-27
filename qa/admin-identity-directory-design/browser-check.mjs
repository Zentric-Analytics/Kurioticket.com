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
const tabs = () => page.getByRole("navigation", { name: "User types" });
const search = () => page.getByRole("search").getByRole("searchbox", { name: "Search users" });
const row = label => page.locator("tbody tr").filter({ hasText: label });

async function check(name, work) {
  await work();
  checks.push(name);
  console.log("PASS", name);
}
async function choose(label, option) {
  const combo = page.getByRole("combobox", { name: label });
  await expect(combo).toHaveAttribute("aria-haspopup", "listbox");
  await combo.click();
  await page.getByRole("listbox", { name: label })
    .getByRole("option", { name: option, exact: true }).click();
}
function query(name) { return new URL(page.url()).searchParams.get(name); }

try {
  for (const width of [1280, 390]) {
    await check("current-dev before screenshot " + width, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/before", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
      await expect(page.locator("thead th")).toHaveCount(5);
      await expect(page.locator("tbody tr")).toHaveCount(30);
      await page.screenshot({ path: output + "/before-search-filter-" + width + ".png", fullPage: true });
    });
  }

  for (const width of [1440, 1280, 768, 390, 320]) {
    await check("responsive two-row toolbar and unchanged five-column table " + width, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(after, { waitUntil: "domcontentloaded" });
      await expect(search()).toBeVisible();
      await expect(search()).toHaveAttribute("placeholder", "Search by name, email, user ID, or guest ID");
      await expect(page.getByRole("combobox", { name: "Sort by" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Account role" })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Account status" })).toBeVisible();
      for (const name of ["Sort by", "Account role", "Account status"]) {
        await expect(page.getByRole("combobox", { name })).toHaveAttribute("aria-haspopup", "listbox");
      }
      await expect(page.getByRole("button", { name: "Apply Filter" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(0);
      await expect(tabs().getByRole("link", { name: "All (30)" })).toHaveAttribute("aria-current", "page");
      await expect(tabs().getByRole("link", { name: "Registered (2)" })).toBeVisible();
      await expect(tabs().getByRole("link", { name: "Guests (28)" })).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(30);
      const heads = await page.locator("thead th").allTextContents();
      assert.deepEqual(heads.map(text => text.trim()), ["Identity", "Type", "Status", "Joined / First Seen", "Activity"]);
      await expect(page.getByRole("region", { name: "Users directory" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");

      const fields = await page.evaluate(() => {
        const input = document.getElementById("admin-user-search");
        const sort = document.querySelector('[aria-label="Sort by"]');
        const role = document.querySelector('[aria-label="Account role"]');
        const status = document.querySelector('[aria-label="Account status"]');
        const tab = document.querySelector('nav[aria-label="User types"]');
        const r = node => node.getBoundingClientRect();
        const inp = r(input), so = r(sort), ro = r(role), st = r(status), ta = r(tab);
        return {
          input: { x: inp.x, y: inp.y, h: inp.height, w: inp.width },
          sort: { x: so.x, y: so.y, h: so.height, w: so.width },
          role: { x: ro.x, y: ro.y, h: ro.height, w: ro.width },
          status: { x: st.x, y: st.y, h: st.height, w: st.width },
          tabs: { y: ta.y, bottom: ta.bottom },
          screen: document.documentElement.scrollWidth,
          viewport: innerWidth,
          tableScrollWidth: document.querySelector('[role="region"][aria-labelledby="identity-directory-title"]').scrollWidth,
          tableClientWidth: document.querySelector('[role="region"][aria-labelledby="identity-directory-title"]').clientWidth,
          borderColor: [input, sort, role, status].map(node => getComputedStyle(node).borderColor),
          height: [input, sort, role, status].map(node => getComputedStyle(node).height),
          radius: [input, sort, role, status].map(node => getComputedStyle(node).borderRadius),
        };
      });
      assert.ok(fields.screen <= fields.viewport + 1, "No page-level horizontal drift: " + JSON.stringify(fields));
      assert.equal(new Set(fields.height).size, 1, "Search and dropdown heights match");
      assert.equal(new Set(fields.radius).size, 1, "Search and dropdown corner radius match");
      assert.equal(new Set(fields.borderColor).size, 1, "Search and dropdown borders match");
      assert.ok(fields.tabs.y > fields.input.y, "Tabs begin beneath search/sort row");
      assert.ok(fields.role.y > fields.input.y, "Filters are on the second row");
      if (width >= 768) {
        assert.ok(Math.abs(fields.input.y - fields.sort.y) <= 2, "Search and Sort share the first desktop row");
        assert.ok(fields.sort.x > fields.input.x + fields.input.w - 2, "Sort stays to search's right");
      } else {
        assert.ok(fields.sort.y > fields.input.y, "Sort moves below search on small viewports");
      }
      if (width >= 1024) {
        assert.ok(Math.abs(fields.tabs.bottom - (fields.role.y + fields.role.h)) < 10, "Filter controls align with tab bottom");
        assert.ok(fields.tableScrollWidth <= fields.tableClientWidth + 1, "Desktop table fits");
      } else {
        assert.ok(Math.abs(fields.role.y - fields.status.y) <= 2, "Role and Status share the narrow-viewport row");
        assert.ok(Math.abs(fields.role.w - fields.status.w) <= 4, "Narrow-viewport filters get equal widths");
        assert.ok(fields.tableScrollWidth > fields.tableClientWidth, "Only the table can scroll horizontally");
      }
      const selected = tabs().getByRole("link", { name: "All (30)" });
      const inactive = tabs().getByRole("link", { name: "Registered (2)" });
      const font = await Promise.all([selected, inactive].map(link => link.evaluate(node => {
        const css = getComputedStyle(node);
        return { weight: css.fontWeight, color: css.color, border: css.borderBottomWidth, borderColor: css.borderBottomColor };
      })));
      assert.notEqual(font[0].weight, font[1].weight, "Selected tab uses medium weight");
      assert.notEqual(font[0].color, font[1].color, "Inactive tab uses secondary text");
      assert.equal(font[0].border, "2px");
      assert.notEqual(font[0].borderColor, font[1].borderColor);
      await page.screenshot({ path: output + "/after-search-filter-" + width + ".png", fullPage: true });
    });
  }

  await check("search debounces and Enter commits immediately without Apply Filter", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(after, { waitUntil: "domcontentloaded" });
    await search().fill("Zara");
    await page.waitForTimeout(120);
    assert.equal(query("q"), null, "Search waits before debounce threshold");
    await expect(page).toHaveURL(/q=Zara/);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(row("Zara Example")).toBeVisible();
    await expect(tabs().getByRole("link", { name: "All (1)" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "Registered (1)" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "Guests (0)" })).toBeVisible();
    await search().fill("qa-guest-001");
    await search().press("Enter");
    await expect(page).toHaveURL(/q=qa-guest-001/);
    await expect(row("qa-guest-001")).toBeVisible();
    await expect(tabs().getByRole("link", { name: "All (1)" })).toBeVisible();
    await search().fill("");
    await search().press("Enter");
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  await check("Role and Status apply immediately, preserve query/tab/sort and clear independently", async () => {
    await page.goto(after + "?q=Zara&sort=oldest&tab=ALL", { waitUntil: "domcontentloaded" });
    await choose("Account role", "Support");
    await expect(page).toHaveURL(/role=SUPPORT/);
    await expect(page).toHaveURL(/q=Zara/);
    await expect(page).toHaveURL(/sort=oldest/);
    await expect(row("Zara Example")).toBeVisible();
    await choose("Account status", "Suspended");
    await expect(page).toHaveURL(/status=SUSPENDED/);
    await expect(page.getByText("No users match your filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(2); // toolbar + empty state
    await page.getByRole("link", { name: "Clear filters" }).first().click();
    await expect(page).toHaveURL(/role=ALL/);
    await expect(page).toHaveURL(/status=ALL/);
    await expect(page).toHaveURL(/q=Zara/);
    await expect(page).toHaveURL(/sort=oldest/);
    await expect(row("Zara Example")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(0);
  });

  await check("tab links preserve combined filters and hide guest Status control", async () => {
    await page.goto(after + "?q=qa-guest&role=ALL&status=ALL&sort=newest&tab=ALL", { waitUntil: "domcontentloaded" });
    await tabs().getByRole("link", { name: "Guests (28)" }).click();
    await expect(page).toHaveURL(/tab=GUEST/);
    await expect(page).toHaveURL(/q=qa-guest/);
    await expect(page.locator("tbody tr")).toHaveCount(28);
    await expect(page.getByRole("combobox", { name: "Account status" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Account role" })).toBeVisible();
    const destination = await page.locator("tbody tr").first().getByRole("link", { name: /View Activity/ }).getAttribute("href");
    assert.ok(destination.includes("tab%3DGUEST") && destination.includes("q%3Dqa-guest"), "View Activity preserves tab and search context");
    await tabs().getByRole("link", { name: "Registered (0)" }).click();
    await expect(page.getByText("No users match your filters")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Account status" })).toBeVisible();
    await expect(tabs().getByRole("link", { name: "All (28)" })).toBeVisible();
  });

  await check("sorting updates immediately and shares the same filter state", async () => {
    await page.goto(after + "?tab=REGISTERED&q=qa&role=ALL&status=ALL", { waitUntil: "domcontentloaded" });
    await choose("Sort by", "Oldest first");
    await expect(page).toHaveURL(/sort=oldest/);
    await expect(page).toHaveURL(/tab=REGISTERED/);
    await expect(page).toHaveURL(/q=qa/);
    await choose("Sort by", "Newest first");
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText("Newest first");
  });

  await check("keyboard-accessible tabs, dropdowns and visible focus styles", async () => {
    await page.goto(after, { waitUntil: "domcontentloaded" });
    const all = tabs().getByRole("link", { name: "All (30)" });
    const registered = tabs().getByRole("link", { name: "Registered (2)" });
    await all.focus();
    await page.keyboard.press("Tab");
    await expect(registered).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/tab=REGISTERED/);
    const status = page.getByRole("combobox", { name: "Account status" });
    await expect(status).toHaveAttribute("aria-haspopup", "listbox");
    await status.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox", { name: "Account status" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(status).toBeFocused();
    assert.match(await status.getAttribute("class"), /focus-ring/);
  });

  await check("legacy identity URLs and empty-state actions remain shareable", async () => {
    await page.goto(after + "?identity=GUEST&sort=oldest", { waitUntil: "domcontentloaded" });
    await expect(tabs().getByRole("link", { name: "Guests (28)" })).toHaveAttribute("aria-current", "page");
    await choose("Sort by", "Newest first");
    await expect(page).toHaveURL(/tab=GUEST/);
    assert.equal(query("identity"), null);
    await page.goto(after + "?q=no-such-visitor&role=ALL&status=ALL&tab=ALL", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("No users match your filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toHaveCount(0);
    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(30);
  });

  await check("native select and native search fallback work without JavaScript", async () => {
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    try {
      const tab = await noJS.newPage();
      await tab.goto(after, { waitUntil: "domcontentloaded" });
      await tab.getByRole("searchbox", { name: "Search users" }).fill("Zara");
      await tab.getByRole("searchbox", { name: "Search users" }).press("Enter");
      await expect(tab).toHaveURL(/q=Zara/);
      await expect(tab.locator("tbody tr")).toHaveCount(1);
      await tab.getByRole("combobox", { name: "Account role" }).selectOption("SUPPORT");
      await tab.getByRole("button", { name: "Update filters" }).click();
      await expect(tab).toHaveURL(/role=SUPPORT/);
      await expect(tab).toHaveURL(/q=Zara/);
      await tab.getByRole("navigation", { name: "User types" }).getByRole("link", { name: "Registered (1)" }).click();
      await expect(tab).toHaveURL(/tab=REGISTERED/);
      await tab.getByRole("combobox", { name: "Sort by" }).selectOption("oldest");
      await tab.getByRole("button", { name: "Apply sort" }).click();
      await expect(tab).toHaveURL(/sort=oldest/);
      await tab.screenshot({ path: output + "/after-nojs-fallback-1280.png", fullPage: false });
    } finally {
      await noJS.close();
    }
  });

  await check("unchanged identity links, access restrictions and pagination", async () => {
    await page.goto(after, { waitUntil: "domcontentloaded" });
    await expect(page.locator("thead th")).toHaveCount(5);
    await expect(row("Zara Example").getByRole("button", { name: "Copy user ID: qa-support-001" })).toBeVisible();
    await expect(row("qa-guest-001").getByRole("button", { name: "Copy guest ID: qa-guest-001" })).toBeVisible();
    await expect(row("Alana Example").getByRole("button", { name: /Manage/ })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Identity pagination" })).toContainText("Pg1 of 1");
  });

  assert.deepEqual(errors, [], "No unhandled browser errors");
  await writeFile(output + "/browser-results.json", JSON.stringify({
    checks, errors, synthetic: true, baseCommit: "2634e1234a5b31f1eca518a7720763772af6ecf1",
  }, null, 2));
  console.log("PASS " + checks.length + " Users search/filter interaction and visual checks");
} finally {
  await browser.close();
}
