// Deploy as a Worker Route on the existing proxied origin hostname.
// Never set secret values in this file. See docs/bot-security.md.
export function edgeRequest(request, env) {
  const url = new URL(request.url);
  const host = env.BOT_EDGE_HOST;
  const secret = env.BOT_EDGE_SECRET;
  if (url.protocol !== "https:" || !host || url.hostname !== host ||
      typeof secret !== "string" || secret.length < 32) return null;

  const headers = new Headers(request.headers);
  headers.delete("rndr-id"); // Render provides its own request log correlation ID.
  for (const name of [...headers.keys()]) {
    if (name.startsWith("x-kurioticket-edge-")) headers.delete(name);
  }
  // Only a Cloudflare ingress request can contribute edge observations.
  const cf = request.cf;
  // In a same-zone Worker subrequest, CF-Connecting-IP can reflect a
  // caller-controlled x-real-ip. Forward the request without attesting that IP.
  const ip = cf && !request.headers.has("cf-worker") ? request.headers.get("cf-connecting-ip") : null;
  const ray = cf ? request.headers.get("cf-ray") : null;
  const country = cf?.country;
  const asn = cf?.asn;
  const organization = cf?.asOrganization;
  headers.set("x-kurioticket-edge-auth", secret);
  headers.set("x-kurioticket-edge-version", "1");
  // Cloudflare score 1 is its high-confidence automation classification.
  // Do not treat a likely-bot score, absent metadata or a verified crawler
  // as suspicious. A verified edge flag alone never authorizes bot access.
  const botManagement = cf?.botManagement;
  if (botManagement?.score === 1 && botManagement.verifiedBot === false) {
    headers.set("x-kurioticket-edge-bot", "automated");
  }
  if (ip && ip.length <= 45 && ip !== "2a06:98c0:3600::103") headers.set("x-kurioticket-edge-ip", ip);
  if (ray && /^[a-f0-9]{16,32}(?:-[A-Z]{3})?$/.test(ray)) headers.set("x-kurioticket-edge-ray", ray);
  if (typeof country === "string" && /^[A-Z]{2}$/.test(country) && country !== "XX") headers.set("x-kurioticket-edge-country", country);
  if (Number.isInteger(asn) && asn > 0 && asn <= 4294967295) headers.set("x-kurioticket-edge-asn", String(asn));
  if (typeof organization === "string" && organization.trim() && organization.length <= 160 &&
      !/[\p{Cc}\p{Cf}]/u.test(organization)) {
    // Header values must be ASCII; preserve international organization names.
    headers.set("x-kurioticket-edge-organization", encodeURIComponent(organization.trim()));
  }
  // The shared assertion must never follow an upstream redirect off-host.
  return new Request(request, { headers, redirect: "manual" });
}

const worker = {
  async fetch(request, env) {
    const forwarded = edgeRequest(request, env);
    if (!forwarded) return new Response("Edge configuration unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    return fetch(forwarded);
  },
};

export default worker;
