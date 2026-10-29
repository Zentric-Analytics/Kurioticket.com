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
const url=base+"/admin/users/guest/qa-guest-activity-0001/activity";

async function inspectActivityTypography(page) {
  return page.evaluate(() => {
    const identity = document.querySelector('section[aria-label="Customer identity"]');
    const summary = document.querySelector('section[aria-label="Activity summary"]');
    const root = identity?.parentElement;
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
    const identity = document.querySelector('section[aria-label="Customer identity"] > div');
    const summary = document.querySelector('section[aria-label="Activity summary"] > div');
    const facts = [...identity.querySelectorAll('dl > div')].map(el => el.getBoundingClientRect());
    const metrics = [...summary.querySelectorAll('[data-testid="activity-metric-label"]')].map(el => el.parentElement.getBoundingClientRect());
    return { identityTracks: getComputedStyle(identity).gridTemplateColumns, summaryTracks: getComputedStyle(summary).gridTemplateColumns,
      positions: facts.map((fact,i) => ({fact:fact.x,metric:metrics[i].x})),
      identityTop: identity.firstElementChild.getBoundingClientRect().top,
      factTops: facts.map(rect => rect.top), bottom: identity.getBoundingClientRect().bottom };
  });
  assert.equal(layout.identityTracks, layout.summaryTracks, 'same five grid tracks');
  for (const position of layout.positions) assert.ok(Math.abs(position.fact-position.metric) < 1, 'divider alignment');
  for (const top of layout.factTops) assert.ok(top < layout.bottom && top >= layout.identityTop - 30, 'facts share desktop row');
}

