import { searchCarLocationSuggestions } from "@/lib/cars/carLocationSuggestions";
import { fromCarLocation } from "@/lib/locations/adapters";
import { resolveStaticSearch } from "@/lib/locations/staticRecovery";

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
    const suggestions = await searchCarLocationSuggestions(q, { limit, country });
    const canonicalLocations = suggestions.map(fromCarLocation);
    const recognized = canonicalLocations.find((location) => location.kind !== "custom");
    const recovery = resolveStaticSearch({ product: "cars", location: recognized, typedValue: q, allowUnverifiedText: true });
    return Response.json({ suggestions, canonicalLocations, source: "local-fallback", isLiveAvailability: false, recovery }, { headers: jsonHeaders });
  } catch {
    return Response.json({ suggestions: [], canonicalLocations: [], source: "local-fallback", isLiveAvailability: false, recovery: resolveStaticSearch({ product: "cars", typedValue: q, allowUnverifiedText: true }) }, { headers: jsonHeaders });
  }
}
