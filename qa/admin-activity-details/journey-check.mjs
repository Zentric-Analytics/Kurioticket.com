import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  // The retained QA journey is older than the default rolling 24-hour window.
  // Scope this historical navigation fixture explicitly without changing the UI default.
  const path = "/admin/users/guest/qa-guest-activity-0001/activity?tab=searches&q=LOS&range=all&directory=tab%3Dguests";
  await page.goto(base + path);
  await expect(page.getByTestId('activity-journey-row')).toHaveCount(1);
  await expect(page.locator('[data-activity-id]')).toHaveCount(0);
  // Summary rows are intentionally informational; full detail stays in Journey History.
  const summaryRow = page.getByTestId('activity-journey-row').first();
  await expect(summaryRow).toContainText('Flight · LOS → IST');
  await expect(summaryRow).toContainText('matching events');
  await expect(summaryRow.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('link',{name:/View Journey History/})).toBeVisible();
  const longDirectory = "客".repeat(1000);
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/activity?" + new URLSearchParams({q:"LOS",range:"all",directory:longDirectory}));
  await expect(page.getByTestId('activity-journey-row')).toHaveCount(1);
  await expect(page.getByTestId('activity-journey-row').getByRole('link')).toHaveCount(0);
  const historyLink = page.getByRole('link',{name:/View Journey History/});
  assert.ok((await historyLink.getAttribute('href')).length < 8192);
  await historyLink.click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  await page.getByRole('link',{name:'Back to Activity'}).last().click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/activity\?/);
  assert.equal(new URL(page.url()).searchParams.get("directory"),longDirectory);
  assert.equal(new URL(page.url()).searchParams.get("q"),"LOS");
  assert.equal(new URL(page.url()).searchParams.get("range"),"all");

  // Exercise the entire Activity -> Journey History -> single Journey -> History
  // -> Activity route, retaining only applicable journey filters.
  const parent = "/admin/users/guest/qa-guest-activity-0001/activity?"
    + new URLSearchParams({range:"all",product:"FLIGHT",q:"LOS",directory:"tab=guests"});
  await page.goto(base+parent);
  const toHistory = page.getByRole("link",{name:/View Journey History/});
  await expect(toHistory).toBeVisible();
  await toHistory.click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  let historyUrl = new URL(page.url());
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  assert.equal(historyUrl.searchParams.get("q"),null);
  await expect(page.getByRole("heading",{name:"Journey history"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Recorded journeys"})).toBeVisible();
  await page.getByRole("link",{name:"View journey",exact:true}).first().click();
  await expect(page).toHaveURL(/\/admin\/journeys\/qa-journey-flight\?/);
  await expect(page.locator("[data-journey-event]")).toHaveCount(4);
  // Journey History still owns the full authorized detail action.
  const detailUrl = new URL(page.url());
  assert.equal(detailUrl.searchParams.get("from"),"1970-01-01T00:00:00.000Z");
  assert.equal(detailUrl.searchParams.get("identity"),"guest");
  assert.equal(detailUrl.searchParams.get("visitorId"),"qa-guest-activity-0001");
  await expect(page.getByRole('heading',{name:'Event History'})).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Search completed');
  await expect(page.getByRole('table')).toContainText('Results viewed');
  await expect(page.getByRole('table')).toContainText('Offer selected');
  await expect(page.getByRole('table')).toContainText('Provider handoff started');
  await expect(page.getByRole('table')).toContainText('LOS → IST');
  await expect(page.getByRole('table')).toContainText('Handoff → Duffel');
  await expect(page.getByRole('columnheader')).toHaveCount(4);
  await expect(page.getByRole('heading',{name:'Other recorded activity'})).toBeVisible();
  await page.screenshot({caret:"initial",path:output+'/journey-detail-navigation-1280.png',fullPage:true});
  await page.getByRole("link",{name:"Back to Journey History"}).click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  historyUrl = new URL(page.url());
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  await page.getByRole("link",{name:"Back to Activity"}).last().click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/activity\?/);
  const parentReturn = new URL(page.url());
  assert.equal(parentReturn.searchParams.get("product"),"FLIGHT");
  assert.equal(parentReturn.searchParams.get("q"),"LOS");
  assert.equal(parentReturn.searchParams.get("directory"),"tab=guests");

  // Direct visits use Today, not a surprising All-time view.
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/journeys");
  await expect(page.getByRole("button",{name:"Date range: Today"})).toBeVisible();
  await expect(page.getByText("No tracked journeys in this range")).toBeVisible();
  console.log("PASS scoped Journey History filters, nested return and Today default");
  console.log('PASS journey association, recorded sequence, filtered return and long international context');
} finally { await browser.close(); }
