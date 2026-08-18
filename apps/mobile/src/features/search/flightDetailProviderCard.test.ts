import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { authoritativeProviderUrl } from "./providerBooking";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const offer = detailSource.slice(detailSource.indexOf("function Offer"), detailSource.indexOf("const d = StyleSheet.create"));

test("provider card shares a compact main row on normal phones and stacks only when unusually narrow", () => {
  assert.match(offer, /useWindowDimensions\(\)\.width < 360/);
  assert.match(offer, /compact && d\.offerCompact/);
  assert.match(detailSource, /offer: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "flex-start"/);
  assert.match(detailSource, /offerCompact: \{[\s\S]*?flexDirection: "column"/);
  assert.match(detailSource, /offerActionsCompact: \{[\s\S]*?flexDirection: "column"[\s\S]*?alignItems: "flex-end"[\s\S]*?gap: 6/);
  assert.match(detailSource, /offerActionsCompact: \{[\s\S]*?alignSelf: "flex-end"/);
  assert.match(detailSource, /priceSmall: \{[^}]*textAlign: "right"/);
  assert.doesNotMatch(detailSource, /offerActionsCompact: \{[^}]*flexWrap/);
});

test("provider card height is content-driven and its action column cannot stretch", () => {
  const offerStyles = detailSource.slice(detailSource.indexOf("  offer: {"), detailSource.indexOf("  offerCompact: {"));
  const actionStyles = detailSource.slice(detailSource.indexOf("  offerActions: {"), detailSource.indexOf("  offerActionsCompact: {"));

  assert.doesNotMatch(offerStyles, /\b(?:height|minHeight)\s*:/);
  assert.match(actionStyles, /flexDirection: "column"/);
  assert.match(actionStyles, /alignItems: "flex-end"/);
  assert.match(actionStyles, /justifyContent: "flex-start"/);
  assert.match(actionStyles, /gap: 9/);
  assert.doesNotMatch(actionStyles, /\bflex\s*:|space-between/);
});

test("provider identity keeps readable space and labels do not shrink into vertical text", () => {
  assert.match(detailSource, /providerIdentity: \{[\s\S]*?minWidth: 140/);
  assert.match(detailSource, /providerCopy: \{ flex: 1, minWidth: 97 \}/);
  assert.match(detailSource, /providerName: \{ flexShrink: 0 \}/);
  assert.match(detailSource, /recommended: \{ alignSelf: "flex-start", flexShrink: 0 \}/);
  assert.match(detailSource, /providerKind: \{ alignSelf: "flex-start", flexShrink: 0 \}/);
  assert.match(offer, /\{provider\}[\s\S]*?★ Recommended[\s\S]*?\{kind\}/);
});

test("responsive actions retain the displayed fare and Select behavior", () => {
  assert.match(offer, /<Text numberOfLines=\{1\} style=\{d\.priceSmall\}>\{price\}<\/Text>/);
  assert.match(offer, /onSelect\?: \(\) => void/);
  assert.match(offer, /<Button label="Select" onPress=\{onSelect\} \/>/);
  assert.match(offer, /\{price\}<\/Text>[\s\S]*?<Button label="Select" onPress=\{onSelect\} \/>/);
  assert.match(detailSource, /offerActions: \{[\s\S]*?flexDirection: "column"/);
  assert.match(detailSource, /offerActions: \{[\s\S]*?alignItems: "flex-end"/);
  assert.match(detailSource, /offerActionsCompact: \{[\s\S]*?flexDirection: "column"/);
  assert.match(flightDetail, /price=\{formattedFare\}/);
  assert.match(flightDetail, /<Offer[\s\S]*?onSelect=\{handleProviderBooking\}/);
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 3);
});

test("flight offer passes the live result logo for the matching provider identity", () => {
  assert.match(flightDetail, /const providerLogoUrl = providerMatchesCarrier\(provider, result\.airlineName\)[\s\S]*?\? result\.airlineLogo[\s\S]*?: null/);
  assert.match(flightDetail, /<Offer[\s\S]*?provider=\{provider\}[\s\S]*?logoUrl=\{providerLogoUrl\}[\s\S]*?price=\{formattedFare\}/);
  assert.match(offer, /<ProviderLogo provider=\{provider\} logoUrl=\{logoUrl\} \/>/);
});

test("provider card keeps its existing theme-aware surfaces", () => {
  assert.match(offer, /backgroundColor: theme\.dark \? "#17243A" : theme\.surface/);
  assert.match(offer, /<View style=\{\[d\.providerLogo, theme\.dark && \{ backgroundColor: "#142B55" \}\]\}>/);
});

test("provider booking redirect logic remains unchanged", () => {
  assert.equal(authoritativeProviderUrl({
    partnerRedirectUrl: "https://partner.example/flight",
    bookingUrl: "https://booking.example/flight",
  }), "https://partner.example/flight");
  assert.equal(authoritativeProviderUrl({
    bookingUrl: "https://booking.example/flight",
  }), "https://booking.example/flight");
  assert.equal(authoritativeProviderUrl({
    partnerRedirectUrl: "",
    bookingUrl: "",
  }), "");

  assert.match(flightDetail, /const url = authoritativeProviderUrl\(result\)/);
  assert.match(flightDetail, /await Linking\.openURL\(url\)/);
  assert.equal(flightDetail.match(/onPress=\{handleProviderBooking\}/g)?.length, 1);
  assert.match(flightDetail, /<Offer[\s\S]*?onSelect=\{handleProviderBooking\}/);
  assert.match(flightDetail, /<Button label=\{`Continue to \$\{provider\}`\} onPress=\{handleProviderBooking\} \/>/);
});
