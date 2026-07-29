import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bookingSource = readFileSync(
  new URL("./HotelDetailsBookingPanel.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("renders one restrained flight-style outer booking card", () => {
  assert.match(
    bookingSource,
    /import { Card } from "@\/components\/ui\/Card";/,
  );
  assert.equal(bookingSource.match(/<Card\b/g)?.length, 1);
  assert.match(bookingSource, /<aside className="min-w-0">/);
  assert.match(bookingSource, /className="lg:sticky lg:top-24"/);

  const cardClass = bookingSource.match(/<Card className="([^"]+)"/)?.[1];
  assert.ok(cardClass);
  for (const token of [
    "min-w-0",
    "overflow-hidden",
    "rounded-2xl",
    "border-slate-200/80",
    "bg-white",
    "p-0",
    "shadow-none",
  ])
    assert.match(
      cardClass,
      new RegExp(`(?:^|\\s)${token.replace("/", "\\/")}(?:\\s|$)`),
    );

  assert.match(bookingSource, /className="divide-y divide-slate-200\/80"/);
  assert.doesNotMatch(
    bookingSource,
    /shadow-\[0_12px_32px_-26px_rgba\(2,28,43,0\.32\)\]/,
  );
});

test("uses divider-owned sections without nested decorative containers", () => {
  assert.match(bookingSource, /<div className="p-5 sm:p-6">/);
  assert.match(bookingSource, /<div className="space-y-3 p-5 sm:p-6">/);
  assert.match(bookingSource, /<div className="space-y-4 p-5 sm:p-6">/);

  for (const removedTreatment of [
    "rounded-xl border border-border bg-surface-subtle p-4",
    "border-s-2 border-blue ps-3",
    "rounded-lg bg-slate-50 p-3",
    "rounded-lg border border-red-200 bg-red-50 p-3",
    "border-t",
  ])
    assert.ok(!bookingSource.includes(removedTreatment), removedTreatment);

  assert.doesNotMatch(bookingSource, /<hr\b/);
  assert.doesNotMatch(bookingSource, /role="separator"/);
});

test("preserves the complete price presentation contract without a price bar", () => {
  for (const contract of [
    "priceDetailsAvailable",
    "totalDisplayPrice.formatted",
    "totalDisplayPrice.title",
    "totalDisplayPrice.ariaLabel",
    "nightlyDisplayPrice.formatted",
    "nightlyDisplayPrice.title",
    "nightlyDisplayPrice.ariaLabel",
    "pricePerNightText.replace",
    "taxesText",
    "totalDisplayPrice.isConvertedEstimate",
    "totalDisplayPrice.providerFormatted",
    "providerPriceLabel",
    "providerText",
    'dir="ltr"',
  ])
    assert.ok(bookingSource.includes(contract), contract);

  for (const removedToken of ["border-s-2", "border-blue", "ps-3"])
    assert.ok(!bookingSource.includes(removedToken), removedToken);
});

test("uses unboxed icon and text rows for the stay summary", () => {
  for (const contract of [
    "staySummary.dateText",
    "staySummary.nightText",
    "staySummary.occupancyText",
    "CalendarDays",
    "Moon",
    "Users",
    'aria-hidden="true"',
    "flex min-w-0 items-start gap-2.5 text-sm",
    "leading-5",
    "break-words",
  ])
    assert.ok(bookingSource.includes(contract), contract);

  assert.ok(
    !bookingSource.includes(
      "rounded-xl border border-border bg-surface-subtle p-4",
    ),
  );
});

test("preserves both actions inside the divided action section", () => {
  for (const contract of [
    "LinkButton",
    "href={changeSearchHref}",
    'variant="secondary"',
    "changeSearchText",
    "Button",
    'variant="accent"',
    'size="lg"',
    "disabled={!providerEnabled || redirecting}",
    "aria-describedby",
    "onClick={onContinue}",
    "providerDisclaimerText",
  ])
    assert.ok(bookingSource.includes(contract), contract);

  assert.ok(!bookingSource.includes("space-y-4 border-t border-border pt-5"));
});

test("keeps accessible status text without boxed treatments", () => {
  for (const contract of [
    'id="hotel-provider-unavailable-message"',
    "providerUnavailableText",
    'role="alert"',
    "redirectError",
  ])
    assert.ok(bookingSource.includes(contract), contract);

  assert.ok(!bookingSource.includes("rounded-lg bg-slate-50 p-3"));
  assert.ok(
    !bookingSource.includes("rounded-lg border border-red-200 bg-red-50 p-3"),
  );
});

test("retains every booking prop at the Hotel Details integration boundary", () => {
  const bookingCall = clientSource.slice(
    clientSource.indexOf("<HotelDetailsBookingPanel"),
    clientSource.indexOf(
      "/>",
      clientSource.indexOf("<HotelDetailsBookingPanel"),
    ) + 2,
  );

  for (const contract of [
    "priceDetailsAvailable=",
    "totalDisplayPrice=",
    "nightlyDisplayPrice=",
    "estimatedStayTotalText=",
    "pricePerNightText=",
    "taxesText=",
    "priceUnavailableText=",
    "liveRateUnavailableText=",
    "staySummary=",
    "changeSearchHref=",
    "changeSearchText=",
    "providerPriceLabel=",
    "providerText=",
    "providerUnavailableText=",
    "redirectError=",
    "providerEnabled=",
    "redirecting=",
    "continueToProviderText=",
    "onContinue=",
    "providerDisclaimerText=",
  ])
    assert.ok(bookingCall.includes(contract), contract);
});
