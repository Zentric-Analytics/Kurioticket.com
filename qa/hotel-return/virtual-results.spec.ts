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
test("Cars desktop Hotels-details-style column includes map, filters and cards; mobile and tablet remain unwrapped", async ({ page }) => {
  await page.route("**/api/cars/search", route => route.fulfill({ json: { results: [carBase], status: "available" } }));
  for (const width of [390, 820, 1024, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(routes.cars);
    const main = page.locator("main").first();
    const column = page.locator("[data-cars-results-hotel-column]");
    const card = column.locator("[data-car-result-card-shell]").first();
    await expect(column).toBeVisible();
    await expect(card).toBeVisible();

    if (width < 1024) {
      await expect(main).toHaveCSS("background-color", width < 640 ? "rgb(245, 247, 251)" : "rgb(246, 248, 251)");
      await expect(column).toHaveCSS("border-top-width", "0px");
      await expect(column).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      continue;
    }

    await expect(main).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(main).toHaveCSS("padding-bottom", "48px");
    await expect(main).toHaveCSS("padding-top", "24px");
    await expect(column).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(column).toHaveCSS("border-color", "rgb(225, 230, 234)");
    await expect(column).toHaveCSS("border-radius", "16px");
    await expect(column).toHaveCSS("padding-left", "20px");
    await expect(column).toHaveCSS("padding-right", "20px");
    await expect(column).toHaveCSS("margin-top", "0px");
    await expect(column).toHaveCSS("padding-top", "28px");
    await expect(column).toHaveCSS("padding-bottom", "28px");

    const map = column.locator("[data-cars-results-map-preview]");
    const filters = column.locator(".desktop-filter-sidebar").first();
    const list = column.locator("[data-cars-results-card-list]");
    await expect(map).toBeVisible();
    await expect(filters).toBeVisible();
    await expect(list).toBeVisible();
    await expect(map).toHaveCSS("margin-bottom", "16px");
    const content = column.locator("[data-cars-results-content-column]");
    await expect(content).toHaveClass(/lg:space-y-5/);
    const firstRow = list.locator("[data-virtual-index]").first();
    await expect(firstRow).toHaveCSS("padding-bottom", "20px");
    const containerBox = (await column.boundingBox())!;
    const insetLeft = containerBox.x + 17;
    const insetRight = containerBox.x + containerBox.width - 17;
    for (const element of [map, filters, card]) {
      const rect = (await element.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(insetLeft);
      expect(rect.x + rect.width).toBeLessThanOrEqual(insetRight);
    }
    const mapBox = (await map.boundingBox())!;
    const filtersBox = (await filters.boundingBox())!;
    const cardBox = (await card.boundingBox())!;
    expect(filtersBox.y - (mapBox.y + mapBox.height)).toBeGreaterThanOrEqual(14);
    expect(filtersBox.y - (mapBox.y + mapBox.height)).toBeLessThanOrEqual(18);
    expect(mapBox.x + mapBox.width).toBeLessThan(cardBox.x);
  }
});


test("Cars reduced desktop column keeps count, Sort and map after moving tracking into rate details", async ({ page }) => {
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [carBase], status: "available" } }));
  for (const width of [1024, 1365, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(routes.cars);
    const column = page.locator("[data-cars-results-hotel-column]");
    const content = column.locator("[data-cars-results-content-column]");
    const summary = content.locator("[data-cars-results-summary-row]");
    const card = content.locator("[data-cars-results-card-list] [data-car-result-card-shell]").first();
    const count = summary.locator("h2").first();
    const sortLabel = summary.locator(".cars-results-desktop-sort-label");
    const sortButton = summary.locator(".cars-results-desktop-sort-trigger");
    const map = column.locator("[data-cars-results-map-preview]");
    await expect(map).toBeVisible();
    await expect(page.locator("[data-cars-price-alert]")).toHaveCount(0);
    await expect(column.locator("[data-cars-price-alert-sidebar-slot]")).toHaveCount(0);
    await expect(sortLabel).toHaveText("Sort by:");
    await expect(sortButton).toContainText("Recommended");
    const nodes = [column, content, summary, card, count, sortLabel, sortButton, map];
    const boxes = await Promise.all(nodes.map(el => el.boundingBox()));
    for (const box of boxes) expect(box).not.toBeNull();
    const [columnBox, contentBox, summaryBox, cardBox, countBox, sortLabelBox, sortBox] =
      boxes as Array<{ x: number; y: number; width: number; height: number }>;
    expect(columnBox.width).toBeLessThanOrEqual(930);
    expect(Math.abs(contentBox.width - cardBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(summaryBox.width - cardBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(summaryBox.x - cardBox.x)).toBeLessThanOrEqual(2);
    for (const box of [countBox, sortLabelBox, sortBox]) {
      expect(box.x).toBeGreaterThanOrEqual(summaryBox.x - 2);
      expect(box.x + box.width).toBeLessThanOrEqual(summaryBox.x + summaryBox.width + 2);
    }
    expect(countBox.x + countBox.width + 12).toBeLessThanOrEqual(sortLabelBox.x);
    expect(await count.evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
    expect(await sortButton.locator("span").first().evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
    await expect(card.locator('[data-region="pricing"]')).toBeHidden();
    await expect(card.locator("[data-car-card-desktop-shared-header] [data-car-card-desktop-actions] button")).toHaveCount(2);
  }
});

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


test("Cars Rate details keeps the compact tinted tracking pill on the provider row across viewports", async ({ page }) => {
  // Rate information is only exposed for KAYAK-sandbox inventory with supplier facts.
  // Do not use the static Kurioticket fixture source here: it intentionally hides the info action.
  const result = {
    ...carBase,
    id: "kayak-sandbox:rate-details-qa-fixture",
    inventorySource: "kayak-sandbox" as const,
    offers: carBase.offers.map((offer, index) => ({
      ...offer,
      id: `kayak-sandbox:rate-offer-${index}`,
      suppliedFacts: [{ label: "Mileage", value: "Unlimited mileage" }],
    })),
  };
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [result], status: "available" } }));

  for (const width of [390, 820, 1024, 1365]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(routes.cars);
    const toolbar = page.locator("[data-cars-results-toolbar]").first();
    await expect(toolbar).toHaveCSS("padding-top", width < 640 ? "24px" : "4px");
    const summary = page.locator("[data-cars-results-summary-row]").first();
    await expect(summary.locator("h2")).toBeVisible();
    if (width < 640) {
      const firstCard = page.locator("[data-cars-results-card-list] [data-car-result-card-shell]").first();
      await expect(firstCard).toBeVisible();
      const countBox = await summary.locator("h2").boundingBox();
      const cardBox = await firstCard.boundingBox();
      expect(countBox).not.toBeNull();
      expect(cardBox).not.toBeNull();
      const countToCardGap = cardBox!.y - (countBox!.y + countBox!.height);
      expect(countToCardGap).toBeGreaterThanOrEqual(6);
      expect(countToCardGap).toBeLessThanOrEqual(28);
    }
    await expect(page.locator("[data-cars-price-alert]")).toHaveCount(0);
    await expect(page.locator("[data-cars-price-alert-sidebar-slot]")).toHaveCount(0);
    const info = page.locator("[data-car-rate-info]").filter({ visible: true }).first();
    await expect(info).toBeVisible();
    await info.click();
    const dialog = page.locator("dialog[data-car-rate-dialog][open]");
    await expect(dialog).toBeVisible();
    const row = dialog.locator("[data-car-rate-provider-alert-row]");
    const provider = row.locator("p").first();
    const alert = row.locator("[data-cars-price-alert]");
    const toggle = alert.getByRole("switch");
    await expect(provider).toContainText("Booking provider ·");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Track car prices");
    await expect(alert).toHaveCSS("background-color", "rgb(238, 246, 255)");
    await expect(alert).toHaveCSS("border-radius", "10px");
    await expect(toggle).toHaveAttribute("aria-label", /Track car prices for .+ offer/);
    await expect(toggle).toBeVisible();
    await expect(dialog.locator("[data-cars-price-alert]")).toHaveCount(1);
    const track = toggle.locator('span[aria-hidden="true"]').first();
    const thumb = track.locator("span").first();
    const [providerBox, alertBox, trackBox, thumbBox, rowBox] = await Promise.all([provider, alert, track, thumb, row].map(el => el.boundingBox()));
    for (const box of [providerBox, alertBox, trackBox, thumbBox, rowBox]) expect(box).not.toBeNull();
    // The provider remains on the left, and the tinted pill is content-sized on the right.
    // The row must never become a full-width stacked bar, including on narrow phones.
    expect(providerBox!.x).toBeLessThan(alertBox!.x);
    expect(providerBox!.x + providerBox!.width).toBeLessThanOrEqual(alertBox!.x - 2);
    expect(alertBox!.x + alertBox!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 2);
    expect(alertBox!.width).toBeLessThan(rowBox!.width * 0.75);
    expect(Math.abs((providerBox!.y + providerBox!.height / 2) - (alertBox!.y + alertBox!.height / 2))).toBeLessThanOrEqual(12);
    expect(Math.abs(trackBox!.width - 44)).toBeLessThanOrEqual(1);
    expect(Math.abs(trackBox!.height - 24)).toBeLessThanOrEqual(1);
    expect(Math.abs(thumbBox!.width - 18)).toBeLessThanOrEqual(1);
    await dialog.getByRole("button", { name: "Close rate details" }).click();
    await expect(page.locator("dialog[data-car-rate-dialog][open]")).toHaveCount(0);
    await expect(page.locator("[data-cars-price-alert]")).toHaveCount(0);
  }
});

