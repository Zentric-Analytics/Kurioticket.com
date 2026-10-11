import { test, expect } from "@playwright/test";
import { buildStaticCarResults } from "../../src/services/travel/staticCarResults";

test("flight results expose all 45 offers without pagination, including old page URLs", async ({ page }) => {
  const results = Array.from({ length: 45 }, (_, index) => ({
    id: `qa-continuous-${index}`, provider: "QA Fixture", airlineName: "Test Air", airlineCode: "TA",
    originAirport: "SFO", destinationAirport: "LAX", departureTime: "2030-10-12T08:00:00Z",
    arrivalTime: "2030-10-12T10:00:00Z", duration: "2h", durationMinutes: 120, stops: 0,
    layovers: [], cabinClass: "economy", baggageInfo: "Carry-on included", refundInfo: "Test policy",
    price: 100 + index, currency: "USD", bookingUrl: "", partnerRedirectUrl: "",
    valueScore: 80, riskScore: 5, comfortScore: 80, travelConfidenceScore: 90, travelEffortScore: 15,
    recommendationReasons: [], badges: [],
    searchPolicy: { source: "duffel", bookable: true, action: { kind: "internal-detail", href: `/flights/details/qa-continuous-${index}`, enabled: true } },
  }));
  await page.route("**/api/flights/search", route => route.fulfill({ json: {
    results, warnings: [], status: "available", resultsCacheValidUntil: Date.now() + 600_000,
  } }));
  await page.goto("/flights/results?tripType=one-way&origin=SFO&destination=LAX&departureDate=2030-10-12&adults=1&children=0&infants=0&travelers=1&cabinClass=economy&page=3");
  const list = page.locator("[data-flight-results-card-list]").filter({ visible: true });
  await expect(list).toHaveCount(1);
  await expect.poll(async () => list.locator('a[href*="/flights/details/qa-continuous-"]').evaluateAll(links =>
    new Set(links.map(link => (link as HTMLAnchorElement).pathname)).size)).toBe(45);
  await expect(page.getByRole("navigation", { name: "Flight results pages" })).toHaveCount(0);
  const last = list.locator('a[href*="/flights/details/qa-continuous-44"]').filter({ visible: true }).first();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test("Rejected car criteria retain the editable results shell instead of retrying", async ({ page }) => {
  let searches = 0;
  await page.route("**/api/cars/search", route => {
    searches++;
    return route.fulfill({ status: 400, json: { error: "Invalid car search parameters." } });
  });
  await page.goto("/cars/results?pickupLocation=BOS&dropoffLocation=BOS&pickupDate=2020-10-12&dropoffDate=2020-10-17&driverAge=18-70");
  await expect(page.getByRole("button", { name: "Retry search", exact: true })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "pickup" }).filter({ visible: true })).toBeVisible();
  expect(searches).toBe(1);
});

test("Cars exits loading through JSON inventory and allows explicit retry after failure", async ({ page }) => {
  const search = { pickupLocation: "BOS", dropoffLocation: "BOS", pickupDate: "2030-10-12", pickupTime: "10:00",
    dropoffDate: "2030-10-17", dropoffTime: "10:00", driverAge: "18-70" };
  const templates = buildStaticCarResults(search);
  const cars = Array.from({ length: 810 }, (_, index) => ({
    ...templates[index % templates.length], id: `synthetic-car-${index}`,
  }));
  expect(cars.length).toBeGreaterThan(0);
  let searches = 0;
  await page.route("**/api/cars/search", route => {
    searches++;
    expect(route.request().postDataJSON()).toMatchObject(search);
    return searches === 1 ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { results: cars, status: "available" } });
  });
  await page.goto(`/cars/results?${new URLSearchParams(search)}`);
  await expect(page.getByRole("alert").filter({ hasText: "couldn’t complete" })).toBeVisible();
  expect(searches).toBe(1);
  await page.getByRole("button", { name: "Retry search", exact: true }).click();
  await expect(page.getByText(`${cars.length} results found`, { exact: true }).filter({ visible: true })).toBeVisible();
  expect(searches).toBe(2);
  await expect(page.getByRole("heading", { name: "Searching the best cars for you" })).toHaveCount(0);
});

test("continuous results preserve a later hotel on details return without another provider search", async ({ page }, testInfo) => {
  let searches = 0;
  const hotels = Array.from({ length: 25 }, (_, i) => ({
    id: `kayak-sandbox:test:${i}`, provider: "KAYAK sandbox", name: `Synthetic Hotel ${i}`,
    inventoryKind: "bookable", pricePerNight: 100 + i, currency: "USD", totalPrice: 100 + i,
    partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout",
    bookingUrl: "https://affiliates.kayak.com/sandbox-clickout", rating: 4,
    location: "Test city", amenities: [], roomType: "Test room", cancellationInfo: "Test policy",
    valueScore: 80, travelConfidenceScore: 80, arrivalSuitabilityScore: 80, recommendationReasons: [], badges: [],
  }));
  await page.route("**/api/hotels/search", route => {
    searches++;
    return route.fulfill({ json: { results: hotels, warnings: [] } });
  });
  await page.route("**/api/hotels/details?**", route => {
    const id = new URL(route.request().url()).searchParams.get("id");
    return route.fulfill({ json: { hotel: hotels.find(hotel => hotel.id === id), propertyDetails: null, providerDetails: null, roomOptions: [], relatedHotels: [] } });
  });
  await page.goto("/hotels/results?destination=New+York&checkIn=2030-10-12&checkOut=2030-10-13&guests=1&rooms=1");
  await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
  const cards = page.locator("[data-hotel-continuous-results] > section");
  await expect(cards).toHaveCount(25);
  await expect(page.getByRole("navigation", { name: "Hotel results pages" })).toHaveCount(0);
  const laterHotel = cards.filter({ has: page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true }) });
  await laterHotel.scrollIntoViewIfNeeded();
  const searchesBeforeDetails = searches;
  await laterHotel.getByRole("link", { name: "View hotel", exact: true }).click();
  await expect(page).toHaveURL(/\/hotels\/details\//);
  await expect(page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
  await expect(cards).toHaveCount(25);
  expect(searches).toBe(searchesBeforeDetails);
  await expect(laterHotel).toBeInViewport();
  await laterHotel.getByRole("link", { name: "View hotel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true })).toBeVisible();
  const returnLink = page.getByRole("link", { name: "Back to hotel results", exact: true });
  if (testInfo.project.name === "mobile") {
    await expect(returnLink).toBeVisible();
    await returnLink.click();
    await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
    await expect(cards).toHaveCount(25);
    await expect(laterHotel).toBeInViewport();
    expect(searches).toBe(searchesBeforeDetails);
  }
});
