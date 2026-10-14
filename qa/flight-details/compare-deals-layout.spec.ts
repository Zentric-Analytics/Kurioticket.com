import { test, expect, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FlightDetailsSuccess } from "../../src/lib/flights/flightDetailsContract";

async function fixture() {
  const { stdout } = await promisify(execFile)(process.execPath, ["--import", "jiti/register", "qa/flight-details/build-kayak-fare-fixture.ts"], { env: { ...process.env, JITI_TSCONFIG_PATHS: "./tsconfig.json", JITI_JSX: "true" } });
  const data: FlightDetailsSuccess = JSON.parse(stdout);
  data.fareChoices[0].deals.forEach((deal, index) => {
    deal.providerName = index ? "Independent Travel Agency International " + "LongName".repeat(12) : "Priceline";
    deal.currency = "NGN"; deal.price = index ? 1234567890 : 419351;
    Object.assign(deal.offer, { bookingProviderName: deal.providerName, price: deal.price, currency: deal.currency });
  });
  return data;
}
async function open(page: Page, data: FlightDetailsSuccess, options: { loading?: boolean } = {}) {
  if (process.env.KAYAK_PREVIEW_STATIC_ROOT) await page.route("**/_next/static/**", async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    try { await route.fulfill({ body: await readFile(path.join(process.env.KAYAK_PREVIEW_STATIC_ROOT!, pathname.replace("/_next/", ""))), contentType: pathname.endsWith(".css") ? "text/css" : "application/javascript" }); }
    catch { await route.continue(); }
  });
  await page.context().addCookies([{ name: "kurioticket_currency", value: "NGN", url: process.env.QA_BASE_URL ?? "http://127.0.0.1:3000" }]);
  await page.addInitScript(() => {
    localStorage.setItem("kurioticket_currency", "NGN");
    Reflect.set(window, "previewHandoffs", []);
    window.open = () => ({ opener: null, document: document.implementation.createHTMLDocument("Preview"), closed: false, close() {}, location: { replace(url: string) { (Reflect.get(window, "previewHandoffs") as string[]).push(url); } } }) as unknown as Window;
  });
  await page.route("**/api/auth/session", route => route.fulfill({ json: {} }));
  await page.route("**/api/account/**", route => route.fulfill({ status: 401, json: {} }));
  let releaseRates = () => {};
  const rates = options.loading ? new Promise<void>(resolve => { releaseRates = resolve; }) : Promise.resolve();
  await page.route("**/api/currency/rates", async route => { await rates; await route.fulfill({ json: { rates: { USD: 1, NGN: 1600 }, baseCurrency: "USD", isFallback: false } }); });
  await page.route("**/api/flights/details?*", route => route.fulfill({ json: data }));
  await page.goto(`/flights/details/${encodeURIComponent(data.flight.id)}?origin=BOS&destination=LAS&tripType=one-way&departureDate=2027-02-10&adults=1&travelers=1&cabinClass=economy`);
  await expect(page.locator('[data-testid="flight-details-hero"]')).toBeVisible();
  const mobile = page.viewportSize()!.width < 640;
  const prefix = mobile ? "mobile" : "desktop";
  const cards = page.locator(`[data-${prefix}-flight-deal-card]`);
  await expect(cards.first()).toBeVisible();
  return { cards, prefix, releaseRates };
}

