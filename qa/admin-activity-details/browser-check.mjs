import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
const context = await browser.newContext({viewport:{width:1280,height:900}, permissions:["clipboard-read","clipboard-write"]});
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const url=base+"/admin/users/guest/qa-guest-activity-0001/activity?range=all";

async function inspectActivityTypography(page) {
  return page.evaluate(() => {
    const identity = document.querySelector('section[aria-label="Customer identity"]');
    const summary = document.querySelector('section[aria-label="Activity summary"]');
    const root = identity?.closest('[data-testid="activity-page-card"]');
    const shell = document.querySelector("main")?.parentElement;
    const bodyCard = document.querySelector('[data-testid="activity-body-card"]');
    const factLabel = identity?.querySelector("dt");
    const factValue = identity?.querySelector("dd");
    const summaryValue = summary?.querySelector('[data-testid="activity-metric-value"]');
    const summaryLabel = summary?.querySelector('[data-testid="activity-metric-label"]');
    const searchInput = document.querySelector('input[aria-label="Search activity"]');
    if (!root || !shell || !summary || !bodyCard || !factLabel || !factValue || !summaryValue || !summaryLabel || !searchInput)
      throw new Error("Activity typography anchors missing");
    const css = element => getComputedStyle(element);
    return {
      rootBackground: css(root).backgroundColor,
      shellBackground: css(shell).backgroundColor,
      summaryBackground: css(summary).backgroundColor,
      bodyBackground: css(bodyCard).backgroundColor,
      outerBorderColor: css(root).borderTopColor,
      innerBorderColor: css(bodyCard).borderTopColor,
      primaryText: css(root).color,
      factValueSize: css(factValue).fontSize,
      factValueWeight: css(factValue).fontWeight,
      factValueColor: css(factValue).color,
      factLabelSize: css(factLabel).fontSize,
      factLabelWeight: css(factLabel).fontWeight,
      factLabelColor: css(factLabel).color,
      summaryValueSize: css(summaryValue).fontSize,
      summaryValueWeight: css(summaryValue).fontWeight,
      summaryValueColor: css(summaryValue).color,
      summaryLabelSize: css(summaryLabel).fontSize,
      summaryLabelWeight: css(summaryLabel).fontWeight,
      summaryLabelColor: css(summaryLabel).color,
      dividerColor: css(summary).borderTopColor,
      searchBackground: css(searchInput).backgroundColor,
    };
  });
}
async function expectAlignedColumns(page) {
  const layout = await page.evaluate(() => {
    const info = document.querySelector('[data-testid="activity-info-grid"]');
    const identity = info.querySelector('section[aria-label="Customer identity"] > div');
    const summary = info.querySelector('section[aria-label="Activity summary"]');
    const metrics = [...info.querySelectorAll('[data-testid="activity-metric"]')];
    const facts = [...identity.querySelectorAll('dl > div')];
    const shared = [40,60,80].map(n => info.querySelector('[data-testid="activity-divider-'+n+'"]'));
    const partial = info.querySelector('[data-testid="activity-divider-20"]');
    const metricRects = metrics.map(el => el.getBoundingClientRect());
    const factRects = facts.map(el => el.getBoundingClientRect());
    const infoRect = info.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    const boundary = (el, top, bottom, x) => {
      const r=el.getBoundingClientRect();
      return Math.abs(r.left-x)<2 && Math.abs(r.top-top)<2 && Math.abs(r.bottom-bottom)<2
        && parseFloat(getComputedStyle(el).borderLeftWidth)>0.5;
    };
    return {
      metricsCount:metrics.length,
      equalWidths:metricRects.every(rect=>Math.abs(rect.width-metricRects[0].width)<1),
      oneRow:metricRects.every(rect=>Math.abs(rect.top-metricRects[0].top)<1),
      identitySpansTwo:Math.abs(identity.firstElementChild.getBoundingClientRect().width-2*metricRects[0].width)<2,
      topAligned:facts.length===3 && factRects.every((rect,i)=>Math.abs(rect.left-metricRects[i+2].left)<2),
      sharedConnected:shared.every((line,i)=>boundary(line,infoRect.top,infoRect.bottom,metricRects[i+2].left)),
      lowerConnected:boundary(partial,summaryRect.top,summaryRect.bottom,metricRects[1].left),
      horizontalConnected:Math.abs(summaryRect.top - identity.getBoundingClientRect().bottom)<2
        && parseFloat(getComputedStyle(summary).borderTopWidth)>0.5,
      topBottom:parseFloat(getComputedStyle(info).borderTopWidth)>0.5 &&
        parseFloat(getComputedStyle(info).borderBottomWidth)>0.5,
      customerFactsSameRow:factRects.every(rect=>Math.abs(rect.top-factRects[0].top)<2),
      noOverflow:document.documentElement.scrollWidth<=innerWidth+1,
    };
  });
  for (const [key, value] of Object.entries(layout)) assert.equal(value,key==="metricsCount"?5:true,
    "Unified full-height grid "+key+": "+JSON.stringify(layout));
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
    const identity = document.querySelector('section[aria-label="Customer identity"] > div');
    const metrics = document.querySelectorAll('[data-testid="activity-metric"]');
    const events = document.querySelector('[data-testid="activity-events-fact"]');
    const email = identity?.firstElementChild?.querySelector('p');
    if (!identity || metrics.length!==5 || !events) throw new Error("Header and summary anchors missing");
    const columns = identity.children[0].getBoundingClientRect();
    const eventsRect = events.getBoundingClientRect();
    const emailStyle = email ? getComputedStyle(email) : null;
    const providerLabel = metrics[3].querySelector('[data-testid="activity-metric-label"]');
    return {
      firstToEventsRatio: columns.width / eventsRect.width,
      emailHeight: email?.getBoundingClientRect().height ?? 0,
      emailFontSize: emailStyle ? Number.parseFloat(emailStyle.fontSize) : 0,
      providerLabelHeight: providerLabel.getBoundingClientRect().height,
      providerLabelFontSize: Number.parseFloat(getComputedStyle(providerLabel).fontSize),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      hasVisibleHeading: Boolean(document.querySelector('section[aria-label="Activity summary"] h2')),
    };
  });
  assert.ok(layout.firstToEventsRatio >= 1.98,
    context + ": identity retains enough room beside compact facts: " + JSON.stringify(layout));
  assert.equal(layout.hasVisibleHeading, false, context + ": summary has no visible heading");
  assert.ok(layout.providerLabelHeight < layout.providerLabelFontSize * 1.9,
    context + ": Provider handoffs label should not wrap across desktop lines: " + JSON.stringify(layout));
  if (requireSingleLineEmail) assert.ok(layout.emailHeight < layout.emailFontSize * 1.9,
    context + ": realistic desktop email should fit without wrapping: " + JSON.stringify(layout));
  assert.equal(layout.overflow, false, context + ": no horizontal overflow");
}

