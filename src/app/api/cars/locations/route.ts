import { searchCanonicalCarCatalog } from "@/lib/cars/carLocationSuggestions";
import type { CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";
import { fromCarLocation } from "@/lib/locations/adapters";
import { resolveStaticSearch } from "@/lib/locations/staticRecovery";
import { discoverLocations } from "@/lib/locations/discovery";
import { availableDiscoveryAdapters } from "@/lib/locations/providerDiscoveryAdapters";
import { getCanonicalCarLocationCatalog } from "@/lib/cars/carLocationSuggestions";

export const dynamic = "force-dynamic";

const jsonHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const countryParam = url.searchParams.get("country")?.trim().toUpperCase();
  const country = countryParam && /^[A-Z]{2}$/.test(countryParam) ? countryParam : undefined;
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "8", 10);
  const limit = Math.min(10, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 8));

  try {
    if (q) {
      const discovery = await discoverLocations({ query: q, product: "cars", catalog: getCanonicalCarLocationCatalog(), adapters: availableDiscoveryAdapters(request, "cars"), limit, timeoutMs: 900 });
      let suggestions: CarLocationSuggestion[] = discovery.suggestions.map((canonical) => ({ id: canonical.id, kind: canonical.kind === "rental-area" ? "area" : canonical.kind,
        value: canonical.submittedValue, primaryText: canonical.primaryLabel, secondaryText: canonical.supportingLabel, city: canonical.primaryLabel,
        countryCode: canonical.country?.code, airportCode: canonical.codes?.iata, canonical, validation: "owned-catalog", isProviderValidated: false }));
      let recovery;
      if (!suggestions.length) {
        const fallback = await searchCanonicalCarCatalog(q, { limit, country });
        suggestions = fallback.suggestions;
        recovery = fallback.recovery;
      }
      return Response.json({ suggestions, canonicalLocations: suggestions.map((item) => item.canonical), discovery: discovery.sources,
        provenance: { source: "owned-catalog", catalogVersion: "legacy-catalog-v1", isLiveAvailability: false }, recovery, source: "local-fallback", isLiveAvailability: false }, { headers: jsonHeaders });
    }
    const result = await searchCanonicalCarCatalog(q, { limit, country });
    const canonicalLocations = result.suggestions.map((suggestion) => suggestion.canonical ?? fromCarLocation(suggestion));
    return Response.json({ ...result, canonicalLocations, source: "local-fallback", isLiveAvailability: false }, { headers: jsonHeaders });
  } catch {
    return Response.json({ suggestions: [], canonicalLocations: [], source: "local-fallback", isLiveAvailability: false, recovery: resolveStaticSearch({ product: "cars", typedValue: q, allowUnverifiedText: true }) }, { headers: jsonHeaders });
  }
}
