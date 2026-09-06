import { buildGoogleHotelMapEmbedUrl, buildGoogleHotelStreetViewEmbedUrl } from "@/lib/hotels/hotelMap";
import { getStaticHotelById } from "@/services/travel/staticHotelResults";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.google.com; base-uri 'none'; form-action 'none'",
};

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const id = searchParams.get("id")?.trim();
  const view = searchParams.get("view");
  if (!id) return new Response("Hotel id is required.", { status: 400 });
  if (view !== "map" && view !== "streetview") return new Response("View must be map or streetview.", { status: 400 });
  const record = getStaticHotelById(id);
  if (!record) return new Response("Hotel not found.", { status: 404 });
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  if (!key?.trim()) return new Response("Map preview unavailable.", { status: 503 });
  const propertyDetails = {
    description: record.description,
    latitude: record.latitude,
    longitude: record.longitude,
    streetAddress: record.location,
    city: record.city,
    country: record.country,
    neighbourhood: record.neighbourhood,
  };
  const configuration = { hotelName: record.name, propertyDetails, googleMapsEmbedApiKey: key };
  const embedUrl = view === "map" ? buildGoogleHotelMapEmbedUrl(configuration) : buildGoogleHotelStreetViewEmbedUrl(configuration);
  if (!embedUrl) return new Response("Map preview unavailable.", { status: view === "streetview" ? 404 : 503 });
  const title = view === "map" ? `${record.name} map` : `${record.name} Street View`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${escapeHtmlAttribute(embedUrl)}" title="${escapeHtmlAttribute(title)}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></body></html>`;
  return new Response(html, { status: 200, headers });
}
