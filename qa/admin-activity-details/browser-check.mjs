import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expectActivityFilterLayout } from "./activity-filter-layout.mjs";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.ADMIN_ACTIVITY_QA_CHROMIUM});
const context = await browser.newContext({viewport:{width:1280,height:900}, permissions:["clipboard-read","clipboard-write"]});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const url=base+"/admin/users/guest/qa-guest-activity-0001/activity?range=all";


const activityRows = page.locator('[data-testid="unified-activity-list"] [data-activity-id]');
const fullUrl = url.replace("/activity?", "/activity/all?");
const capture = async options => {
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
  await page.screenshot(options);
};
async function inspectActivityTypography(page) {
  return page.evaluate(() => {
    const identity = document.querySelector('section[aria-label="Customer identity"]');
    const summary = document.querySelector('section[aria-label="Activity summary"]');
    const root = identity?.closest('[data-testid="activity-page-card"]');
    const shell = document.querySelector("main")?.parentElement;
    const css = element => getComputedStyle(element);
    return {
      rootBackground: css(root).backgroundColor,
      shellBackground: css(shell).backgroundColor,
      summaryBackground: css(summary).backgroundColor,
      outerBorderColor: css(root).borderTopColor,
      primaryText: css(root).color,
      factValueSize: css(identity.querySelector("dd")).fontSize,
      factValueWeight: css(identity.querySelector("dd")).fontWeight,
      factLabelSize: css(identity.querySelector("dt")).fontSize,
      summaryValueSize: css(summary.querySelector('[data-testid="activity-metric-value"]')).fontSize,
      summaryValueWeight: css(summary.querySelector('[data-testid="activity-metric-value"]')).fontWeight,
      summaryLabelSize: css(summary.querySelector('[data-testid="activity-metric-label"]')).fontSize,
      dividerColor: css(summary).borderTopColor,
    };
  });
}
async function expectAlignedColumns(page) {
  const layout = await page.evaluate(() => {
    const identity=document.querySelector('section[aria-label="Customer identity"]');
    const grid=identity.querySelector('[data-testid="activity-identity-facts"]');
    const facts=[...grid.children].map(element=>element.getBoundingClientRect());
    const summary=document.querySelector('section[aria-label="Activity summary"]');
    const metrics=[...summary.querySelectorAll('[data-testid="activity-metric"]')];
    const box=summary.getBoundingClientRect();
    const rects=metrics.map(e=>e.getBoundingClientRect());
    const cols=innerWidth>=1280 ? 6 : innerWidth>=640 ? 3 : 2;
    const e=2;
    return {
      facts:facts.length===3,
      metrics:metrics.length===6,
      factsAligned:facts.every(f=>Math.abs(f.top-facts[0].top)<e&&Math.abs(f.width-facts[0].width)<e),
      equalWidths:rects.every(m=>Math.abs(m.width-rects[0].width)<e),
      metricRows:rects.every((m,i)=>Math.abs(m.top-rects[Math.floor(i/cols)*cols].top)<e),
      inside:rects.every(m=>m.left>=box.left-e && m.right<=box.right+e),
      sectionsSeparate:identity.getBoundingClientRect().bottom<=box.top+e && parseFloat(getComputedStyle(summary).borderTopWidth)>0.5,
      noOverflow:document.documentElement.scrollWidth<=innerWidth+1,
    };
  });
  for (const [key,value] of Object.entries(layout)) assert.equal(value,true,key+": "+JSON.stringify(layout));
}
async function expectHeaderTimePresentation(page, context) {
  const facts = page.locator('section[aria-label="Customer identity"] dl > div');
  for (const index of [0, 1]) {
    const timestamp = facts.nth(index).locator('dd time');
    await expect(timestamp).toHaveCount(1);
    const displayed = (await timestamp.textContent())?.trim() ?? "";
    assert.ok(displayed.length > 0 && !/\bUTC\b/.test(displayed),
      context + ": header date should not wrap a visible UTC suffix: " + displayed);
    await expect(timestamp).toHaveAttribute("datetime", /Z$/);
    await expect(timestamp).toHaveAttribute("title", /\bUTC\b/);
  }
}


