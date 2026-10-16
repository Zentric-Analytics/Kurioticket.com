import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Android progressive Hotel starts with one verified provider page and continues in bounded batches", () => {
  const server = read("src/services/travel/kayakSandbox.ts");
  const route = read("src/app/api/mobile/v1/hotels/progressive/route.ts");
  assert.match(server, /const batchSize = firstPage === 0 \? 1 : 3/);
  assert.match(server, /if \(response\.isComplete === true\) \{ completedPage = response; break; \}/);
  assert.match(server, /if \(offset === total\)/);
  assert.match(server, /if \(count !== pageSize\) throw new KayakError\("invalid_response"\)/);
  assert.match(route, /timingSafeEqual\(expected, actual\)/);
  assert.match(route, /request\.headers\.get\("x-mobile-platform"\) !== "android"/);
  assert.match(route, /hotelSearchSchema\.safeParse/);
  assert.match(route, /await rememberProviderResults\("hotel", results, search\)/);
  assert.match(route, /nextCursor, progressive: true/);
});

test("Android Hotel app renders first verified batch and appends only current search pages", () => {
  const api = read("apps/mobile/src/api/travelApi.ts");
  const screen = read("apps/mobile/src/features/search/ApprovedResultsScreen.tsx");
  assert.match(api, /searchHotelsProgressive: \(body:/);
  assert.match(screen, /Platform\.OS === "android"\s*\? await travelApi\.searchHotelsProgressive/);
  assert.match(screen, /setResults\(valid\);/);
  assert.match(screen, /while \(cursor && isCurrent\(\)\)/);
  assert.match(screen, /canonicalResultsWereSilentlyLost\(accepted\)/);
  assert.match(screen, /for \(const hotel of accepted\.accepted\) merged\.set\(hotel\.id, hotel\)/);
  assert.match(screen, /setHotelProgressivePending\(false\)/);
  assert.match(screen, /Loading more hotels/);
  assert.match(screen, /: await travelApi\.searchHotels\(plan\.plan\.payload/);
});
