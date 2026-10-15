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
  await expect(noCancellation.locator("[data-car-card-desktop-primary-specs]")).toBeVisible();
  await expect(noCancellation.locator("[data-car-card-mobile-main]")).not.toBeVisible();
});


test("Cars offer controls are legible and easy to tap on small phones without overflowing the main price rail", async ({ page }) => {
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
    const rail = card.locator("[data-car-card-mobile-pricing]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ visible: true })).toHaveCount(5);
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toContainText("+2 more offers");
    await expect(rail).toBeVisible();

    const toggleTextSize = await toggle.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(toggleTextSize).toBeGreaterThanOrEqual(10);
    expect(toggleTextSize).toBeLessThanOrEqual(12);
    const railRect = (await rail.boundingBox())!;
    const row = rows.first();
    const name = row.locator("[data-car-deal-provider-name]");
    const price = row.locator("[data-car-deal-provider-price]");
    const viewDeal = row.locator("[data-car-deal-provider-view-deal]");
    const info = row.locator("[data-car-rate-info]");
    const nameRect = (await name.boundingBox())!;
    const priceRect = (await price.boundingBox())!;
    const linkRect = (await viewDeal.boundingBox())!;
    const infoRect = (await info.boundingBox())!;

    for (const [locator, minimumSize] of [[name, 11], [price, 12], [viewDeal, 12]] as const) {
      const size = await locator.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      expect(size).toBeGreaterThanOrEqual(minimumSize);
    }
    expect(nameRect.x + nameRect.width).toBeLessThanOrEqual(priceRect.x + 1);
    expect(linkRect.height).toBeGreaterThanOrEqual(36);
    expect(infoRect.height).toBeGreaterThanOrEqual(36);
    expect(infoRect.width).toBeGreaterThanOrEqual(32);
    expect(linkRect.x + linkRect.width).toBeLessThanOrEqual(infoRect.x + 1);
    expect(infoRect.x + infoRect.width).toBeLessThanOrEqual(railRect.x + 1);
    if (width < 360) {
      expect(linkRect.y).toBeGreaterThanOrEqual(priceRect.y + priceRect.height - 1);
    } else {
      expect(priceRect.x + priceRect.width).toBeLessThanOrEqual(linkRect.x + 1);
    }
    const infoSvg = info.locator("svg");
    await expect(infoSvg).toBeVisible();
    const iconWidth = await infoSvg.evaluate(element => element.getBoundingClientRect().width);
    expect(iconWidth).toBeGreaterThanOrEqual(16);

    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    await expect(toggle).toContainText("Show fewer offers");
    const expandedToggleSize = await toggle.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    expect(expandedToggleSize).toBe(toggleTextSize);
    await toggle.click();
    await expect(rows.filter({ visible: true })).toHaveCount(5);
  }

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto(routes.cars);
  const desktopCard = page.locator("[data-car-result-card-shell]").first();
  const desktopOffer = desktopCard.locator('[data-region="details"] [data-car-deal-provider-offer]').first();
  await expect(desktopOffer).toBeVisible();
  await expect(desktopCard.locator('[data-region="pricing"]')).toBeVisible();
  const desktopFont = await desktopOffer.locator("[data-car-deal-provider-name]").evaluate(
    element => parseFloat(getComputedStyle(element).fontSize),
  );
  expect(desktopFont).toBe(10);
});


test("Cars list defaults to five offers, hides expand control at five, and preserves ten distinct deals", async ({ page }) => {
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
  for (const count of [1, 3, 5, 7, 10]) {
    offerCount = count;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(routes.cars);
    const card = page.locator("[data-car-result-card-shell]").first();
    const offers = card.locator("[data-car-card-mobile-offers]");
    const rows = offers.locator("[data-car-deal-provider-offer]");
    const toggle = offers.locator("[data-car-deal-more-offers]").filter({ visible: true });
    await expect(rows).toHaveCount(count);
    await expect(rows.filter({ visible: true })).toHaveCount(Math.min(count, 5));
    await expect(card.locator("[data-car-card-mobile-pricing]")).toBeVisible();
    if (count <= 5) {
      await expect(toggle).toHaveCount(0);
    } else {
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toContainText("+" + (count - 5) + " more offers");
      await toggle.click();
      await expect(rows.filter({ visible: true })).toHaveCount(count);
      await expect(toggle).toContainText("Show fewer offers");
      await toggle.click();
      await expect(rows.filter({ visible: true })).toHaveCount(5);
    }
    if (count >= 5) {
      const firstRow = (await rows.first().boundingBox())!;
      const fifthRow = (await rows.nth(4).boundingBox())!;
      expect(fifthRow.y + fifthRow.height - firstRow.y).toBeLessThanOrEqual(190);
    }
  }
});

