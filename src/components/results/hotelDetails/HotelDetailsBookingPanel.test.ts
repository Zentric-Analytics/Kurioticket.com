import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { translations } from "../../../lib/i18n/en";

const bookingSource = readFileSync(
  new URL("./HotelDetailsBookingPanel.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("guided estimates and standalone provider-backed prices use truthful labels", () => {
  assert.match(
    clientSource,
    /mode === "guided"[\s\S]*\? "Source estimate"[\s\S]*: t\("hotelDetails\.providerPrice"\)/,
  );
});

test("uses stay semantics for both guided Hotel continuation paths", () => {
  assert.equal(
    translations["deals.guided.hotelDetails.continueFlights"],
    "Continue with this stay to flights",
  );
  assert.equal(
    translations["deals.guided.hotelDetails.continueCars"],
    "Continue with this stay to cars",
  );
});

test("preserves guided stay selection behavior and truthful accessible labeling", () => {
  for (const contract of [
    'guidedSearch?.mode === "hotel-car"',
    't("deals.guided.hotelDetails.continueCars")',
    't("deals.guided.hotelDetails.continueFlights")',
    'kind: "guided-room"',
    "label: guidedActionLabel",
    "accessibleLabel: `${guidedActionLabel}:",
    "onGuidedSelection?.(guidedSelection)",
  ])
    assert.ok(clientSource.includes(contract), contract);

  assert.match(bookingSource, /getDealsGuidedConfirmationActionId\("hotel"\)/);
  assert.ok(
    clientSource.includes(
      "accessibleLabel: `${guidedActionLabel}: ${hotel.name}`",
    ),
  );
  assert.ok(
    !clientSource.includes(
      "accessibleLabel: `${guidedActionLabel}: ${hotel.name}${roomType",
    ),
  );
});

test("frames guided room content as information and unavailable states as planning estimates", () => {
  assert.equal(
    translations["deals.guided.hotelDetails.roomInformation"],
    "Room information",
  );
  assert.equal(
    translations["deals.guided.hotelDetails.roomUnavailable"],
    "This stay cannot be added to your Trip Plan because a current planning estimate is unavailable.",
  );
  assert.ok(
    clientSource.includes(
      'mode === "guided" ? (t("deals.guided.hotelDetails.roomInformation")',
    ),
  );
});

test("does not emit exact-room claims in guided Hotel copy", () => {
  const guidedCopy = Object.entries(translations)
    .filter(([key]) => key.startsWith("deals.guided.hotel"))
    .map(([, value]) => value)
    .join("\n");

  for (const misleadingClaim of [
    "Choose this room",
    "current live room rate",
    "Hotel room added to your Trip Plan",
    "save this room",
  ]) {
    assert.doesNotMatch(guidedCopy, new RegExp(misleadingClaim, "i"));
  }
});

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

  assert.doesNotMatch(bookingSource, /divide-y/);
  assert.doesNotMatch(
    bookingSource,
    /shadow-\[0_12px_32px_-26px_rgba\(2,28,43,0\.32\)\]/,
  );
});

test("uses alternating open side-origin lines without nested containers", () => {
  assert.match(bookingSource, /type OpenLineSide = "left" \| "right";/);
  assert.match(bookingSource, /function OpenSectionLine/);
  assert.match(bookingSource, /aria-hidden="true"/);
  assert.match(bookingSource, /start-0 top-0 border-s/);
  assert.match(bookingSource, /end-0 bottom-0 border-e/);
  assert.match(bookingSource, /rounded-ss-2xl/);
  assert.match(bookingSource, /rounded-ee-2xl/);
  assert.match(bookingSource, /w-\[calc\(100%-2rem\)\]/);
  assert.match(bookingSource, /border-slate-300\/80/);
  assert.equal(bookingSource.match(/<OpenSectionLine side="left"/g)?.length, 2);
  assert.equal(
    bookingSource.match(/<OpenSectionLine side="right"/g)?.length,
    1,
  );

  assert.match(bookingSource, /<div className="space-y-3 p-5 sm:p-6">/);
  assert.match(bookingSource, /<div className="space-y-4 p-5 sm:p-6">/);

  for (const removedTreatment of [
    "rounded-xl border border-border bg-surface-subtle p-4",
    "border-s-2 border-blue ps-3",
    "rounded-lg bg-slate-50 p-3",
    "rounded-lg border border-red-200 bg-red-50 p-3",
  ])
    assert.ok(!bookingSource.includes(removedTreatment), removedTreatment);

  assert.doesNotMatch(bookingSource, /<hr\b/);
  assert.doesNotMatch(bookingSource, /role="separator"/);
});

