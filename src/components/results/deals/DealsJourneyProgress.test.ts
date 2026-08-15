import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./DealsJourneyProgress.tsx", import.meta.url),
  "utf8",
);

test("journey progress nav sits directly on the page without outer card styling", () => {
  const outerNav = source.match(/<nav\s[\s\S]*?>/)?.[0];
  assert.ok(outerNav, "expected a semantic outer nav");
  assert.match(outerNav, /aria-label=/);
  assert.match(outerNav, /className="mt-7"/);
  for (const cardClass of [
    "rounded-2xl",
    "border-slate-200",
    "bg-white",
    "px-4",
    "py-4",
    "sm:px-6",
  ])
    assert.doesNotMatch(outerNav, new RegExp(`\\b${cardClass}\\b`));
});

test("journey progress retains icons, connectors, and every step treatment", () => {
  assert.match(
    source,
    /const icons = \{ hotel: BedDouble, flight: Plane, car: Car/,
  );
  assert.match(source, /step\.status === "completed"[\s\S]*?\? Check/);
  assert.match(
    source,
    /step\.status === "needs-attention"[\s\S]*?\? AlertTriangle/,
  );
  assert.match(source, /index > 0/);
  assert.match(source, /top-\[1\.1rem\] h-0\.5 w-full bg-slate-200/);
  assert.match(source, /border-emerald-700 bg-emerald-700 text-white/);
  assert.match(
    source,
    /border-\[#004BB8\] bg-\[#004BB8\] text-white ring-4 ring-blue-100/,
  );
  assert.match(source, /border-slate-300 bg-white text-slate-500/);
  assert.match(source, /border-amber-600 bg-amber-50 text-amber-800/);
});

test("journey progress has responsive list semantics and accessible statuses", () => {
  assert.match(source, /<ol\s+[\s\S]*?className=/);
  assert.match(source, /aria-current=\{step\.status === "current" \? "step"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /packages\.journey\.stepCount/);
  assert.match(source, /sm:hidden/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /sm:overflow-visible/);
  assert.match(source, /step\.summary/);
});

test("track is RTL-safe and only becomes interactive with a real action", () => {
  assert.match(source, /\bend-1\/2\b/);
  assert.match(source, /first:ps-0 last:pe-0/);
  assert.match(source, /href \? \([\s\S]*?<Link/);
  assert.doesNotMatch(source, /<img|<svg|left-|right-/);
});

test("active progress renders the mobile step count and current label", () => {
  assert.match(
    source,
    /\{current && \([\s\S]*?deals\.journey\.stepCount[\s\S]*?label\(current\)/,
  );
});

test("all-completed progress omits a fake mobile current-step summary", () => {
  assert.match(
    source,
    /progress\.currentStepIndex === null\s*\? null\s*: progress\.steps/,
  );
  assert.match(source, /\{current && \(\s*<div className="sm:hidden">/);
  assert.match(source, /progress\.steps\.map/);
});
