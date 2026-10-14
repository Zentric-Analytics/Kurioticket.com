import type { CarLocationSuggestion, CarLocationSuggestionKind } from "@/lib/cars/carLocationSuggestions";
import { discoverLocations } from "@/lib/locations/discovery";
import { availableDiscoveryAdapters } from "@/lib/locations/providerDiscoveryAdapters";
import { getCanonicalCarLocationCatalog } from "@/lib/cars/carLocationSuggestions";
import type { CanonicalLocation } from "@/lib/locations/types";

export const dynamic = "force-dynamic";

const jsonHeaders = { "Cache-Control": "no-store, max-age=0" };

const toCarSuggestionKind = (canonical: CanonicalLocation): CarLocationSuggestionKind => {
  switch (canonical.kind) {
    case "airport":
    case "city":
    case "custom":
      return canonical.kind;
    case "rental-area":
    case "district":
    case "landmark":
      return "area";
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
  const limit = Math.min(10, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 8));

  if (!q) {
    return Response.json({
      suggestions: [],
      canonicalLocations: [],
      provenance: { source: "provider-query-required", isLiveAvailability: false },
      source: "provider-query-required",
      recovery: { kind: "continue-typing", coverage: "none", canSubmit: false, canSubmitQuery: false,
        message: "Enter a pickup location to check whether KAYAK supports it." },
      isLiveAvailability: false,
    }, { headers: jsonHeaders });
  }

  try {
    if (q) {
      const discovery = await discoverLocations({ query: q, product: "cars", catalog: getCanonicalCarLocationCatalog(), adapters: availableDiscoveryAdapters(request, "cars"), limit, timeoutMs: 900, supportedByProviders: ["kayak"] });
      const suggestions: CarLocationSuggestion[] = discovery.suggestions.map((canonical) => ({ id: canonical.id, kind: toCarSuggestionKind(canonical),
        value: canonical.submittedValue, primaryText: canonical.primaryLabel, secondaryText: canonical.supportingLabel, city: canonical.primaryLabel,
        countryCode: canonical.country?.code, airportCode: canonical.codes?.iata, canonical, validation: "provider-verified", isProviderValidated: true }));
      const providerUnavailable = discovery.sources.length === 0 || discovery.sources.some((source) => source.status !== "success");
      const recovery = suggestions.length ? undefined : {
        kind: providerUnavailable ? "provider-unavailable" : "unsupported-location",
        coverage: "none",
        canSubmit: false,
        canSubmitQuery: false,
        message: providerUnavailable
          ? "Car location suggestions are temporarily unavailable. Please try again shortly."
          : "KAYAK does not provide a verified car location for this search. Try a nearby airport or city.",
      };
      return Response.json({ suggestions, canonicalLocations: suggestions.map((item) => item.canonical), discovery: discovery.sources,
        provenance: { source: "provider-discovery", isLiveAvailability: false }, recovery, source: "provider-discovery", isLiveAvailability: false }, { headers: jsonHeaders });
    }
    return Response.json({ suggestions: [], canonicalLocations: [], source: "provider-unavailable", isLiveAvailability: false,
      recovery: { kind: "provider-unavailable", coverage: "none", canSubmit: false, canSubmitQuery: false,
        message: "Car location suggestions are temporarily unavailable. Please try again shortly." } }, { headers: jsonHeaders });
  } catch {
    return Response.json({ suggestions: [], canonicalLocations: [], source: "provider-unavailable", isLiveAvailability: false, recovery: { kind: "provider-unavailable", coverage: "none", canSubmit: false, canSubmitQuery: false, message: "Car location suggestions are temporarily unavailable. Please try again shortly." } }, { headers: jsonHeaders });
  }
}