async function expectBalancedDesktopHeader(page, context, requireSingleLineEmail = false) {
  const layout = await page.evaluate(() => {
    const identity=document.querySelector('section[aria-label="Customer identity"]');
    const title=identity.querySelector('h1').parentElement;
    const facts=identity.querySelector('[data-testid="activity-identity-facts"]');
    const email=title.querySelector('p');
    const manage=identity.querySelector('[aria-label="Identity management"]');
    const titleBox=title.getBoundingClientRect();
    const manageBox=manage?.getBoundingClientRect();
    return {
      emailFits:!email || email.getBoundingClientRect().height<parseFloat(getComputedStyle(email).fontSize)*1.9,
      managementFits:!manageBox || (manageBox.bottom<=facts.getBoundingClientRect().top+2
        && (titleBox.right<=manageBox.left+2 || titleBox.bottom<=manageBox.top+2)),
      managementPresent:!!manageBox,
      overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(layout.overflow,false,context);
  assert.equal(layout.managementPresent,true,context+": management controls must remain available");
  assert.equal(layout.managementFits,true,context+": manage must not cover identity facts");
  if(requireSingleLineEmail) assert.equal(layout.emailFits,true,context);
}
const approvedActivityTypography={
  rootBackground:"rgb(255, 255, 255)", shellBackground:"rgb(255, 255, 255)",
  summaryBackground:"rgba(0, 0, 0, 0)", outerBorderColor:"rgb(226, 232, 240)",
  primaryText:"rgb(15, 23, 42)",factValueSize:"14px",factValueWeight:"500",factLabelSize:"12px",
  summaryValueSize:"20px",summaryValueWeight:"600",summaryLabelSize:"12px",dividerColor:"rgb(226, 232, 240)",
};

try {
  for (const width of [1536,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base+"/before");
    await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
    await capture({caret:"initial",path:output+"/before-view-activity-"+width+".png",fullPage:true});
  }

  for(const width of [1536,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(url);
    await expect(page.getByRole("heading",{name:"Visitor",exact:true})).toBeVisible();

    await expect(page.getByRole("heading",{name:"Recent activity"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Recent journeys"})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Other recorded activity"})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Activity overview",exact:true})).toBeVisible();
    await expect(page.getByTestId("activity-metric")).toHaveCount(6);
    await expect(page.getByRole("heading",{name:"Related records"})).toHaveCount(0);
    const outerCard=page.getByTestId("activity-page-card");
    await expect(outerCard).toHaveCount(1);
    await expect(outerCard.locator('section[aria-label="Customer identity"]')).toBeVisible();
    await expect(outerCard.locator('section[aria-label="Activity summary"]')).toBeVisible();
    const facts=outerCard.locator('section[aria-label="Customer identity"] dl > div');
    await expect(facts).toHaveCount(3);
    assert.ok(await facts.evaluateAll(nodes=>nodes.every(node=>node.firstElementChild?.tagName==="DT" && node.lastElementChild?.tagName==="DD")));
    await expect(outerCard.getByTestId("identity-device-access")).toHaveCount(0);
    await expect(outerCard.getByTestId("page-view-records")).toHaveCount(0);
    await expect(outerCard.getByTestId("activity-filters-row")).toHaveCount(1);
    await expect(outerCard.getByRole("button",{name:"Date range: All time · UTC",exact:true})).toBeVisible();
    await expect(outerCard.getByRole("button",{name:"Apply period",exact:true})).toBeVisible();
    await expect(outerCard.getByRole("textbox",{name:"Search activity"})).toHaveCount(0);
    await expect(outerCard.getByTestId("unified-activity-list")).toHaveCount(1);
    await expect(outerCard.getByRole("navigation",{name:"Breadcrumb"})).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Breadcrumb"})).toBeVisible();
    await expect(outerCard.locator('section[aria-label="Activity summary"] button[aria-label="About activity data"]')).toHaveCount(0);
    await expect(outerCard.locator('section[aria-label="Activity summary"] [role="tooltip"]')).toHaveCount(0);
    const guestManage=page.getByRole("button",{name:/Manage guest/});
    await expect(guestManage).toBeVisible();
    await expect(guestManage).toHaveAttribute("aria-expanded","false");
    await guestManage.click();
    await expect(page.getByRole("menu",{name:"Guest management"})).toBeVisible();
    await expect(page.getByRole("menuitem",{name:"Disable tracking"})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(guestManage).toHaveAttribute("aria-expanded","false");
    await expect(page.getByRole("link",{name:"View all activity"})).toHaveCount(1);
    assert.deepEqual(await page.getByRole("link",{name:"View all activity"}).evaluate(element=>({
      background:getComputedStyle(element).backgroundColor,color:getComputedStyle(element).color,
      touchTarget:element.getBoundingClientRect().height>=44,
    })),{background:"rgb(0, 75, 184)",color:"rgb(255, 255, 255)",touchTarget:true});
    await expect(outerCard.getByTestId("activity-events-fact")).toContainText("14");
    await expect(outerCard.locator('[data-testid="activity-metric"][href]')).toHaveCount(6);
    await page.getByRole("button",{name:"About this data",exact:true}).click();
    const dataDialog=page.getByRole("dialog",{name:"About this data",exact:true});
    await expect(dataDialog).toBeVisible();
    await expect(dataDialog).toContainText("Recent activity shows up to five newest recorded actions");
    await expect(dataDialog).toContainText("pages of 20");
    assert.equal(await dataDialog.evaluate(element=>element.getBoundingClientRect().width<=innerWidth),true);
    await page.keyboard.press("Escape");
    await expect(dataDialog).not.toBeVisible();
    await expect(page.getByRole("link",{name:/View journey history/i})).toHaveCount(0);
    await expect(activityRows).toHaveCount(5);
    assert.deepEqual(await activityRows.evaluateAll(nodes=>nodes.map(node=>node.dataset.activityId)),
      ["j-qa-newer-search","j-qa-selection-59","j-qa-selection-58","j-qa-selection-57","j-qa-selection-56"]);
    const stamps=await activityRows.locator("time").evaluateAll(nodes=>nodes.map(n=>Date.parse(n.dateTime)));
    assert.ok(stamps.every((t,i)=>i===0||t<=stamps[i-1]));
    await expect(page.getByRole("button",{name:"Show all"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Hide all"})).toHaveCount(0);
    const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(widths.document <= widths.viewport+1, "No horizontal drift "+JSON.stringify(widths));
    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Guest Activity typography and palette "+width);
    if (width >= 1024) await expectAlignedColumns(page);
    await expectHeaderTimePresentation(page, "Guest " + width);
    if (width === 1536) await expectBalancedDesktopHeader(page, "Guest desktop");

    if([1536,1280,1024,768,390,320].includes(width))
      await capture({caret:"initial",path:output+"/after-view-activity-"+width+".png",fullPage:true});
    console.log("PASS responsive activity page",width);
  }

  // Browser zoom changes CSS viewport width. Check the equivalent 1280px desktop
  // at 90%, 100%, 110%, keeping device scale fixed (no CSS zoom hacks).
  for (const zoom of [0.9, 1, 1.1]) {
    await page.setViewportSize({width: Math.round(1280/zoom), height: Math.round(900/zoom)});
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity?range=all");
    await expectAlignedColumns(page);
    await expectHeaderTimePresentation(page, "Registered zoom " + zoom);
    await expectBalancedDesktopHeader(page, "Registered zoom " + zoom);

    await expect(page.getByTestId("identity-device-access")).toHaveCount(0);
    const latest=page.getByRole("region",{name:"Latest device and access"});
    await expect(latest).toHaveCount(1);
    await expect(latest.getByText("Latest recorded access")).toBeVisible();
    await expect(latest.getByRole("link",{name:"Device & Access history"})).toHaveAttribute("href",/\/admin\/users\/user\/qa-registered-0001\/devices\?range=all/);
    await expect(activityRows).toHaveCount(5);
    await expect(activityRows.filter({hasText:"Latest recorded access"})).toHaveCount(0);
    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography);
    await capture({caret:"initial",path: output + "/after-desktop-zoom-equivalent-" + Math.round(zoom*100) + ".png",fullPage:true});
  }

  // Dedicated page visits use a compact summary, real server-page navigation,
  // and return to the exact activity filters rather than expanding the overview.
  await page.setViewportSize({width:1280,height:900});
  const pageActivityPath = "/admin/users/user/qa-page-history-0001/activity?range=all";
  await page.goto(base + pageActivityPath);

  await expect(page.getByTestId("page-view-records")).toHaveCount(0);
  await expect(page.locator('[data-activity-id^="e-qa-page-"]')).toHaveCount(5);
  await expect(page.getByRole("region",{name:"Activity summary"}).locator('[data-testid="activity-metric-value"]').last()).toHaveText("45");
  await expect(page.getByTestId("activity-events-fact")).toContainText("45");
  await page.getByRole("link",{name:"View pages visited: 45",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/user/qa-page-history-0001/pages");
  await expect(page.getByRole("heading",{name:"Pages Visited History"})).toBeVisible();
  await expect(page.getByRole("complementary",{name:"Users & Bots navigation"}).getByRole("link",{name:"Users Directory",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("page-view-row")).toHaveCount(20);
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page.getByTestId("page-view-row")).toHaveCount(20);
  await expect(page.getByRole("navigation",{name:"Page history pagination"})).toContainText("Page 2 of 3");
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page.getByTestId("page-view-row")).toHaveCount(5);
  await page.getByRole("link",{name:"Previous",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"Page history pagination"})).toContainText("Page 2 of 3");
  await page.getByRole("button",{name:"Page history platform: All platforms"}).click();
  await page.getByRole("listbox",{name:"Page history platform"}).getByRole("option",{name:"iOS app",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(url => url.searchParams.get("platform")==="ios" && url.searchParams.get("page")==="1");
  await expect(page.getByTestId("page-view-row")).toHaveCount(15);
  await expect(page.getByTestId("pages-visited-total")).toHaveText("15");
  await page.getByRole("textbox",{name:"Search page or route"}).fill("Support");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.getByTestId("page-view-row")).toHaveCount(7);
  await page.setViewportSize({width:320,height:800});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false,"Page history must fit mobile viewport");
  await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname.endsWith("/activity") && url.searchParams.get("range")==="all" && !url.searchParams.has("platform"));

  await expect(page.locator('[data-activity-id^="e-qa-page-"]')).toHaveCount(5);
  // Old filtered links move to All Activity; dedicated page history is independent.
  await page.goto(base + pageActivityPath + "&tab=searches&product=FLIGHT&stage=SEARCH_COMPLETED&q=unmatched");
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
  await expect(page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Searches",exact:true})).toHaveAttribute("aria-current","page");
  await expect(activityRows).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Pages visited history",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Device & Access history",exact:true})).toHaveCount(0);
  await page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Pages visited",exact:true}).click();
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all")&&u.searchParams.get("tab")==="pages"&&!u.searchParams.has("q")&&!u.searchParams.has("product"));
  const pageCategoryHref=page.url();
  await expect(activityRows).toHaveCount(20);
  await expect(activityRows.getByRole("link",{name:"View pages visited",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"View page history",exact:true})).toHaveCount(1);
  const pageEvent = activityRows.first();
  await expect(pageEvent.getByTestId("activity-event-details")).not.toBeVisible();
  await pageEvent.locator("summary").click();
  await expect(pageEvent.getByTestId("activity-event-details")).toBeVisible();
  await expect(pageEvent.getByTestId("activity-event-details")).toContainText("App screen");
  assert.equal(page.url(),pageCategoryHref,"Opening a page action retains the selected identity and history position");
  await page.getByRole("link",{name:"View page history",exact:true}).click();
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/pages")&&!u.searchParams.has("q")&&!u.searchParams.has("product"));
  await expect(page.getByTestId("pages-visited-total")).toHaveText("45");
  await expect(page.getByRole("complementary",{name:"Users & Bots navigation"}).getByRole("link",{name:"Users Directory",exact:true})).toHaveAttribute("aria-current","page");
  await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
  await expect(page).toHaveURL(u=>u.pathname===new URL(pageCategoryHref).pathname&&u.searchParams.get("range")==="all"&&u.searchParams.get("tab")==="pages");
  console.log("PASS compact page preview, full history, filters and exact return");
  
  // New directory entry points reuse the real individual history routes.
  await page.setViewportSize({width:1280,height:900});
  const usersSidebar = page.getByRole("navigation",{name:"Users & Bots subsections"});
  await usersSidebar.getByRole("link",{name:"Device & Access",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/devices");
  await expect(page.getByRole("heading",{name:"Device & Access",exact:true})).toBeVisible();
  await expect(usersSidebar.getByRole("link",{name:"Device & Access",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("history-directory-row")).toHaveCount(3);
  const assertHorizontalFilters = async (testId, count) => {
    const boxes = await page.getByTestId(testId).evaluate(row => Array.from(row.children).map(child => {
      const control = child.matches("button") ? child : child.querySelector("button:not([role=option]),input:not([type=hidden])");
      const rect = (control ?? child).getBoundingClientRect();
      return { top: rect.top, height: rect.height, left: rect.left, right: rect.right };
    }));
    assert.equal(boxes.length, count);
    assert.ok(boxes.every(box => Math.abs(box.top - boxes[0].top) <= 1 && Math.abs(box.height - boxes[0].height) <= 1), "Filters must share one horizontal row and height: " + JSON.stringify(boxes));
    assert.ok(boxes.every((box, i) => i === 0 || box.left >= boxes[i - 1].right), "Filter controls must not overlap");
  };
  await assertHorizontalFilters("history-directory-filter-row", 4);
  await page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Registered",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Registered",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("history-directory-row")).toHaveCount(1);
  await page.getByRole("button",{name:"History range: Today"}).click();
  await page.getByRole("listbox",{name:"History range"}).getByRole("option",{name:"All time",exact:true}).click();
  await page.getByRole("textbox",{name:"Search name, email or ID"}).fill("customer.qa");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(url => url.searchParams.get("range")==="all" && url.searchParams.get("q")==="customer.qa");
  await page.getByTestId("history-directory-row").getByRole("link",{name:/View history for/}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/user/qa-registered-0001/devices");
  await expect(page.getByRole("heading",{name:"Device & Access History"})).toBeVisible();
  await expect(page.locator('[data-testid="device-history-row"]:visible')).toHaveCount(5);
  await page.getByRole("link",{name:"Back to Device & Access",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/devices" && url.searchParams.get("q")==="customer.qa" && url.searchParams.get("range")==="all");
  await expect(page.getByRole("textbox",{name:"Search name, email or ID"})).toHaveValue("customer.qa");
  await page.getByRole("button",{name:"History platform: All platforms"}).click();
  await page.getByRole("listbox",{name:"History platform"}).getByRole("option",{name:"iOS app",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(url => url.searchParams.get("platform")==="ios");
  await expect(page.getByTestId("history-directory-row")).toContainText("2");
  await page.getByTestId("history-directory-row").getByRole("link",{name:/View history for/}).click();
  await expect(page).toHaveURL(url => url.pathname.endsWith("/qa-registered-0001/devices") && url.searchParams.get("platform")==="ios");
  await expect(page.locator('[data-testid="device-history-row"]:visible')).toHaveCount(2);
  await assertHorizontalFilters("device-history-filter-row", 3);
  await page.getByRole("link",{name:"Back to Device & Access",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/devices" && url.searchParams.get("platform")==="ios");
  await page.getByRole("textbox",{name:"Search name, email or ID"}).fill("");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(url => !url.searchParams.has("q"));
  await page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Guests",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Guests",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("history-directory-row")).toHaveCount(1);
  await page.getByTestId("history-directory-row").getByRole("link",{name:/View history for/}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/guest/qa-page-history-guest/devices" && url.searchParams.get("platform")==="ios");
  await expect(page.getByTestId("guest-access-row")).toHaveCount(2);
  await expect(page.getByTestId("guest-access-total")).toHaveText("2 observations");
  await expect(page.getByText("Recorded guest access observations, not signed-in sessions. Live status is not verified.")).toBeVisible();
  await assertHorizontalFilters("device-history-filter-row", 3);
  await page.getByRole("link",{name:"Back to Device & Access",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/devices" && url.searchParams.get("tab")==="guests" && url.searchParams.get("platform")==="ios");
  await page.getByRole("button",{name:"History platform: iOS app"}).click();
  await page.getByRole("listbox",{name:"History platform"}).getByRole("option",{name:"Android app",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.getByTestId("history-directory-row")).toContainText("Guest session");
  await page.getByTestId("history-directory-row").getByRole("link",{name:/View history for/}).click();
  await expect(page.getByTestId("guest-access-row")).toHaveCount(1);
  await expect(page.getByTestId("guest-access-row")).toContainText("Operational");
  await expect(page.getByTestId("guest-access-row").getByTestId("guest-access-location")).toHaveText("Nigeria");
  await expect(page.getByTestId("guest-access-row")).toContainText("Android device");
  await expect(page.getByTestId("guest-access-row")).toContainText("Android · Native app");
  await page.getByRole("link",{name:"Back to Device & Access",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/devices" && url.searchParams.get("platform")==="android");
  await page.setViewportSize({width:320,height:800});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false,"Device directory must not overflow");
  await page.setViewportSize({width:1280,height:900});

  // Render actual history rows for each newly observed platform, with a
  // separate unobserved legacy website record that must remain unknown.
  await page.goto(base + "/admin/users/guest/22345678-1234-4123-8123-123456789abc/devices?range=all");
  const observedGuestRows = page.getByTestId("guest-access-row");
  await expect(observedGuestRows).toHaveCount(5);
  await expect(observedGuestRows.filter({ hasText: "Desktop web" })).toContainText("Windows computer");
  await expect(observedGuestRows.filter({ hasText: "Desktop web" })).toContainText("Windows · Chrome 140");
  await expect(observedGuestRows.filter({ hasText: "Mobile web" })).toContainText("iPhone");
  await expect(observedGuestRows.filter({ hasText: "Mobile web" })).toContainText("iOS · Safari 18");
  await expect(observedGuestRows.filter({ hasText: "iOS app" })).toContainText("iOS · Native app");
  await expect(observedGuestRows.filter({ hasText: "Android app" })).toContainText("Android · Native app");
  await expect(observedGuestRows.filter({ hasText: "Website" })).toContainText("Browser / OS unavailable");
  await capture({caret:"initial",path:output+"/guest-observed-devices-desktop.png",fullPage:true});
  await page.setViewportSize({width:320,height:800});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Guest device history must fit mobile without overflow");
  await capture({caret:"initial",path:output+"/guest-observed-devices-mobile-320.png",fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole("button",{name:"Device history platform: All platforms"}).click();
  await page.getByRole("listbox",{name:"Device history platform"}).getByRole("option",{name:"Mobile web",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(observedGuestRows).toHaveCount(1);
  await expect(observedGuestRows).toContainText("iOS · Safari 18");
  console.log("PASS observed guest devices on all four platforms, native app labels, and honest legacy unknown");

  await usersSidebar.getByRole("link",{name:"Pages Visited",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/pages");
  await expect(page.getByRole("heading",{name:"Pages Visited",exact:true})).toBeVisible();
  await assertHorizontalFilters("history-directory-filter-row", 4);
  await page.getByRole("button",{name:"History range: Today"}).click();
  await page.getByRole("listbox",{name:"History range"}).getByRole("option",{name:"All time",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.getByTestId("history-directory-total")).toHaveText("23 matching identities");
  await expect(page.getByTestId("history-directory-row")).toHaveCount(20);
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page.getByTestId("history-directory-row")).toHaveCount(3);
  await page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Guests",exact:true}).click();
  await expect(page.getByTestId("history-directory-row")).toHaveCount(1);
  await page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Registered",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"History identity types"}).getByRole("link",{name:"Registered",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("history-directory-total")).toHaveText("22 matching identities");
  await page.getByRole("button",{name:"History platform: All platforms"}).click();
  await page.getByRole("listbox",{name:"History platform"}).getByRole("option",{name:"iOS app",exact:true}).click();
  await page.getByRole("textbox",{name:"Search name, email or ID"}).fill("page-history");
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page.getByTestId("history-directory-row")).toHaveCount(1);
  await page.getByTestId("history-directory-row").getByRole("link",{name:/View history for/}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/user/qa-page-history-0001/pages" && url.searchParams.get("platform")==="ios" && !url.searchParams.has("q"));
  await expect(usersSidebar.getByRole("link",{name:"Pages Visited",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByTestId("pages-visited-total")).toHaveText("15");
  await assertHorizontalFilters("page-history-filter-row", 5);
  await page.getByRole("link",{name:"Back to Pages Visited",exact:true}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/pages" && url.searchParams.get("q")==="page-history" && url.searchParams.get("tab")==="registered" && url.searchParams.get("platform")==="ios");
  await page.setViewportSize({width:320,height:800});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false,"History directory must not overflow narrow screens");
  console.log("PASS Device & Access and Pages Visited directories, filters, pagination, detail and back links");

  // Full device history uses its own date filters and returns records older than Today.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(base + "/admin/users/user/qa-registered-0001/activity?range=all");
  await page.getByRole("region",{name:"Latest device and access"}).getByRole("link",{name:"Device & Access history"}).click();
  await expect(page).toHaveURL(url => url.pathname === "/admin/users/user/qa-registered-0001/devices" && url.searchParams.get("range") === "all");
  await expect(page.getByRole("heading",{name:"Device & Access History"})).toBeVisible();
  await expect(page.locator('[data-testid="device-history-row"]:visible')).toHaveCount(5);
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  // Restrict each assertion to visible rows, excluding the hidden mobile copy.
  // Verified presence is per device: two distinct valid sessions differ here.
  const visibleDeviceRows = page.locator('[data-testid="device-history-row"]:visible');
  await expect(visibleDeviceRows.filter({ has: page.getByText("Signed out", { exact: true }) })).toHaveCount(2);
  await expect(visibleDeviceRows.filter({ has: page.getByText("Expired", { exact: true }) })).toHaveCount(1);
  await expect(visibleDeviceRows.filter({ has: page.getByText("Active", { exact: true }) })).toHaveCount(1);
  await expect(visibleDeviceRows.filter({ has: page.getByText("Inactive", { exact: true }) })).toHaveCount(1);
  await expect(visibleDeviceRows.filter({ hasText: "Not expired" })).toHaveCount(0);
  await expect(visibleDeviceRows.filter({ has: page.getByText("Active", { exact: true }) })
    .locator("span.rounded-full.bg-\\[\\#16A34A\\]")).toHaveCount(1);
  await expect(visibleDeviceRows.filter({ hasText: "Password reset" })).toHaveCount(1);
  await page.getByRole("button",{name:"Device history range: All time"}).click();
  await page.getByRole("listbox",{name:"Device history range"}).getByRole("option",{name:"Today",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/range=today/);
  await expect(page.locator('[data-testid="device-history-row"]:visible')).toHaveCount(4);
  await page.setViewportSize({width:320,height:800});
  await expect(page.locator('[data-testid="device-history-row"]:visible')).toHaveCount(4);
  await expect(page.locator('[data-testid="device-history-row"]:visible').filter({ hasText: "Status: Signed out" })).toHaveCount(2);
  await expect(page.locator('[data-testid="device-history-row"]:visible').filter({ hasText: "Status: Active" })).toHaveCount(1);
  await expect(page.locator('[data-testid="device-history-row"]:visible').filter({ hasText: "Status: Inactive" })).toHaveCount(1);
  const deviceOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(deviceOverflow,false,"Full device history must fit mobile viewport without page overflow");
  await capture({caret:"initial",path:output+"/device-history-today-mobile-320.png",fullPage:true});
  console.log("PASS full device history drill-down, date filters, and mobile layout");

  // Operational-only guest searches and handoffs must be visible here,
  // without an extra Other Activity page or a fictitious consented journey.
  const operationalPath = base + "/admin/users/guest/qa-operational-guest-0001/activity";
  await page.setViewportSize({width:1280,height:900});
  // The same already-recorded access country is available from both entry points.
  await page.goto(base + "/admin/users/guest/12345678-1234-4123-8123-123456789abc/activity?range=all");
  const countryAccess=page.getByRole("region",{name:"Latest device and access"});
  await expect(countryAccess).toContainText("Nigeria");
  await countryAccess.getByRole("link",{name:"Device & Access history"}).click();
  await expect(page.getByTestId("guest-access-location")).toHaveText("Nigeria");
  await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
  await expect(countryAccess).toContainText("Nigeria");
  await page.goto(operationalPath + "?range=all");
  await expect(page.getByText("Essential guest session",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Manage guest/})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"View recorded session activity"})).toHaveCount(0);

  await expect(page.getByRole("link",{name:/View journey history/i})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Recent activity"})).toBeVisible();
  await expect(page.getByRole("region",{name:"Activity summary"}).locator('[data-testid="activity-metric-value"]')).toHaveText(["2","—","—","1","—","—"]);
  await expect(page.locator('[data-testid="activity-metric"][href]')).toHaveCount(2);
  await expect(page.getByTestId("activity-events-fact")).toContainText("3");
  await expect(activityRows).toHaveCount(3);
  assert.deepEqual(await activityRows.evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId)),["s-qa-operational-flight","s-qa-operational-hotel","r-qa-operational-handoff"]);
  await expect(activityRows.first()).toContainText("ATL → MCO");
  await expect(activityRows.first().locator("summary")).toContainText("Search completed with partial coverage");
  await page.getByRole("link",{name:"View all activity"}).click();
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
  await expect(activityRows).toHaveCount(3);
  await expect(page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Pages visited",exact:true})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Activity categories"}).locator('[aria-disabled="true"]')).toHaveCount(3);
  await expect(page.getByRole("link",{name:"Pages visited history",exact:true})).toHaveCount(0);
  await page.goto(operationalPath+"/all?range=all&tab=searches&stage=SEARCH_COMPLETED&product=FLIGHT&q=ATL");
  await expect(activityRows).toHaveCount(1);
  await page.goto(operationalPath+"/all?range=all&tab=handoffs");
  await expect(activityRows).toHaveCount(1);
  await page.goto(operationalPath+"/all?range=all&product=CAR");
  await expect(activityRows).toHaveCount(0);
  await expect(page.getByText("No recorded activity matches this view.")).toBeVisible();
  await page.setViewportSize({width:320,height:800});
  await page.goto(operationalPath+"/all?range=all");
  await expect(activityRows).toHaveCount(3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  
  // Registered accounts use the same fact grid, including protected-admin labels.
  await page.setViewportSize({width:1024,height:900});
  await page.goto(base + "/admin/users/user/qa-registered-0001/activity?range=all");
  await expectAlignedColumns(page);
  await capture({caret:"initial",path:output+"/after-registered-activity-1024.png",fullPage:true});

  await expect(page.getByLabel("Flights: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Hotels: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Cars: 1", {exact:true})).toBeVisible();

  await page.goto(base + "/admin/users/user/qa-protected-admin-0001/activity");
  await expect(page.getByText("Protected admin",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Manage account/})).toHaveCount(0);
  await expectAlignedColumns(page);
  await capture({caret:"initial",path: output+"/after-protected-admin-1024.png",fullPage:true});

  for (const width of [1792,1536,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base + "/admin/users/user/qa-long-identity-0001/activity");
    await expect(page.getByRole("heading",{name:"Alexandria Olufunmilayo Adekunle-Wellington",exact:true})).toBeVisible();
    const identity = await page.locator('section[aria-label="Customer identity"]').evaluate(el => ({
      overflow: document.documentElement.scrollWidth > innerWidth+1,
      truncated:[...el.querySelectorAll('h1,p')].some(el => getComputedStyle(el).textOverflow === "ellipsis"),
    }));
    assert.equal(identity.overflow,false);
    assert.equal(identity.truncated,false);
    if (width >= 1024) await expectAlignedColumns(page);
    await expectHeaderTimePresentation(page, "Long identity " + width);
    if (width >= 1536) await expectBalancedDesktopHeader(page, "Long identity " + width, true);
    await capture({caret:"initial",path:output+"/after-long-identity-"+width+".png",fullPage:true});
  }


  // Exact total, compact recent events, and full history on a separate route.
  await page.goto(url);
  const totals=page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","5","1","6","0"]);
  await expect(activityRows).toHaveCount(5);
  await page.goto(url+"&cursor=older-qa-page");
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","5","1","6","0"]);
  await page.goto(url+"&tab=searches&stage=SEARCH_COMPLETED&product=FLIGHT&q=LOS");
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
  await expect(activityRows).toHaveCount(1);
  const historyUrl=new URL(await page.getByRole("link",{name:/View journey history/i}).getAttribute("href"),base);
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  assert.equal(historyUrl.searchParams.get("stage"),"SEARCH_COMPLETED");
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("q"),null);
  await page.goto(fullUrl+"&tab=handoffs");
  await expect(activityRows).toHaveCount(1);
  await page.goto(fullUrl+"&tab=journeys&q=LOS");
  await expect(page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"All activity"})).toHaveAttribute("aria-current","page");
  for(const kind of ["guest","user"]) {
    const identityUrl=base+"/admin/users/"+kind+"/qa-complete-history-0001/activity?range=all";
    await page.goto(identityUrl);
    await expect(page.getByTestId("activity-metric-value").first()).toHaveText("1,005");
    await expect(page.getByTestId("activity-events-fact")).toContainText("1,005");
    await expect(page.locator('[data-activity-id^="s-qa-complete-"]')).toHaveCount(5);
    await page.getByRole("link",{name:"View all activity"}).click();
    await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
    await expect(activityRows).toHaveCount(20);
    const ids=await activityRows.evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId));
    await page.getByRole("link",{name:"Next page",exact:true}).click();
    await expect(page).toHaveURL(/cursor=/);
    await expect(activityRows).toHaveCount(20);
    await expect(activityRows.first()).toHaveAttribute("data-activity-id","s-qa-complete-0020");
    const next=await activityRows.evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId));
    assert.equal(new Set([...ids,...next]).size,40);
    assert.equal(ids[0],"s-qa-complete-0000");
    assert.equal(next[0],"s-qa-complete-0020");
    await expect(page.getByText(/You’re browsing older activity/)).toBeVisible();
    await page.getByRole("link",{name:"Newest activity",exact:true}).click();
    await expect(page).toHaveURL(u=>!u.searchParams.has("cursor"));
    await expect(activityRows.first()).toHaveAttribute("data-activity-id","s-qa-complete-0000");
    // Preserve the legacy complete history and its original filter contract.
    const legacy=base+"/admin/users/"+kind+"/qa-complete-history-0001/other?range=all";
    await page.goto(legacy);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1005);
    await page.goto(legacy+"&product=FLIGHT&from=2026-10-22&to=2026-10-22");
    await expect(page.locator("[data-activity-id]")).toHaveCount(503);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.goto(url+"&directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2");
  await expect(activityRows).toHaveCount(5);
  await capture({caret:"initial",path:output+"/after-all-selections-visible-1280.png",fullPage:true});
  const back=await page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Users directory",exact:true}).getAttribute("href");
  assert.ok(back.includes("sort=name_asc")&&back.includes("identity=GUEST")&&back.includes("page=2"));
  await page.locator('summary').filter({hasText:/^Guest reference$/}).click();
  await page.getByRole("button",{name:/Copy guest ID:/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),"qa-guest-activity-0001");
  console.log("PASS compact totals, unified history paging, legacy links and identity controls");

  // Use the real Directory table-generated link, then visit each dated view.
  // Historical fixture rows deliberately stay outside the Today window.
  await page.goto(base+"/admin/users");
  await page.getByRole("link",{name:/^View Activity for QA registered customer/}).click();
  const todayPath="/admin/users/user/qa-registered-0001";
  const todayOrigin="/admin/users?date=today";
  await expect(page).toHaveURL(u=>u.pathname===todayPath+"/activity"&&u.searchParams.get("range")==="today"&&u.searchParams.get("usersReturn")===todayOrigin);
  const todayProfile=page.url();
  await expect(activityRows).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Date range: Today · UTC",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"View all activity",exact:true}).click();
  await expect(page).toHaveURL(u=>u.pathname===todayPath+"/activity/all"&&u.searchParams.get("range")==="today"&&u.searchParams.get("usersReturn")===todayOrigin);
  await expect(activityRows).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Remove filter: Today/})).toHaveCount(0);
  await expectActivityFilterLayout(page, "Today full activity", { showInterface: true });
  await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
  await expect(page).toHaveURL(todayProfile);
  for(const [name,suffix,dateLabel] of [
    [/^View pages visited: /,"pages","Page history range: Today · UTC"],
    ["Device & Access history","devices","Device history range: Today · UTC"],
    [/^View journeys tracked: /,"journeys","Date range: Today · UTC"],
  ]) {
    await page.getByRole("link",{name,exact:typeof name==="string"}).click();
    await expect(page).toHaveURL(u=>u.pathname===todayPath+"/"+suffix&&u.searchParams.get("range")==="today");
    await expect(page.getByRole("button",{name:dateLabel,exact:true})).toBeVisible();
    const crumb=page.getByRole("navigation",{name:"Breadcrumb"});
    await crumb.getByRole("link",{name:suffix==="journeys"?"Activity":"Back to Activity",exact:true}).click();
    await expect(page).toHaveURL(todayProfile);
  }
  await page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Users directory",exact:true}).click();
  await expect(page).toHaveURL(base+todayOrigin);
  console.log("PASS Today propagates Directory → Activity → all/pages/devices/journeys and exact return context");


  // Fresh person history starts Today. The retained October fixture is empty
  // in that period; All time is an explicit choice and still reveals it all.
  await page.goto(url.split("?")[0]);
  await expect(activityRows).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Date range: Today · UTC",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"View all activity"}).click();
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all")&&u.searchParams.get("range")==="today");
  await expect(page.getByRole("button",{name:"Date range: Today · UTC",exact:true})).toBeVisible();
  await expect(activityRows).toHaveCount(0);
  await page.getByRole("button",{name:"Date range: Today · UTC",exact:true}).click();
  await page.getByRole("option",{name:"All time",exact:true}).click();
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(u=>u.searchParams.get("range")==="all");
  await expect(activityRows).toHaveCount(14);
  await page.setViewportSize({width:390,height:900});
  await page.goto(fullUrl);
  const mobileFilters=page.getByRole("button",{name:"Filters",exact:true});
  await expect(mobileFilters).toHaveAttribute("aria-expanded","false");
  await expect(page.getByRole("textbox",{name:"Search activity"})).not.toBeVisible();
  await mobileFilters.click();
  await expect(mobileFilters).toHaveAttribute("aria-expanded","true");
  assert.equal(await page.getByRole("textbox",{name:"Search activity"}).evaluate(element=>getComputedStyle(element).fontSize),"16px");
  await page.getByRole("textbox",{name:"Search activity"}).fill("LOS");
  await mobileFilters.click();
  await expect(page.getByRole("textbox",{name:"Search activity"})).not.toBeVisible();
  await mobileFilters.click();
  await expect(page.getByRole("textbox",{name:"Search activity"})).toHaveValue("LOS");
  await expect(page).not.toHaveURL(/q=LOS/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/q=LOS/);
  await expect(activityRows).toHaveCount(4);
  await expect(page.getByLabel("Applied activity filters")).toContainText("Search: LOS");
  await page.getByRole("button",{name:"Remove filter: Search: LOS",exact:true}).click();
  await expect(page).not.toHaveURL(/q=LOS/);
  await expect(activityRows).toHaveCount(14);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await capture({caret:"initial",path:output+"/activity-mobile-filter-controls-390.png",fullPage:true});
  console.log("PASS mobile filter disclosure, preserved draft, applied chips and filter removal");
  // Keep search above the four controls across the sidebar breakpoint and the
  // former 1280px breakpoint; no screenshot pixel width is assumed to be zoom.
  for (const width of [320,390,640,768,1023,1024,1152,1279,1280,1440,1731]) {
    await page.setViewportSize({width,height:900});
    await page.goto(fullUrl);
    await expectActivityFilterLayout(page, "Full activity filter layout " + width + "px");
    await page.getByTestId("activity-filters-row").screenshot({path:output+"/all-activity-filter-rows-"+width+".png"});
  }
  console.log("PASS full-width activity search and four controls across 11 responsive widths");
  await page.setViewportSize({width:1280,height:900});
  await page.goto(fullUrl);
  await expectActivityFilterLayout(page, "Historical full activity");
  await page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).toHaveURL(/tab=searches/);
  const search=page.getByRole("textbox",{name:"Search activity"});
  await search.fill("LOS");
  await expect(page).not.toHaveURL(/q=LOS/);
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"Flights"}).click();
  await expect(page).not.toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:/Activity type:/}).click();
  await page.getByRole("listbox",{name:"Activity type"}).getByRole("option",{name:"Search completed"}).click();
  await expect(page).not.toHaveURL(/stage=SEARCH_COMPLETED/);
  await search.press("Enter");
  await expect(page).toHaveURL(/q=LOS/);
  await expect(page).toHaveURL(/product=FLIGHT/);
  await expect(page).toHaveURL(/stage=SEARCH_COMPLETED/);
  await expect(page.getByRole("button",{name:"Clear filters"})).toHaveCount(0);
  await capture({caret:"initial",path:output+"/after-filtered-activity-1280.png",fullPage:true});
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"All products"}).click();
  await expect(page).toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).not.toHaveURL(/product=FLIGHT/);
  // Legacy custom-date URLs remain editable without adding a fifth preset option.
  await page.goto(fullUrl.split("?")[0]+"?range=custom&from=2026-10-01&to=2026-10-23");
  await expect(page.getByRole("button", { name: "Custom start date" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Custom end date" })).toBeVisible();
  await page.getByRole("button", { name: "Custom end date" }).click();
  const endCalendar = page.getByRole("dialog", { name: "Custom end date" });
  await expect(endCalendar.getByRole("heading")).toHaveText("October 2026");
  await expect(endCalendar.getByRole("combobox")).toHaveCount(0);
  await endCalendar.getByRole("gridcell", { name: "Saturday, October 24, 2026" }).click();
  await expect(endCalendar).toHaveCount(0);
  // No intermediate date action: the same Apply filters button commits both dates.
  await expect(page.getByRole("button",{name:"Set custom dates"})).toHaveCount(0);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/to=2026-10-24/);
  await page.getByRole("button",{name:/Date range:/}).click();
  await page.getByRole("listbox",{name:"Date range"}).getByRole("option",{name:"Last 7 days"}).click();
  await expect(page).toHaveURL(/range=custom/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/range=7d/);
  console.log("PASS custom dates and standard presets load only after Apply filters");

  await page.goto(fullUrl+"&order=oldest");
  await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
  await page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).not.toHaveURL(/order=oldest/);
  console.log("PASS hidden sort normalizes to newest");

  await page.goto(base+"/admin/users/guest/qa-no-events-0001/activity");
  await expect(page.getByText("No recorded activity matches this view.")).toBeVisible();
  await capture({caret:"initial",path:output+"/after-approved-empty-state-1536.png",fullPage:true});
  await page.goto(url+"&cursor=bad");
  await expect(page.getByText("Activity page link expired")).toHaveCount(0);
  await expect(activityRows).toHaveCount(5);
  await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
  await page.goto(fullUrl+"&cursor=bad");
  // AdminEmptyState deliberately renders its title as a paragraph, not a heading.
  await expect(page.getByText("Activity history unavailable",{exact:true})).toBeVisible();
  await expect(page.getByText("The page link no longer matches the selected filters.",{exact:true})).toBeVisible();
  await expect(activityRows).toHaveCount(0);
  await page.getByRole("link",{name:"Return to newest activity",exact:true}).click();
  await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all")&&!u.searchParams.has("cursor"));
  await expect(page.getByTestId("unified-activity-list")).toBeVisible();
  await expect(activityRows.first()).toBeVisible();
  console.log("PASS empty, obsolete summary cursor, invalid full-history cursor and recovery");

  await page.goto(base+"/admin/users/user/qa-registered-0001/activity?range=all");
  await expect(page.getByRole("heading",{name:"QA registered customer"})).toBeVisible();
  await expect(page.getByText("customer.qa@example.invalid",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Related records"})).toHaveCount(0);
  const accountCard = page.getByTestId("activity-page-card");
  await expect(accountCard.locator('section[aria-label="Activity summary"] button[aria-label="About activity data"]')).toHaveCount(0);
  await expect(accountCard.getByRole("button",{name:"Manage account for customer.qa@example.invalid"})).toBeVisible();
  await expect(accountCard.getByTestId("unified-activity-list")).toBeVisible();
  assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Registered Activity typography and palette");
  await expectAlignedColumns(page);
  await capture({caret:"initial",path:output+"/after-registered-activity-1280.png",fullPage:true});

  const localCalendar = base + "/admin/users/guest/qa-lagos-midnight-0001/activity/all?range=custom&from=2026-10-22&to=2026-10-22";
  await page.goto(localCalendar);
  await expect(page.getByRole("button", { name: "Date range: Custom range · UTC", exact: true })).toBeVisible();
  await expect(activityRows).toHaveCount(0);
  const account = createHash("sha256").update("qa-admin").digest("hex").slice(0, 32);
  await context.addCookies([{
    name: "admin_reporting_tz_manual_" + account, value: "Africa/Lagos", url: base, httpOnly: true,
  }]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Date range: Custom range · WAT (UTC+1)", exact: true })).toBeVisible();
  await expect(activityRows).toContainText("Abuja");
  await page.getByRole("link", { name: /View journey history/i }).click();
  await expect(page.getByRole("button", { name: "Date range: Custom range · WAT (UTC+1)", exact: true })).toBeVisible();
  console.log("PASS administrator time zone controls calendar bounds and persists across Activity and Journey History");

  assert.deepEqual(errors,[],"No browser exceptions");
  console.log("PASS registered identity and browser errors");
} finally {
  await browser.close();
}