const approvedActivityTypography = {
  rootBackground: "rgb(255, 255, 255)",
  shellBackground: "rgb(241, 245, 251)",
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
    await page.screenshot({path:output+"/before-view-activity-"+width+".png",fullPage:true});
  }

  for(const width of [1536,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.goto(url);
    await expect(page.getByRole("heading",{name:"Visitor",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Activity history"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Activity summary"})).toBeVisible();
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

    await expect(outerCard.getByTestId("activity-body-card")).toBeVisible();
    await expect(outerCard.getByRole("navigation",{name:"Breadcrumb"})).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Breadcrumb"})).toBeVisible();
    await expect(page.locator('[data-testid="activity-page-card"] [data-testid="activity-body-card"]')).toHaveCount(1);
    await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Journeys"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"About activity data"})).toBeVisible();
    await expect(page.getByRole("tooltip")).toBeHidden();
    await page.getByRole("button",{name:"About activity data"}).focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button",{name:/Manage guest/})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Apply Filter"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Date range: All dates"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity product: All products"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Activity type: All activity types"})).toBeVisible();
    await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
    await expect(page.getByRole("textbox",{name:"Search activity"})).toBeVisible();
    await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
    await expect(page.getByText("14 recorded events",{exact:true})).toBeVisible();
    await expect(page.locator("[data-activity-id]")).toHaveCount(14);
    await expect(page.getByRole("button",{name:"Show all"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Hide all"})).toHaveCount(0);
    const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(widths.document <= widths.viewport+1, "No horizontal drift "+JSON.stringify(widths));
    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Guest Activity typography and palette "+width);
    if (width >= 1024) await expectAlignedColumns(page);

    if([1536,1280,1024,768,390,320].includes(width))
      await page.screenshot({path:output+"/after-view-activity-"+width+".png",fullPage:true});
    console.log("PASS responsive activity page",width);
  }

  // Browser zoom changes CSS viewport width. Check the equivalent 1280px desktop
  // at 90%, 100%, 110%, keeping device scale fixed (no CSS zoom hacks).
  for (const zoom of [0.9, 1, 1.1]) {
    await page.setViewportSize({width: Math.round(1280/zoom), height: Math.round(900/zoom)});
    await page.goto(base + "/admin/users/user/qa-registered-0001/activity");
    await expectAlignedColumns(page);
    assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography);
    await page.screenshot({path: output + "/after-desktop-zoom-equivalent-" + Math.round(zoom*100) + ".png",fullPage:true});
  }

  // Registered accounts use the same fact grid, including protected-admin labels.
  await page.setViewportSize({width:1024,height:900});
  await page.goto(base + "/admin/users/user/qa-registered-0001/activity");
  await expectAlignedColumns(page);
  await page.screenshot({path:output+"/after-registered-activity-1024.png",fullPage:true});

  await expect(page.getByLabel("Flights: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Hotels: 2", {exact:true})).toBeVisible();
  await expect(page.getByLabel("Cars: 1", {exact:true})).toBeVisible();

  await page.goto(base + "/admin/users/user/qa-protected-admin-0001/activity");
  await expect(page.getByText("Protected admin",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Manage account/})).toHaveCount(0);
  await expectAlignedColumns(page);
  await page.screenshot({path: output+"/after-protected-admin-1024.png",fullPage:true});

  // Every fixture event is available upfront, including the formerly separate pages.
  await page.goto(url);
  let totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","1"]);
  await expect(page.getByText("Counts reflect loaded events only.")).toHaveCount(0);
  await expect(page.locator("[data-activity-id]")).toHaveCount(14);
  await expect(page.locator('[data-activity-id="j-qa-older-search"]')).toBeVisible();
  await expect(page.locator('[data-activity-id="j-qa-newer-search"]')).toBeVisible();
  await page.goto(url+"?cursor=older-qa-page");
  await expect(page.getByText("14 recorded events",{exact:true})).toBeVisible();
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["5","2","1"]);
  await page.goto(url+"?tab=searches&stage=SEARCH_COMPLETED&product=FLIGHT&q=LOS");
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["1","0","0"]);
  await page.goto(url+"?tab=handoffs");
  totals = page.getByRole("region",{name:"Activity summary"});
  await expect(totals.locator('[data-testid="activity-metric-value"]')).toHaveText(["0","0","1"]);
  await page.goto(url+"?tab=journeys&q=LOS");
  await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"All activity"})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Journeys"})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches"})).not.toHaveAttribute("href",/tab=journeys/);
  console.log("PASS complete timeline, summary and legacy cursor recovery");

  // No scrolling, load-more click or additional page request is needed for any row.
  for (const kind of ["guest","user"]) {
    const fullUrl = base+"/admin/users/"+kind+"/qa-complete-history-0001/activity";
    const response = await page.goto(fullUrl);
    assert.ok((await response.text()).includes("s-qa-complete-1004"), "oldest row present in initial server response");
    await expect(page.locator("[data-activity-id]")).toHaveCount(1005);
    await expect(page.getByText("1005 recorded events",{exact:true})).toBeVisible();
    await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
    const ids = await page.locator("[data-activity-id]").evaluateAll(nodes => nodes.map(node => node.dataset.activityId));
    assert.equal(new Set(ids).size,1005);
    assert.equal(ids[0],"s-qa-complete-0000");
    assert.equal(ids.at(-1),"s-qa-complete-1004");
    await page.goto(fullUrl+"?product=FLIGHT&from=2026-10-22&to=2026-10-22");
    await expect(page.locator("[data-activity-id]")).toHaveCount(503);
    await expect(page.getByRole("region",{name:"Activity summary"}).locator('[data-testid="activity-metric-value"]').first()).toHaveText("503");
  }
  console.log("PASS 1005 events upfront for guests and registered users with complete filters");

  await page.setViewportSize({width:1280,height:900});
  await page.goto(url+"?directory=sort%3Dname_asc%26identity%3DGUEST%26page%3D2");
  await expect(page.locator("[data-activity-id]")).toHaveCount(14);
  for(const stamp of ["5:59","5:58","5:57","5:56"]) await expect(page.getByRole("main")).toContainText(stamp);
  await page.screenshot({path:output+"/after-all-selections-visible-1280.png",fullPage:true});
  await expect(page.getByRole("button",{name:"Show all"})).toHaveCount(0);
  const back=await page.getByRole("link",{name:"Users",exact:true}).last().getAttribute("href");
  assert.ok(back.includes("sort=name_asc") && back.includes("identity=GUEST") && back.includes("page=2"));
  await page.getByRole("button",{name:/Copy guest ID:/}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),"qa-guest-activity-0001");
  console.log("PASS every record visible and identity");

  await page.goto(url);
  await page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).toHaveURL(/tab=searches/);
  const search=page.getByRole("textbox",{name:"Search activity"});
  await search.fill("LOS");
  await expect(page).toHaveURL(/q=LOS/);
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"Flights"}).click();
  await expect(page).toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:/Activity type:/}).click();
  await page.getByRole("listbox",{name:"Activity type"}).getByRole("option",{name:"Search completed"}).click();
  await expect(page).toHaveURL(/stage=SEARCH_COMPLETED/);
  await expect(page.getByRole("button",{name:"Clear filters"})).toHaveCount(0);
  await page.screenshot({path:output+"/after-filtered-activity-1280.png",fullPage:true});
  await page.getByRole("button",{name:/Activity product:/}).click();
  await page.getByRole("listbox",{name:"Activity product"}).getByRole("option",{name:"All products"}).click();
  await expect(page).not.toHaveURL(/product=FLIGHT/);
  await page.getByRole("button",{name:/Date range:/}).click();
  await page.getByRole("listbox",{name:"Date range"}).getByRole("option",{name:"Custom range"}).click();
  await expect(page.getByLabel("Custom start date UTC")).toBeVisible();
  await expect(page.getByLabel("Custom end date UTC")).toBeVisible();
  await expect(page.getByRole("button",{name:"Apply dates"})).toBeDisabled();
  await page.getByLabel("Custom start date UTC").fill("2026-10-01");
  await page.getByLabel("Custom end date UTC").fill("2026-10-23");
  await expect(page).not.toHaveURL(/range=custom/);
  await expect(page.getByRole("button",{name:"Apply dates"})).toBeEnabled();
  await page.getByRole("button",{name:"Apply dates"}).click();
  await expect(page).toHaveURL(/range=custom/);
  await expect(page).toHaveURL(/from=2026-10-01/);
  await expect(page).toHaveURL(/to=2026-10-23/);
  await page.getByRole("button",{name:/Date range:/}).click();
  await page.getByRole("listbox",{name:"Date range"}).getByRole("option",{name:"Last 7 days"}).click();
  await expect(page).toHaveURL(/range=7d/);
  console.log("PASS custom date confirmation and automatic presets");

  await page.goto(url+"?order=oldest");
  await expect(page.getByRole("button",{name:/Sort activity/})).toHaveCount(0);
  await page.getByRole("navigation",{name:"Activity tabs"}).getByRole("link",{name:"Searches",exact:true}).click();
  await expect(page).not.toHaveURL(/order=oldest/);
  console.log("PASS hidden sort normalizes to newest");

  await page.goto(base+"/admin/users/guest/qa-no-events-0001/activity");
  await expect(page.getByText("No activity matches your filters")).toBeVisible();
  await page.screenshot({path:output+"/after-approved-empty-state-1536.png",fullPage:true});
  await page.goto(url+"?cursor=bad");
  await expect(page.getByText("Activity page link expired")).toHaveCount(0);
  await expect(page.getByText("14 recorded events",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:/Load (older|newer) activity/})).toHaveCount(0);
  console.log("PASS empty and obsolete cursor");

  await page.goto(base+"/admin/users/user/qa-registered-0001/activity");
  await expect(page.getByRole("heading",{name:"QA registered customer"})).toBeVisible();
  await expect(page.getByText("customer.qa@example.invalid",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Related records"})).toHaveCount(0);
  const accountCard = page.getByTestId("activity-page-card");
  await expect(accountCard.getByRole("button",{name:"Manage account for customer.qa@example.invalid"})).toBeVisible();
  await expect(accountCard.getByTestId("activity-body-card")).toBeVisible();
  assert.deepEqual(await inspectActivityTypography(page), approvedActivityTypography, "Registered Activity typography and palette");
  await expectAlignedColumns(page);
  await page.screenshot({path:output+"/after-registered-activity-1280.png",fullPage:true});
  assert.deepEqual(errors,[],"No browser exceptions");
  console.log("PASS registered identity and browser errors");
} finally {
  await browser.close();
}