const approvedActivityTypography = {
  rootBackground: "rgb(255, 255, 255)",
  shellBackground: "rgb(255, 255, 255)",
  summaryBackground: "rgba(0, 0, 0, 0)",
  bodyBackground: "rgb(255, 255, 255)",
  outerBorderColor: "rgb(226, 232, 240)",
  innerBorderColor: "rgb(226, 232, 240)",
  primaryText: "rgb(15, 23, 42)",
  factValueSize: "16px",
  factValueWeight: "500",
  factValueColor: "rgb(15, 23, 42)",
  factLabelSize: "12px",
  factLabelWeight: "400",
  factLabelColor: "rgb(100, 116, 139)",
  summaryValueSize: "16px",
  summaryValueWeight: "500",
  summaryValueColor: "rgb(15, 23, 42)",
  summaryLabelSize: "12px",
  summaryLabelWeight: "400",
  summaryLabelColor: "rgb(100, 116, 139)",
  dividerColor: "rgb(226, 232, 240)",
  searchBackground: "rgb(255, 255, 255)",
};

try {
  for (const width of [1536,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base+"/before");
    await expect(page.getByTestId("fixture-label")).toContainText("synthetic activity");
    await page.screenshot({caret:"initial",path:output+"/before-view-activity-"+width+".png",fullPage:true});
  }

  for(const width of [1536,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(url);
    await expect(page.getByRole("heading",{name:"Visitor",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Recent journeys"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Other recorded activity"})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Activity history"})).toHaveCount(0);
    await expect(page.getByRole("heading",{name:"Activity summary"})).toHaveCount(0);
    await expect(page.getByTestId("activity-metric")).toHaveCount(5);
    await expect(page.getByRole("heading",{name:"Related records"})).toHaveCount(0);
    const outerCard = page.getByTestId("activity-page-card");
    await expect(outerCard).toHaveCount(1);
    await expect(outerCard).toBeVisible();
    await expect(outerCard.locator('section[aria-label="Customer identity"]')).toBeVisible();
    await expect(outerCard.locator('section[aria-label="Activity summary"]')).toBeVisible();
    const facts = outerCard.locator('section[aria-label="Customer identity"] dl > div');
    await expect(facts).toHaveCount(3);
    assert.ok(await facts.evaluateAll(nodes => nodes.every(node =>
      node.firstElementChild?.tagName === "DT" && node.lastElementChild?.tagName === "DD"
    )), "Each identity fact keeps a direct term-description grouping");

    await expect(outerCard.getByTestId("identity-device-access")).toHaveCount(0);
    const filterRow = outerCard.getByTestId("activity-filters-row");
    const tabsAfterFilters = outerCard.getByTestId("activity-tabs-after-filters");
    await expect(filterRow).toBeVisible();
    await expect(tabsAfterFilters).toBeVisible();
    assert.ok(await filterRow.evaluate(el =>
      el.getBoundingClientRect().bottom <= (document.querySelector('[data-testid="activity-tabs-after-filters"]')?.getBoundingClientRect().top ?? 0)
    ), "Activity navigation must follow the filter controls");
    if (width >= 1280) {
      const y = await filterRow.locator("button").first().evaluate(el => el.getBoundingClientRect().top);
      const buttons = await filterRow.locator("button").evaluateAll(items => items.map(el => el.getBoundingClientRect().top));
      assert.ok(buttons.every(top => Math.abs(top - y) <= 15), "Desktop filters must share a balanced horizontal row");
    }
    await expect(outerCard.getByTestId("activity-body-card")).toBeVisible();
    await expect(outerCard.getByRole("navigation",{name:"Breadcrumb"})).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Breadcrumb"})).toBeVisible();
    await expect(page.locator('[data-testid="activity-page-card"] [data-testid="activity-body-card"]')).toHaveCount(1);
    await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Journeys"})).toHaveCount(0);
    // The summary has five metrics but no visible heading, info icon, or disclosure.
    await expect(outerCard.locator('section[aria-label="Activity summary"] button[aria-label="About activity data"]')).toHaveCount(0);
    await expect(outerCard.locator('section[aria-label="Activity summary"] [role="tooltip"]')).toHaveCount(0);
    const guestManage = page.getByRole("button",{name:/Manage guest/});
    await expect(guestManage).toBeVisible();
    await expect(guestManage).toHaveAttribute("aria-expanded","false");
    await guestManage.click();
    await expect(page.getByRole("menu",{name:"Guest management"})).toBeVisible();
    await expect(page.getByRole("menuitem",{name:"Disable tracking"})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(guestManage).toHaveAttribute("aria-expanded","false");
    await expect(page.getByRole("button",{name:"Apply Filter",exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Apply filters",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Date range: All time"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity product: All products"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity type: All activity types"})).toBeVisible();
    await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
    await expect(page.getByRole("textbox",{name:"Search activity"})).toBeVisible();
    await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
    await expect(page.getByTestId("activity-overview")).toBeVisible();
    await expect(page.getByTestId("activity-journey-row")).toHaveCount(5);
    await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Show all"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Hide all"})).toHaveCount(0);
    const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(widths.document <= widths.viewport+1, "No horizontal drift "+JSON.stringify(widths));
    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Guest Activity typography and palette "+width);
    if (width >= 1024) await expectAlignedColumns(page);
    await expectHeaderTimePresentation(page, "Guest " + width);
    if (width === 1536) await expectBalancedDesktopHeader(page, "Guest desktop");

    if([1536,1280,1024,768,390,320].includes(width))
      await page.screenshot({caret:"initial",path:output+"/after-view-activity-"+width+".png",fullPage:true});
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
    const inlineDevices = page.getByTestId("identity-device-access");
    await expect(inlineDevices).toBeVisible();
    await expect(inlineDevices.getByText("Today (UTC)")).toBeVisible();
    await expect(inlineDevices.getByRole("heading",{name:"Device & Access History"})).toHaveCount(0);
    await expect(inlineDevices.getByTestId("device-session-row")).toHaveCount(3);
    await expect(inlineDevices.getByTestId("device-today-list")).toBeVisible();
    const fullDeviceHistory = inlineDevices.getByRole("link", {name:"View full history"});
    await expect(fullDeviceHistory).toBeVisible();
    assert.ok((await fullDeviceHistory.getAttribute("href"))?.includes("/admin/users/user/qa-registered-0001/devices?range=all"));

    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography);
    await page.screenshot({caret:"initial",path: output + "/after-desktop-zoom-equivalent-" + Math.round(zoom*100) + ".png",fullPage:true});
  }

  // Full device history uses its own date filters and returns records older than Today.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(base + "/admin/users/user/qa-registered-0001/activity?range=all");
  await page.getByTestId("identity-device-access").getByRole("link",{name:"View full history"}).click();
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
  await page.screenshot({caret:"initial",path:output+"/device-history-today-mobile-320.png",fullPage:true});
  console.log("PASS full device history drill-down, date filters, and mobile layout");

  // Operational-only guest sessions are not analytics identities and cannot disable tracking.
  await page.goto(base + "/admin/users/guest/qa-operational-guest-0001/activity?range=all");
  await expect(page.getByText("Essential operational activity")).toBeVisible();
  await expect(page.getByRole("button",{name:/Manage guest/})).toHaveCount(0);

  // Registered accounts use the same fact grid, including protected-admin labels.
  await page.setViewportSize({width:1024,height:900});
  await page.goto(base + "/admin/users/user/qa-registered-0001/activity?range=all");
  await expectAlignedColumns(page);
  await page.screenshot({caret:"initial",path:output+"/after-registered-activity-1024.png",fullPage:true});

  await expect(page.getByLabel("Flights: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Hotels: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Cars: 1", {exact:true})).toBeVisible();

  await page.goto(base + "/admin/users/user/qa-protected-admin-0001/activity");
  await expect(page.getByText("Protected admin",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Manage account/})).toHaveCount(0);
  await expectAlignedColumns(page);
  await page.screenshot({caret:"initial",path: output+"/after-protected-admin-1024.png",fullPage:true});

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
    await page.screenshot({caret:"initial",path:output+"/after-long-identity-"+width+".png",fullPage:true});
  }

  // Summary metrics use all authorized records, while only the latest five
  // actual journeys are rendered in the overview; other records live in detail.
  await page.goto(url);
  let totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","5","1","6"]);
  await expect(page.getByTestId("activity-journey-row")).toHaveCount(5);
  await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
  await expect(page.locator("[data-activity-id]")).toHaveCount(0);
  await page.goto(url+"&cursor=older-qa-page");
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","5","1","6"]);
  await page.goto(url+"&tab=searches&stage=SEARCH_COMPLETED&product=FLIGHT&q=LOS");
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["1","0","0","0","1"]);
  await expect(page.getByTestId("activity-journey-row")).toHaveCount(1);
  const historyUrl = new URL(await page.getByRole("link",{name:/View Journey History/}).getAttribute("href"),base);
  assert.equal(historyUrl.searchParams.get("product"),"FLIGHT");
  assert.equal(historyUrl.searchParams.get("stage"),"SEARCH_COMPLETED");
  assert.equal(historyUrl.searchParams.get("range"),"all");
  assert.equal(historyUrl.searchParams.get("q"),null,"Journey filter must not invent a text-search equivalent");
  await page.goto(url+"&tab=handoffs");
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["0","0","0","1","1"]);
  await page.goto(url+"&tab=journeys&q=LOS");
  await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"All activity"})).toHaveAttribute("aria-current","page");
  console.log("PASS filtered summary metrics, journey handoff and legacy cursor recovery");

  for (const kind of ["guest","user"]) {
    const fullUrl = base+"/admin/users/"+kind+"/qa-complete-history-0001/activity?range=all";
    await page.goto(fullUrl);
    await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
    await expect(page.getByTestId("activity-journey-row")).toHaveCount(0);
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    await expect(page.getByRole("link",{name:/View Journey History/})).toBeVisible();
    const allHref = "/admin/users/"+kind+"/qa-complete-history-0001/other?range=all";
    await page.goto(base+allHref);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1005);
    const ids = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(n => n.dataset.activityId));
    assert.equal(ids[0],"s-qa-complete-0000");
    assert.equal(ids.at(-1),"s-qa-complete-1004");
    assert.equal(new Set(ids).size,1005);
    await page.goto(fullUrl+"&product=FLIGHT&from=2026-10-22&to=2026-10-22");
    await expect(page.getByRole("region",{name:"Activity summary"}).locator('[data-testid="activity-metric-value"]').first()).toHaveText("503");
    await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
    const filteredHref = "/admin/users/"+kind+"/qa-complete-history-0001/other?range=all&product=FLIGHT&from=2026-10-22&to=2026-10-22";
    await page.goto(base+filteredHref);
    await expect(page.locator("[data-activity-id]")).toHaveCount(503);
  }
  console.log("PASS five-row summary, complete separate other-event history, and product/date filters");

  await page.setViewportSize({width:1280,height:900});
  await page.goto(url+"&directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2");
  await expect(page.getByTestId("activity-journey-row")).toHaveCount(5);
  await expect(page.locator("[data-activity-id]")).toHaveCount(0);
  await page.screenshot({caret:"initial",path:output+"/after-all-selections-visible-1280.png",fullPage:true});
  await expect(page.getByRole("button",{name:"Show all"})).toHaveCount(0);
  const back=await page.getByRole("link",{name:"Users",exact:true}).last().getAttribute("href");
  assert.ok(back.includes("sort=name_asc") && back.includes("identity=GUEST") && back.includes("page=2"));
  await page.getByRole("button",{name:/Copy guest ID:/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),"qa-guest-activity-0001");
  console.log("PASS concise summary and identity controls");

  // The default rolling 24-hour period must not invent October records in November.
  await page.goto(url.split("?")[0]);
  await expect(page.getByRole("button",{name:"Date range: Today"})).toBeVisible();
  await expect(page.getByTestId("activity-journey-row")).toHaveCount(0);
  await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
  await page.goto(url);
  await page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches",exact:true}).click();
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
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).toHaveURL(/q=LOS/);
  await expect(page).toHaveURL(/product=FLIGHT/);
  await expect(page).toHaveURL(/stage=SEARCH_COMPLETED/);
  await expect(page.getByRole("button",{name:"Clear filters"})).toHaveCount(0);
  await page.screenshot({caret:"initial",path:output+"/after-filtered-activity-1280.png",fullPage:true});
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"All products"}).click();
  await expect(page).toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:"Apply filters",exact:true}).click();
  await expect(page).not.toHaveURL(/product=FLIGHT/);
  // Legacy custom-date URLs remain editable without adding a fifth preset option.
  await page.goto(url.split("?")[0]+"?range=custom&from=2026-10-01&to=2026-10-23");
  await expect(page.getByRole("button", { name: "Custom start date UTC" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Custom end date UTC" })).toBeVisible();
  await page.getByRole("button", { name: "Custom end date UTC" }).click();
  const endCalendar = page.getByRole("dialog", { name: "Custom end date UTC" });
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

  await page.goto(url+"&order=oldest");
  await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
  await page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).not.toHaveURL(/order=oldest/);
  console.log("PASS hidden sort normalizes to newest");

  await page.goto(base+"/admin/users/guest/qa-no-events-0001/activity");
  await expect(page.getByText("No tracked journeys match these filters. Open Journey History to review full records.")).toBeVisible();
  await page.screenshot({caret:"initial",path:output+"/after-approved-empty-state-1536.png",fullPage:true});
  await page.goto(url+"&cursor=bad");
  await expect(page.getByText("Activity page link expired")).toHaveCount(0);
  await expect(page.getByTestId("activity-journey-row")).toHaveCount(5);
  await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
  console.log("PASS empty and obsolete cursor");

  await page.goto(base+"/admin/users/user/qa-registered-0001/activity?range=all");
  await expect(page.getByRole("heading",{name:"QA registered customer"})).toBeVisible();
  await expect(page.getByText("customer.qa@example.invalid",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Related records"})).toHaveCount(0);
  const accountCard = page.getByTestId("activity-page-card");
  await expect(accountCard.locator('section[aria-label="Activity summary"] button[aria-label="About activity data"]')).toHaveCount(0);
  await expect(accountCard.getByRole("button",{name:"Manage account for customer.qa@example.invalid"})).toBeVisible();
  await expect(accountCard.getByTestId("activity-body-card")).toBeVisible();
  assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Registered Activity typography and palette");
  await expectAlignedColumns(page);
  await page.screenshot({caret:"initial",path:output+"/after-registered-activity-1280.png",fullPage:true});
  assert.deepEqual(errors,[],"No browser exceptions");
  console.log("PASS registered identity and browser errors");
} finally {
  await browser.close();
}
