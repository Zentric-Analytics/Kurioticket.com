import { Builder } from "selenium-webdriver";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const repoRoot = resolve(import.meta.dirname, "../../..");
loadEnv({ path: resolve(repoRoot, ".env.browserstack.local"), quiet: true });
const userName = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
if (!userName || !accessKey) throw new Error("BrowserStack credentials are not configured");

const artifacts = resolve(repoRoot, "qa/mobile-web/artifacts");
await mkdir(artifacts, { recursive: true });
const carsUrl = "https://staging.kurioticket.com/cars/results?pickupLocation=LAX%20Airport&dropoffLocation=LAX%20Airport&pickupDate=2026-09-10&pickupTime=10%3A00&dropoffDate=2026-09-12&dropoffTime=10%3A00&driverAge=42";
const options = {
  browserName: "safari",
  "bstack:options": {
    userName,
    accessKey,
    deviceName: "iPhone 16 Pro",
    osVersion: "18",
    realMobile: true,
    deviceOrientation: "portrait",
    projectName: "Kurioticket mobile web",
    buildName: "Real iOS Safari toolbar diagnostics",
    sessionName: "Cars native Safari toolbar states",
    debug: true,
    networkLogs: true,
  },
};

const driver = await new Builder()
  .usingServer("https://hub-cloud.browserstack.com/wd/hub")
  .withCapabilities(options)
  .build();

const diagnosticScript = (label) => `
  const probe = unit => { const e=document.createElement('div'); e.style.cssText='position:fixed;visibility:hidden;height:'+unit; document.body.append(e); const h=e.getBoundingClientRect().height; e.remove(); return h; };
  const rect = selector => { const r=document.querySelector(selector)?.getBoundingClientRect(); return r ? {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height} : null; };
  const root=getComputedStyle(document.documentElement), body=getComputedStyle(document.body);
  return JSON.stringify({label:${JSON.stringify(label)},innerHeight,innerWidth,outerHeight,outerWidth,scrollY,visualViewport:visualViewport&&{height:visualViewport.height,width:visualViewport.width,offsetTop:visualViewport.offsetTop,pageTop:visualViewport.pageTop,scale:visualViewport.scale},units:{vh:probe('100vh'),svh:probe('100svh'),dvh:probe('100dvh'),lvh:probe('100lvh')},rects:{overlay:rect('[data-mobile-results-overlay-root]'),sheet:rect('[data-mobile-results-edit-sheet] [role=dialog]'),continuation:rect('[data-mobile-results-sheet-bottom-continuation]')},colors:{html:root.backgroundColor,body:body.backgroundColor,theme:document.querySelector('meta[name="theme-color"]')?.content||null,activeCanvas:root.getPropertyValue('--mobile-results-overlay-active-canvas').trim()}});
`;
const measure = async label => JSON.parse(await driver.executeScript(diagnosticScript(label)));
const screenshot = async name => writeFile(resolve(artifacts, name), await driver.takeScreenshot(), "base64");
const swipe = async (fromY, toY) => driver.actions({ bridge: true })
  .move({ x: 201, y: fromY, origin: "viewport" })
  .press()
  .move({ x: 201, y: toY, origin: "viewport", duration: 700 })
  .release()
  .perform();

try {
  await driver.get(carsUrl);
  await driver.sleep(2500);
  const session = JSON.parse(await driver.executeScript('browserstack_executor: {"action":"getSessionDetails"}'));
  const samples = [await measure("initial")];
  await swipe(560, 180);
  await driver.sleep(800);
  samples.push(await measure("after-native-swipe-up"));
  await driver.executeScript("const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Modify search')); if(!b) throw new Error('Modify search not found'); b.click();");
  await driver.sleep(400);
  samples.push(await measure("sheet-after-swipe-up"));
  await screenshot("cars-selenium-toolbar-up.png");
  await driver.executeScript("document.querySelector('[data-mobile-results-edit-sheet] button[aria-label*=Close]')?.click()");
  await swipe(180, 560);
  await driver.sleep(800);
  samples.push(await measure("after-native-swipe-down"));
  await driver.executeScript("const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Modify search')); if(!b) throw new Error('Modify search not found'); b.click();");
  await driver.sleep(400);
  samples.push(await measure("sheet-after-swipe-down"));
  await screenshot("cars-selenium-toolbar-down.png");
  await writeFile(resolve(artifacts, "cars-toolbar-selenium.json"), JSON.stringify({
    session: { id: session.hashed_id, device: session.device, os: session.os, osVersion: session.os_version, browser: session.browser },
    samples,
  }, null, 2));
} finally {
  await driver.quit();
}
