import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
const styles = source.slice(source.indexOf("const s = StyleSheet.create"));

test("sticky booking uses authoritative total and only server-revalidated booking CTA", () => {
  assert.match(source, /flightDetailsTotalLabel\(details\.search\.travelers\)/);
  assert.match(source, /fare\?\.formatted \?\? "—"/);
  assert.match(source, /Continue to \$\{provider\}/);
  assert.match(source, /travelApi\.flightRedirect\(offerId\)/);
  assert.equal(source.match(/onPress=\{\(\) => void handoff\(offer\.id\)\}/g)?.length, 1);
  assert.doesNotMatch(source, /authoritativeProviderUrl|bookingUrl|partnerRedirectUrl/);
});

test("offer_changed refreshes details while preserving the review notice", () => {
  assert.match(source, /preserveMessageOnReload\.current = true/);
  assert.match(source, /Review the refreshed price and terms before continuing/);
  assert.match(source, /reload\(\)/);
  assert.match(source, /if \(details\) \{[\s\S]*?setMessage\(nextMessage\)[\s\S]*?setState\("available"\)/);
});

test("sticky dock remains safe-area aware and responsive", () => {
  assert.match(source, /paddingBottom: Math\.max\(inset\.bottom, 10\)/);
  assert.match(styles, /sticky: \{[\s\S]*?minHeight: 88/);
  assert.match(styles, /paddingHorizontal: 18/);
  assert.match(styles, /stickyPrice: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\}/);
});

test("sticky surface retains semantic light and dark theme colors", () => {
  assert.match(source, /backgroundColor: theme\.surface, borderTopColor: theme\.border/);
  assert.match(source, /color: theme\.textPrimary/);
  assert.match(source, /color: theme\.textSecondary/);
});
