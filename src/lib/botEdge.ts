import { timingSafeEqual } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { publicVisitorIp } from "./geo/ipinfo";
import { isIsoCountryCode, normalizeCountryCode } from "./geo/context";

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

const STAGING_RENDER_SERVICE_ID = "srv-dabmo50jo6nc73881d60";
const STAGING_PUBLIC_HOST = "staging.kurioticket.com";
const STAGING_RENDER_HOST = "kurioticket-web-staging.onrender.com";
const nextBindHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::]", "[::1]"]);
const cloudflareWorkerAddress = new BlockList();
cloudflareWorkerAddress.addAddress("2a06:98c0:3600::103", "ipv6");

function canonicalStagingUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.origin === "https://" + STAGING_PUBLIC_HOST && url.pathname === "/"
      && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

/** Conditional trust boundary, NOT a public-ingress detector. Render Support
 * confirmed that the public proxy rejects client-supplied CF-Connecting-IP;
 * private workspace/region workloads may supply arbitrary headers. The flag
 * is explicit operator acceptance that every workload and private request
 * path in that boundary is trusted to assert the client address. It must
 * remain off otherwise. Host, Rndr-Id and Ray are sanity/correlation checks,
 * not authentication credentials. The guest/reporting flag is irrelevant. */
export function trustedRenderWorkspaceIngress(request: Request) {
  if (process.env.BOT_TRUST_RENDER_WORKSPACE_INGRESS !== "true"
      || process.env.BOT_REQUIRE_EDGE === "true"
      || process.env.RENDER !== "true"
      || process.env.RENDER_SERVICE_ID !== STAGING_RENDER_SERVICE_ID
      || process.env.TRAVEL_PROVIDER_MODE !== "staging"
      || !canonicalStagingUrl(process.env.NEXT_PUBLIC_APP_URL)
      || !canonicalStagingUrl(process.env.NEXTAUTH_URL)) return null;
  // Never downgrade an invalid/partial signed-edge assertion to the fallback.
  for (const name of request.headers.keys()) if (name.startsWith("x-kurioticket-edge-")) return null;
  if (request.headers.has("cf-worker")) return null;
  try {
    const url = new URL(request.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
        || (url.hostname !== STAGING_PUBLIC_HOST && url.hostname !== STAGING_RENDER_HOST
          && !nextBindHosts.has(url.hostname))) return null;
  } catch { return null; }
  const trace = request.headers.get("rndr-id");
  if (!trace || !/^[a-zA-Z0-9_-]{1,128}$/.test(trace)) return null;
  const raw = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  if (!isIP(raw)) return null;
  const ip = publicVisitorIp(raw);
  if (!ip || (isIP(ip) === 6 && cloudflareWorkerAddress.check(ip, "ipv6"))) return null;
  const country = normalizeCountryCode(request.headers.get("cf-ipcountry"));
  return {
    ip, country: country && isIsoCountryCode(country) ? country : null,
    ray: null, networkAsn: null, networkOrganization: null, automated: false,
    source: "RENDER_TRUSTED_WORKSPACE" as const,
  };
}

/** Preserve the stronger signed edge path, including explicit v1 semantics. */
export function trustedBotIngress(request: Request) {
  const edge = trustedBotEdge(request);
  return edge ? { ...edge, source: "AUTHENTICATED_EDGE" as const } : trustedRenderWorkspaceIngress(request);
}
