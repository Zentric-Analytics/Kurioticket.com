import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { formatFlightResultCurrency } from "@/lib/currency/formatCurrency";
import { formatFlightCardPrice } from "./flightCardPrice";

function cardPrice(amount: number, currency = "NGN") {
  return formatFlightCardPrice({
    amount,
    formatted: formatFlightResultCurrency(amount, currency, {
      maximumFractionDigits: 0,
      locale: "en-US",
    }),
  });
}

test("FlightCard preserves complete normal and seven-digit NGN prices", () => {
  assert.deepEqual(cardPrice(89_482), { formatted: "₦\u00a089,482", size: "normal" });
  assert.deepEqual(cardPrice(837_706), { formatted: "₦\u00a0837,706", size: "normal" });
  assert.deepEqual(cardPrice(9_999_999), { formatted: "₦\u00a09,999,999", size: "large" });
});

test("FlightCard preserves full eight-digit and larger NGN prices", () => {
  assert.deepEqual(cardPrice(9_500_000), { formatted: "₦\u00a09,500,000", size: "large" });
  assert.deepEqual(cardPrice(13_400_000), { formatted: "₦\u00a013,400,000", size: "compact" });
  assert.deepEqual(cardPrice(105_000_000), { formatted: "₦\u00a0105,000,000", size: "compact" });
});

test("FlightCard preserves full large prices in other currencies", () => {
  assert.deepEqual(cardPrice(12_400_000, "USD"), { formatted: "$12,400,000", size: "compact" });
  assert.deepEqual(cardPrice(10_200_000, "EUR"), { formatted: "€10,200,000", size: "compact" });
  assert.deepEqual(cardPrice(15_800_000, "GBP"), { formatted: "£15,800,000", size: "compact" });
  assert.deepEqual(cardPrice(12_400_000, "CAD"), { formatted: "$12,400,000", size: "compact" });
  assert.deepEqual(cardPrice(12_400_000, "AUD"), { formatted: "$12,400,000", size: "compact" });
  assert.deepEqual(cardPrice(9_999_999, "JPY"), { formatted: "¥9,999,999", size: "large" });
});

test("FlightCard size classification never changes the supplied numeric formatting", () => {
  for (const price of [cardPrice(9_500_000), cardPrice(13_400_000), cardPrice(105_000_000)]) {
    assert.doesNotMatch(price.formatted, /\d(?:M|K|B)\b/);
  }
  assert.doesNotMatch(
    readFileSync(new URL("./flightCardPrice.ts", import.meta.url), "utf8"),
    /notation:\s*["']compact["']|formatFlightResultCurrency/,
  );
});
