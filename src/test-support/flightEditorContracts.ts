import assert from "node:assert/strict";
import { appendFlightLegParams, MULTI_CITY_MAX_LEGS, MULTI_CITY_MIN_LEGS, projectSearchLegs } from "../lib/flights/flightSearchJourney";
import { bindingExpression, evaluateExpression, namedFunction } from "./sourceStructure";

export function verifyMultiCityNavigation(source: string) {
  const legs = [{ origin: "LAX", destination: "JFK", departureDate: "2026-12-01" }, { origin: "JFK", destination: "LHR", departureDate: "2026-12-08" }, { origin: "LHR", destination: "CDG", departureDate: "2026-12-12" }];
  const href = evaluateExpression<() => string>(namedFunction(source, "buildDesktopMultiCityHomeHref"), {
    URLSearchParams, searchQueryString: "returnDate=2026-12-20&origin5=STALE&ref=fixture", MULTI_CITY_MAX_LEGS, MULTI_CITY_MIN_LEGS,
    originCode: "LAX", destinationCode: "JFK", originInput: "Los Angeles", destinationInput: "New York", departureDateInput: "2026-12-01", tripTypeInput: "multi-city", returnDateInput: "2026-12-20", multiCityLegs: legs, projectSearchLegs, appendFlightLegParams,
    adultCount: 2, childCount: 1, infantCount: 1, cabinClassInput: "business", selectedCurrency: "EUR",
  })();
  const url = new URL(href, "https://fixture.local");
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("tripType"), "multi-city");
  assert.equal(url.searchParams.get("legCount"), "3");
  assert.equal(url.searchParams.get("returnDate"), null);
  assert.equal(url.searchParams.get("origin5"), null);
  assert.equal(url.searchParams.get("ref"), "fixture");
  for (const [index, leg] of legs.entries()) for (const [key, value] of Object.entries(leg)) assert.equal(url.searchParams.get(`${key}${index + 1}`), value);
  for (const [key, value] of Object.entries({ adults: "2", children: "1", infants: "1", travelers: "4", cabinClass: "business", currency: "EUR" })) assert.equal(url.searchParams.get(key), value);
  const calls: unknown[] = [], ref = { current: true };
  evaluateExpression<() => void>(namedFunction(source, "navigateDesktopMultiCityToHome"), {
    closeFlightSearchPopovers: () => calls.push("close"), stickySearchPanelOpenRef: ref,
    setIsSearchExpandedWhileSticky: (value: boolean) => calls.push(["expanded", value]), setActiveStickySearchTarget: (value: unknown) => calls.push(["target", value]), setActiveDesktopSearchSurface: (value: unknown) => calls.push(["surface", value]),
    buildDesktopMultiCityHomeHref: () => href, router: { push: (url: string, options: { scroll: boolean }) => calls.push(["push", url, options.scroll]) },
  })();
  assert.equal(ref.current, false);
  assert.deepEqual(calls, ["close", ["expanded", false], ["target", null], ["surface", null], ["push", href, true]]);
}

export function verifyEditorDispatch(source: string) {
  for (const tripTypeInput of ["multi-city", "round-trip", "one-way"]) for (const target of ["origin", "destination"]) {
    const launcher = {}, calls: unknown[] = [];
    evaluateExpression<(launcher: object, target: string) => void>(namedFunction(source, "openDesktopSearchEditor"), {
      tripTypeInput, navigateDesktopMultiCityToHome: () => calls.push("home"), openStickySearchEditor: (node: object, field: string) => calls.push([node, field]),
    })(launcher, target);
    assert.deepEqual(calls, tripTypeInput === "multi-city" ? ["home"] : [[launcher, target]]);
  }
}

export function verifyMobileFlightSubmission(source: string) {
  for (const disabled of [true, false]) {
    const navigation: string[] = [], events: unknown[] = [];
    const submit = evaluateExpression<(event: { preventDefault: () => void }) => void>(bindingExpression(source, "onFlightSubmit"), {
      isFlightSearchDisabled: disabled, isDepartureDateInvalid: false, isReturnDateInvalid: false, tripType: "round-trip", adultCount: 2, childCount: 1, infantCount: 1,
      setAdultCount: (value: number) => events.push(value), setChildCount: (value: number) => events.push(value), setInfantCount: (value: number) => events.push(value), normalizeCabinClass: (value: string) => value, cabinClass: "business", multiCityLegs: [], projectSearchLegs, appendFlightLegParams,
      fromCode: "LAX", toCode: "JFK", from: "Los Angeles", to: "New York", departureDate: "2026-12-01", returnDate: "2026-12-09", URLSearchParams,
      findDiscoveryImageForFlight: () => undefined, buildFlightRecentSearch: () => ({ type: "FLIGHT" }), sessionStatus: "unauthenticated", upsertRecentSearch: () => events.push("recent"), syncBackendRecentSearch: () => { throw Error("unauthenticated submit must not sync account history"); },
      setIsFlightSubmitting: (value: boolean) => events.push(value), startRouteProgress: () => events.push("progress"), router: { push: (url: string) => navigation.push(url) },
    });
    let prevented = false; submit({ preventDefault: () => { prevented = true; } }); assert.equal(prevented, true);
    assert.equal(navigation.length, disabled ? 0 : 1);
    if (!disabled) {
      const url = new URL(navigation[0], "https://fixture.local"); assert.equal(url.pathname, "/flights/results");
      for (const [key, value] of Object.entries({ origin: "LAX", destination: "JFK", departureDate: "2026-12-01", returnDate: "2026-12-09", adults: "2", children: "1", infants: "1", travelers: "4", cabinClass: "business" })) assert.equal(url.searchParams.get(key), value);
      assert.ok(events.includes("recent")); assert.ok(events.includes("progress"));
    }
  }
}