test("Cars mobile card balances category and moves four specifications underneath cancellation without crowding", async ({ page }) => {
  const offer = carBase.offers[0];
  if (!offer) throw new Error("Fixture offer missing");
  const result = {
    ...carBase, id: "mobile-spec-layout-fixture", modelName: "Chrysler Pacifica",
    categoryLabel: "MINIVAN",
    offers: [{ ...offer, id: "fixture-offer", freeCancellation: true }],
  };
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [result], status: "available" } }));

  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const info = card.locator("[data-car-card-mobile-information]");
    const specs = card.locator("[data-car-card-mobile-specs]");
    const cancellation = card.locator("[data-car-card-mobile-cancellation]");
    const category = card.locator("[data-car-card-mobile-category]");
    const name = card.locator("[data-car-card-mobile-identity] h2, [data-car-card-mobile-identity] h3").first();
    const image = card.locator("[data-car-card-mobile-image]");
    const lower = card.locator("[data-car-card-mobile-lower-band]");
    const offers = card.locator("[data-car-card-mobile-offers]");
    await expect(info).toBeVisible();
    await expect(cancellation).toBeVisible();
    await expect(specs).toBeVisible();
    await expect(specs.locator("li")).toHaveCount(4);
    await expect(offers).toBeVisible();
    await expect(lower.locator("[data-car-card-mobile-specs]")).toHaveCount(0);
    const infoRect = (await info.boundingBox())!;
    const nameRect = (await name.boundingBox())!;
    const categoryRect = (await category.boundingBox())!;
    const categoryGap = categoryRect.y - (nameRect.y + nameRect.height);
    expect(categoryGap).toBeGreaterThanOrEqual(4);
    expect(categoryGap).toBeLessThanOrEqual(11);
    const specRect = (await specs.boundingBox())!;
    const cancelRect = (await cancellation.boundingBox())!;
    const imageRect = (await image.boundingBox())!;
    const lowerRect = (await lower.boundingBox())!;
    expect(specRect.y).toBeGreaterThanOrEqual(cancelRect.y + cancelRect.height - 1);
    expect(specRect.x).toBeGreaterThanOrEqual(imageRect.x + imageRect.width - 1);
    expect(specRect.x).toBeGreaterThanOrEqual(infoRect.x - 1);
    expect(specRect.x + specRect.width).toBeLessThanOrEqual(infoRect.x + infoRect.width + 1);
    expect(specRect.y + specRect.height).toBeLessThanOrEqual(lowerRect.y + 1);
    for (const item of await specs.locator("li").all()) {
      const box = (await item.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(infoRect.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(infoRect.x + infoRect.width + 1);
    }
    await expect(card.getByText("MINIVAN", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(lower.locator("[data-car-deal-provider-offer]")).toHaveCount(1);
    await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);
  }

  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [{ ...result, offers: [{ ...result.offers[0], freeCancellation: false }] }], status: "available" } }));
  await page.goto(routes.cars);
  const noCancellation = page.locator("[data-car-result-card-shell]").first();
  await expect(noCancellation.locator("[data-car-card-mobile-cancellation]")).toHaveCount(0);
  const locationRect = (await noCancellation.locator("[data-car-card-mobile-location]").boundingBox())!;
  const specRect = (await noCancellation.locator("[data-car-card-mobile-specs]").boundingBox())!;
  expect(specRect.y).toBeGreaterThanOrEqual(locationRect.y + locationRect.height - 1);

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.cars);
  await expect(noCancellation.locator("[data-car-card-desktop-header-specs]")).toBeVisible();
  await expect(noCancellation.locator("[data-car-card-mobile-main]")).not.toBeVisible();
});


