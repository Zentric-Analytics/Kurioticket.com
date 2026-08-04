import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const modify = readFileSync(
  new URL("../results/deals/DealsModifySearchDialog.tsx", import.meta.url),
  "utf8",
);
test("one shared selector renders three pressed product buttons rather than package radios", () => {
  assert.match(form, /dealsProductOrder\.map/);
  assert.match(form, /data-deals-product=\{product\}/);
  assert.match(form, /type="button"[\s\S]{0,100}aria-pressed=\{selected\}/);
  assert.match(form, /hotel: \{ label: "hotels"/);
  assert.match(form, /flight: \{ label: "flights"/);
  assert.match(form, /car: \{ label: "cars"/);
  assert.doesNotMatch(form, /type="radio" name="packageMode"/);
  assert.match(modify, /<DealsSearchForm/);
});
test("blocked toggles announce the minimum and successful hiding closes pickers without clearing values", () => {
  assert.match(form, /tryToggleDealsProduct/);
  assert.match(
    form,
    /setProductSelectionMessage\(t\("deals\.productSelector\.minimumTwo"\)\)/,
  );
  assert.match(form, /role="status"[\s\S]{0,60}aria-live="polite"/);
  assert.match(form, /if \(wasSelected\) closeProductPickers\(product\)/);
  assert.match(form, /setFlightDatesOpen\(false\)/);
  assert.match(form, /setHotelDatesOpen\(false\)/);
  assert.match(form, /setCarDatesOpen\(false\)/);
  assert.doesNotMatch(
    form,
    /toggleProduct[\s\S]{0,700}(?:flightOriginText|hotelDestination|carPickupLocation): ""/,
  );
});
