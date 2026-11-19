import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const now = new Date();
const departureDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 13)).toISOString().slice(0, 10);
const returnDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15)).toISOString().slice(0, 10);
const resultsUrl = `/flights/results?${new URLSearchParams({ tripType: "round-trip", origin: "SFO", destination: "LAX", departureDate, returnDate, adults: "1", children: "0", infants: "0", travelers: "1", cabinClass: "economy" })}`;

// Keep the shared fixture's itinerary dates valid for this test's search.
function alignFixtureDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(alignFixtureDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, alignFixtureDates(child)]));
  }
  if (typeof value === "string") {
    return value.replace(/^2026-11-13(?=T)/, departureDate).replace(/^2026-11-15(?=T)/, returnDate);
  }
  return value;
}

test.beforeEach(async ({ page, request }) => {
  if (process.env.QA_LOCAL_CHUNKS) {
    await page.route("http://127.0.0.1:3020/_next/static/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      try {
        await route.fulfill({ body: await readFile(`.next/dev/${pathname.replace("/_next/", "")}`), contentType: pathname.endsWith(".js") ? "application/javascript" : pathname.endsWith(".css") ? "text/css" : "application/octet-stream" });
      } catch { await route.continue(); }
    });
  }
  await page.route("**/api/flights/search", async route => {
    const fixture = await request.post("http://127.0.0.1:3011/api/flights/search");
    await route.fulfill({ json: alignFixtureDates(await fixture.json()) });
  });
});

for (const width of [1024, 1440]) {
  test(`desktop Flight page and both filter cards use white surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(resultsUrl);
    const main = page.locator("[data-flight-results-main]");
    const primary = main.locator("[data-flight-desktop-filter-surface]");
    const popular = main.locator("[data-flight-sticky-popular-filters]");
    await expect(main).toBeVisible();
    await expect(primary).toBeVisible();
    await expect(popular).toBeVisible();
    for (const surface of [main, primary, popular]) {
      expect(await surface.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
    }
    const checkbox = popular.getByRole("checkbox", { name: /^Better comfort / });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await primary.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(checkbox).not.toBeChecked();
    await page.screenshot({ path: test.info().outputPath(`flight-surfaces-${width}.jpg`), type: "jpeg", quality: 65 });
  });
}

for (const width of [390, 1023]) {
  test(`Flight non-desktop backgrounds are retained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(resultsUrl);
    const main = page.locator("[data-flight-results-main]");
    await expect(main).toBeVisible();
    expect(await main.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(width < 640 ? "rgb(245, 247, 251)" : "rgb(243, 246, 250)");
    await expect(main.locator("[data-flight-desktop-filter-surface]")).toBeHidden();
    await page.screenshot({ path: test.info().outputPath(`flight-surfaces-${width}.jpg`), type: "jpeg", quality: 65 });
  });
}
