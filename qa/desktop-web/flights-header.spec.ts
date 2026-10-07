import { expect, test } from "@playwright/test";

// Use next month's dates so the route and calendar remain valid on every run.
// UTC matches the browser timezone configured for this suite.
const now = new Date();
const departure = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 22));
const returning = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 22));
const departureDate = departure.toISOString().slice(0, 10);
const returnDate = returning.toISOString().slice(0, 10);
const selectedDepartureDate = `${departureDate.slice(0, 7)}-23`;
const selectedReturnDate = `${departureDate.slice(0, 7)}-24`;
const calendarMonth = departure.getUTCMonth() + 1;
const resultsUrl = `/flights/results?${new URLSearchParams({
  tripType: "round-trip",
  origin: "LOS",
  destination: "DXB",
  departureDate,
  returnDate,
  adults: "1",
  children: "0",
  infants: "0",
  travelers: "1",
  cabinClass: "economy",
})}`;
const formSelector = "[data-flight-results-nav-search-form]";

test.beforeEach(async ({ page, request }) => {
  // Optional local transport for environments that truncate large dev chunks.
  // Read the exact generated assets; application code and assertions stay unchanged.
  if (process.env.QA_LOCAL_CHUNKS) {
    await page.route("http://127.0.0.1:3010/_next/static/**", async route => {
      const { readFile } = await import("node:fs/promises");
      const pathname = new URL(route.request().url()).pathname;
      try {
        const body = await readFile(`.next/dev/${pathname.replace("/_next/", "")}`);
        await route.fulfill({ body, contentType: pathname.endsWith(".js") ? "application/javascript" : pathname.endsWith(".css") ? "text/css" : "application/octet-stream" });
      } catch { await route.continue(); }
    });
  }
  await page.route("**/api/flights/search", async (route) => {
    const response = await request.post("http://127.0.0.1:3011/api/flights/search");
    await route.fulfill({ response });
  });
});

