import assert from "node:assert/strict";
import test from "node:test";
import { currencyAccessibilityLabel, currencyForCountry, displayMarketPrice, displayPrice, formatCurrency, formatMarketCurrency, isDisplayPriceCurrent, resolveDisplayCurrency, resolveDisplayCurrencyContext } from "./displayCurrency";

function withoutFormatToParts(run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, "formatToParts");
  try {
    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", {
      value: undefined,
      configurable: true,
    });
    run();
  } finally {
    if (descriptor) Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", descriptor);
    else delete (Intl.NumberFormat.prototype as { formatToParts?: unknown }).formatToParts;
  }
}

function withIsoCurrencyParts(run: () => void) {
  const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, "formatToParts");
  try {
    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", {
      value() {
        return [
          { type: "currency", value: this.resolvedOptions().currency ?? "NGN" },
          { type: "literal", value: " " },
          { type: "integer", value: "91" },
          { type: "group", value: "," },
          { type: "integer", value: "234" },
        ];
      },
      configurable: true,
    });
    run();
  } finally {
    if (descriptor) Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", descriptor);
    else delete (Intl.NumberFormat.prototype as { formatToParts?: unknown }).formatToParts;
  }
}

test("fare formatting uses clean symbols without country-letter prefixes", () => {
  assert.equal(formatCurrency(158811, "NGN"), "₦158,811");
  assert.equal(formatCurrency(420, "USD"), "$420");
  assert.equal(formatCurrency(420, "CAD"), "$420");
  assert.equal(formatCurrency(420, "AUD"), "$420");
  assert.equal(formatCurrency(1240, "GBP"), "£1,240");
  assert.equal(formatCurrency(980, "EUR"), "€980");
  assert.doesNotMatch(formatCurrency(420, "USD"), /US\$/);
  assert.doesNotMatch(formatCurrency(420, "AUD"), /A\$/);
  assert.doesNotMatch(formatCurrency(420, "CAD"), /CA\$/);
  assert.equal(formatCurrency(1000, "XYZ"), "1,000 XYZ");
  assert.doesNotMatch(formatCurrency(1000, "XYZ"), /^XYZ /);
});

test("successful Intl parts cannot replace canonical product currency labels with ISO codes", () => {
  withIsoCurrencyParts(() => {
    assert.equal(formatCurrency(91234, "NGN"), "₦91,234");
    assert.equal(formatCurrency(420, "USD"), "$420");
    assert.equal(formatCurrency(420, "CAD"), "$420");
    assert.equal(formatCurrency(420, "AUD"), "$420");
    assert.equal(formatCurrency(1240, "GBP"), "£1,240");
    assert.equal(formatCurrency(980, "EUR"), "€980");

    const fare = displayPrice(91234, "NGN", "NGN", { NGN: 1 });
    assert.equal(fare.formatted, "₦91,234");
    assert.equal(fare.providerAmount, 91234);
    assert.equal(fare.providerCurrency, "NGN");
  });
});

test("display fares include a spoken currency name without duplicating visual copy", () => {
  const fare = displayPrice(158811, "NGN", "NGN", { NGN: 1 });
  assert.equal(fare.formatted, "₦158,811");
  assert.match(fare.accessibilityLabel, /158,811 Nigerian nairas?/);
});

test("production fare formatting remains complete without formatToParts", () => {
  withoutFormatToParts(() => {
    assert.equal(formatCurrency(158811, "NGN"), "₦158,811");
    assert.equal(formatCurrency(420, "USD"), "$420");
    assert.equal(formatCurrency(420, "CAD"), "$420");
    assert.equal(formatCurrency(420, "AUD"), "$420");
    assert.equal(formatCurrency(1240, "GBP"), "£1,240");
    assert.equal(formatCurrency(980, "EUR"), "€980");
    assert.equal(formatCurrency(-158811, "NGN"), "-₦158,811");
    assert.equal(formatCurrency(1000, "XYZ"), "1,000 XYZ");

    const fare = displayPrice(420, "USD", "CAD", { USD: 1, CAD: 1.4 });
    assert.equal(fare.providerAmount, 420);
    assert.equal(fare.providerCurrency, "USD");
    assert.equal(fare.amount, 588);
    assert.equal(fare.currency, "CAD");
    assert.equal(fare.converted, true);
    assert.equal(fare.formatted, "$588");
    assert.ok(fare.accessibilityLabel.length > 0);
  });
});

