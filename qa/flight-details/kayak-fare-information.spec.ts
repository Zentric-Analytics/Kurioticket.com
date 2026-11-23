import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { FlightDetailsSuccess } from "../../src/lib/flights/flightDetailsContract";

async function richResponse(): Promise<FlightDetailsSuccess> {
  // Run server normalization through its normal TS loader, outside Playwright's CJS transform.
  const { stdout } = await promisify(execFile)(process.execPath, ["--import", "jiti/register", "qa/flight-details/build-kayak-fare-fixture.ts"], {
    cwd: process.cwd(), env: { ...process.env, JITI_TSCONFIG_PATHS: "./tsconfig.json", JITI_JSX: "true" },
  });
  return JSON.parse(stdout);
}
async function open(page: Page, fixture: FlightDetailsSuccess) {
  // An optional local static root handles the session proxy during isolated development previews.
  if (process.env.KAYAK_PREVIEW_STATIC_ROOT) await page.route("**/_next/static/**", async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    try { await route.fulfill({ body: await readFile(path.join(process.env.KAYAK_PREVIEW_STATIC_ROOT!, pathname.replace("/_next/", ""))), contentType: pathname.endsWith(".css") ? "text/css" : "application/javascript" }); }
    catch { await route.continue(); }
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: {} }));
  await page.route("**/api/account/**", route => route.fulfill({ status: 401, json: { error: "Unauthorized" } }));
  await page.route("**/api/currency/rates", route => route.fulfill({ json: { rates: { USD: 1 }, baseCurrency: "USD", isFallback: false } }));
  await page.route("**/api/flights/details?*", route => route.fulfill({ json: fixture }));
  await page.goto(`/flights/details/${encodeURIComponent(fixture.flight.id)}?origin=BOS&destination=LAS&tripType=one-way&departureDate=2027-02-10&adults=1&travelers=1&cabinClass=economy`);
  await expect(page.locator('[data-testid="flight-details-hero"]')).toBeVisible();
  await expect(page.locator('[data-supplier-information]')).toHaveCount(0);
  await expect(page.getByText("Supplier information", { exact: true })).toHaveCount(0);
}
async function tab(page: Page, name: string, id: string) {
  await page.getByRole("tab", { name, exact: true }).filter({ visible: true }).click();
  return page.locator(`[id="fare-panel-${id}"], [data-mobile-native-fare-information-active-content]`).filter({ visible: true });
}

