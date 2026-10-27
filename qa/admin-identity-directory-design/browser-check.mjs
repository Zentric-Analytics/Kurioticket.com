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
    await expect(search()).toHaveAttribute("placeholder", "Search by name, email, user ID, or guest ID");
    await expect(combo("Sort by")).toHaveCount(0);
    await expect(combo("Date range")).toContainText("All dates");
    await expect(combo("Account role")).toContainText("All roles");
    await expect(combo("Account status")).toContainText("All statuses");
    await expect(tabs().getByRole("link", {name:"All (30)"})).toHaveAttribute("aria-current","page");
    assert.deepEqual((await page.locator("thead th").allTextContents()).map(x=>x.trim()),
      ["IDENTITY","TYPE","STATUS","JOINED / FIRST SEEN","ACTIVITY"]);
    const geometry = await page.evaluate(() => {
      const search = document.getElementById("admin-user-search").getBoundingClientRect();
      const controls = [...document.querySelectorAll('form[aria-label="Filter users"] button[role="combobox"]')].map(node => {
        const rect=node.getBoundingClientRect();
        return { top: rect.top, bottom:rect.bottom, border: getComputedStyle(node).borderBottomWidth, triangle: Boolean(node.querySelector('svg path[d="M0 0h8L4 5z"]')) };
      });
      return { searchWidth:search.width, viewport:innerWidth, doc:document.documentElement.scrollWidth,
        controls, tabs:document.querySelector('nav[aria-label="User types"]').getBoundingClientRect().top,
        searchTop:search.top };
    });
    assert.ok(geometry.doc <= geometry.viewport + 1, "No horizontal document overflow");
    assert.ok(geometry.searchWidth > geometry.viewport * 0.65, "Full-width search input");
    assert.ok(geometry.controls.every(x=>x.border==="0px" && x.triangle), "Text-only filters use solid triangle arrows");
    assert.ok(geometry.tabs > geometry.searchTop, "Tabs follow full-width search");
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
  await search().fill("Zara");
  await expect(page).toHaveURL(/q=Zara/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await search().fill("qa-guest-001");
  await search().press("Enter");
  await expect(page).toHaveURL(/q=qa-guest-001/);
  await search().fill("");
  await search().press("Enter");
  await expect(page.locator("tbody tr")).toHaveCount(30);
  console.log("PASS search and Enter");
  await choose("Date range","Custom range");
  await expect(page.getByLabel("Custom start date UTC")).toBeVisible();
  await expect(page.getByRole("button",{name:"Apply dates"})).toBeDisabled();
  await page.getByLabel("Custom start date UTC").fill("2026-10-01");
  await page.getByLabel("Custom end date UTC").fill("2026-10-23");
  await expect(page).not.toHaveURL(/date=custom/);
  await page.getByRole("button",{name:"Apply dates"}).click();
  await expect(page).toHaveURL(/date=custom/);
  await expect(page).toHaveURL(/from=2026-10-01/);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await choose("Date range","All dates");
  await expect(page).not.toHaveURL(/from=/);
  await expect(page).not.toHaveURL(/to=/);
  await choose("Date range","Last 7 days");
  await expect(page).toHaveURL(/date=last7/);
  await choose("Account role","Support");
  await expect(page).toHaveURL(/role=SUPPORT/);
  await expect(page).toHaveURL(/date=last7/);
  await choose("Account status","Active");
  await expect(page).toHaveURL(/status=ACTIVE/);
  await expect(page.getByRole("link",{name:"Clear filters"})).toHaveCount(0);
  await choose("Date range","All dates");
  await choose("Account role","All roles");
  await choose("Account status","All statuses");
  await expect(page).toHaveURL(/date=all/);
  await expect(page).toHaveURL(/role=ALL/);
  await expect(page).toHaveURL(/status=ALL/);
  console.log("PASS combined filters and clear");
  for (const [date,label] of [["last7","Last 7 days"],["last30","Last 30 days"],["all","All dates"]]) {
    await choose("Date range",label);
    await expect(page).toHaveURL(new RegExp("date="+date));
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
    await native.getByRole("button",{name:"Update filters"}).click();
    await expect(native).toHaveURL(/role=SUPPORT/);
  } finally { await noJS.close(); }
  assert.deepEqual(errors,[],"No uncaught browser errors");
  console.log("PASS no-JS controls and browser errors");
} finally { await browser.close(); }
