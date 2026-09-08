const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.google.com; base-uri 'none'; form-action 'none'",
};
const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length > 160) return new Response("Map query is too long.", { status: 400 });
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (!key) return new Response("Map preview unavailable.", { status: 503 });
  const url = new URL(`https://www.google.com/maps/embed/v1/${query ? "place" : "view"}`);
  url.search = new URLSearchParams(query
    ? { key, q: query, zoom: "10", maptype: "roadmap" }
    : { key, center: "20,0", zoom: "2", maptype: "roadmap" }).toString();
  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${escapeAttribute(url.toString())}" title="Explore destinations on Google Maps" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></body></html>`, { headers });
}
