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
// React reports attribute hydration mismatches through console.error, not
// pageerror. Gate current Users routes; the pinned baseline is comparison-only.
page.on("console", message => {
  if (message.type() === "error" && new URL(page.url()).pathname.startsWith("/admin/users")) {
    errors.push("Console error at " + page.url() + ": " + message.text());
  }
});
const capture = async options => {
  // Dropdown interactions scroll their trigger into view on small screens.
  // Capture the complete page from its top so sticky headers stay at the top.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // Playwright's default caret hiding mutates inline input styles and can race
  // React hydration. Preserve the page's actual styles during the screenshot.
  await page.screenshot({ ...options, caret: "initial" });
};
const url = base + "/admin/users";
const tabs = () => page.getByRole("navigation", { name: "User types" });
const search = () => page.getByRole("searchbox", { name: "Search users" });
const pagination = () => page.getByRole("navigation", { name: "Users directory pagination" });
const combo = name => page.getByRole("combobox", { name });
const choose = async (label, value) => {
  await combo(label).click();
  await expect(page.getByRole("listbox",{name:label})).toBeVisible();
  await page.getByRole("listbox",{name:label}).getByRole("option",{name:value,exact:true}).click();
};
const checkActivityReturn = async (link, origin) => {
  const activity = new URL(await link.getAttribute("href"), base);
  assert.match(activity.pathname, /^\/admin\/users\/(user|guest|live-guest)\/[^/]+\/activity$/);
  assert.equal(activity.searchParams.get("range"), "all", "Activity starts with complete history");
  assert.equal(activity.searchParams.has("directory"), false, "New links use the complete Users return context");
  assert.ok(activity.searchParams.get("usersReturn"), "Activity keeps its Users origin");
  const returned = new URL(activity.searchParams.get("usersReturn"), base);
  const expected = new URL(origin, base);
  assert.equal(returned.pathname, expected.pathname);
  for (const [key, value] of expected.searchParams) {
    assert.equal(returned.searchParams.get(key), value, "Activity return preserves " + key);
  }
  return returned;
};