test("Cars mobile offers fill the card without a duplicate price rail and preserve accessible supplier controls", async ({ page }) => {
  const baseOffer = carBase.offers[0];
  if (!baseOffer) throw new Error("Missing fixture offer");
  const result = {
    ...carBase,
    id: "kayak-sandbox:mobile-touch-targets",
    inventorySource: "kayak-sandbox" as const,
    offers: Array.from({ length: 7 }, (_, index) => ({
      ...baseOffer,
      id: "touch-offer-" + index,
      bookingProviderName: index === 0 ? "Extra Long Rental Provider Name" : "Seller " + index,
      bookingProviderLogoUrl: index === 0 ? "/brand/kurioticket-icon-blue.svg" : undefined,
      bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
      pricePerDay: index === 6 ? 233 : 49 + index,
      totalPrice: 200 + index * 5,
      suppliedFacts: [{ label: "payment Type", value: "payAtPickup" }],
    })),
  };
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [result], status: "available" } }));

  for (const width of [320, 375, 390, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const offers = card.locator("[data-car-card-mobile-offers]");
    const band = card.locator("[data-car-card-mobile-lower-band]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toContainText("+4 more offers");
    await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);

    await expect(rows.first()).toHaveCSS("min-height", "36px"); // The mobile web row metrics remain unchanged.
    const toggleTextSize = await toggle.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(toggleTextSize).toBeGreaterThanOrEqual(10);
    expect(toggleTextSize).toBeLessThanOrEqual(12);
    const bandRect = (await band.boundingBox())!;
    const initialOffersRect = (await offers.boundingBox())!;
    const originalOffersWidth = initialOffersRect.width;
    expect(initialOffersRect.width).toBeGreaterThan(bandRect.width - 3);
    expect(Math.abs(initialOffersRect.x + initialOffersRect.width - (bandRect.x + bandRect.width))).toBeLessThanOrEqual(2);
    const row = rows.first();
    const name = row.locator("[data-car-deal-provider-name]");
    const price = row.locator("[data-car-deal-provider-price]");
    const viewDeal = row.locator("[data-car-deal-provider-view-deal]");
    const info = row.locator("[data-car-rate-info]");
    const nameRect = (await name.boundingBox())!;
    const priceRect = (await price.boundingBox())!;
    const linkRect = (await viewDeal.boundingBox())!;
    const infoRect = (await info.boundingBox())!;

    for (const [locator, actualSize] of [[name, "12px"], [price, "13px"], [viewDeal, "13px"]] as const) {
      await expect(locator).toHaveCSS("font-size", actualSize);
    }
    const day = price.locator("[data-car-deal-provider-per-day]");
    const amount = price.locator("[data-car-deal-price-amount]");
    const baseline = price.locator("[data-car-deal-price-baseline]");
    await expect(day).toHaveCSS("font-size", "11px");
    await expect(price).toHaveCSS("height", "36px");
    await expect(price).toHaveCSS("align-items", "center");
    await expect(baseline).toHaveCSS("align-items", "baseline");
    await expect(info).toHaveCSS("align-self", "center");
    await expect(info).toHaveCSS("justify-self", "center");
    const centerY = (box: { y: number; height: number }) => box.y + box.height / 2;
    const infoGlyphBox = (await info.locator("svg").boundingBox())!;
    const baselineBox = (await baseline.boundingBox())!;
    const amountBox = (await amount.boundingBox())!;
    const dayBox = (await day.boundingBox())!;
    expect(Math.abs(centerY(infoGlyphBox) - centerY(baselineBox))).toBeLessThanOrEqual(2);
    expect(Math.abs(amountBox.y + amountBox.height - (dayBox.y + dayBox.height))).toBeLessThanOrEqual(3);
    expect(dayBox.x - (amountBox.x + amountBox.width)).toBeGreaterThanOrEqual(1);
    expect(dayBox.x - (amountBox.x + amountBox.width)).toBeLessThanOrEqual(5);
    if (width >= 360) {
      const visibleRows = rows.filter({ visible: true });
      for (let index = 0; index < 3; index++) {
        const rect = (await visibleRows.nth(index).boundingBox())!;
        expect(rect.height).toBeLessThanOrEqual(36.5);
      }
      const bandHeight = (await band.boundingBox())!.height;
      expect(bandHeight).toBeLessThanOrEqual(164); // Prevent added card height.
    } else {
      const rowRect = (await rows.first().boundingBox())!;
      expect(rowRect.height).toBeLessThanOrEqual(80.5); // Existing 320px stacked layout.
    }
    expect(nameRect.x + nameRect.width).toBeLessThanOrEqual(priceRect.x + 1);
    expect(linkRect.height).toBeGreaterThanOrEqual(36);
    expect(infoRect.height).toBeGreaterThanOrEqual(36);
    expect(infoRect.width).toBeGreaterThanOrEqual(28);
    // Exact sequence: logo, provider name, info, per-day price, View deal.
    const logo = row.locator("[data-car-deal-provider-brand] > span").first();
    const logoRect = (await logo.boundingBox())!;
    expect(logoRect.width).toBe(19);
    expect(logoRect.height).toBe(19);
    const logoImg = logo.locator("img");
    if (await logoImg.count()) {
      await expect(logoImg).toHaveCSS("width", "19px");
      await expect(logoImg).toHaveCSS("height", "19px");
    }
    expect(logoRect.x + logoRect.width).toBeLessThanOrEqual(nameRect.x + 1);
    expect(nameRect.x + nameRect.width).toBeLessThanOrEqual(infoRect.x + 1);
    expect(infoRect.x + infoRect.width).toBeLessThanOrEqual(priceRect.x + 1);
    expect(infoRect.x + infoRect.width).toBeLessThanOrEqual(initialOffersRect.x + initialOffersRect.width + 1);
    const infoGap = infoRect.x - (nameRect.x + nameRect.width);
    expect(infoGap).toBeGreaterThanOrEqual(7);
    expect(infoGap).toBeLessThanOrEqual(16);
    const offerRight = initialOffersRect.x + initialOffersRect.width;
    expect(offerRight - (linkRect.x + linkRect.width)).toBeGreaterThanOrEqual(-1);
    expect(offerRight - (linkRect.x + linkRect.width)).toBeLessThanOrEqual(35);
    if (width < 360) {
      expect(linkRect.y).toBeGreaterThanOrEqual(priceRect.y + priceRect.height - 1);
    } else {
      expect(priceRect.x + priceRect.width).toBeLessThanOrEqual(linkRect.x + 1);
    }
    const visible = rows.filter({ visible: true });
    const iconXs: number[] = [];
    const priceXs: number[] = [];
    const iconCenterOffsets: number[] = [];
    for (let index = 0; index < 3; index++) {
      const seller = visible.nth(index);
      const iconBox = await seller.locator("[data-car-rate-info]").boundingBox();
      const priceBox = await seller.locator("[data-car-deal-provider-price]").boundingBox();
      expect(iconBox).not.toBeNull();
      expect(priceBox).not.toBeNull();
      iconXs.push(iconBox!.x);
      priceXs.push(priceBox!.x);
      const glyph = await seller.locator("[data-car-rate-info] svg").boundingBox();
      const priceLine = await seller.locator("[data-car-deal-price-baseline]").boundingBox();
      expect(glyph).not.toBeNull();
      expect(priceLine).not.toBeNull();
      iconCenterOffsets.push(Math.abs((glyph!.y + glyph!.height / 2) - (priceLine!.y + priceLine!.height / 2)));
    }
    expect(Math.max(...iconXs) - Math.min(...iconXs)).toBeLessThanOrEqual(1);
    expect(Math.max(...priceXs) - Math.min(...priceXs)).toBeLessThanOrEqual(1);
    expect(Math.max(...iconCenterOffsets)).toBeLessThanOrEqual(2);
    const infoSvg = info.locator("svg");
    await expect(infoSvg).toBeVisible();
    const iconWidth = await infoSvg.evaluate(element => element.getBoundingClientRect().width);
    expect(iconWidth).toBe(18);

    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    await expect(toggle).toContainText("Show fewer offers");
    await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);
    await expect.poll(async () => Math.abs((await offers.boundingBox())!.width - originalOffersWidth)).toBeLessThanOrEqual(2);
    const fullWidthBand = (await card.locator("[data-car-card-mobile-lower-band]").boundingBox())!;
    const expandedOffers = (await offers.boundingBox())!;
    expect(Math.abs(expandedOffers.x + expandedOffers.width - (fullWidthBand.x + fullWidthBand.width))).toBeLessThanOrEqual(2);
    await expect(rows.last().locator("[data-car-deal-provider-view-deal]")).toBeVisible();
    const lastIconGlyph = (await rows.last().locator("[data-car-rate-info] svg").boundingBox())!;
    const lastPriceLine = (await rows.last().locator("[data-car-deal-price-baseline]").boundingBox())!;
    expect(Math.abs(centerY(lastIconGlyph) - centerY(lastPriceLine))).toBeLessThanOrEqual(2);
    const expandedToggleSize = await toggle.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(expandedToggleSize).toBe(toggleTextSize);
    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);
    await expect.poll(async () => Math.abs((await offers.boundingBox())!.width - originalOffersWidth)).toBeLessThanOrEqual(2);
  }

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.cars);
  const desktopCard = page.locator("[data-car-result-card-shell]").first();
  const desktopOffer = desktopCard.locator('[data-region="details"] [data-car-deal-provider-offer]').first();
  await expect(desktopOffer).toBeVisible();
  await expect(desktopCard.locator('[data-region="pricing"]')).toBeHidden();
  const desktopFont = await desktopOffer.locator("[data-car-deal-provider-name]").evaluate(
    element => parseFloat(getComputedStyle(element).fontSize),
  );
  expect(desktopFont).toBe(12); // Desktop remains unchanged.
  await expect(desktopOffer.locator("[data-car-deal-provider-price]")).toHaveCSS("font-size", "13px");
  await expect(desktopOffer.locator("[data-car-deal-provider-view-deal]")).toHaveCSS("font-size", "12px");
  await expect(desktopOffer.locator("[data-car-deal-provider-brand] > span").first()).toHaveCSS("width", "18px");
  await expect(desktopOffer.locator("[data-car-rate-info] svg")).toHaveAttribute("width", "16");
});