test("Cars comparison rows stay horizontal within the existing card beside the main price on mobile and desktop", async ({ page }) => {
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
      const mainPrice = mobile
        ? card.locator("[data-car-card-mobile-pricing]")
        : card.locator('[data-region="pricing"]');

      const rows = dealArea.locator("[data-car-deal-provider-offer]");
      const rightSpecLabel = mobile
        ? card.locator("[data-car-card-mobile-specs] ul").nth(1).locator("li span").first()
        : dealArea.locator("[data-car-card-desktop-primary-specs] li").nth(1).locator("span").first();
      await expect(rows).toHaveCount(count);
      const initiallyVisible = Math.min(count, 5);
      await expect(rows.filter({ visible: true })).toHaveCount(initiallyVisible);
      if (count <= 5) {
        await expect(dealArea.locator("[data-car-deal-more-offers]").filter({ visible: true })).toHaveCount(0);
      }
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
        if (!mobile) expect(Math.abs(link!.x - rightSpecRect!.x)).toBeLessThanOrEqual(3);
        const providerCenterY = provider!.y + provider!.height / 2;
        const linkCenterY = link!.y + link!.height / 2;
        expect(Math.abs(providerCenterY - linkCenterY)).toBeLessThanOrEqual(3);
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
    await expect(rows.filter({ visible: true })).toHaveCount(5);
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
    await expect(dialog.getByRole("button", { name: "Close rate details" })).not.toBeFocused();
    const fixedHeader = dialog.locator("[data-car-rate-header]");
    const rateScroll = dialog.locator("[data-car-rate-scroll]");
    await expect(fixedHeader).toBeVisible();
    await expect(rateScroll).toBeVisible();
    await expect(rateScroll).toHaveCSS("overflow-y", "auto");
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    if (mobile) {
      // A true mobile full-height sheet must fill the usable browser viewport.
      expect(Math.abs(dialogBox!.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.width - viewport.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(dialogBox!.height - viewport.height)).toBeLessThanOrEqual(2);
      await expect(dialog).toHaveCSS("border-top-left-radius", "0px");
    } else {
      // Desktop retains the intentionally compact centered dialog.
      expect(dialogBox!.width).toBeLessThanOrEqual(541);
      expect(dialogBox!.height).toBeLessThan(viewport.height * 0.85);
    }
    await expect(dialog.getByText("Airport Pickup 0", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Airport Pickup 1", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Estimated total:", { exact: false })).toBeVisible();
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
    await expect(dialog.locator("[data-car-rate-source-note]")).toContainText("KAYAK sandbox");
    // Outline icons are visible to sighted customers, decorative to assistive tech,
    // and placed to the left of each heading without changing the supplier content.
    for (const sectionId of ["payment", "policies", "pickup", "driver", "vehicle"]) {
      const section = dialog.locator(`[data-car-rate-section="${sectionId}"]`);
      const heading = section.locator("h3");
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
    const closeButton = dialog.getByRole("button", { name: "Close rate details" });
    await expect(closeButton).toHaveCSS("border-top-width", "0px");
    await expect(closeButton).toHaveCSS("box-shadow", "none");
    await expect(closeButton).toHaveCSS("outline-style", "none");
    // Keyboard-only focus remains visible as a subtle background, not a blue ring.
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    await expect(closeButton).toHaveCSS("background-color", "rgb(241, 245, 249)");
    await expect(closeButton).toHaveCSS("box-shadow", "none");
    const firstValue = dialog.locator("[data-car-rate-fact-value]").first();
    await expect(firstValue).toHaveCSS("font-weight", "400");
    await expect(firstValue).toHaveCSS("color", "rgb(51, 65, 85)");
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
    await expect(dialog.getByRole("button", { name: "Close rate details" })).toBeVisible();
    await dialog.getByRole("button", { name: "Close rate details" }).click();
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
