import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { selectCarPriceAlertResult } from "./priceAlertProcessor";

const car = (id: string, offers: NormalizedCarResult["offers"]): NormalizedCarResult => ({ id, offers } as NormalizedCarResult);
const offer = (id: string, totalPrice: number, currency = "USD"): NormalizedCarResult["offers"][number] => ({ id, totalPrice, currency, bookingProviderName: `provider-${id}`, rentalCompanyName: "Rental Co", pricePerDay: 20, taxesAndFeesIncluded: true, payAtPickup: false, freeCancellation: true });

test("car selection keeps exact-currency behavior when rates are unavailable", () => {
  const selected = selectCarPriceAlertResult([car("a", [offer("cheap-eur", 20, "EUR"), offer("usd", 80)])], "usd");
  assert.equal(selected?.price, 80); assert.equal(selected?.currency, "USD");
});

test("car selection converts mixed provider currencies into the alert currency before comparison", () => {
  const selected = selectCarPriceAlertResult(
    [car("a", [offer("eur", 92, "EUR"), offer("usd", 110, "USD")])],
    "GBP",
    { USD: 1, EUR: 0.92, GBP: 0.79 },
  );
  assert.equal(selected?.currency, "GBP");
  assert.equal(selected?.payload?.providerCurrency, "EUR");
  assert.equal(selected?.payload?.providerPrice, 92);
  assert.ok(Math.abs((selected?.price ?? 0) - 79) < 0.000001);
});

test("car selection is deterministic for equal converted totals", () => {
  const rates = { USD: 1, EUR: 0.5 };
  const first = selectCarPriceAlertResult([car("b", [offer("z", 40, "EUR")]), car("a", [offer("y", 80)])], "USD", rates);
  const reversed = selectCarPriceAlertResult([car("a", [offer("y", 80)]), car("b", [offer("z", 40, "EUR")])], "USD", rates);
  assert.deepEqual(first, reversed); assert.equal(first?.payload?.resultId, "a");
});
