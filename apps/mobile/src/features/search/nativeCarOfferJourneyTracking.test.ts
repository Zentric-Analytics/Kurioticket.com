import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Check both native Cars View deal entrypoints, without treating rate info as a selection.
// The shared journey coordinator independently verifies consent, request ownership
// and idempotency. Rate previews remain separate from provider selections.
const source = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");

test("native car provider clicks record an offer selection using the server search identity", () => {
  assert.match(source, /import \{ journeyEvents \} from "\.\.\/privacy\/journeyEvents"/);
  assert.match(source, /journeyEvents\.offerSelected\(journeyRequestId \?\? undefined, `car:\$\{result\.id\}:\$\{offerId\}`, providerName, "\/car-results"\)/);
  assert.match(source, /onPress=\{bookingUrl \? \(\) => continueRateDeal\(offer\.id, providerName, bookingUrl\) : undefined\}/);
  assert.match(source, /onPress=\{selectedRateBookingUrl && selectedChoice \? \(\) => continueRateDeal\(selectedChoice\.offer\.id, selectedChoice\.providerName, selectedRateBookingUrl\) : undefined\}/);
});

test("native car rate information stays a preview, not an offer selection", () => {
  assert.match(source, /onPress=\{\(\) => \{\s*ratePreviewContext\.current = journeyEvents\.captureContext\(\);\s*setSelectedKey\(key\);/);
  assert.match(source, /onShow=\{recordRatePreview\}/);
  assert.match(source, /hasDisplayOnlyInventory\(result\)\) return;\s*journeyEvents\.workflowDecision\("RATE_DETAILS_OPENED"/);
  assert.doesNotMatch(source, /onPress=\{\(\) => \{ journeyEvents\.offerSelected[^}]*setSelectedKey/);
  assert.match(source, /if \(dealOpeningRef\.current\) return;[\s\S]*?journeyEvents\.offerSelected[\s\S]*?void openProviderInApp\(url\)/);
});