test("Cars results use content-sized offer rows for 1-3 and preserve 4+ expandable preview", async ({ page }) => {
  const firstOffer = carBase.offers[0];
  if (!firstOffer) throw new Error("Missing offer fixture");
  let offerCount = 1;
  const makeResult = (count: number) => ({
    ...carBase,
    id: "fixture-compact-five-offers",
    offers: Array.from({ length: count }, (_, index) => ({
      ...firstOffer,
      id: "offer-" + index,
      bookingProviderName: "Provider " + index,
      pricePerDay: 48 + index,
      totalPrice: 200 + index * 5,
      bookingUrl: "https://example.com/deal-" + index,
    })),
  });
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [makeResult(offerCount)], status: "available" } }));
  let previousShortCardHeight: number | null = null;
  let collapsedOverflowHeight: number | null = null;
  for (const count of [1, 2, 3, 4, 5, 7, 10]) {
    offerCount = count;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const offers = card.locator("[data-car-card-mobile-offers]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(count);
    await expect(rows.filter({ visible: true })).toHaveCount(Math.min(count, 3));
    const offerListHeight = (await offers.locator("[data-car-deal-provider-offers]").boundingBox())!.height;
    expect(Math.abs(offerListHeight - Math.min(count, 3) * 36)).toBeLessThanOrEqual(2);
    const disclosure = offers.locator("[data-car-deal-more-slot]");
    const cardHeight = (await card.boundingBox())!.height;
    if (count <= 3) {
      await expect(disclosure).toHaveCount(0);
      if (previousShortCardHeight !== null) expect(cardHeight).toBeGreaterThan(previousShortCardHeight + 34);
      previousShortCardHeight = cardHeight;
    } else {
      await expect(disclosure).toHaveCount(1);
      const disclosureHeight = (await disclosure.boundingBox())!.height;
      expect(disclosureHeight).toBeGreaterThanOrEqual(36);
      if (collapsedOverflowHeight !== null) expect(Math.abs(cardHeight - collapsedOverflowHeight)).toBeLessThanOrEqual(2);
      collapsedOverflowHeight = cardHeight;
    }
    await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);
    if (count <= 3) {
      await expect(toggle).toHaveCount(0);
    } else {
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toContainText("+" + (count - 3) + " more offers");
      await toggle.click();
      await expect(rows.filter({ visible: true })).toHaveCount(count);
      await expect(toggle).toContainText("Show fewer offers");
      if (count >= 5) {
        const firstRow = (await rows.first().boundingBox())!;
        const fifthRow = (await rows.nth(4).boundingBox())!;
        expect(fifthRow.y + fifthRow.height - firstRow.y).toBeLessThanOrEqual(190);
      }
      await toggle.click();
      await expect(rows.filter({ visible: true })).toHaveCount(3);
    }
  }
  // At 320px, each offer stacks its meta and action; short cards must still shrink.
  let previousNarrowHeight: number | null = null;
  for (const count of [1, 2, 3, 4]) {
    offerCount = count;
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(routes.cars);
    const cards = page.locator("[data-car-result-card-shell]");
    const list = cards.first().locator("[data-car-card-mobile-offers] [data-car-deal-provider-offers]");
    await expect(list.locator("[data-car-deal-provider-offer]")).toHaveCount(count);
    const height = (await list.boundingBox())!.height;
    const disclosure = cards.first().locator("[data-car-card-mobile-offers] [data-car-deal-more-slot]");
    if (count <= 3) {
      await expect(disclosure).toHaveCount(0);
      if (previousNarrowHeight !== null) expect(height).toBeGreaterThan(previousNarrowHeight + 65);
      previousNarrowHeight = height;
    } else {
      expect(height).toBeGreaterThanOrEqual(240);
      await expect(disclosure).toHaveCount(1);
    }
  }

  // Desktop offers have 30px rows and 4px gaps, with no empty disclosure slot.
  let previousDesktopHeight: number | null = null;
  for (const count of [1, 2, 3, 4]) {
    offerCount = count;
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const details = card.locator('[data-region="details"]');
    const list = details.locator("[data-car-deal-provider-offers]");
    const disclosure = details.locator("[data-car-deal-more-slot]");
    const height = (await list.boundingBox())!.height;
    const visibleCount = Math.min(count, 3);
    expect(Math.abs(height - (visibleCount * 30 + (visibleCount - 1) * 4))).toBeLessThanOrEqual(2);
    if (count <= 3) {
      await expect(disclosure).toHaveCount(0);
      const cardHeight = (await card.boundingBox())!.height;
      // Desktop's price/action rail provides a separate natural height floor.
      // Offer rows still fit their exact count; never force the image or rail smaller.
      if (previousDesktopHeight !== null) expect(cardHeight).toBeGreaterThanOrEqual(previousDesktopHeight - 2);
      previousDesktopHeight = cardHeight;
    } else {
      await expect(disclosure).toHaveCount(1);
      await expect(details.locator("[data-car-deal-more-offers]")).toContainText("+1 more offer");
    }
  }
});

