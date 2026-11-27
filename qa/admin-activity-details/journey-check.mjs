import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const browser = await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.ADMIN_ACTIVITY_QA_CHROMIUM});
try {
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  // The retained QA journey is older than the default Today window.
  // Scope this historical navigation fixture explicitly without changing the UI default.
  const path = "/admin/users/guest/qa-guest-activity-0001/activity?tab=searches&q=LOS&range=all&directory=tab%3Dguests";
  await page.goto(base + path);

  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
  await expect(page.locator('[data-activity-id]')).toHaveCount(2);
  await expect(page.getByTestId("unified-activity-list")).toContainText("LOS → IST");
  await expect(page.getByRole('link',{name:/View journey history/i})).toBeVisible();
  const longDirectory = new URLSearchParams({q:"客".repeat(100),tab:"GUEST",date:"all"}).toString();
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/activity?" + new URLSearchParams({q:"LOS",range:"all",directory:longDirectory}));

  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
  await expect(page.locator('[data-activity-id]')).toHaveCount(4);
  const historyLink = page.getByRole('link',{name:/View journey history/i});
  assert.ok((await historyLink.getAttribute('href')).length < 8192);
  await historyLink.click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Activity',exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/activity\/all\?/);
  assert.equal(new URL(page.url()).searchParams.get("directory"),longDirectory);
  assert.equal(new URL(page.url()).searchParams.get("q"),"LOS");
  assert.equal(new URL(page.url()).searchParams.get("range"),"all");

  // Exercise the entire Activity -> Journey History -> single Journey -> History
  // -> Activity route, retaining only applicable journey filters.
  const parent = "/admin/users/guest/qa-guest-activity-0001/activity?"
    + new URLSearchParams({range:"all",product:"FLIGHT",q:"LOS",directory:"tab=guests"});
  await page.goto(base+parent);
  const toHistory = page.getByRole("link",{name:/View journey history/i});
  await expect(toHistory).toBeVisible();
  await toHistory.click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  let historyUrl = new URL(page.url());
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  assert.equal(historyUrl.searchParams.get("q"),null);
  await expect(page.getByRole("heading",{name:"Journey history"})).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Activity",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Back to Activity"})).toHaveCount(0);
  await expect(page.getByRole("link",{name:/Other recorded activity/})).toHaveCount(0);
  const positions = await page.evaluate(() => {
    const summary = document.querySelector('[aria-label="Selected visitor journey summary"]');
    const identity = document.querySelector('[aria-label="Selected visitor"]');
    return { summary: summary?.getBoundingClientRect().top, identity: identity?.getBoundingClientRect().top };
  });
  assert.ok(typeof positions.summary === "number" && typeof positions.identity === "number" && positions.identity < positions.summary,
    "The selected identity must precede its journey metrics");
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
  await expect(page.getByRole('table')).toContainText('Results page viewed');
  await expect(page.getByRole('table')).toContainText('Offer selected');
  await expect(page.getByRole('table')).toContainText('Provider handoff started');
  await expect(page.getByRole('table')).toContainText('LOS → IST');
  await expect(page.getByRole('table')).toContainText('Handoff → Duffel');
  await expect(page.getByRole('columnheader')).toHaveCount(4);
  await expect(page.getByRole('heading',{name:'Other recorded activity'})).toHaveCount(0);
  await page.screenshot({caret:"initial",path:output+'/journey-detail-navigation-1280.png',fullPage:true});
  await page.getByRole("link",{name:"Back to Journey History"}).click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/journeys\?/);
  historyUrl = new URL(page.url());
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  // The normal Journey History page returns through its sole Activity breadcrumb.
  await expect(page.getByRole("link",{name:"Back to Activity"})).toHaveCount(0);
  await page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Activity",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/users\/guest\/qa-guest-activity-0001\/activity\/all\?/);
  const parentReturn = new URL(page.url());
  assert.equal(parentReturn.searchParams.get("product"),"FLIGHT");
  assert.equal(parentReturn.searchParams.get("q"),"LOS");
  assert.equal(parentReturn.searchParams.get("directory"),"tab=guests");

  // Account actions remain discoverable in the complete identity history,
  // without rendering a second unbounded event feed below Journey history.
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/journeys?range=all");
  await expect(page.getByRole("heading",{name:"Other recorded account actions",exact:true})).toHaveCount(0);
  await expect(page.locator("[data-activity-id]")).toHaveCount(0);
  const accountActivity = page.getByRole("link",{name:"View other activity",exact:true});
  await expect(accountActivity).toHaveCount(1);
  const accountHref = new URL(await accountActivity.getAttribute("href"),base);
  assert.equal(accountHref.pathname,"/admin/users/guest/qa-guest-activity-0001/activity/all");
  assert.equal(accountHref.searchParams.get("range"),"all");
  assert.equal(accountHref.searchParams.get("stage"),"ACCOUNT_ACTIVITY");
  await accountActivity.click();
  await expect(page.locator("[data-activity-id]")).toHaveCount(1);
  await expect(page.locator('[data-activity-id="e-qa-account-event"]')).toContainText("Price alert created");
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/journeys?range=custom&from=2026-10-22&to=2026-10-22&product=FLIGHT");
  const scopedAccount = new URL(await page.getByRole("link",{name:"View other activity",exact:true}).getAttribute("href"),base);
  assert.equal(scopedAccount.pathname,accountHref.pathname);
  assert.equal(scopedAccount.searchParams.get("range"),"custom");
  assert.equal(scopedAccount.searchParams.get("from"),"2026-10-22T00:00:00.000Z");
  assert.equal(scopedAccount.searchParams.get("to"),"2026-10-23T00:00:00.000Z");
  assert.equal(scopedAccount.searchParams.get("product"),"FLIGHT");
  assert.equal(scopedAccount.searchParams.get("stage"),"ACCOUNT_ACTIVITY");
  // The legacy 90-day journey preset has no Activity preset equivalent.
  // Its link must retain the exact validated interval as a custom period.
  const ninetyDayStarted = Date.now();
  await page.goto(base + "/admin/users/user/qa-registered-0001/journeys?range=90d&product=FLIGHT");
  const ninetyDay = new URL(await page.getByRole("link",{name:"View account activity",exact:true}).getAttribute("href"),base);
  assert.equal(ninetyDay.pathname,"/admin/users/user/qa-registered-0001/activity/all");
  assert.equal(ninetyDay.searchParams.get("range"),"custom");
  assert.equal(ninetyDay.searchParams.get("product"),"FLIGHT");
  assert.equal(ninetyDay.searchParams.get("stage"),"ACCOUNT_ACTIVITY");
  const ninetyDayFrom = Date.parse(ninetyDay.searchParams.get("from"));
  const ninetyDayTo = Date.parse(ninetyDay.searchParams.get("to"));
  assert.equal(ninetyDayTo-ninetyDayFrom,90*86400000);
  assert.ok(ninetyDayTo >= ninetyDayStarted && ninetyDayTo <= Date.now(),"90-day return retains the server's actual upper cutoff");
  await page.getByRole("link",{name:"View account activity",exact:true}).click();
  await expect(page.getByRole("heading",{name:"All activity",exact:true})).toBeVisible();
  await expect(page.getByText("Invalid activity filters",{exact:true})).toHaveCount(0);
  console.log("PASS account actions remain reachable without a second Journey history feed");

  // Direct visits use Today, not a surprising All-time view.
  await page.goto(base + "/admin/users/guest/qa-guest-activity-0001/journeys");
  await expect(page.getByRole("button",{name:"Date range: Today"})).toBeVisible();
  await expect(page.getByText("No tracked journeys in this range")).toBeVisible();
  console.log("PASS scoped Journey History filters, nested return and Today default");
  console.log('PASS journey association, recorded sequence, filtered return and long international context');
} finally { await browser.close(); }
