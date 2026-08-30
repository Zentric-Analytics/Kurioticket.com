import { expect, test } from "@playwright/test";
import { writeArtifact } from "../helpers/artifacts";
import { collectSafariDiagnostics, installViewportEventRecorder, readViewportEvents } from "../helpers/safariDiagnostics";

const carsResults = "/cars/results?pickupLocation=LAX%20Airport&dropoffLocation=LAX%20Airport&pickupDate=2026-09-10&pickupTime=10%3A00&dropoffDate=2026-09-12&dropoffTime=10%3A00&driverAge=42";

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
    await page.getByRole("button", { name: /back/i }).first().click();
    await expect(picker).toBeHidden();
    const returned = await collectSafariDiagnostics(page, `returned-from-${name}`);
    expect(returned.rects.dialog.top).toBeCloseTo(secondOpen.rects.dialog.top, 0);
    expect(returned.rects.dialog.bottom).toBeCloseTo(secondOpen.rects.dialog.bottom, 0);
    nestedPickerReturns.push({ name, returned });
  }

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  const afterDownwardGesture = await collectSafariDiagnostics(page, "after-downward-scroll-input");
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(500);
  const afterUpwardGesture = await collectSafariDiagnostics(page, "after-upward-scroll-input");

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
