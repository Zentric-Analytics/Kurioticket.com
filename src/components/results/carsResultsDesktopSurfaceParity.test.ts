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
const kayak = readFileSync(
  new URL("./KayakResultCard.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../../app/cars/results/page.tsx", import.meta.url),
  "utf8",
);

test("standalone Cars Results carries the mobile canvas surface through desktop", () => {
  assert.match(results, /<main className="flex-1 bg-\[#F5F7FB\] pb-8">/);
  assert.doesNotMatch(results, /bg-\[#F5F7FB\] pb-8 sm:bg-/);
  assert.match(
    results,
    /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/,
  );
  assert.equal(
    (
      results.match(
        /desktopSurfaceParity=\{!embedded && presentation === "standalone"\}/g,
      ) ?? []
    ).length,
    3,
    "full filter, compact filter, and car card all receive the standalone desktop surface contract",
  );
});

test("desktop Cars filters inherit the mobile F2F4F8 section surface without changing mobile filters", () => {
  assert.match(
    results,
    /desktopSurfaceParity \? "bg-\[#F2F4F8\]" : "bg-transparent"/,
  );
  assert.match(
    results,
    /desktopSurfaceParity \? "bg-\[#F2F4F8\]" : "bg-\[#EEF3F8\]"/,
  );
  assert.match(results, /layout === "mobile"[\s\S]*?"grid gap-6 bg-transparent"/);
  assert.match(results, /data-cars-mobile-filter-shell[\s\S]*?bg-\[#F2F4F8\]/);
});

test("desktop car cards use the mobile information surface while preserving the white image section", () => {
  assert.match(card, /desktopSurfaceParity = false/);
  assert.match(
    card,
    /desktopSurfaceParity \? "md:bg-\[#E7EBF1\]" : "md:bg-white"/,
  );
  assert.match(
    card,
    /data-region="image"[\s\S]*?bg-white[\s\S]*?aspect-\[4\/3\][^"]*bg-white/,
  );
  assert.match(
    card,
    /data-region="pricing"[\s\S]*?desktopSurfaceParity \? "bg-\[#E7EBF1\]" : "bg-slate-50\/45 lg:bg-white"/,
  );
  assert.match(
    card,
    /data-car-card-mobile-information[\s\S]*?bg-\[#E7EBF1\]/,
  );
  assert.match(
    card,
    /data-car-card-mobile-lower-band[\s\S]*?bg-\[#E7EBF1\]/,
  );
});

test("desktop price alert keeps the mobile light-blue surface", () => {
  assert.match(
    alert,
    /bg-\[#EDF6FF\][^"]*sm:border-blue-100 sm:bg-\[#EDF6FF\]/,
  );
  assert.doesNotMatch(
    alert,
    /data-cars-price-alert[\s\S]{0,400}sm:bg-white/,
  );
});

test("KAYAK car cards and loading canvases stay inside the same standalone desktop surface contract", () => {
  assert.match(
    results,
    /desktopCarSurfaceParity=\{!embedded && presentation === "standalone"\}/,
  );
  assert.match(
    kayak,
    /desktopSurfaceParity=\{desktopCarSurfaceParity\}/,
  );
  assert.match(
    route,
    /<main className="flex min-h-\[calc\(100svh-5rem\)\] flex-1 bg-\[#F5F7FB\]">/,
  );
});
