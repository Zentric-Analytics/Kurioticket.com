import { toPublicFlight, toPublicHotel } from "@/lib/searchCache";
import {
  buildCarApiPayload,
  buildFlightApiPayload,
  buildHotelApiPayload,
  getIncludedProducts,
  type DealsProduct,
  type DealsSearch,
} from "@/lib/deals/dealsSearchParams";
import { classifyCars, classifyFlights, classifyHotels } from "@/lib/travel/searchContract";
import { searchCars } from "@/services/travel/carAggregator";
import { searchFlights } from "@/services/travel/flightAggregator";
import { searchHotels } from "@/services/travel/hotelAggregator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";

export type PackageComponent = {
  status: "success" | "empty" | "unavailable";
  results: unknown[];
  warnings: string[];
  source: string;
  requestId: string;
};

export type CanonicalPackageSearchResponse = {
  mode: DealsSearch["mode"];
  query: DealsSearch;
  status: "success" | "partial" | "empty" | "unavailable";
  components: Partial<Record<DealsProduct, PackageComponent>>;
  /** Reserved exclusively for real provider-backed bundle offers. */
  packageOffers: never[];
};

const unavailable = (requestId: string): PackageComponent => ({
  status: "unavailable",
  results: [],
  warnings: ["This component is temporarily unavailable."],
  source: "unavailable",
  requestId,
});

export async function searchPackage(
  query: DealsSearch,
  requestId = crypto.randomUUID(),
  overrides: Partial<Record<DealsProduct, () => Promise<PackageComponent>>> = {},
): Promise<CanonicalPackageSearchResponse> {
  const included = getIncludedProducts(query.mode);
  const tasks: Partial<Record<DealsProduct, Promise<PackageComponent>>> = {};

  if (included.flight) tasks.flight = overrides.flight?.() ?? isFeatureEnabled("FLIGHT_SEARCH_ENABLED").then((enabled) => enabled ? searchFlights(buildFlightApiPayload(query), { requestId: `${requestId}:flight` })
    .then((aggregate) => {
      if (aggregate.unavailableMessage) return unavailable(`${requestId}:flight`);
      const response = classifyFlights(aggregate.results.map(toPublicFlight), buildFlightApiPayload(query), aggregate.warnings, `${requestId}:flight`);
      return { status: response.results.length ? "success" : "empty", results: response.results, warnings: response.warnings, source: response.source, requestId: response.requestId };
    }) : unavailable(`${requestId}:flight`));
  if (included.hotel) tasks.hotel = overrides.hotel?.() ?? isFeatureEnabled("HOTEL_SEARCH_ENABLED").then((enabled) => enabled ? searchHotels(buildHotelApiPayload(query)).then((aggregate) => {
    if (aggregate.unavailableMessage) return unavailable(`${requestId}:hotel`);
    const response = classifyHotels(aggregate.results.map(toPublicHotel), aggregate.warnings, `${requestId}:hotel`);
    return { status: response.results.length ? "success" : "empty", results: response.results, warnings: response.warnings, source: response.source, requestId: response.requestId };
  }) : unavailable(`${requestId}:hotel`));
  if (included.car) tasks.car = overrides.car?.() ?? isFeatureEnabled("CAR_SEARCH_ENABLED").then((enabled) => enabled ? searchCars(buildCarApiPayload(query)).then((aggregate) => {
    if (aggregate.status === "unavailable" || aggregate.status === "invalid-search") return unavailable(`${requestId}:car`);
    const response = classifyCars(aggregate.results, buildCarApiPayload(query), `${requestId}:car`);
    return { status: response.results.length ? "success" : "empty", results: response.results, warnings: response.warnings, source: response.source, requestId: response.requestId };
  }) : unavailable(`${requestId}:car`));

  const entries = await Promise.all(Object.entries(tasks).map(async ([product, task]) => {
    try { return [product, await task] as const; }
    catch { return [product, unavailable(`${requestId}:${product}`)] as const; }
  }));
  const components = Object.fromEntries(entries) as CanonicalPackageSearchResponse["components"];
  const values = Object.values(components);
  const available = values.filter((component) => component.status !== "unavailable");
  const resultCount = values.reduce((count, component) => count + component.results.length, 0);
  const status = available.length === 0 ? "unavailable" : available.length < values.length ? "partial" : resultCount === 0 ? "empty" : "success";
  return { mode: query.mode, query, status, components, packageOffers: [] };
}