test("preserves the complete price presentation contract and its grouping order", () => {
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

  const estimatedTotalIndex = bookingSource.indexOf("{estimatedStayTotalText}");
  const totalIndex = bookingSource.indexOf("{totalDisplayPrice.formatted}");
  const firstBoundaryIndex = bookingSource.indexOf(
    '<OpenSectionLine side="right" turn="bottom" />',
  );
  const nightlyIndex = bookingSource.indexOf("{pricePerNightText.replace(");
  const taxesIndex = bookingSource.indexOf("{taxesText}");
  const providerIndex = bookingSource.indexOf("{providerText}");

  assert.ok(estimatedTotalIndex < totalIndex);
  assert.ok(totalIndex < firstBoundaryIndex);
  assert.ok(firstBoundaryIndex < nightlyIndex);
  assert.ok(nightlyIndex < taxesIndex);
  assert.ok(taxesIndex < providerIndex);
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

  const priceToStayLine = bookingSource.indexOf(
    '<OpenSectionLine side="left" turn="bottom" />',
  );
  assert.ok(priceToStayLine < bookingSource.indexOf("staySummary.dateText"));
});

test("preserves internal planning action and conditionally renders provider action", () => {
  for (const contract of [
    "LinkButton",
    "href={changeSearchHref}",
    'variant="secondary"',
    "changeSearchText",
    "Button",
    'variant="accent"',
    'size="lg"',
    "providerEnabled ?",
    "disabled={redirecting}",
    "onClick={onContinue}",
    "providerDisclaimerText",
  ])
    assert.ok(bookingSource.includes(contract), contract);

  assert.ok(!bookingSource.includes("space-y-4 border-t border-border pt-5"));
  const actionLine = bookingSource.indexOf(
    '<OpenSectionLine side="left" turn="top" />',
  );
  assert.ok(actionLine < bookingSource.indexOf("<LinkButton"));
});

test("keeps the unavailable price branch free of the total-to-nightly line", () => {
  const unavailableBranch = bookingSource.match(
    /\) : \(\s*(<div className="space-y-2 p-5 sm:p-6">[\s\S]*?liveRateUnavailableText[\s\S]*?<\/div>)\s*\)}/,
  )?.[1];

  assert.ok(unavailableBranch);
  assert.match(unavailableBranch, /priceUnavailableText/);
  assert.match(unavailableBranch, /liveRateUnavailableText/);
  assert.doesNotMatch(unavailableBranch, /OpenSectionLine/);
});

test("does not introduce forbidden divider, box, or flourish treatments", () => {
  assert.equal(bookingSource.match(/<Card\b/g)?.length, 1);
  for (const forbidden of [
    "divide-y",
    "<hr",
    'role="separator"',
    "border-2",
    "gradient",
    "shadow-lg",
    "shadow-xl",
    "rounded-xl border border-border bg-surface-subtle",
  ])
    assert.ok(!bookingSource.includes(forbidden), forbidden);

  assert.doesNotMatch(bookingSource, /[╭╮╰╯─]/u);
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

test("hides only the internal static catalogue provider label", () => {
  const providerDisplay = clientSource.slice(
    clientSource.indexOf("const providerText ="),
    clientSource.indexOf("const providerUnavailableText ="),
  );

  assert.match(providerDisplay, /hotel\.provider/);
  assert.match(providerDisplay, /hotel\.dataSource !== "demo"/);
  assert.match(
    providerDisplay,
    /hotel\.provider !== "Kurioticket static catalogue"/,
  );
  assert.match(
    providerDisplay,
    /`\$\{t\("providedBy"\)\} \$\{hotel\.provider\}`/,
  );
  assert.match(providerDisplay, /:\s*"";/);
  assert.match(clientSource, /providerText=\{providerText\}/);
  assert.match(bookingSource, /providerText: string;/);
  assert.match(bookingSource, /\{providerText \? \(/);
});

test("keeps the static catalogue estimated-price planning warning", () => {
  assert.match(
    clientSource,
    /const providerUnavailableText = hotel\.provider === "Kurioticket static catalogue"\s*\? "Prices shown are estimated for trip planning\. Live booking availability will be introduced before launch\."/,
  );
  assert.match(
    clientSource,
    /providerUnavailableText=\{mode === "guided" \? "" : providerUnavailableText\}/,
  );
});
