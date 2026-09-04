import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const screen = read("src/features/search/ApprovedResultsScreen.tsx");
const footer = read("src/features/search/HotelResultsBrandLegalFooter.tsx");
const copy = read("src/features/search/hotelResultsFooterCopy.ts");
const legalUrls = read("src/config/legalUrls.ts");
const webFooter = read("../../src/components/layout/Footer.tsx");
const webHotelResults = read("../../src/components/results/HotelResultsClient.tsx");
const rootLayout = read("app/_layout.tsx");

test("Hotel Results alone owns the compact footer after cards and pagination", () => {
  const content = screen.slice(screen.indexOf("const resultContent"), screen.indexOf('if (status === "loading")'));
  assert.match(screen, /import \{ HotelResultsBrandLegalFooter \}/);
  assert.ok(content.indexOf("hotelPageResults.map") < content.indexOf("<HotelResultsPagination"));
  assert.ok(content.indexOf("<HotelResultsPagination") < content.indexOf("<HotelResultsBrandLegalFooter"));
  assert.match(content, /product === "hotel" \? <HotelResultsBrandLegalFooter \/>/);
  assert.equal(screen.match(/<HotelResultsBrandLegalFooter/g)?.length, 1);
  assert.doesNotMatch(rootLayout, /HotelResultsBrandLegalFooter/);
});

test("footer follows the compact web brand and legal content order", () => {
  const order = ["<Image", "copy.tagline", "sellerNotice", "© {currentYear}", "copy.privacy", "copy.terms", "copy.cookies"];
  let cursor = -1;
  for (const token of order) {
    const next = footer.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `${token} should follow the preceding footer block`);
    cursor = next;
  }
  assert.match(webFooter, /variant\?: FooterVariant/);
  assert.match(webHotelResults, /!guided \? <Footer variant="brand-legal-only" \/> : null/);
  assert.match(copy, /"en-us": \{ tagline: "Search flights, hotels, and travel deals with confidence\."/);
  assert.match(copy, /ar: \{ tagline:/);
});

test("footer uses canonical legal data, a dynamic year, and supported destinations", () => {
  assert.match(footer, /getCaliforniaSellerOfTravelNotice\(\)/);
  assert.match(footer, /legalProfile\.company\.legalName/);
  assert.doesNotMatch(footer, /2172630-70|© 2026/);
  assert.match(footer, /new Date\(\)\.getFullYear\(\)/);
  assert.match(footer, /router\.push\(privacyRoute\)/);
  assert.match(footer, /router\.push\(termsRoute\)/);
  assert.match(footer, /Linking\.openURL\(COOKIE_POLICY_URL\)/);
  assert.match(legalUrls, /COOKIE_POLICY_URL = "https:\/\/kurioticket\.com\/legal\/cookie-policy"/);
  assert.doesNotMatch(footer, /LegalScreen|cookie-policy" as const/);
});

test("footer is ordinary wrapping content with accessible links and no back-to-top", () => {
  assert.match(footer, /StyleSheet\.hairlineWidth/);
  assert.match(footer, /flexDirection: "row", flexWrap: "wrap"/);
  assert.match(footer, /minHeight: 44/);
  assert.equal(footer.match(/accessibilityRole="link"/g)?.length, 1);
  assert.match(footer, /paddingBottom: Math\.max\(insets\.bottom \+ 72, 88\)/);
  assert.doesNotMatch(footer, /ArrowUp|scrollTo|ScrollView|FlatList|SectionList|position:\s*"absolute"/);
  assert.equal(screen.match(/accessibilityLabel="Back to top"/g)?.length, 1);
});
