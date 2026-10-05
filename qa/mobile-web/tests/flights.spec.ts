import { expect, test } from "@playwright/test";
import { collectSafariDiagnostics } from "../helpers/safariDiagnostics";
import { writeArtifact } from "../helpers/artifacts";

const flightResults = process.env.QA_FLIGHT_RESULTS_PATH ?? "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-11-13&returnDate=2026-11-15&adults=1&children=0&infants=0&travelers=1&cabinClass=economy";

for (const width of [320, 360, 390, 412]) {
  test(`Flight Results contains horizontal rails without document overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(flightResults, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-flight-results-main]")).toBeVisible();
    await expect(page.locator("[data-flight-mobile-results-shortcuts]")).toBeVisible();
    await expect(page.locator('[data-nearby-fare-presentation="mobile"]')).toBeVisible();
    await expect(page.locator("[data-flight-price-alert-row]")).toBeVisible();
    const mobileResults = page.locator("[data-mobile-paginated-flight-results]");
    await expect(mobileResults.locator("[data-flight-results-card-list]")).toBeVisible();
    const pagination = mobileResults.getByRole("navigation", { name: "Flight results pages" });
    await expect(page.locator("footer")).toBeVisible();

    const measurements = await page.evaluate(() => {
      const dateRail = document.querySelector<HTMLElement>('[data-nearby-fare-presentation="mobile"] > div');
      const quickRail = document.querySelector<HTMLElement>("[data-mobile-flight-shortcuts]");
      const filterChip = quickRail?.querySelector<HTMLElement>("button");
      const priceAlert = document.querySelector<HTMLElement>("[data-flight-price-alert-row]")?.firstElementChild;
      const resultsFound = document.querySelector<HTMLElement>("[data-mobile-flight-results-summary-row]");
      const mobileResults = document.querySelector<HTMLElement>("[data-mobile-paginated-flight-results]");
      const flightCard = mobileResults?.querySelector<HTMLElement>("[data-flight-results-card-list]")?.firstElementChild;
      const pagination = mobileResults?.querySelector<HTMLElement>('[aria-label="Flight results pages"]');
      const footer = document.querySelector<HTMLElement>("footer");
      if (!dateRail || !quickRail || !filterChip || !(priceAlert instanceof HTMLElement) || !resultsFound || !(flightCard instanceof HTMLElement) || !footer) {
        throw new Error("Expected mobile Flight Results rails and result geometry");
      }
      const scrollRail = (rail: HTMLElement) => {
        rail.scrollLeft = 0;
        const before = rail.scrollLeft;
        rail.scrollLeft = Math.min(40, rail.scrollWidth - rail.clientWidth);
        return { before, after: rail.scrollLeft, scrollWidth: rail.scrollWidth, clientWidth: rail.clientWidth };
      };
      return {
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        filterRail: quickRail.getBoundingClientRect().toJSON(),
        dateRailBounds: dateRail.getBoundingClientRect().toJSON(),
        filterChip: filterChip.getBoundingClientRect().toJSON(),
        priceAlert: priceAlert.getBoundingClientRect().toJSON(),
        resultsFound: resultsFound.getBoundingClientRect().toJSON(),
        flightCard: flightCard.getBoundingClientRect().toJSON(),
        paginationPresent: Boolean(pagination),
        resultsToFooterGap:
          footer.getBoundingClientRect().top -
          (pagination?.getBoundingClientRect().bottom ?? flightCard.getBoundingClientRect().bottom),
        dateRail: scrollRail(dateRail),
        quickRail: scrollRail(quickRail),
      };
    });

    expect(measurements.document).toBeLessThanOrEqual(measurements.viewport);
    expect(measurements.body).toBeLessThanOrEqual(measurements.viewport);
    expect(measurements.filterRail.bottom).toBeLessThanOrEqual(measurements.dateRailBounds.top);
    expect(measurements.filterChip.left).toBeCloseTo(12, 0);
    expect(measurements.priceAlert.left).toBeCloseTo(4, 0);
    expect(measurements.priceAlert.right).toBeCloseTo(width - 4, 0);
    expect(measurements.resultsFound.left).toBeCloseTo(12, 0);
    expect(measurements.flightCard.left).toBeCloseTo(4, 0);
    expect(measurements.flightCard.right).toBeCloseTo(width - 4, 0);
    expect(measurements.resultsToFooterGap).toBeGreaterThanOrEqual(24);
    expect(measurements.resultsToFooterGap).toBeLessThanOrEqual(32);
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
  const modifySearch = page.locator("[data-flight-mobile-summary-card]");
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

for (const width of [320, 390]) {
  test(`Flight mobile header remains single and usable before/after scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(flightResults, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-flight-results-main]")).toBeVisible();
    const navbar = page.locator("[data-mobile-results-navbar]");
    const summary = navbar.locator("[data-flight-mobile-summary-card]");
    await expect(navbar).toHaveCount(1);
    await expect(summary).toContainText("SFO → LAX");
    await expect(summary).toContainText(/Round.trip/);
    await expect(summary).toContainText(/1 adult/);
    await expect(summary).toContainText(/Economy/i);
    await expect(navbar.getByRole("link", { name: "Kurioticket home" })).toBeVisible();
    await expect(navbar.getByRole("link", { name: /sign in/i })).toBeVisible();
    const controls = await navbar.locator("a, button").evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, height: rect.height };
    }));
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    await navbar.getByRole("button", { name: /open.*menu/i }).click();
    await expect(page.locator("#mobile-menu-drawer")).toBeVisible();
    await navbar.getByRole("button", { name: /close.*menu/i }).click();
    await summary.click();
    await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
    await page.getByRole("button", { name: /close edit search/i }).click();
    await page.locator("[data-flight-mobile-results-shortcuts]").getByRole("button", { name: /open filters/i }).click();
    await expect(page.getByRole("dialog", { name: /filters/i })).toBeVisible();
    await page.locator("#flight-mobile-filters-dialog").getByRole("button", { name: /close filters/i }).click();
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(summary).toBeInViewport();
    await expect(page.locator("[data-mobile-results-navbar]")).toHaveCount(1);
    await expect(page.locator("[data-flight-results-compact-header]")).toHaveCount(0);
    await summary.click();
    await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
    await page.getByRole("button", { name: /close edit search/i }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