test("throwing and malformed formatToParts results fall back safely", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, "formatToParts");
  try {
    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", {
      value() { throw new Error("unsupported"); },
      configurable: true,
    });
    assert.equal(formatCurrency(158811, "NGN"), "₦158,811");
    assert.equal(formatCurrency(420, "USD"), "$420");
    assert.equal(formatCurrency(420, "CAD"), "$420");
    assert.equal(formatCurrency(420, "AUD"), "$420");

    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", {
      value() { return [{ type: "literal", value: "unexpected" }]; },
      configurable: true,
    });
    assert.equal(formatCurrency(158811, "NGN"), "₦158,811");
    assert.equal(formatCurrency(420, "USD"), "$420");
    assert.equal(formatCurrency(420, "CAD"), "$420");
    assert.equal(formatCurrency(420, "AUD"), "$420");
    assert.doesNotMatch(formatCurrency(420, "CAD"), /unexpected/);
  } finally {
    if (descriptor) Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", descriptor);
  }
});

test("Intl failures retain truthful visual and accessible currency fallbacks", () => {
  const OriginalNumberFormat = Intl.NumberFormat;
  try {
    Object.defineProperty(Intl, "NumberFormat", {
      value: function NumberFormat() { throw new Error("unsupported"); },
      configurable: true,
    });
    assert.equal(formatCurrency(420, "usd"), "$420");
    assert.equal(currencyAccessibilityLabel(420, "usd"), "420 USD");
  } finally {
    Object.defineProperty(Intl, "NumberFormat", { value: OriginalNumberFormat, configurable: true });
  }
});

test("country regions resolve to their ISO display currencies", () => {
  assert.equal(currencyForCountry("NG"), "NGN");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("CA"), "CAD");
});

test("an explicit saved currency overrides the country currency", () => {
  assert.equal(resolveDisplayCurrency({ preferredCurrency: "USD", countryCode: "NG" }), "USD");
  assert.equal(resolveDisplayCurrency({ preferredCurrency: "EUR", countryCode: "NG" }), "EUR");
});

test("a passed fare is current only for the resolved display currency", () => {
  const ngnFare = displayPrice(604, "USD", "NGN", { USD: 1, NGN: 1600 });
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "NGN"), true);
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "EUR"), false);
  assert.equal(isDisplayPriceCurrent(ngnFare, 604, "USD", "USD"), false);

  const rates = { USD: 1, EUR: 0.9, NGN: 1600 };
  assert.equal(displayPrice(604, "USD", "EUR", rates).currency, "EUR");
  assert.equal(displayPrice(965000, "NGN", "USD", rates).currency, "USD");
  assert.equal(isDisplayPriceCurrent(null, 604, "USD", "EUR"), false);
});

test("a passed fare must still describe the authoritative provider fare", () => {
  const fare = displayPrice(604, "USD", "EUR", { USD: 1, EUR: 0.9 });
  assert.equal(isDisplayPriceCurrent(fare, 605, "USD", "EUR"), false);
  assert.equal(isDisplayPriceCurrent(fare, 604, "GBP", "EUR"), false);
});

test("display currency follows preference, IP country, locale, then USD priority", () => {
  const resolve = (preferredCurrency: string | null, ipCountryCode: string | null, locale: string) =>
    resolveDisplayCurrencyContext({ preferredCurrency, ipCountryCode, locale }).resolvedCurrency;

  assert.equal(resolve(null, "NG", "en-US"), "NGN");
  assert.equal(resolve("USD", "NG", "en-US"), "USD");
  assert.equal(resolve(null, null, "en-NG"), "NGN");
  assert.equal(resolve(null, null, "en-US"), "USD");
  assert.equal(resolve(null, "GB", "en-US"), "GBP");
  assert.equal(resolve(null, "CA", "en-US"), "CAD");
});

