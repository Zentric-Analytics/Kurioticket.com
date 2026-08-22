import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/results/CarResultCard.tsx", "utf8");

test("CarResultCard accepts string and null href actions without provider fallback", () => {
  assert.match(source, /detailsHref: string \| null/);
  assert.match(source, /detailsHref \? \(\s*<Link\s+href=\{detailsHref\}/);
  assert.match(source, /<button\s+type="button"\s+disabled/);
  assert.doesNotMatch(
    source,
    /href=\{detailsHref \?\?|href="#"|bookingUrl|api\/redirect/,
  );
});

test("CarResultCard keeps standalone defaults and guided heading/action overrides", () => {
  assert.match(source, /actionLabel = "View car"/);
  assert.match(source, /headingLevel = "h2"/);
  assert.match(source, /headingLevel === "h3"/);
  assert.match(source, /min-h-11/);
  assert.match(source, /actionAriaLabel/);
});

test("CarResultCard presents total before supporting per-day price and disclosures", () => {
  const totalPrice = source.indexOf("{totalDisplayPrice.formatted}");
  const totalLabel = source.indexOf('planningLabels?.estimatedTotal : "Total"');
  const perDayLabel = source.indexOf("planningLabels?.estimatedPerDay");
  const perDayPrice = source.indexOf("{dailyDisplayPrice.formatted}");
  const taxesDisclosure = source.indexOf("Taxes and fees included");
  const action = source.indexOf("{onSelect ? (");

  assert.ok(totalPrice < totalLabel);
  assert.ok(totalLabel < perDayLabel);
  assert.ok(perDayLabel < perDayPrice);
  assert.ok(perDayPrice < taxesDisclosure);
  assert.ok(taxesDisclosure < action);
  assert.doesNotMatch(source, /order-1 md:order-2/);
  assert.doesNotMatch(source, /order-2 md:order-1/);
});

test("CarResultCard keeps centered LTR price presentation without changing the card grid", () => {
  assert.match(
    source,
    /data-region="pricing"[\s\S]*?items-center[\s\S]*?text-center/,
  );
  assert.match(source, /dir="ltr"[\s\S]*?\{totalDisplayPrice\.formatted\}/);
  assert.match(source, /dir="ltr"[\s\S]*?\{dailyDisplayPrice\.formatted\}/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
});

test("CarResultCard groups the pricing rhythm with its action at every breakpoint", () => {
  assert.match(source, /lg:justify-center/);
  assert.match(
    source,
    /totalDisplayPrice\.formatted[\s\S]*?className="mt-0\.5[^\"]*uppercase[\s\S]*?className="mt-2[^\"]*leading-4[\s\S]*?Taxes and fees included/,
  );
  assert.match(
    source,
    /Taxes and fees included[\s\S]*?className="mt-3[^\"]*min-h-11/,
  );
  assert.doesNotMatch(source, /lg:mt-auto/);
});
