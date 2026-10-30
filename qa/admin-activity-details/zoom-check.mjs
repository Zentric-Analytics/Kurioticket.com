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
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(Math.round((await page.viewportSize()).width / zoom));
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
        await expect.poll(() => page.evaluate(() => {
          const identity = document.querySelector('section[aria-label="Customer identity"] > div');
          const summary = document.querySelector('section[aria-label="Activity summary"] > div');
          return getComputedStyle(identity).gridTemplateColumns === getComputedStyle(summary).gridTemplateColumns;
        })).toBe(true);
        const layout = await page.evaluate(() => {
          const identity = document.querySelector('section[aria-label="Customer identity"] > div');
          const facts = [...document.querySelectorAll('section[aria-label="Customer identity"] dl > div')];
          const metrics = [...document.querySelectorAll('[data-testid="activity-metric-label"]')];
          const email = identity.firstElementChild.querySelector('p');
          const heading = document.querySelector('section[aria-label="Activity summary"] h2');
          const headingRight = Math.max(heading.getBoundingClientRect().right, heading.parentElement.querySelector("button")?.getBoundingClientRect().right || 0);
          const metric = metrics[0].parentElement.getBoundingClientRect();
          return {overflow:document.documentElement.scrollWidth > innerWidth+1,
            horizontal:facts.every(fact => fact.getBoundingClientRect().top < identity.firstElementChild.getBoundingClientRect().bottom),
            aligned:facts.every((fact,i) => Math.abs(fact.getBoundingClientRect().x-metrics[i].parentElement.getBoundingClientRect().x)<1),
            emailFits: !email || email.getBoundingClientRect().height < parseFloat(getComputedStyle(email).fontSize)*1.9,
            headingGap: metric.left-headingRight,
            values:[...document.querySelectorAll('section[aria-label="Customer identity"] dd,[data-testid="activity-metric-value"]')].map(el=>getComputedStyle(el).fontSize)};
        });
        assert.equal(layout.overflow,false);
        assert.equal(layout.horizontal,true);
        assert.equal(layout.aligned,true);
        assert.equal(layout.emailFits,true);
        assert.ok(layout.headingGap >= 8 && layout.headingGap <= 32, JSON.stringify({width,zoom,kind,...layout}));
        assert.deepEqual(layout.values,Array(6).fill("16px"));
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
