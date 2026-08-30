import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { prepareResults, resultsProducts, type ResultsProduct } from "../helpers/resultsAudit";

for (const product of Object.keys(resultsProducts) as ResultsProduct[]) {
  test(`${product} Edit Search is stable across repeated local mobile opens`, async ({ page }, testInfo) => {
    const launcher = await prepareResults(page, product, 1800);
    const initialScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const openSamples = [];

    const cycles = testInfo.project.name === "chromium-393" ? 10 : 2;
    for (let cycle = 1; cycle <= cycles; cycle += 1) {
      await launcher.click();
      const overlay = page.locator("[data-mobile-results-overlay-root]");
      await expect(overlay).toBeVisible();
      const dialog = overlay.getByRole("dialog");
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      if (cycle === 1) {
        await page.screenshot({ path: testInfo.outputPath(`${product}-first-visible-frame.png`), fullPage: false });
      }
      await page.waitForTimeout(250);
      const sample = await collectSafariDiagnostics(page, `${product}-cycle-${cycle}`);
      expect(sample.document.bodyScrollWidth).toBeLessThanOrEqual(sample.viewport.innerWidth);
      expect(sample.rects.dialog.left).toBeGreaterThanOrEqual(0);
      expect(sample.rects.dialog.right).toBeLessThanOrEqual(sample.viewport.innerWidth + 1);
      expect(sample.rects.dialog.bottom).toBeCloseTo(sample.viewport.innerHeight, 0);
      openSamples.push(sample);

      if ([1, 2, 5, 10].includes(cycle)) {
        await page.screenshot({ path: testInfo.outputPath(`${product}-open-${cycle}.png`), fullPage: false });
      }

      if (cycle === cycles) {
        await page.keyboard.press("Escape");
      } else {
        await page.getByRole("button", { name: resultsProducts[product].close }).click();
      }
      await expect(overlay).toBeHidden();
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(initialScroll);
    }

    for (const sample of openSamples.slice(1)) {
      expect(sample.rects.dialog.top).toBeCloseTo(openSamples[0].rects.dialog.top, 0);
      expect(sample.rects.dialog.bottom).toBeCloseTo(openSamples[0].rects.dialog.bottom, 0);
      expect(sample.rects.dialog.width).toBeCloseTo(openSamples[0].rects.dialog.width, 0);
    }
  });
}
