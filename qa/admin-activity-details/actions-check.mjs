import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
assert.ok(base && output, "Use the isolated labelled Activity QA fixture");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
const page = await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(25000);
const errors = [];
page.on("pageerror",e=>errors.push(e.message));
try {
  for (const width of [1280,320]) {
    await page.setViewportSize({width,height:900});
    for (const kind of ["guest","user"]) {
      const id = kind === "guest" ? "qa-guest-activity-0001" : "qa-registered-0001";
      const path = "/admin/users/"+kind+"/"+id+"/activity?range=all";
      await page.goto(base+path);
      await expect(page.getByTestId("activity-overview")).toBeVisible();
      await expect(page.getByTestId("activity-journey-row")).toHaveCount(5);
      await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
      await expect(page.locator("[data-activity-id]")).toHaveCount(0);
      const links = page.getByRole("link",{name:/^View journey for /});
      await expect(links).toHaveCount(5);
      const journeys = await links.evaluateAll(nodes=>nodes.map(link=>link.getAttribute("href")));
      assert.equal(new Set(journeys.map(link=>new URL(link,base).pathname)).size,5,"One journey navigation per true record");
      assert.ok(journeys.every(link=>{
        const target=new URL(link,base);
        return target.searchParams.get("from")==="1970-01-01T00:00:00.000Z"
          && target.searchParams.get("environment")==="staging";
      }),"Every journey shows its full chronology, not a summarized date slice");
      const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1);
      assert.equal(overflow,false,"Activity summary must fit "+width+"px");
      await page.screenshot({path:output+"/activity-summary-"+kind+"-"+width+".png",fullPage:true});
      const other = "/admin/users/"+kind+"/"+id+"/other?range=all";
      assert.ok(other.includes("/other?"));
      await page.goto(base+other);
      await expect(page.getByRole("heading",{name:"Other recorded activity"})).toBeVisible();
      await expect(page.locator("[data-activity-id]")).toHaveCount(1);
      await expect(page.getByText("Price alert created")).toBeVisible();
      await page.getByRole("link",{name:"Back to Activity"}).click();
      await expect(page).toHaveURL(/\/activity\?/);
      await expect(page.getByTestId("activity-overview")).toBeVisible();
      console.log("PASS summary and full other activity",kind,width);
    }
  }
  for(const kind of ["guest","user"]) {
    await page.goto(base+"/admin/users/"+kind+"/qa-complete-history-0001/activity?range=all");
    await expect(page.getByTestId("activity-journey-row")).toHaveCount(0);
    await expect(page.getByTestId("activity-other-row")).toHaveCount(0);
    await expect(page.locator("[data-activity-id]")).toHaveCount(0);
    const other = "/admin/users/"+kind+"/qa-complete-history-0001/other?range=all";
    await page.goto(base+other);
    await expect(page.locator("[data-activity-id]")).toHaveCount(1005);
    const ids=await page.locator("[data-activity-id]").evaluateAll(nodes=>nodes.map(n=>n.dataset.activityId));
    assert.equal(new Set(ids).size,1005,"Complete other-event history is not truncated");
    assert.equal(ids[0],"s-qa-complete-0000");
    assert.equal(ids.at(-1),"s-qa-complete-1004");
    console.log("PASS complete separate non-journey event history",kind);
  }
  assert.deepEqual(errors,[],"No browser exceptions");
} finally { await browser.close(); }
