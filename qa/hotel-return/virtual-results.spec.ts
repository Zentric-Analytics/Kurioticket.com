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
  valueScore: index === count - 1 ? 99 : 80, travelConfidenceScore: 80, arrivalSuitabilityScore: 80, recommendationReasons: [], badges: [],
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
test("Cars cards omit the supplier-information bar and preserve View deal on mobile and desktop", async ({ page }) => {
  const result = { ...carBase, offers: carBase.offers.map(offer => ({ ...offer, suppliedFacts: [{ label: "Fuel policy", value: "Return with the supplied fuel level" }] })) };
  await page.route("**/api/cars/search", route => route.fulfill({ json: { results: [result], status: "available" } }));
  for (const viewport of [{ width: 390, height: 844 }, { width: 1365, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    await expect(card).toBeVisible();
    await expect(card.locator("[data-supplier-information]")).toHaveCount(0);
    await expect(page.getByText("Supplier information", { exact: false })).toHaveCount(0);
    await expect(card.getByText("View deal", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
});
test("Cars comparison rows stay horizontal within the existing card beside the main price on mobile and desktop", async ({ page }) => {
  const firstOffer = carBase.offers[0];
  if (!firstOffer) throw new Error("Missing test offer");

  const makeResult = (count: number) => ({
    ...carBase, id: "fixture-inline-offers",
    offers: Array.from({ length: count }, (_, index) => ({
      ...firstOffer, id: "offer-" + index, bookingProviderName: "Seller " + index,
      bookingUrl: "https://example.com/offer-" + index,
      pricePerDay: 30 + index, totalPrice: 90 + index * 3,
    })),
  });

  let offerCount = 3;
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [makeResult(offerCount)], status: "available" } }));

  for (const viewport of [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 1365, height: 900 }]) {
    await page.setViewportSize(viewport);
    let threeOfferHeight: number | null = null;

    for (const count of [3, 5]) {
      offerCount = count;
      await page.goto(routes.cars);

      const card = page.locator("[data-car-result-card-shell]").first();
      await expect(card).toBeVisible();
      const mobile = viewport.width < 640;
      const dealArea = mobile
        ? card.locator("[data-car-card-mobile-specs]")
        : card.locator('[data-region="details"]');
      const mainPrice = mobile
        ? card.locator("[data-car-card-mobile-pricing]")
        : card.locator('[data-region="pricing"]');

      const rows = dealArea.locator("[data-car-deal-provider-offer]");
      const rightSpecLabel = mobile
        ? dealArea.locator("ul").nth(1).locator("li span").first()
        : dealArea.locator("[data-car-card-desktop-primary-specs] li").nth(1).locator("span").first();
      await expect(rows).toHaveCount(count);
      const initiallyVisible = Math.min(count, mobile ? 3 : 5);
      await expect(rows.filter({ visible: true })).toHaveCount(initiallyVisible);
      if (count > initiallyVisible) {
        const more = dealArea.locator("[data-car-deal-more-offers]").filter({ visible: true });
        await expect(more).toHaveCount(1);
        await more.click();
        await expect(rows.filter({ visible: true })).toHaveCount(count);
      }
      const rightSpecRect = await rightSpecLabel.boundingBox();
      expect(rightSpecRect).not.toBeNull();
      await expect(card.locator("[data-supplier-information]")).toHaveCount(0);
      await expect(mainPrice).toBeVisible();

      const mainRect = await mainPrice.boundingBox();
      const cardRect = await card.boundingBox();
      expect(mainRect).not.toBeNull();
      expect(cardRect).not.toBeNull();

      for (let index = 0; index < count; index++) {
        const row = rows.nth(index);
        const provider = await row.locator("[data-car-deal-provider-name]").boundingBox();
        const price = await row.locator("[data-car-deal-provider-price]").boundingBox();
        const link = await row.locator("[data-car-deal-provider-view-deal]").boundingBox();
        const rowRect = await row.boundingBox();

        expect(provider).not.toBeNull();
        expect(price).not.toBeNull();
        expect(link).not.toBeNull();
        expect(rowRect).not.toBeNull();
        expect(provider!.x + provider!.width).toBeLessThanOrEqual(price!.x + 1);
        expect(price!.x + price!.width + 6).toBeLessThanOrEqual(link!.x + 1);
        expect(Math.abs(link!.x - rightSpecRect!.x)).toBeLessThanOrEqual(3);
        expect(Math.abs(provider!.y - link!.y)).toBeLessThan(10);
        expect(rowRect!.x + rowRect!.width).toBeLessThanOrEqual(mainRect!.x + 1);
        expect(rowRect!.y + rowRect!.height).toBeLessThanOrEqual(cardRect!.y + cardRect!.height + 1);
      }
      if (count === 3) threeOfferHeight = cardRect!.height;
      else expect(cardRect!.height).toBeGreaterThanOrEqual(threeOfferHeight!);
    }
  }
});


