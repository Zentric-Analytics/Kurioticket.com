import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = "src/app/hotels/details/[id]/page.tsx";
const loadingPath = "src/app/hotels/details/[id]/loading.tsx";

test("Hotel Details owns an immersive mobile shell while preserving its desktop header", async () => {
  const [pageSource, loadingSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(loadingPath, "utf8"),
  ]);

  for (const source of [pageSource, loadingSource]) {
    assert.match(
      source,
      /<div className="hidden lg:block" data-hotel-details-desktop-header>[\s\S]*?<AppHeader[\s\S]*?<\/div>/,
    );
    assert.match(
      source,
      /className="pt-\[env\(safe-area-inset-top\)\] lg:pt-0"[\s\S]*?data-hotel-details-mobile-safe-area/,
    );
    assert.equal((source.match(/env\(safe-area-inset-top\)/g) ?? []).length, 1);
    assert.doesNotMatch(source, /import\s+\{\s*Footer\s*\}|<Footer\b/);
    assert.doesNotMatch(
      source,
      /window\.innerWidth|matchMedia|navigator\.userAgent|["']use client["']/,
    );
  }

  assert.match(
    pageSource,
    /<HotelDetailsClient\s+id=\{id\}\s+searchContext=\{searchContext\}\s+\/>/,
  );
  assert.match(loadingSource, /<HotelDetailsLoadingState/);
});

test("Hotel Details preserves the complete results search context", async () => {
  const source = await readFile(pagePath, "utf8");

  for (const key of ["destination", "checkIn", "checkOut", "guests", "rooms"])
    assert.match(source, new RegExp(`${key}: getFirstSearchParam\\(query\\.${key}\\)`));
  assert.match(source, /satisfies HotelDetailsSearchContext/);
});
