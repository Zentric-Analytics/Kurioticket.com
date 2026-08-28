import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./Skeleton.tsx", import.meta.url), "utf8");
const carSkeleton = source.slice(source.indexOf("export function CarCardSkeleton"));

test("CarCardSkeleton mirrors the compact mobile 40/60 card and conversion row", () => {
  assert.match(carSkeleton, /data-car-card-skeleton-mobile className="md:hidden"/);
  assert.match(carSkeleton, /grid-cols-\[40%_minmax\(0,1fr\)\]/);
  assert.match(carSkeleton, /border-t[^\"]*bg-slate-50\/45/);
  assert.match(carSkeleton, /h-11 w-24 rounded-\[10px\]/);
});

test("CarCardSkeleton preserves the existing desktop column contract", () => {
  assert.match(carSkeleton, /data-car-card-skeleton-desktop/);
  assert.match(carSkeleton, /hidden md:grid/);
  assert.match(carSkeleton, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(carSkeleton, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(carSkeleton, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
});
