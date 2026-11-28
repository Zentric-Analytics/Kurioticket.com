import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { expectActivityFilterLayout } from "./activity-filter-layout.mjs";
const base=process.env.ADMIN_ACTIVITY_QA_URL,output=process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.ADMIN_ACTIVITY_QA_CHROMIUM});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{
    if(message.type()==="error" && /hydration failed|a tree hydrated but some attributes/i.test(message.text())) errors.push(message.text());
  });
  const view=(href,full=false,updates={})=>{
    const url=new URL(href,base);
    if(full)url.pathname+="/all";
    for(const [key,value] of Object.entries(updates))url.searchParams.set(key,value);
    return url.href;
  };
  const capture=async name=>{
    await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
    await page.screenshot({caret:"initial",path:output+"/"+name+".png",fullPage:true});
  };
  const directorySelected=async()=>{
    const sidebar=page.locator('[aria-label="Users & Bots subsections"]');
    await expect(sidebar.locator('a[href="/admin/users"]')).toHaveAttribute("aria-current","page");
    await expect(sidebar.locator('a[href="/admin/users/online"]')).not.toHaveAttribute("aria-current","page");
  };
  const openFilters=async()=>{
    const toggle=page.getByRole("button",{name:"Filters",exact:true});
    if(await toggle.isVisible() && await toggle.getAttribute("aria-expanded")==="false")await toggle.click();
  };
  const card=page.getByTestId("activity-page-card");
  const fullCard=page.getByTestId("activity-history-card");
  const layout=()=>card.evaluate(element=>{
    const identity=element.querySelector('[data-testid="activity-identity-facts"]');
    const summary=element.querySelector('[data-testid="activity-metrics-grid"]');
    return {wrapper:element.className,identity:identity.className,summary:summary?.className ?? null,
      identityCols:getComputedStyle(identity).gridTemplateColumns.split(" ").length,
      metricCols:summary ? getComputedStyle(summary).gridTemplateColumns.split(" ").length : 0,
      labels:[...element.querySelectorAll('[data-testid="activity-metric-label"]')].map(value=>value.textContent),
      metricFonts:[...element.querySelectorAll('[data-testid="activity-metric-value"]')].map(value=>getComputedStyle(value).fontSize),
      facts:[...identity.querySelectorAll("dt")].map(value=>value.textContent)};
  });
  const fullLayout=()=>fullCard.evaluate(element=>{
    const filters=element.querySelector('[data-testid="activity-filters-row"]');
    const categories=element.querySelector('[aria-label="Activity categories"]');
    return {wrapper:element.className,header:element.querySelector("header").className,
      filters:filters.className,filterCols:getComputedStyle(filters).gridTemplateColumns.split(" ").length,
      categoryFrame:categories.className,categories:[...categories.children].map(category=>category.firstChild.textContent.trim()),
      duplicateHistoryActions:element.querySelectorAll('[data-testid="activity-history-actions"]').length};
  });
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);

  for(const width of [1536,1280,1024,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+"/admin/users/online");
    const rows=page.getByTestId("online-user-row");
    await expect(rows).toHaveCount(5);
    if(width<768)assert.equal(await page.getByRole("searchbox",{name:"Search online users"}).evaluate(element=>getComputedStyle(element).fontSize),"16px");
    const byPlatform=label=>rows.filter({has:page.locator('td[data-label="Platforms"] span').filter({hasText:new RegExp("^\\s*"+label+"\\s*$")})});
    const guest=byPlatform("Desktop web"),missing=byPlatform("iOS");
    await expect(guest).toHaveCount(1);
    await expect(missing).toHaveCount(1);
    await expect(guest.getByTestId("online-user-location")).toHaveText("Nigeria");
    await expect(missing.getByTestId("online-user-location")).toHaveText("Unavailable");
    await expect(byPlatform("Android")).toHaveCount(1);
    const byType=(candidates,label)=>candidates.filter({has:page.locator('td[data-label="Type"]').filter({hasText:new RegExp("^\\s*"+label+"\\s*$")})});
    const registeredHref=await byType(byPlatform("Mobile web"),"Customer").getByRole("link",{name:"View Activity"}).getAttribute("href");
    assert.equal(new URL(registeredHref,base).pathname,"/admin/users/user/qa-registered-0001/activity");
    const guestHref=await guest.getByRole("link",{name:"View Activity"}).getAttribute("href");
    const otherHref=await missing.getByRole("link",{name:"View Activity"}).getAttribute("href");
    const visitorHref=await byType(byPlatform("Mobile web"),"Guest").getByRole("link",{name:"View Activity"}).getAttribute("href");
    const operationalHref=await byPlatform("Android").getByRole("link",{name:"View Activity"}).getAttribute("href");
    const guestPath=new URL(guestHref,base).pathname;
    assert.notEqual(guestHref,otherHref);
    assert.match(guestPath,/^\/admin\/users\/live-guest\/[A-Za-z0-9_-]{43}\/activity$/);
    for(const href of [registeredHref,guestHref,otherHref,visitorHref,operationalHref]){
      const target=new URL(href,base);
      assert.equal(target.searchParams.get("range"),"today");
      assert.equal(target.searchParams.get("usersReturn"),"/admin/users/online");
    }
    await noOverflow();
    await capture("online-users-"+width);
    await guest.getByRole("link",{name:"View Activity"}).click();
    await expect(page).toHaveURL(url=>url.pathname===guestPath);
    await directorySelected();
    await expect(card.getByRole("heading",{name:"Guest session",exact:true})).toBeVisible();
    await expect(card.getByTestId("live-guest-location")).toHaveCount(1);
    await expect(card.getByTestId("live-guest-location")).toHaveText("Current location: Nigeria");
    await expect(page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Online Users",exact:true})).toHaveAttribute("href","/admin/users/online");
    await expect(card.getByRole("heading",{name:"Activity availability",exact:true})).toBeVisible();
    await expect(card.getByRole("heading",{name:"Recent activity",exact:true})).toHaveCount(0);
    await expect(card.locator("[data-activity-id]")).toHaveCount(0);
    await expect(card.getByRole("region",{name:"Latest device and access"}).getByText("Latest verified access",{exact:true})).toBeVisible();
    await expect(card.getByRole("link",{name:"Device & Access history",exact:true})).toHaveCount(0);
    const metrics=card.getByTestId("activity-metric-value");
    await expect(metrics).toHaveCount(0);
    await expect(card.getByTestId("activity-events-fact")).toHaveCount(0);
    await expect(card.getByRole("status")).toHaveText("Recorded activity history is unavailable for this temporary guest session. Current access information is shown when it can be verified.");
    await expect(card.getByRole("link",{name:"View all activity",exact:true})).toHaveCount(0);
    const liveLayout=await layout();
    assert.deepEqual(liveLayout.facts,["First observed","Last seen"]);
    assert.equal(liveLayout.metricCols,0);
    await noOverflow();
    await capture("live-guest-activity-"+width);
    // Retain existing full-view bookmarks, while the temporary overview no
    // longer sends admins into a history view with no attributable history.
    await page.goto(view(guestHref,true,{range:"all"}));
    await expect(page).toHaveURL(url=>url.pathname===guestPath+"/all"&&url.searchParams.get("usersReturn")==="/admin/users/online");
    await directorySelected();
    await expect(page.getByRole("heading",{name:"All activity",exact:true})).toBeVisible();
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await openFilters();
    const liveFullLayout=await fullLayout();
    await expect(fullCard.getByRole("textbox",{name:"Search activity"})).toBeDisabled();
    await expect(fullCard.getByRole("button",{name:/^Activity interface:/})).toHaveCount(0);
    await expect(fullCard.getByRole("button",{name:"Apply filters",exact:true})).toBeDisabled();
    await expect(fullCard.getByTestId("activity-history-actions")).toHaveCount(0);
    await noOverflow();
    await capture("live-guest-all-activity-"+width);
    const categories=page.getByRole("navigation",{name:"Activity categories"});
    await expect(categories.locator('[aria-disabled="true"]')).toHaveCount(5);
    await categories.getByRole("link",{name:"Device & Access",exact:true}).click();
    await expect(page).toHaveURL(url=>url.searchParams.get("tab")==="access");
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await page.goto(view(guestHref,true,{range:"all",tab:"searches"}));
    await expect(page.getByText("This filter is unavailable for a temporary guest session.")).toBeVisible();
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    await page.getByRole("link",{name:"Reset filters"}).click();
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await page.getByRole("link",{name:"Back to Activity"}).click();
    await expect(page).toHaveURL(url=>url.pathname===guestPath);

    await page.goto(base+registeredHref);
    await directorySelected();
    await expect(page).toHaveURL(url=>url.searchParams.get("range")==="today");
    await expect(card.locator("[data-activity-id]")).toHaveCount(0);
    // Fixed October fixtures remain historical. Exercise their complete
    // display through an explicit All time request instead of moving dates.
    await page.goto(view(registeredHref,false,{range:"all"}));
    await expect(card.getByTestId("activity-metric-value")).toHaveCount(6);
    await expect(card.locator('[data-testid="activity-metric"][href]')).toHaveCount(6);
    const accountLayout=await layout();
    assert.equal(liveLayout.wrapper,accountLayout.wrapper,"temporary guests retain the same workspace frame");
    assert.deepEqual(accountLayout.facts,["Joined","Last seen","Recorded actions in period"]);
    assert.equal(accountLayout.labels.length,6,"recorded accounts retain measured activity metrics");
    await capture("registered-comparison-"+width);
    await card.getByRole("link",{name:"View all activity"}).click();
    await expect(page).toHaveURL(url=>url.pathname===new URL(registeredHref,base).pathname+"/all");
    await openFilters();
    const registeredFullLayout={...liveFullLayout,
      filters:liveFullLayout.filters.replace("repeat(3,","repeat(4,"),
      filterCols:liveFullLayout.filterCols+(width>=1024?1:0)};
    assert.deepEqual(await fullLayout(),registeredFullLayout,"shared full workspace with the registered Interface filter at "+width);
    await expectActivityFilterLayout(page,"Registered activity from Online Users at "+width,{showInterface:true});
    await expect(fullCard.getByRole("textbox",{name:"Search activity"})).toBeEnabled();
    await expect(fullCard.getByRole("button",{name:"Apply filters",exact:true})).toBeEnabled();
    await expect(fullCard.getByRole("navigation",{name:"Activity categories"}).getByRole("link")).toHaveCount(7);
    await expect(fullCard.getByRole("link",{name:"Device & Access history",exact:true})).toHaveCount(0);
    await expect(fullCard.getByRole("link",{name:"Pages visited history",exact:true})).toHaveCount(0);
    await noOverflow();
    await capture("registered-all-activity-"+width);
    for(const [liveHref,id,source] of [
      [visitorHref,"qa-page-history-guest","Consented guest"],
      [operationalHref,"12345678-1234-4123-8123-123456789abc","Essential guest session"],
    ]){
      const operational=source==="Essential guest session";
      const recordedPath="/admin/users/guest/"+id+"/activity";
      await page.goto(base+liveHref);
      await expect(page).toHaveURL(url=>url.pathname===recordedPath&&url.searchParams.get("range")==="today"&&url.searchParams.get("usersReturn")==="/admin/users/online");
      await expect(card.locator("[data-activity-id]")).toHaveCount(0);
      await page.goto(view(liveHref,false,{range:"all"}));
      await expect(page).toHaveURL(url=>url.pathname===recordedPath&&url.searchParams.get("range")==="all"&&url.searchParams.get("usersReturn")==="/admin/users/online");
      await directorySelected();
      await expect(card.getByText(source,{exact:true})).toBeVisible();
      await expect(card.locator("[data-activity-id]")).toHaveCount(operational?3:5);
      await expect(card.getByTestId("activity-metric-value")).toHaveText(operational?["2","—","—","1","—","—"]:["5","2","5","1","6","0"]);
      const guestLayout=await layout();
      assert.equal(guestLayout.facts[0],operational?"First recorded activity":"Identity created");
      assert.deepEqual({...guestLayout,facts:["Joined","Last seen","Recorded actions in period"]},accountLayout,"shared recorded-guest overview at "+width);
      await expect(card.getByRole("link",{name:"Device & Access history",exact:true})).toBeVisible();
      await capture("linked-guest-"+(operational?"operational":"visitor")+"-"+width);
      await card.getByRole("link",{name:"View all activity"}).click();
      await expect(page).toHaveURL(url=>url.pathname===recordedPath+"/all");
      await openFilters();
      assert.deepEqual(await fullLayout(),liveFullLayout,"shared recorded-guest full workspace at "+width);
      await expect(fullCard.getByRole("textbox",{name:"Search activity"})).toBeEnabled();
      await expect(fullCard.getByRole("button",{name:/^Activity interface:/})).toHaveCount(0);
      await expect(fullCard.getByTestId("activity-history-actions")).toHaveCount(0);
      await expect(fullCard.getByRole("navigation",{name:"Activity categories"}).locator('[aria-disabled="true"]')).toHaveCount(operational?3:0);
      await noOverflow();
    }
    await page.goto(view(operationalHref,true,{range:"all",tab:"searches",product:"FLIGHT",stage:"SEARCH_COMPLETED"}));
    await expect(page).toHaveURL(url=>url.pathname==="/admin/users/guest/12345678-1234-4123-8123-123456789abc/activity/all"&&url.searchParams.get("tab")==="searches"&&url.searchParams.get("product")==="FLIGHT"&&url.searchParams.get("stage")==="SEARCH_COMPLETED");
    await expect(page.locator("[data-activity-id]")).toHaveCount(1);
    await page.goto(base+otherHref);
    await directorySelected();
    await expect(card.getByTestId("live-guest-location")).toHaveText("Current location: Unavailable");
    await expect(card.getByRole("region",{name:"Latest device and access"})).toContainText("iOS app");
    await expect(card.getByText("Nigeria",{exact:true})).toHaveCount(0);
    const invalid="Z".repeat(43);
    await page.goto(base+"/admin/users/live-guest/"+invalid+"/activity");
    await expect(card.getByText("This live guest session is no longer available or cannot be verified.")).toBeVisible();
    await expect(card.locator("[data-activity-id]")).toHaveCount(0);
    await expect(card.getByText("Nigeria",{exact:true})).toHaveCount(0);
    await expect(card.getByRole("link",{name:"View all activity"})).toHaveCount(0);
    await page.goto(base+"/admin/users/live-guest/"+invalid+"/activity/all");
    await expect(fullCard.getByRole("status")).toHaveText("This live guest session is no longer available or cannot be verified.");
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"Activity categories"}).locator('[aria-disabled="true"]')).toHaveCount(7);
    const reference=guestPath.split("/").at(-2);
    await page.goto(base+"/admin/users/online/guest/"+reference);
    await expect(page).toHaveURL(url=>url.pathname===guestPath);
    await directorySelected();
    console.log("PASS live/recorded guest coverage, shared workspaces, origin links and expired references",width);
  }

  // A filtered Online report remains the exact origin after both Activity views.
  await page.setViewportSize({width:1280,height:900});
  const origin="/admin/users/online?type=guest&platform=android&q=Nigeria";
  await page.goto(base+origin);
  await expect(page.getByTestId("online-user-row")).toHaveCount(1);
  await page.getByTestId("online-user-row").getByRole("link",{name:"View activity",exact:true}).click();
  await expect(page).toHaveURL(url=>url.pathname.endsWith("/12345678-1234-4123-8123-123456789abc/activity"));
  await card.getByRole("link",{name:"View all activity"}).click();
  await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
  await page.getByRole("navigation",{name:"Breadcrumb"}).getByRole("link",{name:"Online Users",exact:true}).click();
  await expect(page).toHaveURL(url=>url.pathname==="/admin/users/online"&&url.searchParams.get("type")==="guest"&&url.searchParams.get("platform")==="android"&&url.searchParams.get("q")==="Nigeria");
  await expect(page.getByTestId("online-user-row")).toHaveCount(1);
  console.log("PASS filtered Online Users origin survives Activity and full-history navigation");
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
