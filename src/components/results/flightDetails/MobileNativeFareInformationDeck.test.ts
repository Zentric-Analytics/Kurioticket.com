import assert from "node:assert/strict";
import React from "react";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { FlightIdentityMarkContent } from "./FlightIdentityMark";
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
  assert.doesNotMatch(deck, /shadow-\[/);
  assert.match(deck, /text-\[#1a1a1a\] tabular-nums/);
  assert.match(deck, /text-\[#595959\]/);
  assert.match(deck, /rounded-xl border bg-white/);
  assert.match(deck, /border-\[#075EE8\]/);
  assert.match(deck, /h-\[3px\][^"\n]*bg-\[#075EE8\]/);
  assert.doesNotMatch(deck, /#0754F7/);
  assert.match(deck, /data-mobile-flight-provider-logo/);
  assert.match(deck, /deal\.providerLogoUrl[\s\S]*?deal\.providerName/);
  assert.match(deck, /FlightIdentityMark logoUrl=\{identityMark\.logoUrl\} decorative mobile variant="provider"/);
  assert.match(deck, /role="radio"/);
  assert.match(deck, /aria-checked=\{selected\}/);
  assert.match(deck, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(deck, /onClick=\{\(\) => onSelectDeal\(deal\.offerId\)\}/);
  assert.match(deck, /event\.key === "ArrowRight" \|\| event\.key === "ArrowDown"/);
  assert.match(deck, /event\.key === "Home"[\s\S]*?event\.key === "End"/);
  assert.match(deck, /const sourcePrice = formatFlightResultCurrency\(deal\.price, deal\.currency/);
  assert.match(deck, /const visiblePrice = !pricesReady[\s\S]*?priceAvailable[\s\S]*?price\.formatted[\s\S]*?: sourcePrice/);
  assert.match(deck, /const canViewDeal = canContinue && pricesReady/);
  assert.match(deck, /Trip total/);
  assert.match(deck, /data-mobile-flight-deal-action/);
  assert.match(deck, /redirecting \? "Opening…" : "View deal"/);
  assert.match(deck, /disabled=\{redirecting \|\| !canViewDeal\}/);
  assert.match(deck, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.doesNotMatch(deck, /No booking deals available|No additional live provider deals were supplied for this fare/);
});


test("mobile Flight provider card follows the Hotel card styling", async () => {
  const [deck, hotel] = await Promise.all([
    readFile("src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx", "utf8"),
    readFile("src/components/results/hotelDetails/HotelPriceComparisonSection.tsx", "utf8"),
  ]);
  const mobileHotel = hotel.slice(hotel.indexOf("export function MobileProviderOffer"), hotel.indexOf("export function HotelPriceComparisonSection"));
  const card = mobileHotel.match(/<article className="([^"]+)"/)?.[1];
  assert.ok(card);
  const flightCard = deck.match(/className=\{`(grid min-h-\[76px\][^$]+)\$\{/)?.[1];
  assert.ok(flightCard);
  for (const token of card.split(" ").filter(token => token !== "border-[#D9E2E8]")) assert.ok(flightCard.includes(token), token);
  const price = mobileHotel.match(/<strong className="([^"]+)"/)?.[1];
  const action = mobileHotel.match(/<button type="button" className="([^"]+)" disabled=/)?.[1];
  assert.ok(price && action);
  assert.ok(deck.includes(`className="${price}"`));
  assert.ok(deck.includes(`className="${action}"`));
  assert.match(deck, /col-span-2 grid grid-cols-subgrid/);
  assert.match(deck, /grid gap-2 px-1 pb-1\.5 pt-0\.5/);
  assert.match(deck, /className="mr-3 text-center" data-mobile-flight-deal-price/);
  assert.match(deck, /block text-\[10px\] font-normal leading-4 text-\[#595959\]/);
  assert.match(deck, />\s*Trip total\s*<\/span>/);
  assert.doesNotMatch(deck, /min-\[360px\]:text|w-\[88px\]|h-11 w-\[88px\]/);
});


test("provider identity treatment preserves the default mark and broken-logo fallback", () => {
  const previousReact = Reflect.get(globalThis, "React");
  Reflect.set(globalThis, "React", React);
  try {
    const standard = FlightIdentityMarkContent({logoUrl:"invalid-logo",logoFailed:true,decorative:true});
    const provider = FlightIdentityMarkContent({logoUrl:"invalid-logo",logoFailed:true,decorative:true,mobile:true,variant:"provider"});
    assert.match(standard.props.className, /h-8 w-8.*rounded-lg border/);
    assert.match(provider.props.className, /h-7 w-7/);
    assert.doesNotMatch(provider.props.className, /border|rounded/);
    assert.equal(standard.props["data-flight-identity-mark"], "fallback");
    assert.equal(provider.props["data-flight-identity-mark"], "fallback");
  } finally {
    if (previousReact === undefined) Reflect.deleteProperty(globalThis, "React");
    else Reflect.set(globalThis, "React", previousReact);
  }
});
