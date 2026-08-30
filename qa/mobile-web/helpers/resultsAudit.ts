import { expect, type Page } from "@playwright/test";

export type ResultsProduct = "cars" | "flights" | "hotels";

export const resultsProducts = {
  cars: {
    path: "/cars/results?pickupLocation=LAX%20Airport&dropoffLocation=LAX%20Airport&pickupDate=2026-09-10&pickupTime=10%3A00&dropoffDate=2026-09-12&dropoffTime=10%3A00&driverAge=42",
    ready: /results found/i,
    open: /modify search/i,
    close: /close edit search/i,
  },
  flights: {
    path: process.env.QA_FLIGHT_RESULTS_PATH ?? "/flights/results?tripType=round-trip&origin=SFO&destination=LAX&departureDate=2026-09-10&returnDate=2026-09-12&adults=1&children=0&infants=0&travelers=1&cabinClass=economy",
    ready: /results found/i,
    open: /modify flight search/i,
    close: /close edit search/i,
  },
  hotels: {
    path: "/hotels/results?destination=New%20York&checkIn=2026-09-10&checkOut=2026-09-12&guests=2&rooms=1",
    ready: /results found/i,
    open: /edit hotel search/i,
    close: /close edit hotel search/i,
  },
} as const;

async function waitForStableResultsGeometry(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let previous = "";
        let stableFrames = 0;
        let sampledFrames = 0;
        const sample = () => {
          const current = `${scrollX}:${scrollY}:${document.documentElement.scrollHeight}:${document.body.scrollHeight}`;
          stableFrames = current === previous ? stableFrames + 1 : 0;
          previous = current;
          sampledFrames += 1;
          if (stableFrames >= 5 || sampledFrames >= 180) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

export async function prepareResults(page: Page, product: ResultsProduct, scrollY: number) {
  const config = resultsProducts[product];
  await page.goto(config.path, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(config.ready).first()).toBeVisible();
  await waitForStableResultsGeometry(page);
  await page.evaluate((target) => window.scrollTo(0, Math.min(target, document.body.scrollHeight - innerHeight)), scrollY);
  await waitForStableResultsGeometry(page);
  // Flight's compact launcher is driven by a sentinel observer. Re-emit the
  // settled position after late Results layout so the test measures the UI,
  // not observer scheduling during the initial search render.
  const launcher = page.getByRole("button", { name: config.open }).first();
  await expect
    .poll(async () => {
      await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
      return launcher.isVisible();
    })
    .toBe(true);
  await waitForStableResultsGeometry(page);
  return launcher;
}
