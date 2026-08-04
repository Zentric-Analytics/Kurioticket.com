import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("./DealsJourneyProgress.tsx", import.meta.url), "utf8");
test("journey progress has responsive nav/list semantics and accessible statuses", () => { assert.match(source, /<nav aria-label=/); assert.match(source, /<ol className=/); assert.match(source, /aria-current=\{step\.status === "current" \? "step"/); assert.match(source, /aria-live="polite"/); assert.match(source, /deals\.journey\.stepCount/); assert.match(source, /sm:hidden/); assert.match(source, /sm:overflow-visible/); assert.match(source, /Check/); assert.match(source, /needs-attention/); assert.match(source, /step\.summary/); });
test("track is RTL-safe and only becomes interactive with a real action", () => { assert.match(source, /\bend-1\/2\b/); assert.match(source, /first:ps-0 last:pe-0/); assert.match(source, /href \? <Link/); assert.doesNotMatch(source, /<img|<svg|left-|right-/); });
