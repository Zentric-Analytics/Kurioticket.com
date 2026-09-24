import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { writeArtifact } from "../helpers/artifacts";

const flightResults = process.env.QA_FLIGHT_RESULTS_PATH ?? "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-09-10&returnDate=2026-09-12&adults=1&children=0&infants=0&travelers=1&cabinClass=economy";

for (const width of [360, 390, 412]) {
  test(`Flight Results contains horizontal rails without document overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(flightResults, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-flight-results-main]")).toBeVisible();
    await expect(page.locator("[data-flight-mobile-results-shortcuts]")).toBeVisible();
    await expect(page.locator('[data-nearby-fare-presentation="mobile"]')).toBeVisible();

    const measurements = await page.evaluate(() => {
      const dateRail = document.querySelector<HTMLElement>('[data-nearby-fare-presentation="mobile"] > div');
      const quickRail = document.querySelector<HTMLElement>("[data-mobile-flight-shortcuts]");
      if (!dateRail || !quickRail) throw new Error("Expected both mobile Flight Results rails");
      const scrollRail = (rail: HTMLElement) => {
        const before = rail.scrollLeft;
        rail.scrollLeft = Math.min(40, rail.scrollWidth - rail.clientWidth);
        return { before, after: rail.scrollLeft, scrollWidth: rail.scrollWidth, clientWidth: rail.clientWidth };
      };
      return {
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        dateRail: scrollRail(dateRail),
        quickRail: scrollRail(quickRail),
      };
    });

    expect(measurements.document).toBeLessThanOrEqual(measurements.viewport);
    expect(measurements.body).toBeLessThanOrEqual(measurements.viewport);
    expect(measurements.dateRail.scrollWidth).toBeGreaterThan(measurements.dateRail.clientWidth);
    expect(measurements.dateRail.after).toBeGreaterThan(measurements.dateRail.before);
    expect(measurements.quickRail.scrollWidth).toBeGreaterThan(measurements.quickRail.clientWidth);
    expect(measurements.quickRail.after).toBeGreaterThan(measurements.quickRail.before);
  });
}

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
