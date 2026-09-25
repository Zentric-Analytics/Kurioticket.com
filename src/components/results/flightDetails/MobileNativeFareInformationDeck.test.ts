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

test("mobile deal cards keep resilient mark geometry, truncation, radio semantics, selection, and price readiness", async () => {
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
  assert.match(deck, /FlightIdentityMark logoUrl=\{identityMark\.logoUrl\} decorative mobile/);
  assert.match(deck, /min-w-0 flex-1 truncate/);
  assert.match(deck, /h-5 w-5 shrink-0/);
  assert.match(deck, /role="radio"/);
  assert.match(deck, /aria-checked=\{selected\}/);
  assert.match(deck, /onClick=\{\(\) => onSelectDeal\(deal\.offerId\)\}/);
  assert.match(deck, /priceAvailable \? price\.formatted : "—"/);
});
