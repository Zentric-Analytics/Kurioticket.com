import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
assert.ok(base && output, "Use the isolated labelled Activity QA fixture");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({headless:true,args:["--no-sandbox"],executablePath:process.env.ADMIN_ACTIVITY_QA_CHROMIUM});
const page = await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",message=>{
  if(message.type()==="error" && /hydration failed|a tree hydrated but some attributes/i.test(message.text())) errors.push(message.text());
});
try {
  for (const width of [1280,320]) {
    await page.setViewportSize({width,height:900});
    for (const kind of ["guest","user"]) {
      const id = kind === "guest" ? "qa-guest-activity-0001" : "qa-registered-0001";
      const path = "/admin/users/"+kind+"/"+id+"/activity?range=all";
      await page.goto(base+path);

      await expect(page.getByTestId("unified-activity-list")).toBeVisible();
      await expect(page.locator('[data-activity-id]')).toHaveCount(5);
      await expect(page.getByRole("link",{name:/View journey history/i})).toHaveCount(0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      // Preserve server-rendered input attributes while hydration may settle.
      await page.screenshot({caret:"initial",path:output+"/activity-summary-"+kind+"-"+width+".png",fullPage:true});
      await page.getByRole("link",{name:"View all activity"}).click();
      await expect(page).toHaveURL(u=>u.pathname.endsWith("/activity/all"));
      await expect(page.getByText("Price alert created")).toBeVisible();
      await expect(page.getByRole("link",{name:/View journey history/i})).toBeVisible();
      const ids=await page.locator("[data-activity-id]").evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId));
      assert.equal(new Set(ids).size,ids.length);
      const timestamps=await page.locator("[data-activity-id] time").evaluateAll(nodes=>nodes.map(n=>Date.parse(n.dateTime)));
      assert.ok(timestamps.every((at,i)=>i===0||at<=timestamps[i-1]));
      if(kind==="user") {
        await expect(page.locator('[data-activity-id="d-qa-fixture-access"]')).toHaveCount(0);
        const accessTab=page.getByRole("navigation",{name:"Activity categories"}).getByRole("link",{name:"Device & Access",exact:true});
        await accessTab.click();
        await expect(accessTab).toHaveAttribute("aria-current","page");
        await expect(page).toHaveURL(u=>u.searchParams.get("tab")==="access");
        await expect(page.locator("[data-activity-id]")).toHaveCount(1);
        await expect(page.getByRole("button",{name:/Activity product/})).toHaveCount(0);
        await expect(page.getByRole("button",{name:/Activity type/})).toHaveCount(0);
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.getByRole("link",{name:"Back to Activity",exact:true}).click();
      await expect(page).toHaveURL(/\/activity\?/);
      await expect(page.getByTestId("unified-activity-list")).toBeVisible();
      console.log("PASS summary and full other activity",kind,width);
    }
  }
  for(const kind of ["guest","user"]) {
    await page.goto(base+"/admin/users/"+kind+"/qa-complete-history-0001/activity?range=all");

    await expect(page.locator('[data-activity-id^="s-qa-complete-"]')).toHaveCount(5);
    await page.getByRole("link",{name:"View all activity"}).click();
    // Traverse every page, not merely a representative first page.
    const ids=[];
    for(let n=0;n<51;n++){
      const rows=page.locator("[data-activity-id]");
      await expect(rows).toHaveCount(n===50?5:20);
      await expect(rows.first()).toHaveAttribute("data-activity-id","s-qa-complete-"+String(n*20).padStart(4,"0"));
      ids.push(...await rows.evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId)));
      const older=page.getByRole("link",{name:"Next page",exact:true});
      if(n===50){await expect(older).toHaveCount(0);break;}
      const next=await older.getAttribute("href");
      await older.click();
      await expect(page).toHaveURL(u=>u.pathname+u.search===next);
    }
    assert.equal(ids.length,1005);
    assert.equal(new Set(ids).size,1005,"Complete unified history is neither truncated nor duplicated");
    assert.equal(ids[0],"s-qa-complete-0000");
    assert.equal(ids.at(-1),"s-qa-complete-1004");
    console.log("PASS complete separate non-journey event history",kind);
  }
  assert.deepEqual(errors,[],"No browser exceptions");
} finally { await browser.close(); }