test("currency resolution diagnostics expose each decision input", () => {
  assert.deepEqual(resolveDisplayCurrencyContext({
    preferredCurrency: null,
    ipCountryCode: "ng",
    locale: "en-US",
  }), {
    preferredCurrency: null,
    detectedCountryCode: "NG",
    localeCountryCode: "US",
    resolvedCurrency: "NGN",
  });
});

test("same-currency provider prices do not convert", () => {
  const fare = displayPrice(965000, "NGN", "NGN", { USD: 1, NGN: 1600 });
  assert.equal(fare.amount, 965000);
  assert.equal(fare.currency, "NGN");
  assert.equal(fare.converted, false);
});

test("provider prices convert through current USD-based rates without mutation", () => {
  const result = { price: 604, currency: "USD" };
  const fare = displayPrice(result.price, result.currency, "NGN", { USD: 1, NGN: 1600 });
  assert.equal(fare.amount, 966400);
  assert.equal(fare.currency, "NGN");
  assert.match(fare.formatted, /₦\s?966,400/);
  assert.deepEqual(result, { price: 604, currency: "USD" });
});

test("a missing rate falls back accurately to the provider currency", () => {
  const fare = displayPrice(604, "USD", "NGN", { USD: 1 });
  assert.equal(fare.amount, 604);
  assert.equal(fare.currency, "USD");
  assert.equal(fare.formatted, "$604");
  assert.equal(fare.converted, false);
});

const marketSymbols = {
  USD: "$", NGN: "₦", CAD: "CA$", AUD: "A$", GBP: "£", EUR: "€",
  BRL: "R$", INR: "₹", JPY: "¥", CNY: "CN¥", HKD: "HK$", SGD: "S$",
  NZD: "NZ$", MXN: "MX$", KRW: "₩", PLN: "zł",
} as const;

test("Hotel market formatting uses deterministic recognizable symbols", () => {
  for (const [currency, symbol] of Object.entries(marketSymbols)) {
    const formatted = formatMarketCurrency(420, currency);
    assert.equal(formatted, `${symbol}420`);
    assert.doesNotMatch(formatted, new RegExp(currency));
  }
});

test("Hotel symbols remain available when formatToParts is unavailable", () => {
  withoutFormatToParts(() => {
    for (const [currency, symbol] of Object.entries(marketSymbols))
      assert.equal(formatMarketCurrency(420, currency), `${symbol}420`);
  });
});

test("Hotel conversion keeps provider truth and falls back when rates are missing", () => {
  const provider = { pricePerNight: 210, currency: "USD" };
  const rates = { USD: 1, CAD: 1.4, NGN: 1600, GBP: 0.8, EUR: 0.9 };
  assert.equal(displayMarketPrice(210, provider.currency, "USD", rates).formatted, "$210");
  assert.equal(displayMarketPrice(210, provider.currency, "CAD", rates).formatted, "CA$294");
  assert.equal(displayMarketPrice(210, provider.currency, "NGN", rates).formatted, "₦336,000");
  assert.equal(displayMarketPrice(210, provider.currency, "GBP", rates).formatted, "£168");
  assert.equal(displayMarketPrice(210, provider.currency, "EUR", rates).formatted, "€189");
  const fallback = displayMarketPrice(210, provider.currency, "NGN", { USD: 1 });
  assert.deepEqual({ formatted: fallback.formatted, currency: fallback.currency, converted: fallback.converted },
    { formatted: "$210", currency: "USD", converted: false });
  assert.deepEqual(provider, { pricePerNight: 210, currency: "USD" });
});

test("Hotel auto-detected markets and explicit preference select market symbols", () => {
  for (const [country, expected] of [["US","$"],["NG","₦"],["CA","CA$"],["GB","£"],["FR","€"],["JP","¥"],["IN","₹"]]) {
    const currency = resolveDisplayCurrencyContext({ preferredCurrency: null, ipCountryCode: country, locale: "en-US" }).resolvedCurrency;
    assert.ok(formatMarketCurrency(1, currency).startsWith(expected));
  }
  const manual = resolveDisplayCurrencyContext({ preferredCurrency: "EUR", ipCountryCode: "NG", locale: "en-NG" });
  assert.equal(formatMarketCurrency(1, manual.resolvedCurrency), "€1");
});
