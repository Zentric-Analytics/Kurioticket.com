import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** The edge must overwrite the shared assertion and strip client observations. */
export function trustedBotEdge(request: Request) {
  const secret = process.env.BOT_EDGE_SECRET;
  const assertion = request.headers.get("x-kurioticket-edge-auth");
  if (!secret || secret.length < 32 || !assertion) return null;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(assertion);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const ip = request.headers.get("cf-connecting-ip")?.trim() || "";
  const country = request.headers.get("cf-ipcountry") || "";
  const ray = request.headers.get("cf-ray") || "";
  return {
    ip: isIP(ip) ? ip : null,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    ray: /^[a-f0-9]{16,32}-[A-Z]{3}$/.test(ray) ? ray : null,
    automated: request.headers.get("x-kurioticket-edge-bot") === "automated",
  };
}
