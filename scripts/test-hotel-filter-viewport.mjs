/**
 * Isolated browser-layout regression for the Hotel filter scroll lock.
 * No server, provider API, sign-in, or physical phone is required.
 * Run: node scripts/test-hotel-filter-viewport.mjs
 * Optional: HOTEL_FILTER_BROWSER=webkit (requires its Playwright browser).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const engines = await import(process.env.PLAYWRIGHT_MODULE || "@playwright/test");
const name = process.env.HOTEL_FILTER_BROWSER || "chromium";
assert.ok(["chromium", "webkit", "firefox"].includes(name), "unsupported browser");
const source = readFileSync(new URL("../src/lib/search/mobileResultsScrollLock.ts", import.meta.url), "utf8");
function bundle(code) {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  return `(() => { const exports = {}; ${outputText}\nwindow.acquireLock = exports.acquireMobileResultsScrollLock; })();`;
}
const fixedBundle = bundle(source);
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { box-sizing: border-box; } html,body { margin: 0; } html { scroll-behavior: smooth; }
body { display: flex; flex-direction: column; min-height: 100vh; font-family: sans-serif; }
header { position: sticky; top: 0; z-index: 950; flex-shrink: 0; height: calc(72px + var(--safe-top, 0px)); padding-top: var(--safe-top, 0px); background: white; }
header div { display: flex; height: 72px; align-items: center; padding: 12px; }
main { flex: 1; overflow-x: clip; background: #f5f7fb; }
#rail { position: fixed; top: calc(72px + var(--safe-top, 0px)); left: 0; height: 60px; width: 100vw; z-index: 850; background: #f5f7fb; padding: 8px; }
button { min-height: 36px; } article { height: 300px; margin: 8px; border: 1px solid #ddd; background: white; padding: 20px; }
footer { height: 200px; }
#overlay { position: fixed; inset: 0; z-index: 10000; background: rgb(8 18 35 / 52%); }
#sheet { position: absolute; bottom: 12px; left: 12px; right: 12px; max-height: 45vh; overflow: auto; border-radius: 24px; background: #f2f4f8; padding: 20px; }
</style></head><body>
<header data-app-header data-hotel-results-desktop-header><div>Back | New York | Edit | Account | Menu</div></header>
<main data-mobile-web-hotel-results><div id="rail" data-hotel-results-toolbar data-scroll-pinned="true"><button>Filter</button> <button>Price</button> <button>Stars</button> <button>Facilities</button></div>
${Array.from({ length: 20 }, (_, i) => `<article id="hotel-${i}">Hotel ${i}<p>Price and amenities</p></article>`).join("")}</main>
<footer>Footer</footer><div id="overlay" hidden><section id="sheet" role="dialog" aria-modal="true" aria-label="Hotel filter"><button id="close">Close</button><h2>Room &amp; bed</h2>${"<p><input type=checkbox> Suites</p>".repeat(10)}<button>Reset</button> <button>Apply</button></section></div>
</body></html>`;
const browser = await engines[name].launch({
  headless: true,
  ...(process.env.HOTEL_FILTER_BROWSER_EXECUTABLE ? { executablePath: process.env.HOTEL_FILTER_BROWSER_EXECUTABLE } : {}),
});
let passed = 0;
async function measure(page) {
  return page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; };
    return {
      header: rect(document.querySelector("header")), rail: rect(document.querySelector("#rail")),
      card: rect(document.querySelector(window.referenceCard)),
    };
  });
}
function assertUnmoved(before, after, context) {
  for (const item of ["header", "rail", "card"]) {
    for (const key of ["top", "left", "width", "height"]) {
      assert.ok(Math.abs(before[item][key] - after[item][key]) < 0.6, `${context}: ${item}.${key}: ${before[item][key]} -> ${after[item][key]}`);
    }
  }
}
async function prepare(width, safeTop, y, code = fixedBundle) {
  const context = await browser.newContext({ viewport: { width, height: 760 }, ...(name !== "firefox" ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  await page.setContent(fixture);
  await page.addScriptTag({ content: code });
  await page.evaluate(({ safeTop, y }) => {
    document.documentElement.style.setProperty("--safe-top", `${safeTop}px`);
    window.scrollTo({ top: y, behavior: "instant" });
    const visible = [...document.querySelectorAll("article")].find(el => el.getBoundingClientRect().bottom > 160);
    window.referenceCard = `#${visible.id}`;
  }, { safeTop, y });
  await page.waitForTimeout(40);
  return { context, page };
}
try {
  for (const width of [320, 390, 639]) {
    for (const safeTop of [0, 20]) {
      for (const y of [0, 1100, 5700]) {
        for (const freezeBodyPosition of [false, true]) {
          const { context, page } = await prepare(width, safeTop, y);
          const before = await measure(page);
          const originalY = await page.evaluate(() => scrollY);
          const originalStyles = await page.evaluate(() => [document.body.style.cssText, document.querySelector("header").style.cssText]);
          for (let cycle = 0; cycle < 2; cycle++) {
            await page.evaluate(freezeBodyPosition => {
              document.querySelector("#overlay").hidden = false;
              window.releaseLock = window.acquireLock({ freezeBodyPosition });
              // Mirror the current shortcut autofocus, including its next-frame timing.
              requestAnimationFrame(() => document.querySelector("#close").focus());
            }, freezeBodyPosition);
            assertUnmoved(before, await measure(page), "opening");
            await page.waitForTimeout(60);
            assertUnmoved(before, await measure(page), "after autofocus");
            await page.mouse.move(100, 170);
            await page.mouse.wheel(0, 350);
            await page.waitForTimeout(60);
            assertUnmoved(before, await measure(page), "background wheel locked");
            await page.evaluate(() => { window.nestedRelease = window.acquireLock(); window.releaseLock(); });
            assertUnmoved(before, await measure(page), "nested lock still active");
            await page.evaluate(() => {
              window.nestedRelease(); window.nestedRelease(); window.releaseLock();
              document.querySelector("#overlay").hidden = true;
            });
            await page.waitForTimeout(40);
            assertUnmoved(before, await measure(page), "closing");
            assert.equal(await page.evaluate(() => scrollY), originalY, "close restores original document scroll");
            assert.deepEqual(await page.evaluate(() => [document.body.style.cssText, document.querySelector("header").style.cssText]), originalStyles);
            assert.equal(await page.locator("header").count(), 1, "no duplicate navbar or placeholder");
          }
          passed++;
          await context.close();
        }
      }
    }
  }
  console.log(`${name}: ${passed} viewport/lock combinations passed (two open/close cycles each).`);
} finally { await browser.close(); }
