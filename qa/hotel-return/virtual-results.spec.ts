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
    await expect(card.locator("[data-car-card-mobile-pricing]")).toBeVisible();
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


test("Cars single provider bars match Hotel-style blue actions and nearby info on 320–430px screens", async ({ page }) => {
  const baseOffer = carBase.offers[0];
  if (!baseOffer) throw new Error("Missing fixture offer");
  const result = {
    ...carBase,
    id: "kayak-sandbox:hotel-style-car-bars",
    inventorySource: "kayak-sandbox" as const,
    offers: Array.from({ length: 7 }, (_, index) => ({
      ...baseOffer,
      id: "touch-offer-" + index,
      bookingProviderName: index === 0 ? "Extra Long Rental Provider Name" : "Seller " + index,
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
    const footer = card.locator("[data-car-card-mobile-pricing]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    await expect(toggle).toContainText("+4 more offers");
    await expect(footer).toBeVisible();
    await expect(offers.locator("[data-car-deal-provider-offers]")).toHaveCSS("min-height", "162px");
    const cardBox = (await card.boundingBox())!;
    const offerBox = (await offers.boundingBox())!;
    const footerBox = (await footer.boundingBox())!;
    expect(offerBox.x).toBeGreaterThanOrEqual(cardBox.x);
    expect(offerBox.x + offerBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
    expect(footerBox.y).toBeGreaterThanOrEqual(offerBox.y + offerBox.height - 1);

    for (let index = 0; index < 3; index++) {
      const row = rows.nth(index);
      const brand = row.locator("[data-car-deal-provider-brand]");
      const logo = brand.locator("span").first();
      const name = row.locator("[data-car-deal-provider-name]");
      const info = row.locator("[data-car-rate-info]");
      const price = row.locator("[data-car-deal-provider-price]");
      const action = row.locator("[data-car-deal-provider-view-deal]");
      const r = (await row.boundingBox())!;
      const l = (await logo.boundingBox())!;
      const n = (await name.boundingBox())!;
      const i = (await info.boundingBox())!;
      const p = (await price.boundingBox())!;
      const a = (await action.boundingBox())!;
      expect(l.x + l.width).toBeLessThanOrEqual(n.x + 1);
      expect(i.x).toBeGreaterThanOrEqual(n.x + n.width);
      expect(i.x - (n.x + n.width)).toBeLessThanOrEqual(9);
      expect(p.x).toBeGreaterThanOrEqual(i.x + i.width - 1);
      expect(a.x).toBeGreaterThanOrEqual(p.x + p.width - 1);
      expect(Math.abs((p.y + p.height / 2) - (a.y + a.height / 2))).toBeLessThanOrEqual(11);
      expect(a.height).toBeGreaterThanOrEqual(36);
      expect(r.x).toBeGreaterThanOrEqual(offerBox.x - 1);
      expect(r.x + r.width).toBeLessThanOrEqual(offerBox.x + offerBox.width + 1);
      await expect(row).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(row).toHaveCSS("border-top-width", "1px");
      await expect(action).toHaveCSS("background-color", "rgb(0, 75, 184)");
      await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(action).toHaveAttribute("target", "_blank");
      await expect(action).toHaveAttribute("rel", "noopener noreferrer");
    }
    const firstRateButton = rows.first().locator("[data-car-rate-info]");
    await expect(firstRateButton.locator("svg")).toBeVisible();
    await firstRateButton.click();
    await expect(page.locator("[data-car-rate-dialog][open]")).toBeVisible();
    await page.getByRole("button", { name: "Close rate details" }).click();
    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    await expect(toggle).toContainText("Show fewer offers");
    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(3);
  }

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.cars);
  const desktopCard = page.locator("[data-car-result-card-shell]").first();
  const desktopOffer = desktopCard.locator('[data-region="details"] [data-car-deal-provider-offer]').first();
  await expect(desktopOffer).toBeVisible();
  await expect(desktopOffer).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(desktopOffer.locator("[data-car-deal-provider-view-deal]")).toHaveCSS("background-color", "rgb(0, 75, 184)");
  await expect(desktopCard.locator('[data-region="pricing"]')).toBeVisible();
});

test("Cars list previews three offers with equal collapsed heights and retains ten distinct deals", async ({ page }) => {
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
  let threeRowHeight: number | null = null;
  for (const count of [1, 2, 3, 5, 7, 10]) {
    offerCount = count;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const offers = card.locator("[data-car-card-mobile-offers]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(count);
    await expect(rows.filter({ visible: true })).toHaveCount(Math.min(count, 3));
    const offerMinHeight = (await offers.locator("[data-car-deal-provider-offers]").boundingBox())!.height;
    expect(offerMinHeight).toBeGreaterThanOrEqual(162);
    const disclosure = offers.locator("[data-car-deal-more-slot]");
    const disclosureHeight = (await disclosure.boundingBox())!.height;
    expect(disclosureHeight).toBeGreaterThanOrEqual(32);
    if (count <= 3) {
      if (threeRowHeight !== null) expect(Math.abs(offerMinHeight - threeRowHeight)).toBeLessThanOrEqual(2);
      threeRowHeight = offerMinHeight;
    }
    await expect(card.locator("[data-car-card-mobile-pricing]")).toBeVisible();
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
        expect(fifthRow.y + fifthRow.height - firstRow.y).toBeLessThanOrEqual(285);
      }
      await toggle.click();
      await expect(rows.filter({ visible: true })).toHaveCount(3);
    }
  }
  // Narrow mobile cards retain one horizontal bar per supplier; one- and two-offer
  // cards still reserve the same height as a three-offer preview.
  let stackedMinimumHeight: number | null = null;
  for (const count of [1, 2, 3]) {
    offerCount = count;
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(routes.cars);
    const cards = page.locator("[data-car-result-card-shell]");
    const list = cards.first().locator("[data-car-card-mobile-offers] [data-car-deal-provider-offers]");
    await expect(list.locator("[data-car-deal-provider-offer]")).toHaveCount(count);
    const height = (await list.boundingBox())!.height;
    expect(height).toBeGreaterThanOrEqual(162);
    if (stackedMinimumHeight !== null) expect(Math.abs(height - stackedMinimumHeight)).toBeLessThanOrEqual(2);
    stackedMinimumHeight = height;
  }

});

test("Cars Hotel-style horizontal offer bars stay within the card while desktop T remains intact", async ({ page }) => {
  const firstOffer = carBase.offers[0];
  if (!firstOffer) throw new Error("Missing test offer");
  let offerCount = 3;
  const makeResult = (count: number) => ({
    ...carBase, id: "fixture-inline-offer-bars",
    offers: Array.from({ length: count }, (_, index) => ({
      ...firstOffer, id: "offer-" + index, freeCancellation: true,
      bookingProviderName: "Seller " + index,
      bookingUrl: "https://example.com/offer-" + index,
      pricePerDay: 30 + index, totalPrice: 90 + index * 3,
    })),
  });
  await page.route("**/api/cars/search", route =>
    route.fulfill({ json: { results: [makeResult(offerCount)], status: "available" } }));

  for (const viewport of [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 1365, height: 900 }]) {
    await page.setViewportSize(viewport);
    let threeOfferHeight: number | null = null;
    for (const count of [3, 5]) {
      offerCount = count;
      await page.goto(routes.cars);
      const card = page.locator("[data-car-result-card-shell]").first();
      const mobile = viewport.width < 640;
      const area = mobile ? card.locator("[data-car-card-mobile-offers]") : card.locator('[data-region="details"]');
      const primaryPrice = mobile ? card.locator("[data-car-card-mobile-pricing]") : card.locator('[data-region="pricing"]');
      const rows = area.locator("[data-car-deal-provider-offer]");
      const toggle = area.locator("[data-car-deal-more-offers]").filter({ visible: true });
      await expect(rows).toHaveCount(count);
      await expect(rows.filter({ visible: true })).toHaveCount(3);
      await expect(card.locator("article")).toHaveCSS("background-color", "rgb(255, 255, 255)");
      if (count === 3) await expect(toggle).toHaveCount(0);
      else await expect(toggle).toContainText("+2 more offers");

      const p = (await primaryPrice.boundingBox())!;
      const c = (await card.boundingBox())!;
      const a = (await area.boundingBox())!;
      if (mobile) {
        expect(p.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
        await expect(primaryPrice).toHaveCSS("border-top-width", "1px");
        await expect(area.locator("[data-car-deal-provider-offers]")).toHaveCSS("min-height", "162px");
      } else {
        await expect(area).toHaveCSS("border-top-width", "1px");
        await expect(primaryPrice).toHaveCSS("border-top-width", "1px");
        await expect(primaryPrice).toHaveCSS("border-left-width", "1px");
        const cancellation = card.locator("[data-car-card-desktop-shared-header] [data-car-card-desktop-free-cancellation]");
        const amenities = card.locator("[data-car-card-desktop-header-specs]");
        const cancellationBox = (await cancellation.boundingBox())!;
        const amenitiesBox = (await amenities.boundingBox())!;
        expect(amenitiesBox.y).toBeGreaterThanOrEqual(cancellationBox.y + cancellationBox.height - 1);
        expect(a.y).toBeGreaterThanOrEqual(amenitiesBox.y + amenitiesBox.height - 1);
        expect(Math.abs(a.y - p.y)).toBeLessThanOrEqual(2);
      }

      for (let index = 0; index < 3; index++) {
        const row = rows.nth(index);
        const name = (await row.locator("[data-car-deal-provider-name]").boundingBox())!;
        const price = (await row.locator("[data-car-deal-provider-price]").boundingBox())!;
        const action = row.locator("[data-car-deal-provider-view-deal]");
        const button = (await action.boundingBox())!;
        const infoButton = row.locator("[data-car-rate-info]");
        const info = (await infoButton.count()) ? await infoButton.boundingBox() : null;
        const r = (await row.boundingBox())!;
        expect(r.x).toBeGreaterThanOrEqual(a.x - 1);
        expect(r.x + r.width).toBeLessThanOrEqual(a.x + a.width + 1);
        expect(r.y + r.height).toBeLessThanOrEqual(c.y + c.height + 1);
        expect(name.x + name.width).toBeLessThanOrEqual(price.x + 1);
        if (info) {
          expect(info.x - (name.x + name.width)).toBeLessThanOrEqual(9);
          expect(info.x).toBeGreaterThanOrEqual(name.x + name.width);
        }
        expect(price.x + price.width).toBeLessThanOrEqual(button.x + 1);
        await expect(action).toHaveCSS("background-color", "rgb(0, 75, 184)");
        await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      }
      if (count > 3) {
        await toggle.click();
        await expect(rows.filter({ visible: true })).toHaveCount(count);
        await toggle.click();
        await expect(rows.filter({ visible: true })).toHaveCount(3);
      }
      if (count === 3) threeOfferHeight = c.height;
      else expect(c.height).toBeGreaterThanOrEqual(threeOfferHeight!);
    }
  }
});

test("desktop Cars previews three sellers and expands all additional offers without affecting mobile previews", async ({ page }) => {
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
    expect(listHeight).toBeGreaterThanOrEqual(138);
    if (count <= 3) {
      await expect(more).toHaveCount(0);
    } else {
      await expect(more).toContainText("+" + (count - 3) + " more offers");
      const compactHeight = (await card.boundingBox())!.height;
      await more.click();
      await expect(rows.filter({ visible: true })).toHaveCount(count);
      await expect(more).toHaveAttribute("aria-expanded", "true");
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
      bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
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
    await expect(main).toBeVisible();
    await expect(area.locator("[data-car-rate-terms]")).toHaveCount(0);
    await expect(area.getByText("Rate details", { exact: true })).toHaveCount(0);
    const initialHeight = (await card.boundingBox())!.height;
    await area.locator("[data-car-deal-more-offers]").filter({ visible: true }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
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
    await expect(fixedHeader).toBeVisible();
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
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
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
      await expect(closeButton).toBeHidden();
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
      await expect(heading).toHaveCSS("margin-bottom", "18px");
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
      await expect(closeButton).toBeHidden();
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
    expect(fixedHeaderBefore).not.toBeNull();
    const scrollDistance = await rateScroll.evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(scrollDistance).toBeGreaterThan(40);
    const fixedHeaderAfter = await fixedHeader.boundingBox();
    expect(fixedHeaderAfter).not.toBeNull();
    expect(Math.abs(fixedHeaderAfter!.y - fixedHeaderBefore!.y)).toBeLessThanOrEqual(2);
    if (mobile) {
      await expect(closeButton).toBeVisible();
      await closeButton.click();
    } else {
      // Desktop removes the visible X; clicking the backdrop still dismisses the modal.
      await page.mouse.click(8, 8);
    }
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    const resultRow = page.locator('[data-cars-results-card-list] [data-virtual-index]').first();
    await resultRow.focus(); // Virtualized result rows are programmatically focusable.
    await expect(resultRow).toHaveCSS("outline-style", "none");
    const carBorder = await card.locator("article").first().evaluate(element => getComputedStyle(element).borderTopColor);
    expect(carBorder).not.toBe("rgb(0, 75, 184)");
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
