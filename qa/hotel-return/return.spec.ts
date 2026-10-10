import { test, expect } from "@playwright/test";
import { buildStaticCarResults } from "../../src/services/travel/staticCarResults";

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

test("details return preserves results and page without another provider search", async ({ page }, testInfo) => {
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
  await page.getByRole("navigation", { name: "Hotel results pages" }).getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 21–25", { exact: true }).filter({ visible: true })).toBeVisible();
  const searchesBeforeDetails = searches;
  await page.getByRole("link", { name: "View hotel", exact: true }).first().click();
  await expect(page).toHaveURL(/\/hotels\/details\//);
  await expect(page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
  await expect(page.getByText("Showing 21–25", { exact: true }).filter({ visible: true })).toBeVisible();
  expect(searches).toBe(searchesBeforeDetails);
  await page.getByRole("link", { name: "View hotel", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true })).toBeVisible();
  const returnLink = page.getByRole("link", { name: "Back to hotel results", exact: true });
  if (testInfo.project.name === "mobile") {
    await expect(returnLink).toBeVisible();
    await returnLink.click();
    await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
    await expect(page.getByText("Showing 21–25", { exact: true }).filter({ visible: true })).toBeVisible();
    expect(searches).toBe(searchesBeforeDetails);
  }
});
