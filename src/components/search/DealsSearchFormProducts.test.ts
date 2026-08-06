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
  assert.match(form, /hotel: \{ label: "deals\.product\.hotel"/);
  assert.match(form, /flight: \{ label: "deals\.product\.flight"/);
  assert.match(form, /car: \{ label: "deals\.product\.car"/);
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


test("product selector keeps pressed blue pills without selected check marks", () => {
  const selector =
    form.match(/<div\s+data-deals-product-selector[\s\S]*?<\/div>\n        <p/)?.[0] ??
    "";
  assert.match(selector, /dealsProductOrder\.map/);
  assert.match(selector, /data-deals-product=\{product\}/);
  assert.match(selector, /type="button"[\s\S]*aria-pressed=\{selected\}/);
  assert.match(selector, /onClick=\{\(\) => toggleProduct\(product\)\}/);
  assert.match(selector, /border-\[#004BB8\] bg-blue-50 text-\[#004BB8\] shadow-sm/);
  assert.match(selector, /border-slate-200 bg-white text-slate-700 hover:border-slate-400/);
  assert.match(selector, /<Icon aria-hidden="true" className="size-5 shrink-0" \/>/);
  assert.match(selector, /<span className="min-w-0 break-words">\{t\(productLabel\)\}<\/span>/);
  assert.doesNotMatch(selector, /<Check\b/);
  assert.doesNotMatch(selector, /selected && \([\s\S]*?<Check\b/);
  assert.doesNotMatch(selector, /Selected/);
  assert.doesNotMatch(selector, /(?:selected|aria-pressed=\{selected\})[\s\S]{0,160}<(?:Circle|Badge|Dot)\b/);
  assert.doesNotMatch(form, /import \{[\s\S]*\bCheck,?[\s\S]*\} from "lucide-react"/);
});

test("selector behavior contracts keep the existing toggle flow and consumers", () => {
  assert.match(form, /const toggleProduct = \(product: DealsProduct\) => \{/);
  assert.match(form, /const result = tryToggleDealsProduct\(search\.mode, product\)/);
  assert.match(form, /if \(!result\.changed\) \{[\s\S]*setProductSelectionMessage\(t\("deals\.productSelector\.minimumTwo"\)\)/);
  assert.match(form, /role="status"[\s\S]{0,80}aria-live="polite"/);
  assert.match(form, /setSearch\(\(current\) => transitionDealsMode\(current, result\.mode\)\)/);
  assert.match(form, /router\.push\(buildDealsResultsUrl\(search\)\)/);
  assert.match(modify, /<DealsSearchForm initialSearch=\{search\} variant="results"/);
  assert.match(form, /isLandingVariant && params\.get\("guidedPreview"\) === "1"/);
});
