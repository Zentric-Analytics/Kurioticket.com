import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = source.slice(source.indexOf("function FlightDetail"), source.indexOf("function HotelDetail"));
const sticky = flightDetail.slice(flightDetail.indexOf("<View style={[d.sticky"), flightDetail.lastIndexOf("</View>\n    </SafeAreaView>"));
const styles = source.slice(source.indexOf("const d = StyleSheet.create"));
const flightStickyStyles = styles.slice(styles.indexOf("  sticky: {"), styles.indexOf("  gallery:"));
const hotelStickyStyles = styles.slice(styles.indexOf("  hotelSticky: {"), styles.indexOf("  hotelStickyPrice:"));

test("sticky booking keeps the authoritative fare, total, canonical trip type, and only booking CTA", () => {
  assert.match(sticky, />Total</);
  assert.match(sticky, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\}[\s\S]*?\{formattedFare\}/);
  assert.match(sticky, /\{header\.tripTypeLabel\}/);
  assert.doesNotMatch(sticky, />Round trip</);
  assert.match(sticky, /<Button label=\{`Continue to \$\{provider\}`\} onPress=\{handleProviderBooking\} \/>/);
  assert.equal(flightDetail.match(/onPress=\{handleProviderBooking\}/g)?.length, 1);
});

test("round-trip and one-way labels come from the same canonical header model", () => {
  const headerModel = readFileSync(resolve("src/features/search/flightDetailHeaderModel.ts"), "utf8");
  assert.match(flightDetail, /const header = flightDetailHeaderModel\(result, params\)/);
  assert.match(headerModel, /const oneWay = firstFlightParam\(params\.tripType\) === "one-way"/);
  assert.match(headerModel, /tripTypeLabel: FLIGHT_TRIP_TYPE_LABELS\[oneWay \? "one-way" : "round-trip"\]/);
});

test("provider handoff behavior and concise redirect disclosure remain intact", () => {
  assert.match(flightDetail, /const url = authoritativeProviderUrl\(result\)/);
  assert.ok(flightDetail.includes("if (!/^https:\\/\\//.test(url))"));
  assert.match(flightDetail, /await Linking\.openURL\(url\)/);
  assert.match(sticky, /numberOfLines=\{2\}[\s\S]*?You’ll continue on \{provider\}’s site/);
});

test("compact responsive styling preserves safe area, touch target, long fare, and provider usability", () => {
  assert.match(flightDetail, /paddingBottom: Math\.max\(inset\.bottom, 10\)/);
  assert.match(flightStickyStyles, /minHeight: 88/);
  assert.match(flightStickyStyles, /borderTopWidth: StyleSheet\.hairlineWidth/);
  assert.match(flightStickyStyles, /paddingTop: 10/);
  assert.match(flightStickyStyles, /paddingHorizontal: 14/);
  assert.match(flightStickyStyles, /gap: 10/);
  assert.match(flightStickyStyles, /stickyTotal: \{ flexShrink: 1, minWidth: 92, maxWidth: "42%"/);
  assert.match(flightStickyStyles, /stickyCta: \{ flex: 1, minWidth: 0, maxWidth: 250 \}/);

  const searchUi = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
  assert.match(searchUi, /button: \{[\s\S]*?height: 45/);
  assert.match(searchUi, /minimumFontScale=\{0\.78\}[\s\S]*?numberOfLines=\{1\}/);
});

test("scroll clearance follows the slimmer footprint and hotel sticky styling is untouched", () => {
  assert.match(flightDetail, /paddingBottom: 110 \+ inset\.bottom/);
  assert.match(flightDetail, />Booking provider<[\s\S]*?<View style=\{\[d\.sticky/);
  assert.match(hotelStickyStyles, /minHeight: 92/);
  assert.match(hotelStickyStyles, /padding: 10/);
});

test("sticky surface and text retain semantic light and dark theme colors", () => {
  assert.match(sticky, /backgroundColor: theme\.surface, borderTopColor: theme\.border/);
  assert.match(sticky, /color: theme\.textPrimary/);
  assert.match(sticky, /color: theme\.textSecondary/);
});
