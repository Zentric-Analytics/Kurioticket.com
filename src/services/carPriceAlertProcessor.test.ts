import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { selectCarPriceAlertResult } from "./priceAlertProcessor";

const car = (id: string, offers: NormalizedCarResult["offers"]): NormalizedCarResult => ({ id, offers } as NormalizedCarResult);
const offer = (id: string, totalPrice: number, currency = "USD"): NormalizedCarResult["offers"][number] => ({ id, totalPrice, currency, bookingProviderName: `provider-${id}`, rentalCompanyName: "Rental Co", pricePerDay: 20, taxesAndFeesIncluded: true, payAtPickup: false, freeCancellation: true });

test("car selection filters requested currency and uses total rental price", () => {
  const selected = selectCarPriceAlertResult([car("a", [offer("cheap-eur", 20, "EUR"), offer("usd", 80)])], "usd");
  assert.equal(selected?.price, 80); assert.equal(selected?.currency, "USD");
});

test("car selection is deterministic for equal totals", () => {
  const first = selectCarPriceAlertResult([car("b", [offer("z", 80)]), car("a", [offer("y", 80)])], "USD");
  const reversed = selectCarPriceAlertResult([car("a", [offer("y", 80)]), car("b", [offer("z", 80)])], "USD");
  assert.deepEqual(first, reversed); assert.equal(first?.payload?.resultId, "a");
});

test("car alerts compare only their selected offer and never substitute the cheapest other seller", () => {
  const offers = [offer("a", 40), offer("b", 80), offer("c", 100, "EUR")];
  const scope = { resultId: "result-1", offerId: "b", providerName: "provider-b" };
  const selected = selectCarPriceAlertResult([car("result-1", offers), car("result-2", [offer("b", 15)])], "USD", scope);
  assert.equal(selected?.price, 80);
  assert.deepEqual(selected?.payload, { resultId: "result-1", offerId: "b" });
  assert.equal(selectCarPriceAlertResult([car("result-1", [offer("a", 40)])], "USD", scope), null);
  assert.equal(selectCarPriceAlertResult([car("result-1", [offer("b", 65)])], "USD", { ...scope, providerName: "other" }), null);
  assert.equal(selectCarPriceAlertResult([car("result-1", [offer("b", 65, "EUR")])], "USD", scope), null);
});
