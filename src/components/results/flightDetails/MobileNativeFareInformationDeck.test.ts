import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveDealIdentityMark } from "./flightDetailsPresentation";

test("matching airline deal identity uses the authoritative offer logo", () => {
  assert.deepEqual(resolveDealIdentityMark({
    providerName: "  Hahn-Air! ",
    offer: { airlineName: "hahn air", airlineLogo: "https://assets.example.test/hahn.svg" },
  }), { kind: "airline", logoUrl: "https://assets.example.test/hahn.svg" });
});

test("an agency deal never acquires the offer airline logo", () => {
  assert.deepEqual(resolveDealIdentityMark({
    providerName: "Independent Travel Agency",
    offer: { airlineName: "Hahn Air", airlineLogo: "https://assets.example.test/hahn.svg" },
  }), { kind: "provider", logoUrl: null });
});

test("a matching airline without a logo still resolves as airline identity for fallback rendering", () => {
  assert.deepEqual(resolveDealIdentityMark({
    providerName: "Hahn Air",
    offer: { airlineName: "Hahn Air", airlineLogo: null },
  }), { kind: "airline", logoUrl: null });
});

test("mobile Compare deals keeps resilient provider identity, selection, price hierarchy, and booking action", async () => {
  const [mark, deck] = await Promise.all([
    readFile("src/components/results/flightDetails/FlightIdentityMark.tsx", "utf8"),
    readFile("src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx", "utf8"),
  ]);
  assert.match(mark, /h-8 w-8 shrink-0/);
  assert.match(mark, /width=\{mobile \? 28 : 24\} height=\{mobile \? 28 : 24\}/);
  assert.match(mark, /object-contain/);
  assert.match(mark, /onError=\{onLogoError\}/);
  assert.match(mark, /logoUrl && !logoFailed/);
  assert.match(mark, /FlightIdentityMarkState key=\{logoUrl \?\? "__no-logo__"\}/);
  assert.match(mark, /const \[logoFailed, setLogoFailed\] = useState\(false\)/);
  assert.match(mark, /aria-hidden=\{decorative \|\| undefined\}/);

  assert.match(deck, /fallbackOffer\?\.bookingProviderName\?\.trim\(\)/);
  assert.match(deck, /const displayedDeals = deals\.length/);
  assert.match(deck, /data-mobile-flight-deal-list/);
  assert.match(deck, /data-mobile-flight-deal-card/);
  assert.match(deck, /data-mobile-flight-provider-logo/);
  assert.match(deck, /FlightIdentityMark logoUrl=\{identityMark\.logoUrl\} decorative mobile/);
  assert.match(deck, /role="radio"/);
  assert.match(deck, /aria-checked=\{selected\}/);
  assert.match(deck, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(deck, /onClick=\{\(\) => onSelectDeal\(deal\.offerId\)\}/);
  assert.match(deck, /event\.key === "ArrowRight" \|\| event\.key === "ArrowDown"/);
  assert.match(deck, /event\.key === "Home"[\s\S]*?event\.key === "End"/);
  assert.match(deck, /priceAvailable \? price\.formatted : "Loading price…"/);
  assert.match(deck, /Trip total/);
  assert.match(deck, /data-mobile-flight-deal-action/);
  assert.match(deck, /redirecting \? "Opening…" : "View deal"/);
  assert.match(deck, /disabled=\{redirecting \|\| !canContinue\}/);
  assert.match(deck, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.doesNotMatch(deck, /No booking deals available|No additional live provider deals were supplied for this fare/);
});
