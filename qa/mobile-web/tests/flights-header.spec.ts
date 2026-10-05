import { expect, test } from "@playwright/test";

const flightResults = "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-11-13&returnDate=2026-11-15&adults=1&children=0&infants=0&travelers=1&cabinClass=economy";

for (const width of [320, 360, 390, 412]) {
  test(`Flight mobile filters precede dates without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(flightResults, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-flight-mobile-results-shortcuts]")).toBeVisible();
    await expect(page.locator('[data-nearby-fare-presentation="mobile"]')).toBeVisible();
    const bounds = await page.evaluate(() => {
      const filters = document.querySelector<HTMLElement>("[data-flight-mobile-results-shortcuts]")!;
      const dates = document.querySelector<HTMLElement>('[data-nearby-fare-presentation="mobile"]')!;
      const navbar = document.querySelector<HTMLElement>("[data-mobile-results-navbar]")!;
      const rails = [document.querySelector<HTMLElement>("[data-mobile-flight-shortcuts]")!, dates.firstElementChild as HTMLElement];
      return {
        headerBottom: navbar.getBoundingClientRect().bottom,
        filterTop: filters.getBoundingClientRect().top,
        filterBottom: filters.getBoundingClientRect().bottom,
        dateTop: dates.getBoundingClientRect().top,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        rails: rails.map(rail => {
          rail.scrollLeft = 0;
          const top = rail.getBoundingClientRect().top;
          rail.scrollLeft = 40;
          return { distance: rail.scrollLeft, topShift: rail.getBoundingClientRect().top - top };
        }),
      };
    });
    expect(bounds.headerBottom).toBeLessThanOrEqual(bounds.filterTop);
    expect(bounds.filterBottom).toBeLessThanOrEqual(bounds.dateTop);
    expect(bounds.overflow).toBeLessThanOrEqual(0);
    for (const rail of bounds.rails) {
      expect(rail.distance).toBeGreaterThan(0);
      expect(rail.topShift).toBe(0);
    }
  });
}

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
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }));
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    for (const control of controls.slice(-2)) expect(control.width).toBeGreaterThanOrEqual(44);
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
    const scrollBeforeEdit = await page.evaluate(() => scrollY);
    await summary.focus();
    await summary.press("Enter");
    await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
    await expect(summary).toHaveAttribute("inert", "");
    await expect(summary).toHaveAttribute("aria-hidden", "true");
    await expect(summary).not.toBeFocused();
    await page.getByRole("button", { name: /close edit search/i }).click();
    await expect(summary).toBeFocused();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollBeforeEdit);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
