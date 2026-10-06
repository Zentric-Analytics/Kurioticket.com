import { expect, test } from "@playwright/test";

const flightResults = "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-11-13&returnDate=2026-11-15&adults=1&children=0&infants=0&travelers=1&cabinClass=economy";

test.beforeEach(async ({ page, request }) => {
  await page.route("**/api/flights/search", async (route) => {
    const response = await request.post("http://127.0.0.1:3011/api/flights/search");
    await route.fulfill({ response });
  });
});

for (const width of [320, 360, 390, 412]) {
  test(`Flight mobile filters stay inside the header without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(flightResults, { waitUntil: "domcontentloaded" });

    const header = page.locator("[data-app-header]");
    const navbar = header.locator("[data-mobile-results-navbar]");
    const filterNavbar = header.locator("[data-mobile-results-filter-navbar]");
    const filters = filterNavbar.locator("[data-flight-mobile-results-shortcuts]");
    const dates = page.locator('[data-nearby-fare-presentation="mobile"]');

    await expect(header).toBeVisible();
    await expect(navbar).toBeVisible();
    await expect(filterNavbar).toBeVisible();
    await expect(filters).toBeVisible();
    await expect(dates).toBeVisible();

    const initial = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>("[data-app-header]")!;
      const navbar = header.querySelector<HTMLElement>("[data-mobile-results-navbar]")!;
      const filterNavbar = header.querySelector<HTMLElement>("[data-mobile-results-filter-navbar]")!;
      const filters = filterNavbar.querySelector<HTMLElement>("[data-flight-mobile-results-shortcuts]")!;
      const dates = document.querySelector<HTMLElement>('[data-nearby-fare-presentation="mobile"]')!;
      const quickRail = document.querySelector<HTMLElement>("[data-mobile-flight-shortcuts]")!;
      const dateRail = dates.firstElementChild as HTMLElement;

      const headerRect = header.getBoundingClientRect();
      const navbarRect = navbar.getBoundingClientRect();
      const filterNavbarRect = filterNavbar.getBoundingClientRect();
      const filterRect = filters.getBoundingClientRect();
      const dateRect = dates.getBoundingClientRect();

      const scrollRail = (rail: HTMLElement) => {
        rail.scrollLeft = 0;
        const top = rail.getBoundingClientRect().top;
        rail.scrollLeft = Math.min(40, Math.max(0, rail.scrollWidth - rail.clientWidth));
        return { distance: rail.scrollLeft, topShift: rail.getBoundingClientRect().top - top };
      };

      return {
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        navbarBottom: navbarRect.bottom,
        filterNavbarTop: filterNavbarRect.top,
        filterNavbarBottom: filterNavbarRect.bottom,
        filterTop: filterRect.top,
        filterBottom: filterRect.bottom,
        dateTop: dateRect.top,
        filterOffsetFromHeader: filterRect.top - headerRect.top,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        quickRail: scrollRail(quickRail),
        dateRail: scrollRail(dateRail),
      };
    });

    expect(Math.abs(initial.filterNavbarTop - initial.navbarBottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(initial.filterNavbarBottom - initial.headerBottom)).toBeLessThanOrEqual(1);
    expect(initial.filterBottom).toBeLessThanOrEqual(initial.headerBottom);
    expect(initial.headerBottom).toBeLessThanOrEqual(initial.dateTop);
    expect(initial.overflow).toBeLessThanOrEqual(0);
    expect(initial.quickRail.distance).toBeGreaterThan(0);
    expect(initial.quickRail.topShift).toBe(0);
    expect(initial.dateRail.distance).toBeGreaterThan(0);
    expect(initial.dateRail.topShift).toBe(0);

    for (const scrollTop of [240, 640, 600, 760]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTop);
      const sample = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>("[data-app-header]")!;
        const filters = header.querySelector<HTMLElement>("[data-flight-mobile-results-shortcuts]")!;
        const filterNavbar = header.querySelector<HTMLElement>("[data-mobile-results-filter-navbar]")!;
        const headerRect = header.getBoundingClientRect();
        const filterRect = filters.getBoundingClientRect();
        const filterNavbarRect = filterNavbar.getBoundingClientRect();
        return {
          headerTop: headerRect.top,
          headerBottom: headerRect.bottom,
          filterTop: filterRect.top,
          filterNavbarBottom: filterNavbarRect.bottom,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        };
      });

      expect(Math.abs((sample.filterTop - sample.headerTop) - initial.filterOffsetFromHeader)).toBeLessThanOrEqual(1);
      expect(Math.abs(sample.filterNavbarBottom - sample.headerBottom)).toBeLessThanOrEqual(1);
      expect(sample.overflow).toBeLessThanOrEqual(0);
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
    const homeAction = navbar.getByRole("link", { name: "Kurioticket home" });
    await expect(homeAction).toBeVisible();
    await expect(homeAction).toHaveAttribute("href", "/");
    await expect(homeAction).toHaveAttribute("data-flight-results-mobile-home", "true");
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
    await expect(page.locator("[data-mobile-results-filter-navbar]")).toHaveCount(0);
    await navbar.getByRole("button", { name: /close.*menu/i }).click();
    await expect(page.locator("[data-mobile-results-filter-navbar]")).toBeVisible();
    await summary.click();
    await expect(page.locator("[data-mobile-results-overlay-root]")).toBeVisible();
    await page.getByRole("button", { name: /close edit search/i }).click();
    await page.locator("[data-flight-mobile-results-shortcuts]").getByRole("button", { name: /open filters/i }).click();
    await expect(page.getByRole("dialog", { name: /filters/i })).toBeVisible();
    await page.locator("#flight-mobile-filters-dialog").getByRole("button", { name: /close filters/i }).click();
    await expect(page.locator("#flight-mobile-filters-dialog")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.position)).not.toBe("fixed");
    const targetScroll = await page.evaluate(() =>
      Math.min(800, Math.max(0, document.documentElement.scrollHeight - innerHeight)),
    );
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), targetScroll);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(targetScroll);
    await expect(summary).toBeInViewport();
    await expect(page.locator("[data-mobile-results-navbar]")).toHaveCount(1);
    await expect(page.locator("[data-mobile-results-filter-navbar]")).toBeInViewport();
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
