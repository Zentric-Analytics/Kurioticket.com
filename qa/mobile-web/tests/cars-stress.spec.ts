import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { writeArtifact } from "../helpers/artifacts";

const carsResults = "/cars/results?pickupLocation=LAX%20Airport&dropoffLocation=LAX%20Airport&pickupDate=2026-09-10&pickupTime=10%3A00&dropoffDate=2026-09-12&dropoffTime=10%3A00&driverAge=42";

test("Cars Edit Search remains stable for 20 consecutive real-Safari cycles", async ({ page }) => {
  await page.goto(carsResults, { waitUntil: "domcontentloaded" });
  const records: unknown[] = [];
  for (let cycle = 1; cycle <= 20; cycle += 1) {
    // The compact Results header is activated only after the page-level search
    // summary has scrolled away. Keep the first half close to that threshold
    // while still exercising the real compact "Modify search" control.
    const targetY = cycle <= 10 ? 600 : 1700;
    await page.evaluate((y) => window.scrollTo(0, y), targetY);
    await page.waitForTimeout(500);
    const modify = page.getByRole("button", { name: /modify search/i }).first();
    await expect(modify).toBeVisible();
    const before = await collectSafariDiagnostics(page, `cycle-${cycle}-before`);
    await modify.click();
    const overlay = page.locator("[data-mobile-results-overlay-root]");
    await expect(overlay).toBeVisible();
    const open = await collectSafariDiagnostics(page, `cycle-${cycle}-open`);
    expect(open.rects.dialog.bottom).toBeCloseTo(open.viewport.innerHeight, 0);
    expect(open.rects.continuation.top).toBeLessThanOrEqual(open.viewport.innerHeight);
    if (cycle % 2 === 0) {
      await page.getByRole("button", { name: /close edit search/i }).click();
    } else {
      // BrowserStack's Playwright transport for real iOS does not synthesize
      // pointerdown for touchscreen.tap(). Dispatch the same event here; the
      // separate Selenium runner covers the physical native-tap path.
      await overlay.evaluate((element) => {
        element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      });
    }
    await expect(overlay).toBeHidden();
    const after = await collectSafariDiagnostics(page, `cycle-${cycle}-after`);
    expect(after.viewport.scrollY).toBe(before.viewport.scrollY);
    records.push({ cycle, before, open, after });
  }
  await writeArtifact("cars-20-cycles.json", records);
});
