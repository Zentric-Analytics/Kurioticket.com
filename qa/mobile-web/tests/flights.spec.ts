import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { writeArtifact } from "../helpers/artifacts";

const flightResults = process.env.QA_FLIGHT_RESULTS_PATH ?? "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-09-10&returnDate=2026-09-12&adults=1&children=0&infants=0&travelers=1&cabinClass=economy";

test("Flights Edit Search is stable on real iOS Safari", async ({ page }, testInfo) => {
  await page.goto(flightResults, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/results found/i).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, Math.min(1800, document.body.scrollHeight - innerHeight)));
  await page.waitForTimeout(700);
  const before = await collectSafariDiagnostics(page, "flights-before");
  const modifySearch = page.getByRole("button", { name: /modify flight search/i }).first();
  await expect(modifySearch).toBeVisible();
  await modifySearch.click();
  await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
  const first = await collectSafariDiagnostics(page, "flights-first-open");
  const screenshot = testInfo.outputPath("flights-edit-search.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach("Flights Edit Search", { path: screenshot, contentType: "image/png" });
  await page.getByRole("button", { name: /close edit search/i }).click();
  const after = await collectSafariDiagnostics(page, "flights-after-close");
  await writeArtifact("flights-smoke.json", { before, first, after });
  expect(after.viewport.scrollY).toBe(before.viewport.scrollY);
});