test("Cars mobile offers stay full-width while desktop eliminates the duplicate price rail", async ({ page }) => {
  const firstOffer = carBase.offers[0];
  if (!firstOffer) throw new Error("Missing test offer");

  const makeResult = (count: number) => ({
    ...carBase, id: "fixture-inline-offers",
    offers: Array.from({ length: count }, (_, index) => ({
      ...firstOffer, id: "offer-" + index, freeCancellation: true, bookingProviderName: "Seller " + index,
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
        ? card.locator("[data-car-card-mobile-offers]")
        : card.locator('[data-region="details"]');
      const mainPrice = card.locator('[data-region="pricing"]');
      if (mobile) await expect(card.locator("[data-car-card-mobile-pricing]")).toHaveCount(0);

      const rows = dealArea.locator("[data-car-deal-provider-offer]");
      const rightSpecLabel = mobile
        ? card.locator("[data-car-card-mobile-specs] ul").nth(1).locator("li span").first()
        : card.locator("[data-car-card-desktop-header-specs] li").nth(1).locator("span").first();
      await expect(rows).toHaveCount(count);
      const initiallyVisible = Math.min(count, 3);
      await expect(rows.filter({ visible: true })).toHaveCount(initiallyVisible);
      const toggle = dealArea.locator("[data-car-deal-more-offers]").filter({ visible: true });
      if (count <= initiallyVisible) {
        await expect(toggle).toHaveCount(0);
      } else {
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toContainText("+" + (count - initiallyVisible) + " more offers");
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
      }
      if (!mobile) {
        // The redundant desktop rail is hidden; the reduced article owns the
        // entire vehicle and offer surface with no reserved price gutter.
        await expect(card.locator("article")).toHaveCSS("background-color", "rgb(255, 255, 255)");
        await expect(mainPrice).toBeHidden();
        await expect(card.locator("[data-car-card-desktop-header-rail]")).toHaveCount(0);
        const sharedDivider = card.locator("[data-car-card-desktop-full-width-divider]");
        await expect(sharedDivider).toBeVisible();
        await expect(sharedDivider).toHaveCSS("height", "1px");
        await expect(sharedDivider).toHaveCSS("background-color", "rgb(203, 213, 225)");
        const heading = card.locator("[data-car-card-desktop-shared-header]");
        const cardName = heading.locator("[data-car-card-desktop-title-row] h2");
        const headerActions = heading.locator("[data-car-card-desktop-actions]");
        await expect(cardName).toBeVisible();
        await expect(headerActions.locator("button")).toHaveCount(2);
        const nameBox = (await cardName.boundingBox())!;
        const saveBox = (await headerActions.locator("button").first().boundingBox())!;
        const shareBox = (await headerActions.locator("button").nth(1).boundingBox())!;
        const centerY = (box: { y: number; height: number }) => box.y + box.height / 2;
        expect(Math.abs(centerY(saveBox) - centerY(nameBox))).toBeLessThanOrEqual(3);
        expect(Math.abs(centerY(shareBox) - centerY(nameBox))).toBeLessThanOrEqual(3);
        const cancellation = heading.locator("[data-car-card-desktop-free-cancellation]");
        const amenities = heading.locator("[data-car-card-desktop-header-specs]");
        const cancellationBox = await cancellation.boundingBox();
        const amenitiesBox = await amenities.boundingBox();
        expect(cancellationBox).not.toBeNull();
        expect(amenitiesBox).not.toBeNull();
        expect(amenitiesBox!.y).toBeGreaterThanOrEqual(cancellationBox!.y + cancellationBox!.height - 1);
        expect(amenitiesBox!.y - (cancellationBox!.y + cancellationBox!.height)).toBeLessThanOrEqual(30);
        const detailsRect = (await dealArea.boundingBox())!;
        const image = card.locator('[data-region="image"] > div').first();
        const imageBox = (await image.boundingBox())!;
        const dividerBox = (await sharedDivider.boundingBox())!;
        const articleBox = (await card.locator("article").boundingBox())!;
        expect(imageBox.height).toBeGreaterThanOrEqual(174);
        expect(imageBox.height).toBeLessThanOrEqual(178);
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(dividerBox.y + 1);
        expect(dividerBox.y).toBeGreaterThanOrEqual(amenitiesBox!.y + amenitiesBox!.height - 1);
        expect(Math.abs(detailsRect.y - dividerBox.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(dividerBox.x - (articleBox.x + 1))).toBeLessThanOrEqual(2);
        expect(Math.abs(dividerBox.x + dividerBox.width - (articleBox.x + articleBox.width - 1))).toBeLessThanOrEqual(2);
        expect(Math.abs(detailsRect.x - (articleBox.x + 1))).toBeLessThanOrEqual(2);
        expect(detailsRect.x + detailsRect.width).toBeLessThanOrEqual(articleBox.x + articleBox.width + 1);
        expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(articleBox.x + articleBox.width + 1);
        // The paragraph-style offers start under the original image region.
        const firstRow = (await rows.first().boundingBox())!;
        const leftInset = firstRow.x - articleBox.x;
        expect(leftInset).toBeGreaterThanOrEqual(29);
        expect(leftInset).toBeLessThanOrEqual(38);
        expect(firstRow.x).toBeLessThan(imageBox.x + imageBox.width - 40);
        // No empty 152px gap remains between the providers and the new card edge.
        expect(articleBox.x + articleBox.width - (firstRow.x + firstRow.width)).toBeLessThanOrEqual(24);
      }
      const previewCardHeight = (await card.boundingBox())!.height;
      if (!mobile) expect(previewCardHeight).toBeLessThanOrEqual(410); // Bounded increase for evenly spaced desktop rows.
      const previewMainRect = mobile ? null : await dealArea.boundingBox();
      if (!mobile) expect(previewMainRect).not.toBeNull();
      const mobileFullBand = mobile ? await card.locator("[data-car-card-mobile-lower-band]").boundingBox() : null;
      if (mobile) {
        expect(mobileFullBand).not.toBeNull();
        const offersRect = await dealArea.boundingBox();
        expect(offersRect).not.toBeNull();
        expect(Math.abs(offersRect!.x + offersRect!.width - (mobileFullBand!.x + mobileFullBand!.width))).toBeLessThanOrEqual(2);
      }
      if (count > initiallyVisible) {
        await toggle.click();
        await expect(rows.filter({ visible: true })).toHaveCount(count);
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(toggle).toContainText("Show fewer offers");
      }
      const rightSpecRect = await rightSpecLabel.boundingBox();
      expect(rightSpecRect).not.toBeNull();
      await expect(card.locator("[data-supplier-information]")).toHaveCount(0);
      const expandedOffers = count > initiallyVisible;
      if (!mobile) {
        await expect(mainPrice).toBeHidden();
        // Expanded and collapsed rows both fill the same content-width area.
        await expect.poll(async () => {
          const row = (await rows.first().boundingBox())!;
          const details = (await dealArea.boundingBox())!;
          return details.x + details.width - (row.x + row.width);
        }).toBeGreaterThanOrEqual(0);
      }
      const cardRect = await card.boundingBox();
      expect(cardRect).not.toBeNull();

      for (let index = 0; index < count; index++) {
        const row = rows.nth(index);
        const provider = await row.locator("[data-car-deal-provider-name]").boundingBox();
        const price = await row.locator("[data-car-deal-provider-price]").boundingBox();
        const link = await row.locator("[data-car-deal-provider-view-deal]").boundingBox();
        const brand = row.locator("[data-car-deal-provider-brand]");
        const info = row.locator("[data-car-rate-info]");
        const iconBox = (await info.count()) ? await info.boundingBox() : null;
        const rowRect = await row.boundingBox();

        expect(provider).not.toBeNull();
        expect(price).not.toBeNull();
        expect(link).not.toBeNull();
        expect(rowRect).not.toBeNull();
        if (await info.count()) {
          expect(iconBox).not.toBeNull();
          const logoBox = await brand.locator("span").first().boundingBox();
          expect(logoBox).not.toBeNull();
          expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(provider!.x + 1);
          expect(provider!.x + provider!.width).toBeLessThanOrEqual(iconBox!.x + 1);
          expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(price!.x + 1);
        }
        expect(provider!.x + provider!.width).toBeLessThanOrEqual(price!.x + 1);
        expect(price!.x + price!.width + 6).toBeLessThanOrEqual(link!.x + 1);
        if (!mobile) {
          // All desktop View deal links finish at the same restrained right inset.
          const actionRect = await row.locator("[data-car-deal-provider-action-slot]").boundingBox();
          expect(actionRect).not.toBeNull();
          expect(actionRect!.width).toBeGreaterThanOrEqual(90);
          expect(Math.abs(link!.x + link!.width - (actionRect!.x + actionRect!.width - 8))).toBeLessThanOrEqual(3);
          expect(rowRect!.x).toBeLessThan(rightSpecRect!.x);
        }
        const providerCenterY = provider!.y + provider!.height / 2;
        const linkCenterY = link!.y + link!.height / 2;
        expect(Math.abs(providerCenterY - linkCenterY)).toBeLessThanOrEqual(3);
        if (mobile) {
          expect(rowRect!.x + rowRect!.width).toBeLessThanOrEqual(mobileFullBand!.x + mobileFullBand!.width + 1);
          const rightEdgeGap = mobileFullBand!.x + mobileFullBand!.width - (link!.x + link!.width);
          expect(rightEdgeGap).toBeGreaterThanOrEqual(-1);
          expect(rightEdgeGap).toBeLessThanOrEqual(35);
        } else {
          expect(rowRect!.x + rowRect!.width).toBeLessThanOrEqual(previewMainRect!.x + previewMainRect!.width + 1);
          expect(rowRect!.x + rowRect!.width).toBeLessThanOrEqual(cardRect!.x + cardRect!.width + 1);
        }
        expect(rowRect!.y + rowRect!.height).toBeLessThanOrEqual(cardRect!.y + cardRect!.height + 1);
      }
      if (count === 3) threeOfferHeight = cardRect!.height;
      else expect(cardRect!.height).toBeGreaterThanOrEqual(threeOfferHeight!);
      if (expandedOffers) {
        await toggle.click();
        await expect(rows.filter({ visible: true })).toHaveCount(3);
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        if (!mobile) {
          await expect(mainPrice).toBeHidden();
          await expect.poll(async () => {
            const row = (await rows.first().boundingBox())!;
            const details = (await dealArea.boundingBox())!;
            return details.x + details.width - (row.x + row.width);
          }).toBeGreaterThanOrEqual(0);
        }
      }
    }
  }
});




test("desktop Cars sort badge follows the selected sort and keeps title aligned with Save and Share", async ({ page }) => {
  const baseOffer = carBase.offers[0];
  if (!baseOffer) throw new Error("Missing Cars fixture");
  const fixture = (id: string, modelName: string, recommendationScore: number, total: number, rating: number) => ({
    ...carBase,
    id, modelName, recommendationScore, supplierRating: rating,
    offers: Array.from({ length: 5 }, (_, index) => ({
      ...baseOffer,
      id: id + "-offer-" + index,
      bookingProviderName: "Fixture Seller " + index,
      bookingUrl: "https://example.com/cars/" + id + "/" + index,
      totalPrice: total + index * 15,
      pricePerDay: Math.round((total + index * 15) / 3),
    })),
  });
  const cars = [
    fixture("sort-best", "Sort Leader", 90, 120, 4.1),
    fixture("sort-other", "Value Alternative", 70, 170, 4.5),
    fixture("sort-rated", "Rated Leader", 60, 220, 4.9),
  ];
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: cars, status: "available" } }));

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.cars);
  const firstCard = page.locator("[data-car-result-card-shell]").first();
  const heading = firstCard.locator("[data-car-card-desktop-shared-header]");
  const badge = heading.locator("[data-car-card-desktop-badge]");
  const cardName = heading.locator("[data-car-card-desktop-title-row] h2");
  await expect(cardName).toHaveText("Sort Leader");
  await expect(badge).toContainText("Cheapest"); // Recommended uses the same objective award as mobile.
  await expect(badge).not.toContainText("Best value");

  const checkIdentitySpacing = async () => {
    const nameRect = await cardName.boundingBox();
    const actions = heading.locator("[data-car-card-desktop-actions]");
    const saveRect = await actions.locator("button").first().boundingBox();
    const shareRect = await actions.locator("button").nth(1).boundingBox();
    const typeRect = await heading.locator("[data-car-card-desktop-category]").boundingBox();
    expect(nameRect).not.toBeNull();
    expect(saveRect).not.toBeNull();
    expect(shareRect).not.toBeNull();
    expect(typeRect).not.toBeNull();
    const nameCenter = nameRect!.y + nameRect!.height / 2;
    expect(Math.abs(nameCenter - (saveRect!.y + saveRect!.height / 2))).toBeLessThanOrEqual(3);
    expect(Math.abs(nameCenter - (shareRect!.y + shareRect!.height / 2))).toBeLessThanOrEqual(3);
    const gap = typeRect!.y - (nameRect!.y + nameRect!.height);
    expect(gap).toBeGreaterThanOrEqual(1);
    expect(gap).toBeLessThanOrEqual(9);
  };
  await checkIdentitySpacing();
  const toggle = firstCard.locator("[data-car-deal-more-offers]").filter({ visible: true });
  await expect(toggle).toContainText("+2 more offers");
  const offerRow = firstCard.locator('[data-region="details"] [data-car-deal-provider-offer]').first();
  await expect(offerRow.locator('[data-car-deal-provider-brand] > span').first()).toHaveCSS("width", "18px");
  await expect(offerRow.locator("[data-car-deal-provider-name]")).toHaveCSS("font-size", "12px");
  await expect(offerRow.locator("[data-car-deal-provider-price]")).toHaveCSS("font-size", "13px");
  await expect(offerRow.locator("[data-car-deal-provider-view-deal]")).toHaveCSS("font-size", "12px");
  await expect(toggle).toHaveCSS("font-size", "12px");
  await expect(toggle).toHaveCSS("line-height", "16px");
  await expect(toggle).toHaveCSS("font-weight", "600");
  await toggle.click();
  await expect(toggle).toContainText("Show fewer offers");
  await expect(toggle).toHaveCSS("font-size", "12px");
  await expect(toggle).toHaveCSS("font-weight", "600");
  await toggle.click();
  await expect(toggle).toContainText("+2 more offers");

  const sortButton = page.locator(".cars-results-desktop-sort-trigger").filter({ visible: true }).first();
  await sortButton.click();
  await page.locator(".cars-results-desktop-sort-option").nth(1).click();
  await expect(cardName).toHaveText("Sort Leader");
  await expect(badge).toContainText("Cheapest");
  await checkIdentitySpacing();

  await sortButton.click();
  await page.locator(".cars-results-desktop-sort-option").nth(2).click();
  await expect(cardName).toHaveText("Rated Leader");
  await expect(badge).toContainText("Top rated");
  await checkIdentitySpacing();

  // Mobile keeps objective source badges and its original +more 11px sizing.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(routes.cars);
  const mobileCard = page.locator("[data-car-result-card-shell]").first();
  await expect(mobileCard.locator("[data-car-card-mobile-information]")).toContainText("Sort Leader");
  await expect(mobileCard.locator("[data-car-card-mobile-information]")).toContainText("Cheapest");
  const mobileToggle = mobileCard.locator("[data-car-deal-more-offers]").filter({ visible: true });
  await expect(mobileToggle).toHaveCSS("font-size", "11px");
  await expect(mobileToggle).toHaveCSS("font-weight", "600");
});

