import { expect, test, type Page, type Request } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { flightResultsFixture, flightResultsPath } from "../helpers/flightResultsFixture";

async function settle(page: Page) {
  // Wait for actual layout stability, including dynamic row measurements.
  await page.evaluate(() => new Promise<void>(resolve => {
    let previous = "", stable = 0;
    const frame = () => {
      const list = document.querySelector("[data-virtual-results]")!;
      const current = JSON.stringify([scrollY, list.getBoundingClientRect().height, ...Array.from(list.children, row => row.getBoundingClientRect().top)]);
      stable = current === previous ? stable + 1 : 0;
      previous = current;
      if (stable >= 4) resolve(); else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }));
}
async function geometry(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>("[data-virtual-results]")!;
    const header = document.querySelector("[data-flight-mobile-summary-card]")?.getBoundingClientRect();
    const visible = Array.from(list.querySelectorAll<HTMLElement>("[data-virtual-index]")).filter(row => {
      const rect = row.getBoundingClientRect();
      return rect.bottom > (header?.bottom ?? 0) + 80 && rect.top < innerHeight;
    });
    return { y: scrollY, x: scrollX, key: visible[0]?.dataset.resultKey, top: visible[0]?.getBoundingClientRect().top,
      count: list.dataset.totalResults, mounted: list.children.length, visible: visible.length,
      body: document.body.style.cssText, root: document.documentElement.style.cssText, overflow: document.documentElement.scrollWidth - innerWidth };
  });
}

test.beforeEach(async ({ page }) => {
  if (process.env.QA_STATIC_ROOT) await page.route("**/_next/static/**", async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    try { await route.fulfill({ body: await readFile(path.join(process.env.QA_STATIC_ROOT!, pathname.replace("/_next/", ""))), contentType: pathname.endsWith(".css") ? "text/css" : "application/javascript" }); }
    catch { await route.continue(); }
  });
  await page.route("https://**/*", route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: {} }));
  await page.route("**/api/flights/search", route => route.fulfill({ json: { results: flightResultsFixture, warnings: [], resultsCacheValidUntil: Date.now() + 600_000 } }));
});

test("cancel keeps the restored viewport visible after a toolbar-height change", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "Mobile Edit Search lifecycle");
  await page.goto(flightResultsPath);
  const list = page.locator("[data-virtual-results]");
  await expect(list).toHaveAttribute("data-total-results", "120");
  await settle(page);
  await page.evaluate(() => scrollTo({ top: 1800, behavior: "instant" })); await settle(page);
  await page.locator("[data-flight-mobile-summary-card]").click();
  await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 780 }); await settle(page);
  // Sample every frame: a later scroll/ResizeObserver must not be needed to recover.
  await page.evaluate(() => {
    Reflect.set(window, "cancelFrames", []);
    const sample = () => {
      if (document.querySelector("[data-mobile-results-overlay-root]")) return requestAnimationFrame(sample);
      const visible = Array.from(document.querySelectorAll("[data-virtual-index]")).filter(row => {
        const rect = row.getBoundingClientRect(); return rect.bottom > 180 && rect.top < innerHeight;
      }).length;
      const frames = Reflect.get(window, "cancelFrames") as number[];
      frames.push(visible);
      if (frames.length < 6) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("button", { name: /close edit search/i }).click();
  await expect.poll(() => page.evaluate(() => (Reflect.get(window, "cancelFrames") as number[]).length)).toBe(6);
  expect(await page.evaluate(() => Reflect.get(window, "cancelFrames"))).not.toContain(0);
  await expect(page.locator("[data-mobile-results-overlay-root]")).toHaveCount(0);
});

test("ten cancellations at each scroll depth preserve inventory, filters, URL, session and position", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "Mobile Edit Search lifecycle");
  const searches: string[] = [], navigations: string[] = [];
  const pendingSearches = new Set<Request>();
  page.on("request", request => {
    if (new URL(request.url()).pathname !== "/api/flights/search") return;
    searches.push(request.postData() ?? request.url()); pendingSearches.add(request);
  });
  page.on("requestfinished", request => pendingSearches.delete(request));
  page.on("requestfailed", request => pendingSearches.delete(request));
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await page.goto(flightResultsPath);
  const list = page.locator("[data-virtual-results]");
  await expect(list).toHaveAttribute("data-total-results", "120"); await settle(page);
  // Nearby-date pricing also uses the search endpoint. Finish that initial work
  // before recording the no-new-search baseline for dismissal.
  await expect.poll(async () => {
    const count = searches.length;
    await settle(page);
    return pendingSearches.size === 0 && searches.length === count;
  }).toBe(true);
  // Apply a real filter after hydration, then establish the cancel baseline.
  await page.locator("[data-mobile-flight-shortcuts]").getByRole("button", { name: "Stops", exact: true }).click();
  await page.getByRole("checkbox", { name: /Nonstop/ }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/fStop=0/);
  await expect(page.getByRole("button", { name: "Clear Stops filter" })).toBeVisible();
  await expect(page.locator("[data-mobile-continuous-flight-results]")).toHaveAttribute("aria-busy", "false");
  await settle(page);
  const url = page.url();
  const launcher = page.locator("[data-flight-mobile-summary-card]");
  const overlay = page.locator('[data-flight-edit-presentation="bottom-sheet"]');
  const session = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const filterSummary = await page.locator("[data-mobile-flight-shortcuts]").innerText();
  expect(filterSummary).toContain("Stops");
  const searchCount = searches.length, navigationCount = navigations.length;
  await list.evaluate(element => Reflect.set(window, "originalFlightList", element));
  for (const depth of [0, 1800, 6500]) {
    await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), depth); await settle(page);
    for (let cycle = 0; cycle < 10; cycle++) {
      const before = await geometry(page);
      // Keyboard activation exercises focus restoration; pointer does not steal focus.
      if (cycle === 0) { await launcher.focus(); await page.keyboard.press("Enter"); }
      else await launcher.click();
      await expect(overlay).toBeVisible();
      // Vary only viewport height to model mobile browser chrome, retaining page width.
      if (cycle % 3 === 0) await page.setViewportSize({ width: page.viewportSize()!.width, height: cycle % 2 ? 844 : 780 });
      await settle(page);
      const locked = await page.evaluate(() => ({ y: Math.max(0, -parseFloat(document.body.style.top)), x: Math.max(0, -parseFloat(document.body.style.left)) }));
      if (cycle % 3 === 0) await page.getByRole("button", { name: /close edit search/i }).click();
      else if (cycle % 3 === 1) await overlay.click({ position: { x: 2, y: 2 } });
      else await page.keyboard.press("Escape");
      await expect(overlay).toHaveCount(0); await settle(page);
      const after = await geometry(page);
      expect(after.y).toBe(locked.y); expect(after.x).toBe(locked.x);
      expect(after.y).toBe(before.y); expect(after.key).toBe(before.key); expect(after.top).toBe(before.top);
      expect(after.count).toBe("120"); expect(after.visible).toBeGreaterThan(0); expect(after.mounted).toBeLessThan(30);
      expect(after.body).not.toMatch(/position: fixed|overflow: hidden/); expect(after.root).not.toMatch(/overflow: hidden|overlay-active-canvas/);
      expect(after.overflow).toBe(0); expect(page.url()).toBe(url);
      expect(await page.locator("[data-mobile-flight-shortcuts]").innerText()).toBe(filterSummary);
      expect(searches.length).toBe(searchCount); expect(navigations.length).toBe(navigationCount);
      expect(await page.evaluate(() => document.querySelector("[data-virtual-results]") === Reflect.get(window, "originalFlightList"))).toBe(true);
      expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(session);
      if (cycle === 0) await expect(launcher).toBeFocused();
      await expect(page.locator('[data-mobile-continuous-flight-results]')).toHaveAttribute("aria-busy", "false");
      await expect(page.locator('html')).not.toHaveAttribute("data-mobile-results-overlay-open", "");
      // Reopen at the next iteration without an arbitrary delay after the close animation.
    }
  }
});

