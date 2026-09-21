import { expect, test } from "@playwright/test";
import { writeArtifact } from "../helpers/artifacts";
import { collectSafariDiagnostics, installViewportEventRecorder, readViewportEvents } from "../helpers/safariDiagnostics";

const carsResults = "/cars/results?pickupLocation=LAX%20Airport&dropoffLocation=LAX%20Airport&pickupDate=2026-09-10&pickupTime=10%3A00&dropoffDate=2026-09-12&dropoffTime=10%3A00&driverAge=42";

async function expectDocumentFrozen(page: import("@playwright/test").Page, expectedScrollY: number) {
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(expectedScrollY, 0);
  await page.mouse.wheel(0, -1200);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(expectedScrollY, 0);
}

test("Cars Edit Search records first-open, reopen, and Safari viewport geometry", async ({ page }, testInfo) => {
  await page.goto(carsResults, { waitUntil: "domcontentloaded" });
  await installViewportEventRecorder(page);
  await page.evaluate(() => window.scrollTo(0, Math.min(1600, document.body.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(800);

  const modify = page.getByRole("button", { name: /modify search/i }).first();
  await expect(modify).toBeVisible();
  const beforeFirst = await collectSafariDiagnostics(page, "before-first-open");
  await modify.click();
  const overlay = page.locator("[data-mobile-results-overlay-root]");
  await expect(overlay).toBeVisible();
  const firstOpen = await collectSafariDiagnostics(page, "first-open");
  expect(firstOpen.viewport.scrollY).toBeCloseTo(beforeFirst.viewport.scrollY, 0);
  const firstScreenshot = testInfo.outputPath("cars-first-open.png");
  await page.screenshot({ path: firstScreenshot, fullPage: false });
  await testInfo.attach("Cars first open", { path: firstScreenshot, contentType: "image/png" });

  await page.getByRole("button", { name: /close edit search/i }).click();
  await expect(overlay).toBeHidden();
  const afterFirstClose = await collectSafariDiagnostics(page, "after-first-close");
  await modify.click();
  await expect(overlay).toBeVisible();
  const secondOpen = await collectSafariDiagnostics(page, "second-open");
  const secondScreenshot = testInfo.outputPath("cars-second-open.png");
  await page.screenshot({ path: secondScreenshot, fullPage: false });
  await testInfo.attach("Cars second open", { path: secondScreenshot, contentType: "image/png" });

  const nestedPickerReturns = [];
  const groupedRows = page.locator("[data-mobile-results-edit-sheet] [data-cars-mobile-grouped-row]");
  for (const [name, index] of [["pickup-location", 0], ["rental-dates", 1], ["pickup-return-time", 2], ["driver-age", 3]] as const) {
    await groupedRows.nth(index).getByRole("button").first().click();
    const picker = page.locator("[data-flight-mobile-picker-shell]");
    await expect(picker).toBeVisible();
    const pickerOpen = await collectSafariDiagnostics(page, `open-${name}`);
    expect(pickerOpen.viewport.scrollY).toBeCloseTo(secondOpen.viewport.scrollY, 0);
    await page.getByRole("button", { name: /back/i }).first().click();
    await expect(picker).toBeHidden();
    const returned = await collectSafariDiagnostics(page, `returned-from-${name}`);
    expect(returned.rects.dialog.top).toBeCloseTo(secondOpen.rects.dialog.top, 0);
    expect(returned.rects.dialog.bottom).toBeCloseTo(secondOpen.rects.dialog.bottom, 0);
    expect(returned.viewport.scrollY).toBeCloseTo(secondOpen.viewport.scrollY, 0);
    nestedPickerReturns.push({ name, returned });
  }

  // Gesture on the backdrop, rather than the internally scrollable sheet.
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  const afterDownwardGesture = await collectSafariDiagnostics(page, "after-downward-scroll-input");
  expect(afterDownwardGesture.viewport.scrollY).toBeCloseTo(secondOpen.viewport.scrollY, 0);
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(500);
  const afterUpwardGesture = await collectSafariDiagnostics(page, "after-upward-scroll-input");
  expect(afterUpwardGesture.viewport.scrollY).toBeCloseTo(secondOpen.viewport.scrollY, 0);

  const sheetContent = page.locator(".mobile-results-sheet-content");
  const internalScroll = await sheetContent.evaluate((element) => {
    const before = element.scrollTop;
    element.scrollTop = Math.min(before + 200, element.scrollHeight - element.clientHeight);
    return { before, after: element.scrollTop, canScroll: element.scrollHeight > element.clientHeight };
  });
  if (internalScroll.canScroll) expect(internalScroll.after).toBeGreaterThan(internalScroll.before);
  const afterInternalScroll = await collectSafariDiagnostics(page, "after-sheet-internal-scroll");
  expect(afterInternalScroll.viewport.scrollY).toBeCloseTo(secondOpen.viewport.scrollY, 0);

  await page.getByRole("button", { name: /close edit search/i }).click();
  const afterSecondClose = await collectSafariDiagnostics(page, "after-second-close");
  const events = await readViewportEvents(page);
  await writeArtifact("cars-investigation.json", {
    beforeFirst,
    firstOpen,
    afterFirstClose,
    secondOpen,
    nestedPickerReturns,
    afterDownwardGesture,
    afterUpwardGesture,
    afterSecondClose,
    events,
  });

  expect(afterFirstClose.viewport.scrollY).toBe(beforeFirst.viewport.scrollY);
  expect(afterSecondClose.viewport.scrollY).toBe(beforeFirst.viewport.scrollY);
});

test("Cars full Filters and representative quick sheets freeze the document while their content scrolls", async ({ page }) => {
  await page.goto(carsResults, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, Math.min(1400, document.body.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(500);
  const originalScrollY = await page.evaluate(() => window.scrollY);
  expect(originalScrollY).toBeGreaterThan(0);

  await page.getByRole("button", { name: /^filters?$/i }).first().click();
  const fullFilters = page.locator("[data-cars-mobile-filter-shell]");
  await expect(fullFilters).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(originalScrollY, 0);
  await expectDocumentFrozen(page, originalScrollY);
  const filterScroller = fullFilters.locator(".overflow-y-auto");
  const fullFilterScroll = await filterScroller.evaluate((element) => {
    const before = element.scrollTop;
    element.scrollTop = Math.min(before + 300, element.scrollHeight - element.clientHeight);
    return { before, after: element.scrollTop, canScroll: element.scrollHeight > element.clientHeight };
  });
  expect(fullFilterScroll.canScroll).toBe(true);
  expect(fullFilterScroll.after).toBeGreaterThan(fullFilterScroll.before);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(originalScrollY, 0);
  await fullFilters.getByRole("button", { name: /close filters/i }).click();
  await expect(fullFilters).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(originalScrollY, 0);

  for (const launcher of [/sort by/i, /^price/i, /^vehicle type/i, /^transmission/i]) {
    const button = page.getByRole("button", { name: launcher }).first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const sheet = page.locator("[data-cars-quick-sheet]");
    await expect(sheet).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(originalScrollY, 0);
    await expectDocumentFrozen(page, originalScrollY);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(originalScrollY, 0);
  }
});
