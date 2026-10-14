import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileNativeFareInformationDeck } from "./MobileNativeFareInformationDeck";
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
  assert.match(deck, /rounded-xl border border-\[#D9E2E8\] bg-white/);
  assert.match(deck, /border-\[#D9E2E8\]/);
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
  assert.equal(deck.match(/data-mobile-flight-deal-action\s*>\s*([^<]+)<\/button>/)?.[1].trim(), "View deal");
  assert.match(deck, /disabled=\{redirecting \|\| !canViewDeal\}/);
  assert.match(deck, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.doesNotMatch(deck, /No booking deals available|No additional live provider deals were supplied for this fare/);
});


test("mobile Flight and Hotel provider cards retain shared styling with product-specific grids", async () => {
  const [deck, hotel] = await Promise.all([
    readFile("src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx", "utf8"),
    readFile("src/components/results/hotelDetails/HotelPriceComparisonSection.tsx", "utf8"),
  ]);
  const mobileHotel = hotel.slice(hotel.indexOf("export function MobileProviderOffer"), hotel.indexOf("export function HotelPriceComparisonSection"));
  const card = mobileHotel.match(/<article className="([^"]+)"/)?.[1];
  assert.ok(card);
  const flightCard = deck.match(/className="(grid min-h-\[76px\][^"]+)"/)?.[1];
  assert.ok(flightCard);
  for (const token of ["grid", "min-h-[76px]", "min-w-0", "items-baseline", "content-center", "rounded-xl", "border", "border-[#D9E2E8]", "bg-white", "px-3", "py-3"]) {
    assert.ok(flightCard.split(/\s+/).includes(token), `Flight retains ${token}`);
    assert.ok(card.split(/\s+/).includes(token), `Hotel retains ${token}`);
  }
  assert.ok(flightCard.includes("grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"));
  assert.ok(card.includes("grid-cols-[max-content_max-content_max-content]"));
  assert.ok(card.includes("justify-between"));
  assert.ok(card.includes("max-[349px]:px-2"));
  assert.ok(flightCard.includes("max-[349px]:px-2"));
  const price = mobileHotel.match(/<strong className="([^"]+)"/)?.[1];
  const action = mobileHotel.match(/<button type="button" className="([^"]+)" disabled=/)?.[1];
  assert.ok(price && action);
  for (const token of ["text-[13px]", "font-semibold", "leading-5", "max-[349px]:text-[10px]"]) {
    assert.ok(price.split(/\s+/).includes(token));
    assert.ok(deck.includes(token));
  }
  for (const token of ["min-h-8", "text-[12px]", "px-1.5", "disabled:opacity-50"]) {
    assert.ok(action.split(/\s+/).includes(token));
    assert.ok(deck.includes(token));
  }
  assert.match(deck, /col-span-2 grid grid-cols-subgrid/);
  assert.match(deck, /grid gap-2 px-1 pb-1\.5 pt-0\.5/);
  assert.match(deck, /className="inline-flex items-baseline justify-self-center gap-1 whitespace-nowrap" data-mobile-flight-deal-price/);
  assert.match(deck, /block text-\[10px\] font-normal leading-4 text-\[#595959\] max-\[349px\]:text-\[9px\]/);
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

test("provider action accessible names include the visible label in every state", () => {
  const previousReact = Reflect.get(globalThis, "React");
  Reflect.set(globalThis, "React", React);
  try {
    for (const state of [
      {available: true,ready: true,redirecting: false,suffix: ""},
      {available: false,ready: true,redirecting: false,suffix: ", checkout unavailable"},
      {available: true,ready: false,redirecting: false,suffix: ", checking price"},
      {available: true,ready: true,redirecting: true,suffix: ""},
    ]) {
      const offer = {id:"offer-1",provider:"Duffel",airlineName:"Example Air",price:100,currency:"USD"};
      const fare = {key:"basic",label:"Basic",offer,handoff:{available:state.available},deals:[]};
      const markup = renderToStaticMarkup(React.createElement(MobileNativeFareInformationDeck, {
        activeTab:"deals",onTabChange:()=>{},fare:fare as never,activeOffer:offer as never,locale:"en-US",
        selectedDealOfferId:null,onSelectDeal:()=>{},selectedCurrency:"USD",currencyRates:{USD:1},
        isFallbackRate:false,pricesReady:state.ready,redirecting:state.redirecting,onViewDeal:()=>{},
      }));
      const action = markup.match(/<button\b[^>]*data-mobile-flight-deal-action[^>]*>/)?.[0];
      assert.ok(action);
      assert.equal(action.match(/aria-label="([^"]+)"/)?.[1], `View deal with Duffel${state.suffix}`);
      assert.equal(/disabled=""/.test(action), !state.available || !state.ready || state.redirecting);
      assert.equal(/aria-busy="true"/.test(action), !state.ready || state.redirecting);
    }
  } finally {
    if (previousReact === undefined) Reflect.deleteProperty(globalThis, "React");
    else Reflect.set(globalThis, "React", previousReact);
  }
});


test("mobile Flight price and Trip total share one accessible inline group without an info control", () => {
  const previousReact = Reflect.get(globalThis, "React"); Reflect.set(globalThis, "React", React);
  try {
    const offer = {id:"selected-offer",provider:"KAYAK sandbox",bookingProviderName:"Priceline",airlineName:"Example Air",price:419351,currency:"NGN"};
    const fare = {key:"economy",label:"Economy",offer,handoff:{available:true},deals:[]};
    const markup = renderToStaticMarkup(React.createElement(MobileNativeFareInformationDeck, {
      activeTab:"deals",onTabChange:()=>{},fare:fare as never,activeOffer:offer as never,locale:"en-US",selectedDealOfferId:null,
      onSelectDeal:()=>{},selectedCurrency:"NGN",currencyRates:{NGN:1},isFallbackRate:false,pricesReady:true,redirecting:false,onViewDeal:()=>{},
    }));
    assert.match(markup, /class="inline-flex items-baseline justify-self-center gap-1 whitespace-nowrap" data-mobile-flight-deal-price="true"><strong[^>]*aria-label="Trip total:[^"]+"[^>]*>[^<]+<\/strong><span[^>]*>Trip total<\/span>/);
    assert.match(markup, /aria-label="View deal with Priceline"/);
    assert.match(markup, />View deal<\/button>/);
    assert.match(markup, /title="Priceline"/);
    assert.doesNotMatch(markup, /View deals|Rate details|aria-haspopup|lucide-info/);
  } finally { if (previousReact === undefined) Reflect.deleteProperty(globalThis, "React"); else Reflect.set(globalThis, "React", previousReact); }
});