try {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/before");
    await expect(page.getByRole("button", { name: "Apply Filter" })).toBeVisible();
    // AdminDirectorySelect upgrades from a server-rendered native select to
    // this button only after hydration; SSR-visible text alone is insufficient.
    await expect(page.locator('button[role="combobox"][aria-label="Sort by"]')).toBeVisible();
    await capture({path: output + "/before-search-filter-" + width + ".png", fullPage:true});
  }
  for (const width of [1440,1280,768,390,320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.locator('button[role="combobox"][aria-label="Date range"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Online Users"]')).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Users & Bots subsections"})
      .getByRole("link",{name:"Online Users",exact:true})).toBeVisible();
    const population = page.locator('section[aria-label="User population metrics"]');
    await expect(population).toContainText("Consented guest");
    await expect(population).not.toContainText("Non consented guest");
    await expect(population).not.toContainText("New non consented guest");
    await expect(population.locator('[data-testid="user-population-metric"]').nth(3)
      .getByText("Guest", {exact:true})).toBeVisible();
    await expect(population.locator('[data-testid="user-population-metric"]').nth(6)
      .getByText("New guest", {exact:true})).toBeVisible();
    await expect(population).not.toContainText("Consented guest identities");
    await expect(population).toContainText("Total recorded accounts & guest sessions");
    await expect(population.getByRole("note")).toHaveCount(0);
    await expect(population.locator('[data-testid="user-population-metric"] [title]')).toHaveCount(0);
    await expect(population.locator('[data-testid="user-population-metric"]').nth(3)).toContainText("Recorded sessions · All time");
    await expect(population.locator('[data-testid="user-population-metric"]').nth(6)).toContainText("New recorded sessions · Today · WAT (UTC+1)");
    await expect(population).not.toContainText("Registered counts include all account roles");
    await expect(population.locator('[data-testid="user-population-metric"]')).toHaveCount(7);
    const rows = population.locator('[data-testid="user-population-row"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).locator('[data-testid="user-population-metric"]')).toHaveCount(4);
    await expect(rows.nth(1).locator('[data-testid="user-population-metric"]')).toHaveCount(3);
    const rowLayout = await rows.evaluateAll(nodes => nodes.map(node => {
      const cards = [...node.querySelectorAll('[data-testid="user-population-metric"]')];
      return cards.map(card => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
    }));
    assert.ok(Math.min(...rowLayout[1].map(card => card.top)) >= Math.max(...rowLayout[0].map(card => card.bottom)) + 6,
      "New metrics row follows recorded metrics row with a clear gutter");
    if (width >= 1200) {
      assert.ok(rowLayout[0].every(card => Math.abs(card.top - rowLayout[0][0].top) <= 1),
        "Recorded metrics must occupy one row of four cards at desktop width");
      assert.ok(rowLayout[1].every(card => Math.abs(card.top - rowLayout[1][0].top) <= 1),
        "New metrics must occupy one row of three cards at desktop width");
      assert.ok(rowLayout.every(row => row.every((card, index) =>
        index === 0 || card.left - row[index - 1].right >= 6)),
        "Every metric in a horizontal row keeps a visible gap");
    }
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
    await expect(combo("Date range")).toHaveAccessibleDescription("WAT (UTC+1)");
    await expect(combo("Account role")).toContainText("All roles");
    await expect(combo("Status")).toContainText("All statuses");
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
    await expect(pagination()).toContainText("Showing 1–20 of 30 matching identities");
    await expect(pagination()).toContainText("Page 1 of 2");
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await combo("Date range").click();
    await expect(page.getByRole("listbox",{name:"Date range"})).toBeVisible();
    await page.keyboard.press("Escape");
    await capture({path: output + "/after-search-filter-" + width + ".png", fullPage:true});
    console.log("PASS responsive premium users toolbar",width);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.goto(base + "/admin/users/online");
  await expect(page.locator('button[role="combobox"][aria-label="Identity type"]')).toBeVisible();
  const live = page.locator('section[aria-label="Online Users"]');
  await expect(live).toBeVisible();
  await expect(live.locator('[data-testid="online-platform-metric"]')).toHaveCount(4);
  assert.deepEqual((await live.locator('p.tabular-nums').allTextContents()).map(text => text.trim()),
    ["3","1","0","3"]);
  await expect(page.getByRole("navigation",{name:"Users & Bots subsections"}).getByRole("link",{name:"Online Users"}))
    .toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("online-user-row")).toHaveCount(3);
  await expect(page.getByRole("columnheader",{name:"LOCATION"})).toBeVisible();
  await expect(page.getByTestId("online-user-row").first()).toContainText("Alana Example");
  await expect(page.getByTestId("online-user-row").first().getByTestId("online-user-location")).toHaveText("Lagos, Nigeria");
  await expect(page.getByTestId("online-user-row").nth(1).getByTestId("online-user-location")).toHaveText("Unavailable");
  await expect(page.getByTestId("online-user-row").nth(2).getByTestId("online-user-location")).toHaveText("Unavailable");
  const filters = page.locator('[data-testid="online-users-filter-row"]');
  const filterRects = await filters.evaluate(form => {
    const items = [...form.children].map(child => child.getBoundingClientRect());
    const parent = form.getBoundingClientRect();
    return { items: items.map(item => ({top:item.top,left:item.left,right:item.right,width:item.width})),
      left: parent.left, right: parent.right };
  });
  assert.equal(filterRects.items.length,5);
  assert.ok(filterRects.items.every(item => Math.abs(item.top - filterRects.items[0].top) < 2),
    "All five Online Users filters must stay in one balanced horizontal row on desktop");
  assert.ok(filterRects.items.every((item,index) => index === 0 || item.left >= filterRects.items[index-1].right + 4),
    "Filter controls must not overlap");
  assert.ok(filterRects.items.every(item => item.left >= filterRects.left && item.right <= filterRects.right + 2),
    "All filters must remain inside content width");
  assert.ok(filterRects.items[0].width > filterRects.items[1].width,
    "Online user search should be wider than dropdowns");
  await capture({path:output+"/online-users-desktop-1280.png",fullPage:true});
  await expect(page.getByText("Guest session")).toHaveCount(1);
  await expect(page.getByTestId("online-user-row").filter({hasText:"Guest session"})
    .getByRole("link",{name:"View Activity"})).toHaveCount(0);
  await expect(page.getByTestId("online-user-row").filter({hasText:"Alana Example"})
    .getByRole("link",{name:"View Activity"})).toHaveCount(1);
  await page.getByRole("combobox",{name:"Platform"}).click();
  await page.getByRole("listbox",{name:"Platform"}).getByRole("option",{name:"iOS"}).click();
  await expect(page.getByTestId("online-user-row")).toHaveCount(3);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.getByTestId("online-user-row")).toHaveCount(1);
  await expect(page.getByTestId("online-user-row").first()).toContainText("Alana Example");
  await checkActivityReturn(page.getByTestId("online-user-row").first()
    .getByRole("link", { name: "View Activity" }), page.url());
  await page.setViewportSize({width:320,height:800});
  await page.goto(base + "/admin/users/online");
  await expect(page.getByRole("heading",{name:"Online Users",exact:true})).toBeVisible();
  await expect(page.locator('button[role="combobox"][aria-label="Identity type"]')).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),true);
  await capture({path:output+"/online-users-mobile-320.png",fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.goto(url);
  await expect(pagination()).toContainText("Page 1 of 2");
  await expect(page.locator("tbody tr")).toHaveCount(20);
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
  await expect(page.locator('td[data-label="Last Seen"]')).toHaveCount(20);
  await expect(page.locator('td[data-label="Last Seen"] time')).toHaveCount(20);
  await expect(page.locator('td[data-label="Last Seen"] time').first()).toHaveAttribute("dateTime", /2026-/);
  const firstPageIds = await page.locator("tbody tr").evaluateAll(nodes =>
    nodes.map(node => node.getAttribute("data-users-refresh-anchor")));
  const firstReturn = await checkActivityReturn(page.locator("tbody tr").first()
    .getByRole("link", { name: "View Activity" }), url);
  assert.equal(firstReturn.searchParams.get("date"), "today", "Directory date remains in return context");
  await pagination().getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(pagination()).toContainText("Showing 21–30 of 30 matching identities");
  await expect(pagination()).toContainText("Page 2 of 2");
  await expect(pagination().getByRole("link", { name: "Next", exact: true })).toHaveCount(0);
  const secondPageIds = await page.locator("tbody tr").evaluateAll(nodes =>
    nodes.map(node => node.getAttribute("data-users-refresh-anchor")));
  assert.ok([...firstPageIds, ...secondPageIds].every(Boolean), "Every identity has a stable row anchor");
  assert.equal(new Set([...firstPageIds, ...secondPageIds]).size, 30,
    "Both bounded pages expose all 30 identities without a duplicate or missing row");
  const secondTimes = await page.locator('td[data-label="Last Seen"] time').evaluateAll(
    nodes => nodes.map(node => Date.parse(node.getAttribute("dateTime"))),
  );
  const allTimes = [...observedTimes, ...secondTimes];
  assert.ok(allTimes.every((at, index) => index === 0 || allTimes[index - 1] >= at),
    "Mixed identity ordering remains stable across the page boundary");
  await checkActivityReturn(page.locator("tbody tr").first()
    .getByRole("link", { name: "View Activity" }), page.url());
  await pagination().getByRole("link", { name: "Previous", exact: true }).click();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.goto(url + "?date=all&sort=newest&page=999");
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/date=all/);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(pagination()).toContainText("Page 2 of 2");
  await page.goto(url);
  await expect(page.locator("tbody tr")).toHaveCount(20);
  console.log("PASS bounded complete directory pagination and Users activity return context");
  await search().fill("Zara");
  await expect(page).not.toHaveURL(/q=Zara/);
  await expect(page.locator("tbody tr")).toHaveCount(20);
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
  await expect(page.locator("tbody tr")).toHaveCount(20);
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
  await expect(page.getByRole("button", { name: "Custom start date" })).toBeVisible();
  await pickCalendarDate("Custom start date", "2026-10-01");
  await pickCalendarDate("Custom end date", "2026-10-23");
  await expect(page).not.toHaveURL(/date=custom/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/date=custom/);
  await expect(page).toHaveURL(/from=2026-10-01/);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await choose("Date range","All time");
  await choose("Account role","Support");
  await choose("Status","Active");
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
  await choose("Status","All statuses");
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
  await expect(combo("Guest status")).toBeVisible();
  await expect(page.getByTestId("guest-directory-status").first()).toHaveText("Active");
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