test("compact inline totals, provider truncation, keyboard selection and exact-offer handoff", async ({ page }) => {
  const data = await fixture();
  const { cards, prefix } = await open(page, data);
  const first = cards.first(), last = cards.last();
  const actions = cards.locator(`[data-${prefix}-flight-deal-action]`);
  await expect(actions.first()).toHaveText("View deal"); await expect(actions.first()).toBeEnabled();
  await expect(actions.first()).toHaveAccessibleName("View deal with Priceline");
  await expect(first.getByRole("radio")).toHaveAccessibleName(/Priceline.*Trip total/);
  await expect(first.locator(`[data-${prefix}-flight-deal-provider]`)).toHaveText("Priceline");
  await expect(first.locator(`[data-${prefix}-flight-deal-price]`)).toContainText("419,351");
  await expect(cards.getByRole("button", { name: /Rate details|info/i })).toHaveCount(0);
  const geometry = await cards.evaluateAll((elements, prefix) => elements.map(element => {
    const group = element.querySelector(`[data-${prefix}-flight-deal-price]`)!;
    const amount = group.querySelector("strong")!, basis = group.querySelector("span")!;
    const action = element.querySelector(`[data-${prefix}-flight-deal-action]`)!;
    const r = element.getBoundingClientRect(), g = group.getBoundingClientRect(), a = amount.getBoundingClientRect(), b = basis.getBoundingClientRect(), c = action.getBoundingClientRect();
    return { display: getComputedStyle(group).display, align: getComputedStyle(group).alignItems, nowrap: getComputedStyle(group).whiteSpace, centerOffset: Math.abs((g.left + g.right - r.left - r.right) / 2), actionLeft: c.left, cardHeight: r.height, groupHeight: g.height, amountRight: a.right, basisLeft: b.left, right: r.right, groupRight: g.right, actionRight: c.right, overflow: document.documentElement.scrollWidth - innerWidth };
  }), prefix);
  for (const g of geometry) {
    expect(g.display).toMatch(/^(inline-)?flex$/); expect(g.align).toBe("baseline"); expect(g.nowrap).toBe("nowrap");
    expect(g.basisLeft).toBeGreaterThanOrEqual(g.amountRight); expect(g.groupHeight).toBeLessThanOrEqual(24);
    expect(g.cardHeight).toBe(page.viewportSize()!.width < 640 ? 76 : 88);
    expect(g.groupRight).toBeLessThanOrEqual(g.right); expect(g.actionRight).toBeLessThanOrEqual(g.right);
    expect(g.overflow).toBe(0);
    expect(g.centerOffset).toBeLessThanOrEqual(1);
    expect(g.groupRight).toBeLessThanOrEqual(g.actionLeft - 3);
  }
  await first.getByRole("radio").focus(); await page.keyboard.press("End");
  await expect(last.getByRole("radio")).toBeFocused(); await expect(last.getByRole("radio")).toBeChecked();
  const selected = data.fareChoices[0].deals[0];
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/redirect", async route => {
    expect(route.request().postDataJSON()).toEqual({ id: selected.offerId, type: "flight", sourcePage: "flight_details" });
    await pending; await route.fulfill({ json: { url: "https://provider.example.test/selected-offer" } });
  });
  await actions.first().click(); await expect(actions.first()).toBeDisabled();
  await expect(actions.first()).toHaveAttribute("aria-busy", "true"); release();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, "previewHandoffs"))).toEqual(["https://provider.example.test/selected-offer"]);
  await expect(actions.first()).toBeEnabled();
});

test("provider logo identity and unavailable checkout preserve the singular action", async ({ page }) => {
  const data = await fixture(); const fare = data.fareChoices[0];
  fare.deals = []; fare.handoff = { available: false };
  Object.assign(fare.offer, { bookingProviderName: "Priceline", price: 419351, currency: "NGN", bookingProviderLogoUrl: "https://content.r9cdn.net/provider.png" });
  await page.route("**/_next/image?*", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="28"><text x="0" y="20">Priceline</text></svg>' }));
  const { cards, prefix } = await open(page, data);
  await expect(cards.first().getByRole("radio")).toHaveAccessibleName(/Priceline.*Trip total/);
  const action = cards.first().locator(`[data-${prefix}-flight-deal-action]`);
  await expect(action).toHaveText("View deal"); await expect(action).toBeDisabled();
  await expect(action).toHaveAccessibleName("View deal with Priceline, checkout unavailable");
  expect(await cards.first().locator("img").count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test("mobile price loading keeps checkout disabled and the trip total group inline", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 640, "Existing mobile price-readiness contract");
  const { cards, prefix, releaseRates } = await open(page, await fixture(), { loading: true });
  const action = cards.first().locator(`[data-${prefix}-flight-deal-action]`);
  await expect(action).toHaveText("View deal"); await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute("aria-busy", "true");
  await expect(action).toHaveAccessibleName("View deal with Priceline, checking price");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  releaseRates(); await expect(action).toBeEnabled(); await expect(action).toHaveText("View deal");
});
