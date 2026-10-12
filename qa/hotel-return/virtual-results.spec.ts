import { test, expect } from "@playwright/test";
import { buildStaticCarResults } from "../../src/services/travel/staticCarResults";

const count = 3000;
const date = "2030-11-18";
const carSearch = { pickupLocation: "BOS", dropoffLocation: "BOS", pickupDate: date, pickupTime: "10:00", dropoffDate: "2030-11-21", dropoffTime: "10:00", driverAge: "18-70" };
const carBase = buildStaticCarResults(carSearch)[0];
const hotels = Array.from({ length: count }, (_, index) => ({
  id: `kayak-sandbox:fixture:${index}`, provider: "KAYAK sandbox", name: `Fixture Hotel ${index}${index === 5 ? ' with a longer property name to exercise dynamic card heights on a narrow screen' : ''}`,
  inventoryKind: "bookable", pricePerNight: 100 + index, currency: "USD", totalPrice: 100 + index,
  partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout", bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
  rating: index % 2 ? 5 : 4, location: "Test city", amenities: [], roomType: "Test room", cancellationInfo: "Test policy",
  valueScore: 80, travelConfidenceScore: 80, arrivalSuitabilityScore: 80, recommendationReasons: [], badges: [],
}));
const flights = Array.from({ length: count }, (_, index) => ({
  id: `flight-${index}`, provider: "QA Fixture", airlineName: `Fixture Air ${index}`, airlineCode: "QA",
  originAirport: "SFO", destinationAirport: "LOS", departureTime: `${date}T08:00:00Z`, arrivalTime: `${date}T20:00:00Z`,
  duration: "12h", durationMinutes: 720, stops: 0, layovers: [], cabinClass: "economy", baggageInfo: "Carry-on included",
  refundInfo: "Changes permitted", price: 100 + index, currency: "USD", bookingUrl: "", partnerRedirectUrl: "",
  valueScore: 80, riskScore: 5, comfortScore: 80, travelConfidenceScore: 80, travelEffortScore: 15,
  recommendationReasons: [], badges: [],
  legs: [{ direction: "outbound", originAirport: "SFO", destinationAirport: "LOS", departureTime: `${date}T08:00:00Z`,
    arrivalTime: `${date}T20:00:00Z`, duration: "12h", durationMinutes: 720, stops: 0, layovers: [], segments: [] }],
  searchPolicy: { source: "duffel", bookable: true, action: { kind: "internal-detail", href: `/flights/details/flight-${index}`, enabled: true } },
}));
const cars = Array.from({ length: count }, (_, index) => ({ ...carBase, id: `car-${index}`, name: `Fixture Car ${index}`, pricePerDay: 100 + index }));

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: {} }));
  await page.route("**/api/hotels/search", route => route.fulfill({ json: { results: hotels, warnings: [] } }));
  await page.route("**/api/flights/search", route => route.fulfill({ json: { results: flights, warnings: [], resultsCacheValidUntil: Date.now() + 600_000 } }));
  await page.route("**/api/cars/search", route => route.fulfill({ json: { results: cars, status: "available" } }));
});

const routes = {
  hotels: `/hotels/results?destination=London&checkIn=${date}&checkOut=2030-11-21&guests=1&rooms=1`,
  flights: `/flights/results?tripType=one-way&origin=SFO&destination=LOS&departureDate=${date}&adults=1&children=0&infants=0&travelers=1&cabinClass=economy&sort=cheapest`,
  cars: `/cars/results?${new URLSearchParams(carSearch)}`,
};
for (const vertical of ["hotels", "flights", "cars"] as const) {
  test(`${vertical} keeps all results reachable with bounded mounted cards`, async ({ page }, testInfo) => {
    const started = Date.now();
    await page.goto(routes[vertical]);
    const list = page.locator("[data-virtual-results]");
    await expect(list).toHaveCount(1);
    await expect(list).toHaveAttribute("data-total-results", String(count));
    await expect.poll(() => list.locator("[data-virtual-index]").count()).toBeGreaterThan(0);
    expect(await list.locator("[data-virtual-index]").count()).toBeLessThan(30);
    const elements = await page.locator("*").count();
    expect(elements).toBeLessThan(15_000);
    console.log(JSON.stringify({ project: testInfo.project.name, vertical, inventory: count,
      mounted: await list.locator('[data-virtual-index]').count(), elements, observedNavigationToRowsMs: Date.now() - started }));
    await page.screenshot({ path: testInfo.outputPath(`${vertical}-initial.png`) });
    await expect.poll(() => list.locator('[data-virtual-index]').evaluateAll(rows => {
      const rectangles = rows.map(row => row.getBoundingClientRect());
      return rectangles.every((rect, index) => index === 0 || rect.top >= rectangles[index - 1].bottom - 1);
    })).toBe(true);
    // Jump to the end using the same browser window scrollbar as the customer.
    await list.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + element.scrollHeight - window.innerHeight, behavior: "instant" }));
    await expect(list.locator(`[data-virtual-index="${count - 1}"]`)).toBeVisible();
    expect(await list.locator("[data-virtual-index]").count()).toBeLessThan(30);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(list.locator('[data-virtual-index="0"]')).toBeAttached();
  });
}

test("flights mount one layout when resizing between desktop and mobile", async ({ page }) => {
  await page.goto(routes.flights);
  await expect(page.locator("[data-flight-results-card-list]")).toHaveCount(1);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(page.locator("[data-flight-results-card-list]")).toHaveCount(1);
  await expect(page.locator("[data-mobile-continuous-flight-results] [data-virtual-results]")).toHaveAttribute("data-total-results", String(count));
  await page.setViewportSize({ width: 1365, height: 900 });
  await expect(page.locator("[data-flight-results-card-list]")).toHaveCount(1);
  await expect(page.locator("[data-virtual-results]")).toHaveAttribute("data-total-results", String(count));
});

test("hotel filters can find an offer that was never mounted", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.hotels);
  const list = page.locator('[data-virtual-results]');
  await expect(list).toHaveAttribute('data-total-results', String(count));
  await expect(page.getByRole('heading', { name: 'Fixture Hotel 999', exact: true })).toHaveCount(0);
  await page.getByPlaceholder('Search properties').filter({ visible: true }).first().fill('Fixture Hotel 999');
  await expect(list).toHaveAttribute('data-total-results', '1');
  await expect(page.getByRole('heading', { name: 'Fixture Hotel 999', exact: true })).toBeVisible();
  await page.getByPlaceholder('Search properties').filter({ visible: true }).first().fill('');
  await expect(list).toHaveAttribute('data-total-results', String(count));
});

test("keyboard focus reaches results beyond the initial mounted window", async ({ page }) => {
  await page.goto(routes.hotels);
  const list = page.locator('[data-virtual-results]');
  await expect(list).toHaveAttribute('data-total-results', String(count));
  await list.locator('[data-virtual-index="0"] a').first().focus();
  let reached = 0;
  // A hotel card has several independent links/actions; allow enough Tab
  // presses to traverse those controls as well as twenty complete cards.
  for (let step = 0; step < 300 && reached < 20; step++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => Number(document.activeElement?.closest<HTMLElement>('[data-virtual-index]')?.dataset.virtualIndex ?? -1));
    expect(reached).toBeGreaterThanOrEqual(0);
  }
  expect(reached).toBeGreaterThanOrEqual(20);
  expect(await list.locator('[data-virtual-index]').count()).toBeLessThan(30);
});
