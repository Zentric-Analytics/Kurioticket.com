import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import { formatFlightCardPrice } from "./flightCardPrice";

function cardPrice(amount: number, currency = "NGN") {
  return formatFlightCardPrice({
    amount,
    currency,
    formatted: formatCurrency(amount, currency, { maximumFractionDigits: 0 }),
    locale: "en-US",
  });
}

test("FlightCard preserves complete normal and seven-digit NGN prices", () => {
  assert.deepEqual(cardPrice(89_482), { formatted: "NGN\u00a089,482", size: "normal" });
  assert.deepEqual(cardPrice(837_706), { formatted: "NGN\u00a0837,706", size: "normal" });
  assert.deepEqual(cardPrice(9_999_999), { formatted: "NGN\u00a09,999,999", size: "large" });
});

test("FlightCard compacts only eight-digit and larger NGN prices", () => {
  assert.deepEqual(cardPrice(10_000_000), { formatted: "NGN\u00a010M", size: "compact" });
  assert.deepEqual(cardPrice(25_850_000), { formatted: "NGN\u00a025.9M", size: "compact" });
  assert.deepEqual(cardPrice(105_000_000), { formatted: "NGN\u00a0105M", size: "compact" });
});

test("FlightCard applies the same controlled fallback to other currencies", () => {
  assert.deepEqual(cardPrice(25_850_000, "USD"), { formatted: "$25.9M", size: "compact" });
  assert.deepEqual(cardPrice(105_000_000, "EUR"), { formatted: "€105M", size: "compact" });
  assert.deepEqual(cardPrice(9_999_999, "JPY"), { formatted: "¥9,999,999", size: "large" });
});