test("rich KAYAK facts occupy the existing tabs and switching sellers refreshes the active price", async ({ page }) => {
  const fixture = await richResponse();
  expect(JSON.stringify(fixture)).not.toMatch(/suppliedFacts|segment Fares|provider-segment|1795914000000|rawBadge|futureUnknownField/);
  await open(page, fixture);
  let content = await tab(page, "Compare deals", "deals");
  await expect(content.getByText("KAYAK sandbox", { exact: true })).toBeVisible();
  await expect(content.getByText("Alternate seller", { exact: true })).toBeVisible();
  const action = content.getByRole("button", { name: /View deals|View deal|Continue/i });
  expect(await action.count()).toBeGreaterThan(0);
  content = await tab(page, "Fare details", "details");
  for (const fact of ["Boeing 737 MAX 8", "Boeing 787-8 Dreamliner", '32" seat pitch · 3-3 seat layout', "Power & USB outlets", "Power (some rows) & USB", "Meal provided", "Streaming entertainment", "Overnight flight (red-eye)"]) await expect(content.getByText(fact, { exact: true })).toBeVisible();
  await expect(content.getByText("Fast web browsing (fee)", { exact: true })).toHaveCount(0);
  await expect(content.getByText("$202", { exact: true })).toBeVisible();
  content = await tab(page, "Fare conditions", "conditions");
  for (const fact of ["Airline baggage policy", "Up to 21 × 15 × 7 in", "Up to 21 × 15 × 9 in", "Up to 62 in total", "Up to 79 in total", "1 carry-on included"]) await expect(content.getByText(fact, { exact: true })).toBeVisible();
  await expect(content.getByText(/Example Airways/)).toBeVisible(); await expect(content.getByText(/Example Connect/)).toBeVisible();
  content = await tab(page, "Optional extras", "extras");
  await expect(content.getByText("Fast web browsing (fee)", { exact: true })).toBeVisible();
  await expect(content.getByText("Available for a fee", { exact: true })).toBeVisible();
  await expect(content.getByText("Preferred seat", { exact: true })).toBeVisible();
  await expect(content.getByText("$0", { exact: true })).toHaveCount(0);
  await tab(page, "Compare deals", "deals");
  await page.getByRole("radio", { name: /Alternate seller/ }).filter({ visible: true }).click();
  content = await tab(page, "Fare details", "details");
  await expect(content.getByText("$211", { exact: true })).toBeVisible(); await expect(content.getByText("$202", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/segment Fares|quality Items|bag Number|equipment Type Name|1795914000000/);
});

test("missing KAYAK data keeps clean empty states and airline policy alone does not create entitlement", async ({ page }) => {
  const fixture = await richResponse();
  const policies = fixture.flight.providerDetails!.airlineBaggagePolicies;
  fixture.flight.fareTerms = [];
  fixture.flight.providerDetails = { airlineBaggagePolicies: policies };
  fixture.flight.legs?.forEach(leg => leg.segments.forEach(segment => { segment.cabinDetails = undefined; segment.aircraft = undefined; }));
  fixture.fareChoices = [{ ...fixture.fareChoices[0], offer: fixture.flight, deals: [], distinguishingTerms: [] }];
  await open(page, fixture);
  let content = await tab(page, "Fare details", "details");
  await expect(content.getByText("Additional cabin details not supplied by the provider.", { exact: true })).toBeVisible();
  content = await tab(page, "Fare conditions", "conditions");
  await expect(content.getByText("Airline baggage policy", { exact: true })).toBeVisible();
  await expect(content).not.toContainText(/carry-on included|checked bag included/i);
  content = await tab(page, "Optional extras", "extras");
  await expect(content.getByText("No optional services were supplied by this provider.", { exact: true })).toBeVisible();
});

test("Duffel cabin amenities, conditions and priced extras keep their existing behavior", async ({ page }) => {
  const fixture = await richResponse();
  fixture.flight.provider = "Duffel"; fixture.flight.fareTerms = [];
  fixture.flight.legs![0].segments[0].cabinDetails = [{ cabinClass: "economy", fareBrandName: "Basic", amenities: { wifi: { state: "included" }, power: { state: "included" }, seat: { pitch: "32" } } }];
  fixture.flight.providerDetails = { price: { baseAmount: 200, baseCurrency: "USD", taxAmount: 109, taxCurrency: "USD", totalAmount: 309, totalCurrency: "USD" }, conditions: [{ category: "change", scope: "trip", state: "allowed", penaltyAmount: 25, penaltyCurrency: "USD" }], optionalServices: [{ type: "baggage", description: "Additional baggage available", price: 30, currency: "USD" }] };
  fixture.fareChoices = [{ ...fixture.fareChoices[0], offer: fixture.flight, deals: [] }];
  await open(page, fixture);
  let content = await tab(page, "Fare details", "details");
  await expect(content.getByText("32 in pitch", { exact: true })).toBeVisible();
  await expect(content.getByText("Taxes", { exact: true })).toBeVisible();
  await expect(content.getByText("$109", { exact: true })).toBeVisible();
  content = await tab(page, "Fare conditions", "conditions");
  await expect(content.getByText(/\$25 penalty/)).toBeVisible();
  content = await tab(page, "Optional extras", "extras");
  await expect(content.getByText("Additional baggage available", { exact: true })).toBeVisible();
  await expect(content.getByText("$30", { exact: true })).toBeVisible();
});
