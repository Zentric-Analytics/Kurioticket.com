import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  alias: { "@": fileURLToPath(new URL("../../../", import.meta.url)) },
});
const { HotelPriceComparisonSection } = jiti("./HotelPriceComparisonSection.tsx") as typeof import("./HotelPriceComparisonSection");

const offer: HotelDetailsProviderOffer = {
  id: "provider-one",
  providerName: "Example stays",
  nightlyPrice: "NGN 80,000",
  action: { kind: "provider-handoff", providerOfferId: "server-owned-offer" },
};
const baseProps = {
  perNightText: "{{price}} per night",
  offers: [offer],
  selectedOfferId: offer.id,
  selectableOfferIds: new Set([offer.id]),
  providerHandoffError: null,
  onSelectOffer: () => {},
};

function findElement(node: ReactNode, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child)) return child;
    const children = typeof child.type === "function"
      ? (child.type as (props: Record<string, unknown>) => ReactNode)(child.props)
      : child.props.children as ReactNode;
    const match = findElement(children, predicate);
    if (match) return match;
  }
  return undefined;
}

test("desktop rate card shows only the provider, stay total, and deal action", () => {
  const html = renderToStaticMarkup(createElement(HotelPriceComparisonSection, {
    ...baseProps,
    variant: "desktop",
    totalLabel: "Estimated stay total",
    offers: [{ ...offer, totalPrice: "NGN 240,000", roomName: "Deluxe room", bedConfiguration: "King bed", mealPlanLabel: "Breakfast included", cancellationLabel: "Non-refundable", paymentLabel: "Pay at property", taxesAndFeesLabel: "Taxes included" }],
    onContinueOffer: () => {},
  }));
  for (const fact of ["Example stays", "NGN 240,000", "Stay total", "View deal"]) assert.ok(html.includes(fact), fact);
  for (const extra of ["Estimated stay total", "NGN 80,000 per night", "Deluxe room", "King bed", "Breakfast included", "Non-refundable", "Pay at property", "Taxes included"]) assert.ok(!html.includes(extra), extra);
  assert.equal((html.match(/data-desktop-provider-offer/g) ?? []).length, 1);
  assert.match(html, /<article/);
  assert.doesNotMatch(html, /<label[^>]*>[\s\S]*?<button[\s\S]*?<\/label>/);

  const nightlyOnly = renderToStaticMarkup(createElement(HotelPriceComparisonSection, { ...baseProps, variant: "desktop", onContinueOffer: () => {} }));
  assert.ok(nightlyOnly.includes("NGN 80,000"));
  assert.ok(nightlyOnly.includes("per night"));
  assert.doesNotMatch(nightlyOnly, /Stay total|Breakfast|cancellation|Taxes included/);
});

test("desktop direct action uses the clicked offer and preserves its button for focus restoration", () => {
  const selected: string[] = [];
  const continued: Array<[string, HTMLButtonElement]> = [];
  const otherOffer = { ...offer, id: "provider-two", providerName: "Second provider" };
  const tree = HotelPriceComparisonSection({
    ...baseProps,
    offers: [offer, otherOffer],
    selectableOfferIds: new Set([offer.id, otherOffer.id]),
    variant: "desktop",
    onSelectOffer: id => selected.push(id),
    onContinueOffer: (id, trigger) => continued.push([id, trigger]),
  });
  const button = findElement(tree, element => element.type === "button" && element.props["aria-label"] === "View deal with Second provider");
  assert.ok(button);
  const trigger = {} as HTMLButtonElement;
  (button.props.onClick as (event: { currentTarget: HTMLButtonElement }) => void)({ currentTarget: trigger });
  assert.deepEqual(selected, [otherOffer.id]);
  assert.deepEqual(continued, [[otherOffer.id, trigger]]);
});

test("pending and unavailable desktop offers cannot start another continuation", () => {
  const pending = renderToStaticMarkup(createElement(HotelPriceComparisonSection, { ...baseProps, variant: "desktop", pendingOfferId: offer.id, onContinueOffer: () => {} }));
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /<button[^>]*disabled=""/);
  assert.ok(pending.includes("Opening…"));

  const unavailable = renderToStaticMarkup(createElement(HotelPriceComparisonSection, { ...baseProps, variant: "desktop", selectableOfferIds: new Set<string>(), onContinueOffer: () => {} }));
  assert.match(unavailable, /<input[^>]*disabled=""/);
  assert.match(unavailable, /<button[^>]*disabled=""/);
});

test("empty desktop rates explain availability and default presentation stays selection-only", () => {
  const empty = renderToStaticMarkup(createElement(HotelPriceComparisonSection, { ...baseProps, variant: "desktop", offers: [] }));
  assert.ok(empty.includes("No offers are currently available for this stay."));
  assert.doesNotMatch(empty, /data-provider-offer-id/);

  const legacy = renderToStaticMarkup(createElement(HotelPriceComparisonSection, baseProps));
  assert.match(legacy, /type="radio"/);
  assert.doesNotMatch(legacy, /<button|data-desktop-provider-offer/);
});

test("desktop stay controls follow the heading without duplicating the stay summary", () => {
  const html = renderToStaticMarkup(createElement(HotelPriceComparisonSection, {
    ...baseProps,
    variant: "desktop",
    stayContext: "Duplicated stay summary",
    stayEditor: createElement("button", { type: "button" }, "Edit dates and guests"),
    onContinueOffer: () => {},
  }));
  assert.ok(html.indexOf("Compare prices") < html.indexOf("Edit dates and guests"));
  assert.ok(html.indexOf("Edit dates and guests") < html.indexOf("data-comparison-offers"));
  assert.doesNotMatch(html, /Duplicated stay summary/);
});


test("desktop rate cards match the existing stay editor width", () => {
  const html = renderToStaticMarkup(createElement(HotelPriceComparisonSection, {
    ...baseProps,
    variant: "desktop",
    onContinueOffer: () => {},
  }));
  assert.match(html, /data-comparison-offers[^>]*class="[^"]*max-w-\[622px\]/);
});