test("desktop Cars sizes one-to-three seller rows to content and expands additional offers without affecting mobile previews", async ({ page }) => {
  const original = carBase.offers[0];
  if (!original) throw new Error("Missing Cars comparison test offer");
  let sellerCount = 3;
  await page.route("**/api/cars/search", route => route.fulfill({ json: {
    results: [{
      ...carBase,
      id: "desktop-three-seller-preview",
      offers: Array.from({ length: sellerCount }, (_, index) => ({
        ...original,
        id: "desktop-seller-" + index,
        bookingProviderName: "Distinct Seller " + index,
        pricePerDay: 50 + index,
        totalPrice: 150 + 3 * index,
        bookingUrl: "https://example.com/deal-" + index,
      })),
    }],
    status: "available",
  } }));
  await page.setViewportSize({ width: 1365, height: 900 });
  for (const count of [1, 2, 3, 4, 5, 7, 10]) {
    sellerCount = count;
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const detail = card.locator('[data-region="details"]');
    const rows = detail.locator("[data-car-deal-provider-offer]");
    const more = detail.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(count);
    await expect(rows.filter({ visible: true })).toHaveCount(Math.min(3, count));
    await expect(card.locator("article")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    const offerList = detail.locator("[data-car-deal-provider-offers]");
    const listHeight = (await offerList.boundingBox())!.height;
    const visibleCount = Math.min(3, count);
    const expectedHeight = visibleCount * 30 + (visibleCount - 1) * 4;
    expect(Math.abs(listHeight - expectedHeight)).toBeLessThanOrEqual(2);
    if (count > 3) await expect(offerList).toHaveCSS("min-height", "98px");
    await expect(rows.first()).toHaveCSS("min-height", "30px");
    const assertEvenDesktopRowGap = async (index: number) => {
      const current = await rows.nth(index).boundingBox();
      const next = await rows.nth(index + 1).boundingBox();
      expect(current).not.toBeNull();
      expect(next).not.toBeNull();
      const gap = next!.y - (current!.y + current!.height);
      expect(gap).toBeGreaterThanOrEqual(3);
      expect(gap).toBeLessThanOrEqual(5);
    };
    if (count >= 2) await assertEvenDesktopRowGap(0);
    if (count <= 3) {
      expect(listHeight).toBeLessThanOrEqual(100); // No oversized short-offer reserve.
      await expect(more).toHaveCount(0);
    } else {
      await expect(more).toContainText("+" + (count - 3) + " more offers");
      const compactHeight = (await card.boundingBox())!.height;
      await more.click();
      await expect(rows.filter({ visible: true })).toHaveCount(count);
      await expect(more).toHaveAttribute("aria-expanded", "true");
      await assertEvenDesktopRowGap(2); // The fourth offer gets the same spacing as preview rows.
      if (count > 4) await assertEvenDesktopRowGap(count - 2);
      expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(compactHeight);
      await more.click();
      await expect(rows.filter({ visible: true })).toHaveCount(3);
      await expect(more).toHaveAttribute("aria-expanded", "false");
      await expect(more).toContainText("+" + (count - 3) + " more offers");
    }
    // The original provider View deal links remain available without a re-query.
    await expect(rows.first().locator("[data-car-deal-provider-view-deal]")).toBeVisible();
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
      bookingUrl: index === 6 ? "https://invalid.example.org/not-a-kayak-checkout" : `https://sandbox-en-us.kayakaffiliates.com/in?offer=option-${index}`,
      pricePerDay: 50 + index,
      totalPrice: 150 + index * 3,
      suppliedFacts: [
        { label: "payment Type", value: index % 2 === 0 ? "prepay" : "payAtPickup" },
        { label: "fees 1 · code", value: "securityDeposit" },
        { label: "fees 1 · rate · display Price", value: "$200" },
        { label: "fees 1 · is Included In Total", value: "No" },
        { label: "Pickup · address", value: "Airport Pickup " + index },
        { label: "policy · fuel · code", value: "fullToFull" },
        { label: "policy · fuel · description", value: "Return the vehicle with a full tank or confirm the refueling terms with the rental desk before pickup." },
        { label: "is Credit Card Required", value: "Yes" },
        { label: "brand", value: "Ford Transit or similar, a longer provider-supplied vehicle description for a special rental category. Confirm the exact model at pickup. This intentionally long vehicle description checks line wrapping, tall content, the fixed Rate details header, and readable alignment on narrow mobile screens and in the desktop dialog. Additional notes may run across multiple lines without pushing the close button away." },
        { label: "fuel", value: "petrol" },
        { label: "sipp", value: "XXAR" },
        { label: "futureField", value: "future-enum" },
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
    const area = mobile ? card.locator("[data-car-card-mobile-offers]") : card.locator('[data-region="details"]');
    const rows = area.locator("[data-car-deal-provider-offer]");
    const main = mobile ? card.locator("[data-car-card-mobile-pricing]") : card.locator('[data-region="pricing"]');
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    if (mobile) await expect(main).toHaveCount(0);
    else await expect(main).toBeHidden(); // Standalone desktop has no duplicate price rail.
    await expect(area.locator("[data-car-rate-terms]")).toHaveCount(0);
    await expect(area.getByText("Rate details", { exact: true })).toHaveCount(0);
    const initialHeight = (await card.boundingBox())!.height;
    await area.locator("[data-car-deal-more-offers]").filter({ visible: true }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    if (mobile) await expect(main).toHaveCount(0);
    else await expect(main).toBeHidden();
    await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(initialHeight);

    const firstInfo = rows.first().locator("[data-car-rate-info]");
    await expect(firstInfo).toBeVisible();
    await firstInfo.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await firstInfo.click();
    const dialog = area.locator("[data-car-rate-dialog]");
    await expect(dialog).toBeVisible();
    const sheetHeading = dialog.locator("[data-car-rate-heading]");
    await expect(sheetHeading).toBeFocused(); // Safari should not auto-highlight the X.
    const closeButton = dialog.locator('button[aria-label="Close rate details"]');
    await expect(closeButton).not.toBeFocused();
    const fixedHeader = dialog.locator("[data-car-rate-header]");
    const rateScroll = dialog.locator("[data-car-rate-scroll]");
    const fixedFooter = dialog.locator("[data-car-rate-footer]");
    const footerLink = fixedFooter.locator("[data-car-rate-view-deal]");
    await expect(fixedHeader).toBeVisible();
    await expect(fixedFooter).toBeVisible();
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute("href", "https://sandbox-en-us.kayakaffiliates.com/in?offer=option-0");
    await expect(footerLink).toHaveAttribute("aria-label", "View deal from Same Seller");
    await expect(footerLink).toHaveAttribute("target", "_blank");
    await expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");
    await expect(footerLink).toHaveText("View deal");
    await expect(footerLink.locator("svg")).toHaveCount(0);
    await expect(footerLink).toHaveCSS("justify-content", "center");
    await expect(footerLink).toHaveCSS("align-items", "center");
    const labelAlignment = await footerLink.evaluate(element => {
      const text = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      if (!text) return null;
      const range = document.createRange();
      range.selectNodeContents(text);
      const textBox = range.getBoundingClientRect();
      const buttonBox = element.getBoundingClientRect();
      return {
        horizontal: Math.abs(textBox.x + textBox.width / 2 - (buttonBox.x + buttonBox.width / 2)),
        vertical: Math.abs(textBox.y + textBox.height / 2 - (buttonBox.y + buttonBox.height / 2)),
      };
    });
    expect(labelAlignment).not.toBeNull();
    expect(labelAlignment!.horizontal).toBeLessThanOrEqual(2);
    expect(labelAlignment!.vertical).toBeLessThanOrEqual(4);
    await expect(rateScroll).toBeVisible();
    await expect(rateScroll).toHaveCSS("overflow-y", "auto");
    if (!mobile) {
      const scrollbarWidth = await rateScroll.evaluate(element =>
        getComputedStyle(element, "::-webkit-scrollbar").width
      );
      expect(scrollbarWidth).toBe("7px");
    }
    await expect(dialog.locator("[data-car-rate-title-row]")).toBeVisible();
    const titleBox = await sheetHeading.boundingBox();
    const headerBox = await fixedHeader.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(Math.abs((titleBox!.x + titleBox!.width / 2) - (headerBox!.x + headerBox!.width / 2))).toBeLessThanOrEqual(1);
    const footerBox = await fixedFooter.boundingBox();
    const footerLinkBox = await footerLink.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerLinkBox).not.toBeNull();
    expect(Math.abs((footerLinkBox!.x + footerLinkBox!.width / 2) - (footerBox!.x + footerBox!.width / 2))).toBeLessThanOrEqual(1);
    expect(footerLinkBox!.height).toBeGreaterThanOrEqual(44);
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1);
    if (mobile) {
      // A true mobile full-height sheet must fill the usable browser viewport.
      expect(Math.abs(dialogBox!.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.width - viewport.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.height - viewport.height)).toBeLessThanOrEqual(2);
      await expect(dialog).toHaveCSS("border-top-left-radius", "0px");
      await expect(closeButton).toBeVisible();
    } else {
      // Desktop retains the intentionally compact centered dialog.
      expect(dialogBox!.width).toBeLessThanOrEqual(541);
      expect(dialogBox!.height).toBeLessThan(viewport.height * 0.85);
      await expect(closeButton).toBeVisible();
    }
    await expect(dialog.getByText("Airport Pickup 0", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 1", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Estimated total:", { exact: false })).toBeVisible();
    await expect(dialog.locator("[data-car-rate-total-price]")).toHaveCSS("font-weight", "600");
    await expect(dialog.locator("[data-car-rate-section=payment]")).toBeVisible();
    await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(dialog.locator("[data-car-rate-fact-row]")).toHaveCount(6);
    expect(await dialog.locator("[data-car-rate-section]").evaluateAll(elements =>
      elements.map(element => element.getAttribute("data-car-rate-section")))).toEqual(
        ["payment", "policies", "pickup", "driver", "vehicle"]
      );
    await expect(dialog.getByText("Price and payment", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Security deposit", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Credit card required", { exact: true })).toBeVisible();
    await expect(dialog.locator("[data-car-rate-source-note]")).toHaveCount(0);
    await expect(dialog.getByText("Sandbox rate information is simulated.", { exact: false })).toHaveCount(0);
    // Outline icons are visible to sighted customers, decorative to assistive tech,
    // and placed to the left of each heading without changing the supplier content.
    for (const sectionId of ["payment", "policies", "pickup", "driver", "vehicle"]) {
      const section = dialog.locator(`[data-car-rate-section="${sectionId}"]`);
      const heading = section.locator("h3");
      await expect(heading).toHaveCSS("margin-bottom", "24px");
      const icon = heading.locator("[data-car-rate-section-icon]");
      await expect(icon).toHaveCount(1);
      await expect(icon).toHaveAttribute("data-car-rate-section-icon", sectionId);
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      const iconBox = await icon.boundingBox();
      const titleBox = await heading.locator("span").boundingBox();
      expect(iconBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(titleBox!.x + 1);
    }
    if (mobile) {
      await expect(closeButton).toHaveCSS("border-top-width", "0px");
      await expect(closeButton).toHaveCSS("box-shadow", "none");
      await expect(closeButton).toHaveCSS("outline-style", "none");
      // Touch-opened mobile sheets retain a visible, keyboard-accessible X.
      const unfocusedBackground = await closeButton.evaluate(element => getComputedStyle(element).backgroundColor);
      await page.keyboard.press("Tab");
      await expect(closeButton).toBeFocused();
      const keyboardBackground = await closeButton.evaluate(element => getComputedStyle(element).backgroundColor);
      expect(keyboardBackground).not.toBe(unfocusedBackground);
      await expect(closeButton).toHaveCSS("box-shadow", "none");
    } else {
      await expect(closeButton).toBeVisible();
      await expect(closeButton).toHaveCSS("border-top-width", "0px");
      await expect(closeButton).toHaveCSS("box-shadow", "none");
    }
    const firstValue = dialog.locator("[data-car-rate-fact-value]").first();
    await expect(firstValue).toHaveCSS("font-weight", "500");
    await expect(firstValue).toHaveCSS("color", "rgb(30, 41, 59)");
    await expect(dialog.getByText("XXAR", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("future-enum", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("fullToFull", { exact: true })).toHaveCount(0);
    // Both narrow mobile sheets and desktop dialogs keep every supplier value
    // at the far-right content gutter, including long wrapping descriptions.
    const alignment = await dialog.locator("[data-car-rate-fact-row]").evaluateAll(elements =>
      elements.map(element => {
        const label = element.querySelector("dt");
        const value = element.querySelector<HTMLElement>("[data-car-rate-fact-value]");
        if (!label || !value) return null;
        const rowBox = element.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        const valueBox = value.getBoundingClientRect();
        return {
          textAlign: getComputedStyle(value).textAlign,
          rightGap: Math.abs(rowBox.right - valueBox.right),
          labelGap: valueBox.left - labelBox.right,
          overflow: value.scrollWidth > value.clientWidth + 1,
        };
      })
    );
    for (const fact of alignment) {
      expect(fact).not.toBeNull();
      expect(fact!.textAlign).toBe("right");
      expect(fact!.rightGap).toBeLessThanOrEqual(1);
      expect(fact!.labelGap).toBeGreaterThanOrEqual(10);
      expect(fact!.overflow).toBe(false);
    }
    const fixedHeaderBefore = await fixedHeader.boundingBox();
    const fixedFooterBefore = await fixedFooter.boundingBox();
    expect(fixedHeaderBefore).not.toBeNull();
    expect(fixedFooterBefore).not.toBeNull();
    const scrollDistance = await rateScroll.evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(scrollDistance).toBeGreaterThan(40);
    const fixedHeaderAfter = await fixedHeader.boundingBox();
    const fixedFooterAfter = await fixedFooter.boundingBox();
    expect(fixedHeaderAfter).not.toBeNull();
    expect(fixedFooterAfter).not.toBeNull();
    expect(Math.abs(fixedHeaderAfter!.y - fixedHeaderBefore!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(fixedFooterAfter!.y - fixedFooterBefore!.y)).toBeLessThanOrEqual(2);
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    // A supplier with rate terms but no approved booking URL must have a disabled action.
    await rows.last().locator("[data-car-rate-info]").click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 6", { exact: true })).toBeVisible();
    await expect(dialog.locator("[data-car-rate-view-deal]")).toHaveCount(0);
    const unavailableAction = dialog.locator("[data-car-rate-view-deal-unavailable]");
    await expect(unavailableAction).toBeVisible();
    await expect(unavailableAction).toBeDisabled();
    await expect(unavailableAction).toHaveText("View deal");
    await expect(unavailableAction.locator("svg")).toHaveCount(0);
    await expect(unavailableAction).toHaveCSS("justify-content", "center");
    await expect(unavailableAction).toHaveCSS("align-items", "center");
    await closeButton.click();
    await expect(dialog).not.toBeVisible();
    await area.locator("[data-car-deal-more-offers]").filter({ visible: true }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    if (mobile) await expect(main).toHaveCount(0);
    else await expect(main).toBeHidden(); // Standalone desktop has no duplicate price rail.
    const resultRow = page.locator('[data-cars-results-card-list] [data-virtual-index]').first();
    await resultRow.focus(); // Virtualized result rows are programmatically focusable.
    await expect(resultRow).toHaveCSS("outline-style", "none");
    const carBorder = await card.locator("article").first().evaluate(element => getComputedStyle(element).borderTopColor);
    expect(carBorder).not.toBe("rgb(0, 75, 184)");
    await rows.nth(1).locator("[data-car-rate-info]").click();
    await expect(dialog.getByText("Airport Pickup 1", { exact: true })).toBeVisible();
    await expect(dialog.locator("[data-car-rate-view-deal]")).toHaveAttribute(
      "href", "https://sandbox-en-us.kayakaffiliates.com/in?offer=option-1"
    );
    await expect(dialog.getByText("Airport Pickup 0", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    if (mobile) await expect(main).toHaveCount(0);
    else await expect(main).toBeHidden(); // Standalone desktop has no duplicate price rail.
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
