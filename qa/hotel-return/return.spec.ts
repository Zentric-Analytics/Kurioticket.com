import { test, expect } from "@playwright/test";

test("details return preserves results and page without another provider search", async ({ page }) => {
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
  await page.getByRole("navigation", { name: "Hotel results pages" }).getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByText("Showing 21–25", { exact: true })).toBeVisible();
  const searchesBeforeDetails = searches;
  await page.getByRole("link", { name: "View hotel", exact: true }).first().click();
  await expect(page).toHaveURL(/\/hotels\/details\//);
  await expect(page.getByRole("heading", { name: "Synthetic Hotel 20", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "25 results found" })).toBeVisible();
  await expect(page.getByText("Showing 21–25", { exact: true })).toBeVisible();
  expect(searches).toBe(searchesBeforeDetails);
});
