import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { authoritativeProviderUrl } from "./providerBooking";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const hotelDetail = detailSource.slice(detailSource.indexOf("function HotelDetail"), detailSource.indexOf("function DetailsRow"));
const bookingCard = detailSource.slice(detailSource.indexOf("function BookingProviderCard"), detailSource.indexOf("function Offer"));
const offer = detailSource.slice(detailSource.indexOf("function Offer"), detailSource.indexOf("const d = StyleSheet.create"));

test("flight details presents its single authoritative offer as a booking provider", () => {
  assert.match(flightDetail, />Booking provider</);
  assert.doesNotMatch(flightDetail, />Choose where to book</);
  assert.match(flightDetail, /<BookingProviderCard[\s\S]*?provider=\{provider\}[\s\S]*?logoUrl=\{result\.airlineLogo\}/);
  assert.match(flightDetail, /provider === result\.airlineName[\s\S]*?"Airline direct"[\s\S]*?: "Travel provider"/);
  assert.match(bookingCard, /<ProviderLogo provider=\{provider\} logoUrl=\{logoUrl\} \/>/);
  assert.match(bookingCard, /★ Recommended/);
  assert.match(flightDetail, /price=\{formattedFare\}/);
  assert.match(flightDetail, /Booking provided by \{provider\}\./);
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 2);
});

test("flight booking provider card is non-interactive and has no selected border", () => {
  assert.doesNotMatch(bookingCard, /\bselected\b|onSelect|accessibilityRole="button"|<Button/);
  assert.doesNotMatch(flightDetail, /<Offer|label="Select"|onSelect=|borderColor: ui\.blue/);
  assert.match(bookingCard, /accessibilityLabel=\{`\$\{provider\}\. Recommended\. \$\{kind\}\. \$\{price\}`\}/);
  const cardStyles = detailSource.slice(detailSource.indexOf("  bookingProviderCard: {"), detailSource.indexOf("  bookingProviderCardCompact:"));
  assert.doesNotMatch(cardStyles, /borderWidth|borderColor/);
  assert.match(cardStyles, /borderRadius: 13/);
  assert.match(cardStyles, /shadowOpacity: 0\.1/);
});

test("booking provider identity and fare remain readable on narrow screens", () => {
  assert.match(bookingCard, /useWindowDimensions\(\)\.width < 360/);
  assert.match(bookingCard, /compact && d\.bookingProviderCardCompact/);
  assert.match(detailSource, /bookingProviderCardCompact: \{ flexDirection: "column" \}/);
  assert.match(detailSource, /providerIdentity: \{[\s\S]*?flex: 1[\s\S]*?minWidth: 140/);
  assert.match(detailSource, /providerLogo: \{[\s\S]*?width: 34[\s\S]*?height: 34[\s\S]*?flexShrink: 0/);
  assert.match(bookingCard, /numberOfLines=\{1\}[\s\S]*?\{provider\}/);
  assert.match(bookingCard, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\}[\s\S]*?\{price\}/);
});

test("booking provider card preserves semantic light and dark surfaces", () => {
  assert.match(bookingCard, /backgroundColor: theme\.dark \? "#17243A" : theme\.surface/);
  assert.match(bookingCard, /theme\.dark && d\.bookingProviderCardDark/);
  assert.match(bookingCard, /<View style=\{\[d\.providerLogo, theme\.dark && \{ backgroundColor: "#142B55" \}\]\}>/);
  assert.match(bookingCard, /color: theme\.textPrimary/);
  assert.match(bookingCard, /color: theme\.textSecondary/);
});

test("hotel Offer selection behavior remains unchanged", () => {
  assert.match(hotelDetail, />Choose where to book</);
  assert.match(hotelDetail, /<Offer[\s\S]*?selected/);
  assert.match(offer, /selected && \{ borderColor: ui\.blue \}/);
  assert.match(offer, /<Button label="Select" onPress=\{onSelect\} \/>/);
});

test("provider booking redirect logic and sticky CTA remain unchanged", () => {
  assert.equal(authoritativeProviderUrl({ partnerRedirectUrl: "https://partner.example/flight", bookingUrl: "https://booking.example/flight" }), "https://partner.example/flight");
  assert.equal(authoritativeProviderUrl({ bookingUrl: "https://booking.example/flight" }), "https://booking.example/flight");
  assert.equal(authoritativeProviderUrl({ partnerRedirectUrl: "", bookingUrl: "" }), "");
  assert.match(flightDetail, /const url = authoritativeProviderUrl\(result\)/);
  assert.match(flightDetail, /if \(!\/\^https:\\\/\\\/\/.test\(url\)\)/);
  assert.match(flightDetail, /await Linking\.openURL\(url\)/);
  assert.equal(flightDetail.match(/onPress=\{handleProviderBooking\}/g)?.length, 1);
  assert.match(flightDetail, /<Button label=\{`Continue to \$\{provider\}`\} onPress=\{handleProviderBooking\} \/>/);
});
