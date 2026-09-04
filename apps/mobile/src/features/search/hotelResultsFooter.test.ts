import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const screen = read("src/features/search/ApprovedResultsScreen.tsx");
const footer = read("src/features/search/HotelResultsBrandLegalFooter.tsx");
const copy = read("src/features/search/hotelResultsFooterCopy.ts");
const legalUrls = read("src/config/legalUrls.ts");
const appTheme = read("src/theme/AppTheme.tsx");
const tokens = read("src/theme/tokens.ts");
const webFooter = read("../../src/components/layout/Footer.tsx");
const webIndonesian = read("../../src/lib/i18n/id.ts");
const webVietnamese = read("../../src/lib/i18n/vi.ts");
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
  assert.doesNotMatch(copy, /2172630-70/);
});

test("footer protects the canonical light-background logo and resolves link contrast locally", () => {
  assert.match(footer, /kurioticket-logo-primary-light-bg\.png/);
  assert.match(footer, /theme\.dark && styles\.logoFrameDark/);
  assert.match(footer, /logoFrameDark: \{ backgroundColor: "#FFFFFF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 \}/);
  assert.match(footer, /logo: \{ width: 150, height: 30 \}/);
  assert.match(footer, /const linkColor = theme\.dark \? "#8FB5FF" : colors\.blue/);
  assert.match(footer, /<LegalLink label=\{copy\.privacy\} color=\{linkColor\}/);
  assert.match(tokens, /blue: "#004BB8"/);
  assert.match(appTheme, /surface: "#FFFFFF"/);
  assert.match(appTheme, /surface: "#121E33"/);
  assert.doesNotMatch(appTheme, /#8FB5FF/);
  assert.doesNotMatch(tokens, /#8FB5FF/);
});

test("Seller notice mirrors explicit web localizations and otherwise uses canonical fallback", () => {
  assert.match(webFooter, /t\.footerSellerOfTravelNotice \|\|/);
  assert.match(webIndonesian, /footerSellerOfTravelNotice:/);
  assert.match(webVietnamese, /footerSellerOfTravelNotice:/);
  assert.match(copy, /id: \{[\s\S]*?Nomor Pendaftaran Penjual Perjalanan California \$\{registrationNumber\}/);
  assert.match(copy, /vi: \{[\s\S]*?Số đăng ký Người bán dịch vụ du lịch California \$\{registrationNumber\}/);
  assert.equal(copy.match(/sellerNotice:/g)?.length, 2);
  assert.match(footer, /companyName: legalProfile\.company\.legalName/);
  assert.match(footer, /registrationNumber: legalProfile\.californiaSellerOfTravel\.registrationNumber/);
  assert.match(footer, /\?\? `\$\{legalProfile\.company\.legalName\} — \$\{getCaliforniaSellerOfTravelNotice\(\)\}`/);
  assert.match(footer, /textAlign: direction === "rtl" \? "right" : "left", writingDirection: direction/);
});

test("footer owns compact visual spacing without duplicating the screen safe area", () => {
  assert.match(footer, /StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(footer, /useSafeAreaInsets|\binsets\b/);
  assert.doesNotMatch(footer, /Math\.max|paddingBottom:\s*(?:6[4-9]|[7-9]\d|\d{3,})/);
  assert.match(footer, /footer: \{[\s\S]*?paddingBottom: 16/);
  assert.match(footer, /links: \{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, paddingRight: 60 \}/);
  assert.match(footer, /minHeight: 44/);
  assert.equal(footer.match(/accessibilityRole="link"/g)?.length, 1);
  assert.doesNotMatch(footer, /ArrowUp|scrollTo|ScrollView|FlatList|SectionList|position:\s*"absolute"/);
});

test("screen remains the sole safe-area and Back-to-top owner", () => {
  assert.match(screen, /style=\{\[s0\.body, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}/);
  assert.equal(screen.match(/accessibilityLabel="Back to top"/g)?.length, 1);
  assert.match(screen, /s0\.hotelBackToTop,\{bottom:Math\.max\(insets\.bottom \+ 16,16\)/);
  assert.match(screen, /hotelBackToTop:\s*\{[^}]*position:"absolute"[^}]*right:16[^}]*width:44[^}]*height:44[^}]*borderRadius:22/);
});
