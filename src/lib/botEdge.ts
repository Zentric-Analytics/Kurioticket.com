import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function botNetworkAsn(value: string | number | null | undefined) {
  const token = value == null ? "" : String(value);
  return /^[1-9][0-9]{0,9}$/.test(token) && Number(token) <= 4294967295 ? token : null;
}

export function botNetworkOrganization(value: string | null | undefined) {
  const text = value?.trim();
  return text && text.length <= 160 && !/[\p{Cc}\p{Cf}]/u.test(text) ? text : null;
}

function decodedOrganization(value: string | null) {
  try { return value && value.length <= 1920 ? botNetworkOrganization(decodeURIComponent(value)) : null; }
  catch { return null; }
}

/** The edge must overwrite the shared assertion and strip client observations.
 * Version 1 captures the original ingress metadata before forwarding through
 * another proxy that might replace CF-Connecting-IP or CF-Ray. */
export function trustedBotEdge(request: Request) {
  const secret = process.env.BOT_EDGE_SECRET;
  const assertion = request.headers.get("x-kurioticket-edge-auth");
  if (!secret || secret.length < 32 || !assertion) return null;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(assertion);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const version = request.headers.get("x-kurioticket-edge-version");
  if (version !== null && version !== "1") return null;
  const explicit = version === "1";
  const ip = request.headers.get(explicit ? "x-kurioticket-edge-ip" : "cf-connecting-ip")?.trim() || "";
  const country = request.headers.get(explicit ? "x-kurioticket-edge-country" : "cf-ipcountry") || "";
  const ray = request.headers.get(explicit ? "x-kurioticket-edge-ray" : "cf-ray")?.match(/^([a-f0-9]{16,32})(?:-[A-Z]{3})?$/)?.[1] ?? null;
  return {
    ip: isIP(ip) && ip.toLowerCase() !== "2a06:98c0:3600::103" ? ip : null,
    country: /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null,
    ray,
    networkAsn: explicit ? botNetworkAsn(request.headers.get("x-kurioticket-edge-asn")) : null,
    networkOrganization: explicit ? decodedOrganization(request.headers.get("x-kurioticket-edge-organization")) : null,
    automated: request.headers.get("x-kurioticket-edge-bot") === "automated",
  };
}
