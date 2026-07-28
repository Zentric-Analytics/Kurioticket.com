import { searchCarLocationSuggestions } from "@/lib/cars/carLocationSuggestions";

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
    return Response.json({ suggestions, source: "local-fallback" }, { headers: jsonHeaders });
  } catch {
    return Response.json({ suggestions: [], source: "local-fallback" }, { headers: jsonHeaders });
  }
}
