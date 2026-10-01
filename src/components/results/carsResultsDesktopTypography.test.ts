import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./CarResultCard.tsx", import.meta.url),
  "utf8",
);
const alert = readFileSync(
  new URL("./CarPriceAlertControl.tsx", import.meta.url),
  "utf8",
);
const comparison = readFileSync(
  new URL("./CarPriceComparison.tsx", import.meta.url),
  "utf8",
);

test("desktop Cars Results uses a restrained four-level typography hierarchy", () => {
  assert.match(results, /lg:text-\[11px\] lg:font-medium lg:uppercase lg:leading-4 lg:tracking-\[0\.06em\] lg:text-\[#536B92\]/);
  assert.match(results, /lg:text-\[14px\] lg:font-medium lg:leading-5 lg:tracking-\[-0\.005em\] lg:text-\[#142033\]/);
  assert.match(results, /data-cars-results-compact-search-summary[\s\S]*?text-\[14px\] font-medium leading-5 tracking-\[-0\.005em\]/);
  assert.match(results, /sticky-cars-search-title[\s\S]*?text-\[18px\] font-semibold leading-6 tracking-\[-0\.01em\]/);
  assert.match(results, /aria-label="Breadcrumb"[\s\S]*?text-\[12px\] font-medium leading-5 text-\[#64748B\]/);
  assert.match(results, /lg:text-\[16px\] lg:font-semibold lg:leading-5 lg:tracking-\[-0\.005em\]/);
  assert.match(results, /lg:text-\[14px\] lg:font-medium lg:leading-5 lg:tracking-normal/);
});

test("desktop Cars filters use sentence-case headings and regular-weight options", () => {
  assert.match(results, /truncate text-\[15px\] font-semibold leading-5 tracking-\[-0\.005em\] text-\[#07133B\]/);
  assert.match(results, /text-\[13px\] font-semibold normal-case leading-5 tracking-normal text-\[#334155\]/);
  assert.match(results, /text-\[13px\] font-normal leading-5 transition-all/);
  assert.match(results, /\? "font-medium text-\[#142033\]"/);
  assert.match(results, /: "text-\[#475569\] hover:bg-slate-50 hover:text-\[#142033\]"/);
  assert.doesNotMatch(results, /text-\[12px\] font-bold uppercase leading-4 tracking-\[0\.11em\]/);
});

test("desktop Cars result cards use one primary title and one supporting metadata tier", () => {
  assert.equal((card.match(/text-\[18px\] font-semibold leading-\[23px\] tracking-\[-0\.01em\] text-\[#07133B\]/g) ?? []).length, 2);
  assert.match(card, /text-\[12px\] font-medium normal-case leading-4 tracking-normal text-\[#475569\]/);
  assert.match(card, /text-\[13px\] font-normal leading-\[18px\] text-\[#475569\]/);
  assert.match(card, /text-\[13px\] font-medium leading-\[18px\] text-\[#334155\]/);
  assert.match(card, /lg:text-\[13px\] lg:font-normal lg:leading-\[18px\] lg:text-\[#475569\]/);
  assert.doesNotMatch(card, /text-\[19px\] font-bold leading-\[24px\]/);
  assert.doesNotMatch(card, /text-\[10px\] font-bold uppercase leading-\[14px\] tracking-\[0\.12em\]/);
});

test("desktop Cars pricing and price tracking keep price emphasis without over-weighting metadata", () => {
  assert.match(comparison, /text-\[20px\] font-semibold leading-\[24px\] tracking-\[-0\.01em\]/);
  assert.match(comparison, /text-\[12px\] font-normal leading-4 text-\[#64748B\]/);
  assert.match(comparison, /cleanStaticSummary \? "text-\[13px\] tracking-normal" : "text-\[14px\] tracking-\[-0\.005em\]"/);
  assert.match(alert, /lg:text-\[13px\] lg:font-medium lg:leading-5 lg:tracking-normal lg:text-\[#334155\]/);
});

test("mobile typography remains intact while desktop is refined", () => {
  assert.match(card, /text-\[15px\] font-bold leading-\[18px\]/);
  assert.match(results, /text-\[15px\] font-extrabold text-slate-950/);
  assert.match(alert, /text-\[12\.5px\] font-bold leading-4 text-slate-950/);
});