for (const width of [1024, 1100, 1280, 1440]) {
  test(`desktop header alignment and dropdown affordances at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(resultsUrl);
    const form = page.locator(formSelector);
    await expect(form).toBeVisible();
    const origin = form.locator("[data-flight-results-header-origin]");
    const destination = form.locator("[data-flight-results-header-destination]");
    await expect(origin).toHaveValue("Lagos");
    await expect(destination).toHaveValue("Dubai");
    for (const input of [origin, destination]) {
      expect(await input.evaluate(el => getComputedStyle(el).textAlign)).toBe("left");
      expect(await input.evaluate(el => getComputedStyle(el).paddingLeft)).toBe("8px");
    }
    const controls = form.locator("[data-flight-results-header-trip], [data-flight-results-compact-route], [data-flight-results-header-dates], [data-flight-results-header-travelers], button[type=submit]");
    const geometry = await controls.evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }));
    expect(geometry).toHaveLength(5);
    for (const rect of geometry) {
      expect(rect.height).toBe(40);
      expect(rect.top).toBe(geometry[0].top);
    }
    for (const selector of ["trip", "travelers"]) {
      const trigger = form.locator(`[data-flight-results-header-${selector}]`);
      await expect(trigger.locator("svg.lucide-chevron-down")).toBeVisible();
      const layout = await trigger.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const children = Array.from(el.children).map(child => child.getBoundingClientRect());
        return {
          justify: getComputedStyle(el).justifyContent,
          leftInset: children[0].left - rect.left,
          right: rect.right,
          children: children.map(child => ({ left: child.left, right: child.right, centerY: child.top + child.height / 2 })),
          centerY: rect.top + rect.height / 2,
        };
      });
      expect(layout.justify).toBe("flex-start");
      expect(layout.leftInset).toBeGreaterThanOrEqual(4);
      expect(layout.leftInset).toBeLessThanOrEqual(11);
      for (const [index, child] of layout.children.entries()) {
        expect(child.right).toBeLessThanOrEqual(layout.right - 3);
        expect(Math.abs(child.centerY - layout.centerY)).toBeLessThanOrEqual(1);
        if (index) expect(child.left).toBeGreaterThanOrEqual(layout.children[index - 1].right);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await origin.click();
    await form.locator("[data-flight-results-header-origin-clear]").click();
    await expect(origin).toHaveValue("");
    expect(await origin.evaluate(el => getComputedStyle(el).textAlign)).toBe("left");
    expect(await origin.evaluate(el => getComputedStyle(el).paddingLeft)).toBe("8px");
    await expect(destination).toHaveValue("Dubai");
  });
}

test("desktop search retains swap, trip, travelers, calendar and submission", async ({ page }) => {
  await page.goto(resultsUrl);
  const form = page.locator(formSelector);
  await expect(form).toBeVisible();
  const origin = form.locator("[data-flight-results-header-origin]");
  const destination = form.locator("[data-flight-results-header-destination]");
  await form.getByRole("button", { name: "Swap origin and destination" }).click();
  await expect(origin).toHaveValue("Dubai");
  await expect(destination).toHaveValue("Lagos");
  await form.getByRole("button", { name: "Swap origin and destination" }).click();
  await expect(origin).toHaveValue("Lagos");
  await expect(destination).toHaveValue("Dubai");

  const trip = form.locator("[data-flight-results-header-trip]");
  await trip.click();
  await form.getByRole("option", { name: "One-way", exact: true }).click();
  await expect(trip).toHaveText("One-way");
  await trip.click();
  await form.getByRole("option", { name: "Multi-city", exact: true }).click();
  await expect(page.locator("[data-sticky-multicity-editor]")).toBeVisible();
  await trip.click();
  await form.getByRole("option", { name: "Round-trip", exact: true }).click();
  await expect(trip).toHaveText("Round-trip");

  const travelers = form.locator("[data-flight-results-header-travelers]");
  await travelers.click();
  const travelerDialog = page.locator("#flight-traveler-cabin-popover");
  await expect(travelerDialog).toBeVisible();
  await travelerDialog.getByRole("button", { name: "Increase adults" }).click();
  await travelerDialog.getByRole("button", { name: "Business", exact: true }).click();
  await expect(travelerDialog.getByRole("button", { name: "Business", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(travelers).toContainText("2");
  await page.keyboard.press("Escape");
  await expect(travelerDialog).toBeHidden();

  const dates = form.locator("[data-flight-results-header-dates]");
  await dates.click();
  const calendar = page.locator("#flight-date-picker-popover");
  await expect(calendar).toBeVisible();
  await calendar.getByRole("button", { name: "23", exact: true }).first().click();
  await calendar.getByRole("button", { name: "24", exact: true }).first().click();
  await expect(dates).toContainText(`${calendarMonth}/23`);
  await expect(dates).toContainText(`${calendarMonth}/24`);
  await page.keyboard.press("Escape");
  await form.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("departureDate") === selectedDepartureDate);
  const params = new URL(page.url()).searchParams;
  expect(params.get("origin")).toBe("LOS");
  expect(params.get("destination")).toBe("DXB");
  expect(params.get("tripType")).toBe("round-trip");
  expect(params.get("returnDate")).toBe(selectedReturnDate);
  expect(params.get("adults")).toBe("2");
  expect(params.get("cabinClass")).toBe("business");
});

test("desktop editor closes at the mobile breakpoint", async ({ page }) => {
  await page.goto(resultsUrl);
  const form = page.locator(formSelector);
  await expect(form).toBeVisible();
  await form.locator("[data-flight-results-header-travelers]").click();
  await expect(page.locator("#flight-traveler-cabin-popover")).toBeVisible();
  await page.setViewportSize({ width: 1023, height: 900 });
  await expect(form).toBeHidden();
  await expect(page.locator("#flight-traveler-cabin-popover")).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(form).toBeHidden();
  await expect(page.locator("[data-flight-mobile-summary-card]")).toBeVisible();
  await expect(page.locator("[data-flight-mobile-summary-card]")).toContainText("LOS → DXB");
});
