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
  for (const kind of ["guest","user"]) {
    await page.goto(base+"/admin/users/"+kind+"/"+(kind === "guest" ? "qa-guest-activity-0001" : "qa-registered-0001")+"/activity");
    for (const zoom of [0.9,1,1.1]) {
      const applied = await worker.evaluate(async ({url,zoom}) => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find(tab => tab.url === url);
        await chrome.tabs.setZoom(tab.id,zoom);
        return chrome.tabs.getZoom(tab.id);
      }, {url:page.url(),zoom});
      assert.ok(Math.abs(applied-zoom)<0.001,"Real Chromium tab zoom applied");
      await expect.poll(() => page.evaluate(() => {
        const identity = document.querySelector('section[aria-label="Customer identity"] > div');
        const summary = document.querySelector('section[aria-label="Activity summary"] > div');
        return getComputedStyle(identity).gridTemplateColumns === getComputedStyle(summary).gridTemplateColumns;
      })).toBe(true);
      const layout = await page.evaluate(() => {
        const facts = [...document.querySelectorAll('section[aria-label="Customer identity"] dl > div')];
        const metrics = [...document.querySelectorAll('[data-testid="activity-metric-label"]')];
        return { overflow:document.documentElement.scrollWidth > innerWidth+1,
          aligned:facts.every((fact,i) => Math.abs(fact.getBoundingClientRect().x-metrics[i].parentElement.getBoundingClientRect().x)<1),
          values:[...document.querySelectorAll('section[aria-label="Customer identity"] dd,[data-testid="activity-metric-value"]')].map(el => getComputedStyle(el).fontSize),
          viewport:innerWidth };
      });
      assert.equal(layout.overflow,false);
      assert.equal(layout.aligned,true);
      assert.deepEqual(layout.values,Array(6).fill("16px"));
      await page.screenshot({path:output+"/actual-browser-zoom-"+kind+"-"+Math.round(zoom*100)+".png",fullPage:true});
      console.log("PASS actual browser zoom",kind,zoom,layout.viewport);
    }
  }
} finally { await context.close(); }
