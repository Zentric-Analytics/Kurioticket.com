import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const base = process.env.ADMIN_ACTIVITY_QA_URL;
const output = process.env.ADMIN_ACTIVITY_QA_OUTPUT;
const extension = await mkdtemp(path.join(os.tmpdir(), "kt-zoom-extension-"));
await writeFile(path.join(extension,"manifest.json"), JSON.stringify({manifest_version:3,name:"Activity QA zoom",version:"1.0",permissions:["tabs"],background:{service_worker:"worker.js"}}));
await writeFile(path.join(extension,"worker.js"), 'chrome.runtime.onInstalled.addListener(() => {});');
const context = await chromium.launchPersistentContext("", {channel:"chromium",headless:true,viewport:{width:1280,height:900},args:["--no-sandbox","--disable-extensions-except="+extension,"--load-extension="+extension]});
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
    const bounds = await capture.send("Page.getLayoutMetrics");
    const shot = await capture.send("Page.captureScreenshot", {format:"png",captureBeyondViewport:true,
      clip:{x:0,y:0,width:bounds.contentSize.width,height:bounds.contentSize.height,scale:1/zoom}});
    await writeFile(output+"/"+name+".png",Buffer.from(shot.data,"base64"));
  };
  for (const width of [1280,1440,1536]) {
    await page.setViewportSize({width,height:900});
    for (const zoom of [1,0.9,0.8,0.75,1.1]) {
      for (const kind of ["guest","user"]) {
        await page.goto(base+"/admin/users/"+kind+"/"+(kind === "guest" ? "qa-guest-activity-0001" : "qa-realistic-identity-0001")+"/activity");
        await applyZoom(zoom);
        const layout = await page.evaluate(() => {
          const info = document.querySelector('[data-testid="activity-info-grid"]');
          const identity = info.querySelector('section[aria-label="Customer identity"] > div');
          const summary = info.querySelector('section[aria-label="Activity summary"]');
          const facts = [...identity.querySelectorAll('dl > div')];
          const metrics = [...info.querySelectorAll('[data-testid="activity-metric"]')];
          const metricRects = metrics.map(el=>el.getBoundingClientRect());
          const infoRect = info.getBoundingClientRect();
          const summaryRect = summary.getBoundingClientRect();
          const epsilon=2;
          const lineMatches = (el,x,top,bottom) => {
            const rect = el.getBoundingClientRect();
            return Math.abs(rect.left-x)<epsilon && Math.abs(rect.top-top)<epsilon
              && Math.abs(rect.bottom-bottom)<epsilon
              && parseFloat(getComputedStyle(el).borderLeftWidth)>0.5;
          };
          const shared = [40,60,80].map(n=>info.querySelector('[data-testid="activity-divider-'+n+'"]'));
          const lower=info.querySelector('[data-testid="activity-divider-20"]');
          const email = identity.firstElementChild.querySelector('p');
          const dates = facts.slice(0,2).map(fact => fact.querySelector("time")).filter(Boolean);
          const datesUnwrapped = dates.every(time => time.getBoundingClientRect().height < Number.parseFloat(getComputedStyle(time).lineHeight || "24")*1.5);
          return {
            overflow:document.documentElement.scrollWidth > innerWidth+1,
            horizontal:facts.every(fact => fact.getBoundingClientRect().top < identity.firstElementChild.getBoundingClientRect().bottom),
            metricsCount: metrics.length,
            noHeading: !summary.querySelector('h2'),
            evenlySpaced: metricRects.length === 5 && metricRects.every(rect=>Math.abs(rect.width-metricRects[0].width)<1 && Math.abs(rect.top-metricRects[0].top)<1),
            sharedConnected:shared.every((el,i)=>lineMatches(el,metricRects[i+2].left,infoRect.top,infoRect.bottom)),
            partialConnected:lineMatches(lower,metricRects[1].left,summaryRect.top,summaryRect.bottom),
            alignedFacts:facts.every((fact,i)=>Math.abs(fact.getBoundingClientRect().left-metricRects[i+2].left)<epsilon),
            joint:Math.abs(identity.getBoundingClientRect().bottom-summaryRect.top)<epsilon &&
              parseFloat(getComputedStyle(summary).borderTopWidth)>0.5,
            edges:parseFloat(getComputedStyle(info).borderTopWidth)>0.5 &&
              parseFloat(getComputedStyle(info).borderBottomWidth)>0.5,
            startsAtLeft: Math.abs(metricRects[0].left-infoRect.left)<epsilon,
            emailFits: !email || email.getBoundingClientRect().height < parseFloat(getComputedStyle(email).fontSize)*1.9,
            datesUnwrapped,
            values:[...document.querySelectorAll('section[aria-label="Customer identity"] dd,[data-testid="activity-metric-value"]')].map(el=>getComputedStyle(el).fontSize)
          };
        });
        assert.equal(layout.overflow,false,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.horizontal,true,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.metricsCount,5,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.noHeading,true,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.evenlySpaced,true,JSON.stringify({width,zoom,kind,...layout}));
        for (const key of ["sharedConnected","partialConnected","alignedFacts","joint","edges","startsAtLeft"])
          assert.equal(layout[key],true,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.emailFits,true,JSON.stringify({width,zoom,kind,...layout}));
        assert.equal(layout.datesUnwrapped,true,JSON.stringify({width,zoom,kind,...layout}));
        assert.deepEqual(layout.values,Array(8).fill("16px"));
        await screenshot(`after-activity-${kind}-${width}-zoom-${Math.round(zoom*100)}`,zoom);
      }
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
} finally { await context.close(); }
