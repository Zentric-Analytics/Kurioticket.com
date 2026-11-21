import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_DIRECTORY_QA_URL;
const output = process.env.ADMIN_DIRECTORY_QA_OUTPUT;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const url = base + "/admin/users";
const tabs = () => page.getByRole("navigation", { name: "User types" });
const search = () => page.getByRole("searchbox", { name: "Search users" });
const combo = name => page.getByRole("combobox", { name });
const choose = async (label, value) => {
  await combo(label).click();
  await expect(page.getByRole("listbox",{name:label})).toBeVisible();
  await page.getByRole("listbox",{name:label}).getByRole("option",{name:value,exact:true}).click();
};

try {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/before");
    await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
    await page.screenshot({path: output + "/before-search-filter-" + width + ".png", fullPage:true});
  }
  for (const width of [1440,1280,768,390,320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    const population = page.locator('section[aria-label="User population metrics"]');
    await expect(population).toContainText("Consented guest");
    await expect(population).toContainText("Non consented guest");
    await expect(population).not.toContainText("Consented guest identities");
    await expect(population).toContainText("Total recorded accounts & guest sessions");
    await expect(population.getByRole("note")).toHaveCount(3);
    await expect(population.getByRole("note").first()).toHaveAttribute("title", /not unique people/);
    await expect(population.getByRole("note").nth(1)).toHaveAttribute("title", /not verified individual people or explicit consent refusals/);
    await expect(population.locator('[data-testid="user-population-metric"]').nth(3)).toContainText("Recorded sessions · All time");
    await expect(population.locator('[data-testid="user-population-metric"]').nth(6)).toContainText("New recorded sessions · Today (UTC)");
    await expect(population).not.toContainText("Registered counts include all account roles");
    await expect(population.locator('[data-testid="user-population-metric"]')).toHaveCount(7);
    const cardLayout = await population.evaluate(section => {
      const cards = [...section.querySelectorAll('[data-testid="user-population-metric"]')];
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      const style = getComputedStyle(cards[0]);
      return { firstRight: first.right, secondLeft: second.left, firstTop: first.top,
        secondTop: second.top, radius: style.borderTopLeftRadius };
    });
    if (Math.abs(cardLayout.firstTop - cardLayout.secondTop) < 2) {
      assert.ok(cardLayout.secondLeft - cardLayout.firstRight >= 6,
        "Separate metric cards must have an actual visible gutter");
    }
    assert.notEqual(cardLayout.radius, "0px", "Metric cards are rounded");
    assert.deepEqual((await population.locator("p.tabular-nums").allTextContents()).map(value => value.trim()),
      ["30", "2", "28", "0", "0", "0", "0"], "Verified synthetic totals include all-time and new operational sessions separately");
    await expect(search()).toHaveAttribute("placeholder", "Search by name, email, user ID, or guest ID");
    await expect(combo("Sort by")).toHaveCount(0);
    await expect(combo("Date range")).toContainText("Today");
    await expect(combo("Account role")).toContainText("All roles");
    await expect(combo("Account status")).toContainText("All statuses");
    await expect(tabs().getByRole("link", {name:"All (30)"})).toHaveAttribute("aria-current","page");
    assert.deepEqual((await page.locator("thead th").allTextContents()).map(x=>x.trim()),
      ["IDENTITY","TYPE","STATUS","JOINED / FIRST SEEN","LAST SEEN","ACTIVITY"]);
    const geometry = await page.evaluate(() => {
      const search = document.getElementById("admin-user-search").getBoundingClientRect();
      const filter = document.querySelector('form[aria-label="Filter users"]').getBoundingClientRect();
      const controls = [...document.querySelectorAll('form[aria-label="Filter users"] button[role="combobox"]')]
        .map(node => node.getBoundingClientRect());
      return { searchWidth: search.width, viewport: innerWidth, doc: document.documentElement.scrollWidth,
        controls: controls.map(rect=>({top:rect.top,bottom:rect.bottom})),
        filterTop:filter.top, tabs:document.querySelector('nav[aria-label="User types"]').getBoundingClientRect().top };
    });
    assert.ok(geometry.doc <= geometry.viewport + 1, "No horizontal document overflow");
    assert.ok(geometry.searchWidth > 0, "Search remains visible");
    assert.ok(geometry.tabs > geometry.filterTop, "Tabs follow filter bar");
    if (width >= 1280) assert.ok(geometry.controls.every(rect=>Math.abs(rect.top - geometry.filterTop)<14),
      "Desktop filter controls belong to the same horizontal row");
    await expect(page.getByRole("button",{name:"Apply filters",exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:"Clear filters"})).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Identity pagination"})).toHaveCount(0);
    await combo("Date range").click();
    await expect(page.getByRole("listbox",{name:"Date range"})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({path: output + "/after-search-filter-" + width + ".png", fullPage:true});
    console.log("PASS responsive premium users toolbar",width);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.goto(url);
  await expect(page.getByRole("navigation",{name:"Identity pagination"})).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(30);
  // A returning registered account must outrank a more recently created guest
  // when its recorded last observation is newer. Sorting is never based on
  // account type alone; the mock SQL returns mixed identities in one order.
  await expect(page.locator("tbody tr").nth(0)).toContainText("Alana Example");
  await expect(page.locator("tbody tr").nth(1)).toContainText("Zara Example");
  await expect(page.locator("tbody tr").nth(2)).toContainText("Guest visitor");
  const observedTimes = await page.locator('td[data-label="Last Seen"] time').evaluateAll(
    nodes => nodes.map(node => Date.parse(node.getAttribute("dateTime"))),
  );
  assert.ok(observedTimes.every((at, index) => index === 0 || observedTimes[index - 1] >= at),
    "Last Seen must be descending across registered and guest records");
  // Registered accounts can be older than their latest recorded session.
  // Confirm the new column preserves actual evidence for both registered
  // and consented guest rows without becoming an online-status indicator.
  await expect(page.locator('td[data-label="Last Seen"]')).toHaveCount(30);
  await expect(page.locator('td[data-label="Last Seen"] time')).toHaveCount(30);
  await expect(page.locator('td[data-label="Last Seen"] time').first()).toHaveAttribute("dateTime", /2026-/);
  await search().fill("Zara");
  await expect(page).not.toHaveURL(/q=Zara/);
  await expect(page.locator("tbody tr")).toHaveCount(30);
  await search().press("Enter");
  await expect(page).not.toHaveURL(/q=Zara/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/q=Zara/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await search().fill("qa-guest-001");
  await expect(page).not.toHaveURL(/q=qa-guest-001/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/q=qa-guest-001/);
  await search().fill("");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.locator("tbody tr")).toHaveCount(30);
  console.log("PASS apply-only directory search and Enter suppression");
  await choose("Date range","Custom range");
  const pickCalendarDate = async (label, isoDate) => {
    await page.getByRole("button", { name: label, exact: true }).click();
    const calendar = page.getByRole("dialog", { name: label });
    await expect(calendar).toBeVisible();
    await expect(calendar.getByRole("combobox")).toHaveCount(0);
    await expect(calendar.getByRole("button", { name: "Apply date" })).toHaveCount(0);
    const [year, month] = isoDate.split("-").map(Number);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const currentTitle = await calendar.getByRole("heading").innerText();
    const [currentMonth, currentYear] = currentTitle.split(" ");
    let delta = (year - Number(currentYear)) * 12 + month - (monthNames.indexOf(currentMonth) + 1);
    while (delta <= -12) { await calendar.getByRole("button", { name: "Previous year" }).click(); delta += 12; }
    while (delta >= 12) { await calendar.getByRole("button", { name: "Next year" }).click(); delta -= 12; }
    while (delta < 0) { await calendar.getByRole("button", { name: "Previous month" }).click(); delta++; }
    while (delta > 0) { await calendar.getByRole("button", { name: "Next month" }).click(); delta--; }
    const fullDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(new Date(isoDate + "T00:00:00.000Z"));
    await calendar.getByRole("gridcell", { name: fullDate }).click();
    await expect(calendar).toHaveCount(0);
  };
  await expect(page.getByRole("button", { name: "Custom start date UTC" })).toBeVisible();
  await pickCalendarDate("Custom start date UTC", "2026-10-01");
  await pickCalendarDate("Custom end date UTC", "2026-10-23");
  await expect(page).not.toHaveURL(/date=custom/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/date=custom/);
  await expect(page).toHaveURL(/from=2026-10-01/);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await choose("Date range","All time");
  await choose("Account role","Support");
  await choose("Account status","Active");
  await expect(page).not.toHaveURL(/role=SUPPORT/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/date=all/);
  await expect(page).not.toHaveURL(/from=/);
  await expect(page).not.toHaveURL(/to=/);
  await expect(page).toHaveURL(/role=SUPPORT/);
  await expect(page).toHaveURL(/status=ACTIVE/);
  await expect(page.getByRole("link",{name:"Clear filters"})).toHaveCount(0);
  await choose("Date range","All time");
  await choose("Account role","All roles");
  await choose("Account status","All statuses");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/role=ALL/);
  await expect(page).toHaveURL(/status=ALL/);
  console.log("PASS combined filters only after Apply");
  for (const [date,label] of [["last7","Last 7 days"],["last30","Last 30 days"],["all","All time"]]) {
    await choose("Date range",label);
    await page.getByRole("button",{name:"Apply filters",exact:true}).click();
    await expect(page).toHaveURL(new RegExp("date="+date));
    await expect(page.locator('[data-testid="user-population-metric"]').nth(3)).toContainText("Recorded sessions · All time");
    await expect(page.locator('[data-testid="user-population-metric"]').nth(6)).toContainText(
      date === "all" ? "New recorded sessions · All time" : `New recorded sessions · ${label}`);
  }
  await tabs().getByRole("link",{name:/Guests/}).click();
  await expect(page).toHaveURL(/tab=GUEST/);
  await expect(combo("Account status")).toHaveCount(0);
  await expect(combo("Date range")).toBeVisible();
  console.log("PASS date options and guest tab");
  const noJS = await browser.newContext({javaScriptEnabled:false});
  try {
    const native = await noJS.newPage();
    await native.goto(url);
    await native.getByRole("searchbox",{name:"Search users"}).fill("Zara");
    await native.getByRole("searchbox",{name:"Search users"}).press("Enter");
    await expect(native).toHaveURL(/q=Zara/);
    await native.getByRole("combobox",{name:"Date range"}).selectOption("all");
    await native.getByRole("combobox",{name:"Account role"}).selectOption("SUPPORT");
    await native.locator('noscript button[type="submit"]').click();
    await expect(native).toHaveURL(/role=SUPPORT/);
  } finally { await noJS.close(); }
  assert.deepEqual(errors,[],"No uncaught browser errors");
  console.log("PASS no-JS controls and browser errors");
} finally { await browser.close(); }
