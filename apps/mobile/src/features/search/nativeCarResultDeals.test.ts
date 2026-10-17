import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { CarResult } from "../../api/travelApi";
import type { CarOffer } from "../../../../../src/lib/cars/types";
import { nativeCarOfferBookingUrl, nativeCarPrimaryBookingUrl, nativeCarResultDealChoices } from "./nativeCarResultDeals";

const offer = (id: string, provider: string, perDay: number, bookingUrl?: string): CarOffer => ({
  id, bookingProviderName: provider, rentalCompanyName: provider, currency: "USD",
  pricePerDay: perDay, totalPrice: perDay * 2,
  taxesAndFeesIncluded: true, payAtPickup: false, freeCancellation: true,
  ...(bookingUrl ? { bookingUrl } : {}),
});
const car = (
  offers: CarOffer[],
  inventorySource: CarResult["inventorySource"] = "kurioticket-static-cars",
): CarResult => ({
  inventorySource,
  offers,
  searchPolicy: { source: inventorySource, bookable: false, action: { kind: "internal-detail", enabled: true, href: "/cars/details/test" } },
} as CarResult);

test("native Cars shows all supplied static Kurioticket prices without inventing links", () => {
  const result = car([
    offer("a", "Kurioticket", 139),
    offer("b", "Kurioticket", 146),
    offer("c", "Kurioticket", 153),
    offer("d", "Kurioticket", 160),
  ]);
  const choices = nativeCarResultDealChoices(result);
  assert.deepEqual(choices.map(({ offer: item }) => item.id), ["a", "b", "c", "d"]);
  assert.deepEqual(choices.map(({ offer: item }) => item.pricePerDay), [139, 146, 153, 160]);
  assert.ok(choices.every(({ providerName }) => providerName === "Kurioticket"));
  assert.ok(choices.every(({ bookingUrl }) => bookingUrl === null));
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
});

test("native Cars preserves every distinct KAYAK rate through the shared web grouping", () => {
  const result = car([
    offer("b-high", "Provider B", 200),
    offer("a-low", "Provider A", 111, "https://sandbox-en-us.kayakaffiliates.com/in?offer=a"),
    offer("b-low", "Provider B", 135),
  ], "kayak-sandbox");
  const choices = nativeCarResultDealChoices(result);
  assert.deepEqual(choices.map(({ providerName }) => providerName), ["Provider A", "Provider B", "Provider B"]);
  assert.deepEqual(choices.map(({ offer: item }) => item.id), ["a-low", "b-low", "b-high"]);
  assert.equal(new Set(choices.map(choice => choice.key)).size, 3);
  assert.equal(choices[0]?.bookingUrl, "https://sandbox-en-us.kayakaffiliates.com/in?offer=a");
  assert.equal(choices[1]?.bookingUrl, null);
  assert.equal(choices[2]?.bookingUrl, null);
});

test("native Cars preserves five distinct sellers without a three-choice cap", () => {
  const result = car(Array.from({ length: 5 }, (_, index) =>
    offer("seller-" + index, "Seller " + index, 100 + index)
  ), "kayak-sandbox");
  const choices = nativeCarResultDealChoices(result);
  assert.equal(choices.length, 5);
  assert.equal(new Set(choices.map(choice => choice.key)).size, 5);
  assert.deepEqual(choices.map(choice => choice.providerName),
    ["Seller 0", "Seller 1", "Seller 2", "Seller 3", "Seller 4"]);
});

test("native result-card actions only accept credential-free HTTPS, with stricter sandbox clickout rules", () => {
  const staticCar = car([offer("a", "Kurioticket", 139)]);
  for (const unsafe of [
    "http://seller.example/deal", "https://user:password@seller.example/deal",
    "javascript:alert(1)", "https:///deal",
  ]) {
    assert.equal(nativeCarOfferBookingUrl(staticCar, offer("a", "Kurioticket", 139, unsafe)), null, unsafe);
  }
  assert.equal(nativeCarOfferBookingUrl(staticCar, offer("a", "Kurioticket", 139, "https://seller.example/deal")), "https://seller.example/deal");

  const sandboxCar = car([], "kayak-sandbox");
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://seller.example/deal")), null);
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://sandbox-en-us.kayakaffiliates.com/in?api_key=secret")), null);
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://affiliates.kayak.com/sandbox-clickout")), "https://affiliates.kayak.com/sandbox-clickout");
});

test("main View deal opens only a genuine provider action; never a Cars details route", () => {
  const result = car([offer("a", "Kurioticket", 139)]);
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.searchPolicy.action = { kind: "provider", enabled: true, href: "https://seller.example/deal" };
  assert.equal(nativeCarPrimaryBookingUrl(result), "https://seller.example/deal");
  result.searchPolicy.action = { kind: "provider", enabled: true, href: "http://seller.example/deal" };
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.searchPolicy.action = { kind: "none", enabled: false };
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.offers[0] = offer("a", "Kurioticket", 139, "https://seller.example/offer");
  assert.equal(nativeCarPrimaryBookingUrl(result), "https://seller.example/offer");
});

