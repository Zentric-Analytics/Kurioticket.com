import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { writeArtifact } from "../helpers/artifacts";

const hotelResults = "/hotels/results?destination=New%20York&checkIn=2026-09-10&checkOut=2026-09-12&guests=2&rooms=1";

test("Hotels Edit Search is stable on real iOS Safari", async ({ page }, testInfo) => {
  await page.goto(hotelResults, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/results found/i).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, Math.min(1800, document.body.scrollHeight - innerHeight)));
  await page.waitForTimeout(700);
  const before = await collectSafariDiagnostics(page, "hotels-before");
  const editSearch = page.getByRole("button", { name: /edit hotel search/i }).first();
  await expect(editSearch).toBeVisible();
  await editSearch.click();
  await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
  const first = await collectSafariDiagnostics(page, "hotels-first-open");
  const screenshot = testInfo.outputPath("hotels-edit-search.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach("Hotels Edit Search", { path: screenshot, contentType: "image/png" });
  await page.getByRole("button", { name: /close edit hotel search/i }).click();
  const after = await collectSafariDiagnostics(page, "hotels-after-close");
  await writeArtifact("hotels-smoke.json", { before, first, after });
  expect(after.viewport.scrollY).toBe(before.viewport.scrollY);
});