test("KAYAK Cars with seven distinct rates stay compact and reveal exact offer terms without a details page", async ({ page }) => {
  const firstOffer = carBase.offers[0];
  if (!firstOffer) throw new Error("Missing car offer");
  const result = {
    ...carBase,
    id: "kayak-sandbox:fixture-rate-options",
    inventorySource: "kayak-sandbox" as const,
    offers: Array.from({ length: 7 }, (_, index) => ({
      ...firstOffer,
      id: "option-" + index,
      bookingProviderName: index < 2 ? "Same Seller" : "Seller " + index,
      bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
      pricePerDay: 50 + index,
      totalPrice: 150 + index * 3,
      suppliedFacts: [
        { label: "payment Type", value: index % 2 === 0 ? "prepay" : "payAtPickup" },
        { label: "Pickup · address", value: "Airport Pickup " + index },
        { label: "policy · fuel · code", value: "fullToFull" },
      ],
    })),
  };
  await page.route("**/api/cars/search", route => route.fulfill({ json: { results: [result], status: "available" } }));
  for (const viewport of [{ width: 390, height: 844 }, { width: 1365, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    await expect(card).toBeVisible();
    const mobile = viewport.width < 640;
    const area = mobile ? card.locator("[data-car-card-mobile-specs]") : card.locator('[data-region="details"]');
    const rows = area.locator("[data-car-deal-provider-offer]");
    const main = mobile ? card.locator("[data-car-card-mobile-pricing]") : card.locator('[data-region="pricing"]');
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ visible: true })).toHaveCount(mobile ? 3 : 5);
    await expect(main).toBeVisible();
    await expect(area.locator("[data-car-rate-terms]")).toHaveCount(0);
    await expect(area.getByText("Rate details", { exact: true })).toHaveCount(0);
    const initialHeight = (await card.boundingBox())!.height;
    await area.locator("[data-car-deal-more-offers]").filter({ visible: true }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(initialHeight);

    const firstInfo = rows.first().locator("[data-car-rate-info]");
    await expect(firstInfo).toBeVisible();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await firstInfo.click();
    const dialog = card.locator("[data-car-rate-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 0", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 1", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Estimated total:", { exact: false })).toBeVisible();
    await expect(dialog.locator("[data-car-rate-section=payment]")).toBeVisible();
    await dialog.getByRole("button", { name: "Close rate details" }).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await rows.nth(1).locator("[data-car-rate-info]").click();
    await expect(dialog.getByText("Airport Pickup 1", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 0", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(main).toBeVisible();
    if (!mobile) {
      const image = card.locator('[data-region="image"] > div').first();
      const imageRect = await image.boundingBox();
      expect(imageRect).not.toBeNull();
      expect(imageRect!.height).toBeLessThanOrEqual(230);
    }
  }
});

test("customer Hotel Details does not append the generic KAYAK supplier-information box", async ({ page }) => {
  await page.route("**/api/hotels/details?**", route => route.fulfill({ json: {
    hotel: hotels[0], propertyDetails: null, roomOptions: [], relatedHotels: [],
    providerDetails: { source: "KAYAK", overview: { policies: [{ label: "Check-in", value: "After 3 PM" }], selfRated: false }, reviews: { quotes: [{ label: "Guest quote", value: "Great location supplied by provider" }] } },
  } }));
  await page.goto(`/hotels/details/${encodeURIComponent(hotels[0].id)}?destination=London&checkIn=${date}&checkOut=2030-11-21&guests=1&rooms=1`);
  await expect(page.locator("[data-supplier-information]")).toHaveCount(0);
  await expect(page.getByText("Property information supplied by KAYAK", { exact: true })).toHaveCount(0);
});
for (const vertical of ["hotels", "flights", "cars"] as const) {
  test(`${vertical} keeps all results reachable with bounded mounted cards`, async ({ page }, testInfo) => {
    const started = Date.now();
    await page.goto(routes[vertical]);
    const list = page.locator("[data-virtual-results]");
    await expect(list).toHaveCount(1);
    await expect(list).toHaveAttribute("data-total-results", String(count));
    await expect.poll(() => list.locator("[data-virtual-index]").count()).toBeGreaterThan(0);
    expect(await list.locator("[data-virtual-index]").count()).toBeLessThan(30);
    await expect.poll(() => list.locator('[data-virtual-index]').evaluateAll(rows =>
      rows.every(row => getComputedStyle(row).transform === 'none'))).toBe(true);
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

test("hotel filters and sorting can find an offer that was never mounted", async ({ page }) => {
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
  // Restoring a larger inventory whose first key is unchanged must not read
  // beyond the previous one-item measurement snapshot during effect cleanup.
  await page.getByPlaceholder('Search properties').filter({ visible: true }).first().fill('Fixture Hotel 0');
  await expect(list).toHaveAttribute('data-total-results', '1');
  await page.getByPlaceholder('Search properties').filter({ visible: true }).first().fill('');
  await expect(list).toHaveAttribute('data-total-results', String(count));
  await page.getByRole('button', { name: /^Sort by / }).click();
  await page.getByRole('option', { name: 'Best value', exact: true }).click();
  await expect(list.locator('[data-virtual-index="0"]')).toHaveAttribute('data-result-key', `kayak-sandbox:fixture:${count - 1}`);
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
  for (let step = 0; step < 300 && reached > 0; step++) {
    await page.keyboard.press('Shift+Tab');
    reached = await page.evaluate(() => Number(document.activeElement?.closest<HTMLElement>('[data-virtual-index]')?.dataset.virtualIndex ?? -1));
    expect(reached).toBeGreaterThanOrEqual(0);
  }
  expect(reached).toBe(0);
  expect(await list.locator('[data-virtual-index]').count()).toBeLessThan(30);
});