test("native Cars balances the category label and positions specifications below free cancellation", () => {
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  const top = card.slice(card.indexOf("<View style={c.topSection}>"), card.indexOf("<View style={[c.lowerBand"));
  const lower = card.slice(card.indexOf("<View style={[c.lowerBand"), card.indexOf("  </View>;\n}"));

  assert.match(card, /category:\{marginTop:5,fontSize:10/);
  assert.match(top, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}/);
  assert.match(top, /hasPrimarySpecs \|\| hasSecondarySpecs \? <View style=\{c\.specRow\}/);
  assert.match(top, /accessibilityLabel="Vehicle specifications"/);
  assert.ok(top.indexOf("accessibilityLabel=\"Vehicle specifications\"") > top.indexOf("Free cancellation"));
  assert.ok(top.indexOf("accessibilityLabel=\"Vehicle specifications\"") > top.indexOf("result.pickupLocation"));
  assert.match(top, /specLabels\.passengers[\s\S]*specLabels\.transmission[\s\S]*specLabels\.doors[\s\S]*specLabels\.bags/);
  assert.match(card, /specRow:\{minWidth:0,flexDirection:"row",alignItems:"flex-start",gap:6,marginTop:2/);
  assert.match(card, /specColumn:\{flex:1,minWidth:0,gap:6,paddingRight:1/);
  assert.doesNotMatch(lower, /<View style=\{c\.specRow\}>/);
  assert.match(lower, /<NativeCarResultOfferPicker result=\{result\}/);
  assert.doesNotMatch(lower, /commerceColumn/);
});

test("native inline provider card keeps logos, individual prices and disabled unavailable actions", () => {
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  const results = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
  const theme = readFileSync("src/theme/AppTheme.tsx", "utf8");

  assert.match(picker, /nativeCarResultDealChoices\(result\)/);
  assert.match(picker, /kurioticket-icon-blue\.png/);
  assert.match(picker, /resolveTravelProviderLogo\(logoUrl\)/);
  assert.match(picker, /presentCarOfferCurrency\(offer, displayCurrency, rates\)/);
  assert.match(picker, /Linking\.openURL\(bookingUrl\)/);
  assert.match(picker, /disabled=\{!bookingUrl\}/);
  assert.match(picker, /provider: \{ minHeight: 36, minWidth: 0, flexDirection: "row", alignItems: "center"/);
  assert.match(picker, /providerNarrow: \{ flexDirection: "column"/);
  assert.match(picker, /hideActionChevron = rowWidth === 0 \|\| rowWidth < 410/);
  assert.match(picker, /stackVeryNarrow = rowWidth > 0 && rowWidth < 260/);
  assert.match(picker, /providers: \{ minWidth: 0, gap: 0, paddingTop: 0, paddingBottom: 0/);
  assert.match(picker, /offerRows: \{ minWidth: 0, minHeight: 108 \}/);
  assert.match(picker, /moreSlot: \{ minHeight: 36, justifyContent: "center" \}/);
  assert.match(picker, /brand: \{ flex: 1, minWidth: 0/);
  assert.match(picker, /Math\.round\(event\.nativeEvent\.layout\.width\)/);
  assert.match(picker, /rowWidth \* 0\.68 \+ 20/);
  assert.match(picker, /meta: \{ minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 4/);
  assert.match(picker, /action: \{ minHeight: 36, flex: 1, minWidth: 0[\s\S]*justifyContent: "flex-end"/);
  assert.match(picker, /logo: \{ width: 19, height: 19/);
  assert.match(picker, /providerName: \{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16/);
  assert.match(picker, /price: \{ width: 66, flexShrink: 0, textAlign: "left", fontSize: 13, lineHeight: 17/);
  assert.match(picker, /link: \{ fontSize: 13, lineHeight: 16/);
  assert.match(picker, /infoAction: \{ width: 32, height: 36, flexShrink: 0/);
  assert.match(picker, /moreAction: \{ minHeight: 36/);
  assert.match(picker, /moreText: \{ fontSize: 11, lineHeight: 16/);
  assert.match(card, /detailsColumn:\{flex:1/);
  assert.doesNotMatch(card, /commerceColumn/);
  assert.match(picker, /price: \{ width: 66, flexShrink: 0, textAlign: "left"/);
  assert.match(picker, /visibleChoices = expanded \? choices : choices\.slice\(0, INITIAL_VISIBLE_OFFER_COUNT\)/);
  assert.match(picker, /choices\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.equal((picker.match(/choices\.length - INITIAL_VISIBLE_OFFER_COUNT/g) ?? []).length, 2);
  assert.match(picker, /const INITIAL_VISIBLE_OFFER_COUNT = 3;/);
  assert.doesNotMatch(picker, /choices\.slice\(0, [25]\)/);
  assert.match(picker, /choices\.find\(choice => choice\.key === selectedKey\)/);
  assert.match(picker, /getCarRateDisclosureSections\(selectedChoice\.offer\)/);
  assert.match(picker, /getCarRatePaymentLabel\(selectedChoice\.offer\)/);
  assert.match(picker, /<Modal/);
  assert.match(picker, /onRequestClose=\{\(\) => setSelectedKey\(null\)\}/);
  assert.match(picker, /accessibilityViewIsModal/);
  assert.match(picker, /choices\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.doesNotMatch(picker, /Compare deals/);
  assert.match(card, /<NativeCarResultOfferPicker result=\{result\}/);
  assert.match(picker, /disabled=\{!bookingUrl\}/);
  assert.doesNotMatch(results, /\/car-details/);
  assert.match(results, /backgroundColor:theme\.dark\?theme\.surface:CAR_RESULTS_LIGHT_CANVAS/);
  assert.match(theme, /priceAlertSurface: "#EDF6FF"/);
  assert.match(theme, /priceAlertBorder: "#C8DFF7"/);
});

test("native Cars rate sheet aligns provider values at the far right and stays white in light theme", () => {
  const sheet = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  const theme = readFileSync("src/theme/AppTheme.tsx", "utf8");
  assert.ok(theme.includes('surface: "#FFFFFF"'));
  for (const token of [
    "backgroundColor: theme.surface",
    'factRow: { flexDirection: "row", alignItems: "flex-start"',
    'factLabel: { width: "42%"',
    'factValue: { flex: 1, minWidth: 0, textAlign: "right"',
    'sectionTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 21',
    "getCarRateDisclosureSections(selectedChoice.offer)",
  ]) assert.ok(sheet.includes(token), token);
});


test("native Cars rate details keep centered heading, emphasized total and mapped policies aligned with web", () => {
  const sheet = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  for (const token of [
    "sheetTitleRow: { flexDirection:",
    "sheetHeadingSpacer: { width: 44, height: 44 }",
    'textAlign: "center"',
    "styles.sheetTotalAmount",
    "Booking provider · ",
    "getCarRateDisclosureSections(selectedChoice.offer)",
    'disclosureSections.filter(section => section.id !== "payment")',
    "Price and payment",
    "Payment timing:",
    "styles.paymentSection",
    'factValue: { flex: 1, minWidth: 0, textAlign: "right"',
  ]) assert.ok(sheet.includes(token), token);
  assert.ok(!sheet.includes("getCarRateDisclosureSections(selectedChoice.offer).map(section"));
  assert.ok(!sheet.includes("KAYAK sandbox · Simulated rates and availability. No live booking."));
  assert.ok(!sheet.includes("Sandbox rate information is simulated."));
});


test("native Cars Rate details is full screen with safe insets, fixed header and independent scrolling", () => {
  const sheet = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  for (const token of [
    'SafeAreaProvider, SafeAreaView',
    'transparent={false}',
    'presentationStyle="fullScreen"',
    'statusBarTranslucent={false}',
    'edges={["top", "bottom", "left", "right"]}',
    'accessibilityViewIsModal',
    'sheetScreen: { flex: 1, paddingHorizontal: 18 }',
    'sheetScroll: { flex: 1, minHeight: 0 }',
    'style={styles.sheetScroll}',
    'borderBottomWidth: StyleSheet.hairlineWidth',
    'fontSize: 15, lineHeight: 21, letterSpacing: -0.18',
    'accessibilityRole="header"',
    'fontFamily: appFonts.semibold',
    'Close rate details',
  ]) assert.ok(sheet.includes(token), token);
  assert.ok(sheet.indexOf('style={styles.sheetHeader}') === -1);
  assert.ok(sheet.indexOf('styles.sheetHeader') < sheet.indexOf('style={styles.sheetScroll}'));
  assert.doesNotMatch(sheet, /maxHeight: "82%"|textTransform: "uppercase"|styles\.modalRoot|styles\.backdrop/);
});


test("native Cars Rate details has clean X, leading icons and softer values without changing selected data", () => {
  const sheet = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  const mapping = sheet.slice(sheet.indexOf("const rateSectionIcons"), sheet.indexOf("function RateSectionHeading"));
  for (const [id, name] of [
    ["payment", "Wallet"],
    ["policies", "ShieldCheck"],
    ["pickup", "MapPin"],
    ["driver", "IdCard"],
    ["vehicle", "CarFront"],
    ["other", "Info"],
  ]) assert.ok(mapping.includes(id + ": " + name), id);
  assert.ok(sheet.includes("function RateSectionHeading("));
  assert.ok(sheet.includes('<SectionIcon accessible={false} size={18} strokeWidth={2.1} color={iconColor} />'));
  assert.ok(sheet.includes('<RateSectionHeading id="payment" title="Price and payment"'));
  assert.ok(sheet.includes('<RateSectionHeading id={section.id} title={section.title}'));
  assert.ok(sheet.includes('sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }'));
  assert.ok(sheet.includes('factValue: { flex: 1, minWidth: 0, textAlign: "right", fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: appFonts.medium }'));
  assert.equal((sheet.match(/style=\{\[styles\.factValue, \{ color: theme\.dark \? "#E2E8F0" : "#1E293B" \}\]\}/g) ?? []).length, 2);
  const closeButtonStyle = sheet.match(/closeButton: \{([^}]+)\}/)?.[1];
  assert.ok(closeButtonStyle);
  assert.doesNotMatch(closeButtonStyle, /border|backgroundColor/);
  assert.ok(sheet.includes('accessibilityLabel="Close rate details"'));
  assert.ok(sheet.includes('presentationStyle="fullScreen"'));
  assert.ok(sheet.includes('getCarRateDisclosureSections(selectedChoice.offer)'));
});


test("native Cars rows keep logo, name, rate info, price and View deal in that exact order", () => {
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  const rows = picker.slice(picker.indexOf("{visibleChoices.map("), picker.indexOf("{choices.length > INITIAL_VISIBLE_OFFER_COUNT ? ("));
  const positions = [
    rows.indexOf("<ProviderMark name={providerName} logoUrl={logoUrl} />"),
    rows.indexOf("{providerName}</Text>"),
    rows.indexOf('accessibilityLabel={"Rate information for " + providerName}'),
    rows.indexOf("money(displayed.currency, displayed.pricePerDay)"),
    rows.indexOf('accessibilityLabel={"View deal from " + providerName}'),
  ];
  assert.ok(positions.every(index => index >= 0), positions.join(","));
  assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]!));
  assert.match(rows, /<Info accessible=\{false\} size=\{18\} strokeWidth=\{1\.9\}/);
  assert.match(rows, /onPress=\{\(\) => setSelectedKey\(key\)\}/);
  assert.match(rows, /onPress=\{bookingUrl \? \(\) => void Linking\.openURL\(bookingUrl\)/);
  assert.match(picker, /infoAction: \{ width: 32, height: 36, flexShrink: 0/);
  assert.match(picker, /meta: \{ minWidth: 0, flexDirection: "row"/);
  assert.match(picker, /rowWidth \* 0\.68 \+ 20/);
  assert.match(picker, /offerRows: \{ minWidth: 0, minHeight: 108/);
  assert.match(picker, /moreSlot: \{ minHeight: 36/);
  assert.match(picker, /offerRowsStacked: \{ minHeight: 240 \}/);
  assert.match(picker, /stackVeryNarrow && styles\.offerRowsStacked/);
  assert.match(picker, /provider: \{ minHeight: 36/);
  assert.match(picker, /visibleChoices = expanded \? choices : choices\.slice\(0, INITIAL_VISIBLE_OFFER_COUNT\)/);
});


test("native Cars reserves exactly three visible provider rows plus an aligned disclosure slot", () => {
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  assert.match(picker, /const INITIAL_VISIBLE_OFFER_COUNT = 3;/);
  assert.match(picker, /visibleChoices = expanded \? choices : choices\.slice\(0, INITIAL_VISIBLE_OFFER_COUNT\)/);
  assert.match(picker, /style=\{\[styles\.offerRows, stackVeryNarrow && styles\.offerRowsStacked\]\}/);
  assert.match(picker, /style=\{styles\.moreSlot\}/);
  assert.match(picker, /offerRows: \{ minWidth: 0, minHeight: 108 \}/);
  assert.match(picker, /offerRowsStacked: \{ minHeight: 240 \}/);
  assert.match(picker, /moreSlot: \{ minHeight: 36/);
  assert.match(picker, /choices\.length > INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /choices\.length - INITIAL_VISIBLE_OFFER_COUNT/);
  assert.match(picker, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(picker, /style=\{styles\.infoAction\} accessible=\{false\}/);
  assert.match(picker, /infoAction: \{ width: 32, height: 36, flexShrink: 0/);
  assert.match(picker, /price: \{ width: 66, flexShrink: 0, textAlign: "left"/);
  assert.doesNotMatch(picker, /choices\.slice\(0, 5\)|choices\.length - 5/);
});