test("inner airport, date and traveler pickers release only their own lock before Edit Search cancel", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "Mobile Edit Search lifecycle");
  await page.goto(flightResultsPath);
  await expect(page.locator("[data-virtual-results]")).toHaveAttribute("data-total-results", "120"); await settle(page);
  await page.evaluate(() => scrollTo({ top: 4000, behavior: "instant" })); await settle(page);
  const before = await geometry(page);
  await page.locator("[data-flight-mobile-summary-card]").click();
  const overlay = page.locator('[data-flight-edit-presentation="bottom-sheet"]');
  await expect(overlay).toBeVisible();
  for (const field of ["origin", "dates", "travelers"]) {
    await overlay.locator(`[data-mobile-field="${field}"]`).click();
    const picker = page.locator("[data-flight-mobile-picker-shell]");
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: /^(Cancel|Back)$/ }).first().click();
    await expect(picker).toHaveCount(0);
    await expect(overlay).toBeVisible();
    expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
  }
  await page.getByRole("button", { name: /close edit search/i }).click();
  await expect(overlay).toHaveCount(0); await settle(page);
  const after = await geometry(page);
  expect(after.y).toBe(before.y); expect(after.key).toBe(before.key); expect(after.top).toBe(before.top);
  expect(after.body).toBe(before.body); expect(after.root).toBe(before.root); expect(after.visible).toBeGreaterThan(0);
  // The page must be interactive and scrollable before any reopen.
  await page.evaluate(() => scrollBy({ top: 200, behavior: "instant" })); await settle(page);
  expect((await geometry(page)).y).toBe(before.y + 200);
});

test("Back-to-top follows the card surface and retains compact square geometry and behavior", async ({ page }, testInfo) => {
  await page.goto(flightResultsPath);
  await expect(page.locator("[data-virtual-results]")).toHaveAttribute("data-total-results", "120"); await settle(page);
  const button = page.getByRole("button", { name: "Back to top", exact: true });
  await expect(button).toHaveCount(0);
  await page.evaluate(() => scrollTo({ top: 1800, behavior: "instant" })); await settle(page);
  await expect(button).toBeVisible();
  const mobile = page.viewportSize()!.width < 640;
  const surface = page.locator(mobile ? "[data-mobile-flight-card]" : "[data-flight-result-card]").filter({ visible: true }).first();
  const expectedColor = await surface.evaluate(element => getComputedStyle(element).backgroundColor);
  const style = await button.evaluate(element => { const s = getComputedStyle(element); const r = element.getBoundingClientRect(); return { bg: s.backgroundColor, radius: parseFloat(s.borderRadius), width: r.width, height: r.height, color: s.color, icon: element.querySelector("svg")?.getBoundingClientRect().width }; });
  expect(style.bg).toBe(expectedColor); expect(style.radius).toBe(12); expect(style.width).toBe(44); expect(style.height).toBe(44);
  expect(style.color).toBe("rgb(0, 75, 184)"); expect(style.icon).toBe(mobile ? 18 : 20);
  await page.screenshot({ path: testInfo.outputPath("back-to-top.png") });
  await button.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(button).toHaveCount(0);
});
