import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expectActivityFilterLayout } from "./activity-filter-layout.mjs";
const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const extension = await mkdtemp(path.join(os.tmpdir(), "kt-zoom-extension-"));
await writeFile(path.join(extension,"manifest.json"), JSON.stringify({manifest_version:3,name:"Activity QA zoom",version:"1.0",permissions:["tabs"],background:{service_worker:"worker.js"}}));
await writeFile(path.join(extension,"worker.js"), 'chrome.runtime.onInstalled.addListener(() => {});');
const context = await chromium.launchPersistentContext("", {channel:"chromium",headless:true,viewport:{width:1280,height:900},args:["--no-sandbox","--disable-extensions-except="+extension,"--load-extension="+extension],executablePath:process.env.ADMIN_ACTIVITY_QA_CHROMIUM});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  const page = await context.newPage();
  const capture = await context.newCDPSession(page);
  const applyZoom = async zoom => {
    const applied = await worker.evaluate(async ({url,zoom}) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(tab => tab.url === url);
      await chrome.tabs.setZoom(tab.id,zoom);
      return chrome.tabs.getZoom(tab.id);
    }, {url:page.url(),zoom});
    assert.ok(Math.abs(applied-zoom)<0.001,"Real Chromium tab zoom applied");
    const expectedWidth = (await page.viewportSize()).width / zoom;
    // Chromium rounds fractional CSS viewport widths down at some zoom factors.
    await expect.poll(async () => Math.abs(await page.evaluate(() => innerWidth) - expectedWidth)).toBeLessThanOrEqual(1);
  };
  const screenshot = async (name,zoom) => {
    await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
    const bounds = await capture.send("Page.getLayoutMetrics");
    const shot = await capture.send("Page.captureScreenshot", {format:"png",captureBeyondViewport:true,
      clip:{x:0,y:0,width:bounds.contentSize.width,height:bounds.contentSize.height,scale:1/zoom}});
    await writeFile(output+"/"+name+".png",Buffer.from(shot.data,"base64"));
  };
  for (const width of [1280,1440,1536]) {
    await page.setViewportSize({width,height:900});
    for (const zoom of [1,0.9,0.8,0.75,1.1]) {
      for (const kind of ["guest","user"]) {
        // Compare the retained historical records at every zoom. Today and
        // its empty fixed-date fixture are tested in the navigation suite.
        await page.goto(base+"/admin/users/"+kind+"/"+(kind === "guest" ? "qa-guest-activity-0001" : "qa-realistic-identity-0001")+"/activity?range=all");
        await applyZoom(zoom);

        const layout=await page.evaluate(()=>{
          const identity=document.querySelector('section[aria-label="Customer identity"]');
          const grid=identity.querySelector('[data-testid="activity-identity-facts"]');
          const summary=document.querySelector('section[aria-label="Activity summary"]');
          const metrics=[...summary.querySelectorAll('[data-testid="activity-metric"]')];
          const facts=[...grid.children];
          const factRects=facts.map(element=>element.getBoundingClientRect());
          const metricRects=metrics.map(el=>el.getBoundingClientRect());
          const cols=innerWidth>=1280?6:3;
          const dates=facts.slice(0,2).map(f=>f.querySelector("time")).filter(Boolean);
          return {
            overflow:document.documentElement.scrollWidth>innerWidth+1,
            metricsCount:metrics.length,
            summaryHeading:summary.querySelector("h2")?.textContent==="Activity overview",
            evenlySpaced:metricRects.every((m,i)=>Math.abs(m.width-metricRects[0].width)<2&&Math.abs(m.top-metricRects[Math.floor(i/cols)*cols].top)<2),
            alignedFacts:factRects.every(rect=>Math.abs(rect.top-factRects[0].top)<2&&Math.abs(rect.width-factRects[0].width)<2),
            separatedSections:identity.getBoundingClientRect().bottom<=summary.getBoundingClientRect().top+2,
            datesUnwrapped:dates.every(t=>t.getBoundingClientRect().height<parseFloat(getComputedStyle(t).lineHeight||"24")*1.5),
            values:[...document.querySelectorAll('section[aria-label="Customer identity"] dd,[data-testid="activity-metric-value"]')].map(el=>getComputedStyle(el).fontSize)
          };
        });
        assert.equal(layout.overflow,false,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.metricsCount,6,JSON.stringify(layout));
        for(const key of ["summaryHeading","evenlySpaced","alignedFacts","separatedSections","datesUnwrapped"])
          assert.equal(layout[key],true,JSON.stringify({width,zoom,kind,...layout}));
        assert.deepEqual(layout.values,[...Array(3).fill("14px"),...Array(6).fill("20px")]);
        await screenshot(`after-activity-${kind}-${width}-zoom-${Math.round(zoom*100)}`,zoom);
      }
      await page.goto(base+"/admin/users/user/qa-realistic-identity-0001/activity/all?range=all");
      await applyZoom(zoom);
      await expectActivityFilterLayout(page, `All activity ${width}px at ${Math.round(zoom*100)}% zoom`, { showInterface: true });
      await screenshot(`all-activity-filters-${width}-zoom-${Math.round(zoom*100)}`,zoom);
      await page.goto(base+"/before?kind=user");
      await applyZoom(zoom);
      await screenshot(`before-activity-user-${width}-zoom-${Math.round(zoom*100)}`,zoom);
      for (const version of ["before","after"]) {
        await page.goto(base+(version === "before" ? "/before-journey" : "/admin/journeys/qa-journey-flight"));
        await applyZoom(zoom);
        if(version === "after") {
          await expect(page.locator('[data-journey-event]')).toHaveCount(4);
          await expect(page.getByRole('columnheader')).toHaveCount(4);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1),false);
          assert.equal(await page.getByRole('table').evaluate(el=>el.scrollWidth > el.clientWidth+1),false);
          await expect(page.getByText('Journey events count',{exact:true})).toBeVisible();
        }
        await screenshot(`${version}-journey-${width}-zoom-${Math.round(zoom*100)}`,zoom);
      }
      console.log("PASS actual browser zoom, both pages",width,zoom);
    }
  }
  // The new filter row also crosses the desktop and tablet boundaries at
  // real 125% and 200% zoom; test that form without repeating unrelated pages.
  await page.setViewportSize({width:1280,height:900});
  for (const zoom of [1.25,2]) {
    await page.goto(base+"/admin/users/user/qa-realistic-identity-0001/activity/all?range=all");
    await applyZoom(zoom);
    await expectActivityFilterLayout(page, `All activity 1280px at ${Math.round(zoom*100)}% zoom`, { showInterface: true });
    await screenshot(`all-activity-filters-1280-zoom-${Math.round(zoom*100)}`,zoom);
    console.log("PASS activity filters at actual browser zoom",zoom);
  }
} finally { await context.close(); }
