import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FlightResult } from "../../api/travelApi";
import { buildFlightDetailParams } from "./flightDetailNavigation";

const result = { id: "opaque-kurioticket-result", bookingUrl: "https://provider.invalid/private", partnerRedirectUrl: "https://provider.invalid/redirect" } as FlightResult;

test("Flight Results hands Details only the opaque authoritative identity", () => {
  const params = buildFlightDetailParams({ searchParams: { departureDate: "2026-09-01", travelers: "1", result: JSON.stringify({ id: "stale" }), displayFare: "stale" }, result });
  assert.deepEqual(params, { departureDate: "2026-09-01", travelers: "1", id: "opaque-kurioticket-result" });
  assert.equal(JSON.stringify(params).includes("provider.invalid"), false);
});

test("FlightCard never opens a provider URL before shared Flight Details", () => {
  const source=readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"),"utf8");
  const card=source.slice(source.indexOf("function FlightCard"),source.indexOf("function HotelCard"));
  assert.match(card,/router\.push\(\{ pathname: "\/flight-details", params: buildFlightDetailParams/);
  assert.doesNotMatch(card,/Linking\.openURL\(result\.searchPolicy\.action\.href\)/);
});

test("Flight Details remains a native push/pop with a supported horizontal transition", () => {
  const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
  const detailsSource = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");
  const layoutSource = readFileSync(resolve("app/_layout.tsx"), "utf8");
  const nativeStackTypes = readFileSync(
    resolve("node_modules/@react-navigation/native-stack/lib/typescript/src/types.d.ts"),
    "utf8",
  );

  assert.match(resultsSource, /router\.push\(\{ pathname: "\/flight-details"/);
  assert.match(detailsSource, /onPress=\{\(\)=>router\.back\(\)\}/);
  assert.doesNotMatch(detailsSource, /router\.(?:replace|dismissTo)\([^)]*flight-results/);
  assert.match(nativeStackTypes, /["']ios_from_right["']/);
  assert.match(
    layoutSource,
    /<Stack\.Screen name="flight-details" options=\{\{ animation: "ios_from_right", gestureEnabled: true \}\} \/>/,
  );
  assert.doesNotMatch(
    layoutSource,
    /<Stack\.Screen name="flight-details"[^>]*presentation:/,
  );
});

test("the root navigation change leaves existing travel routes intact", () => {
  const layoutSource = readFileSync(resolve("app/_layout.tsx"), "utf8");
  assert.match(layoutSource, /<Stack\.Screen name="hotel-results" options=\{\{ gestureEnabled: true \}\} \/>/);
  assert.doesNotMatch(layoutSource, /<Stack\.Screen name="(?:hotel-details|car-details)"/);
});

test("Duffel and KAYAK cards share the opaque native Flight Details parameters", () => {
  for (const source of ["duffel", "kayak-sandbox"] as const) {
    const candidate = { ...result, searchPolicy: { source, bookable: source === "duffel", action: { kind: "internal-detail", href: "/unused", enabled: true } } } as FlightResult;
    assert.deepEqual(buildFlightDetailParams({ searchParams: {}, result: candidate }), { id: "opaque-kurioticket-result" });
  }
});

test("multi-city handoff retains every structured edit-search leg without an offer snapshot", () => {
  const params = buildFlightDetailParams({ searchParams: { tripType: "multi-city", legCount: "3", origin1: "LOS", destination1: "LHR", departureDate1: "2026-10-01", origin2: "LHR", destination2: "JFK", departureDate2: "2026-10-03", origin3: "JFK", destination3: "LAX", departureDate3: "2026-10-05" }, result });
  assert.equal(params.legCount, "3"); assert.equal(params.destination3, "LAX"); assert.equal(params.departureDate3, "2026-10-05"); assert.equal("result" in params, false);
});
