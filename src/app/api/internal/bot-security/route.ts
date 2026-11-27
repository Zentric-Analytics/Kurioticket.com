import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { botTarget } from "@/lib/botPolicy";
import { botNetworkAsn, botNetworkOrganization } from "@/lib/botEdge";
import { declaredSearchCrawler } from "@/lib/searchCrawlerGate";
import { recognizedCrawler, crawlerPolicy } from "@/lib/botRegistry";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { BOT_ACTIVITY_RETENTION_DAYS, pruneBotActivity, recordBotAttempt } from "@/services/botActivityStore";

const noStore = { "Cache-Control": "private, no-store" };
const event = z.object({
  ray: z.string().regex(/^[a-f0-9]{16,32}$/),
  timestamp: z.iso.datetime(),
  path: z.string().max(1000).regex(/^\/(?![\\/])/),
  method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]),
  status: z.union([z.literal(403), z.literal(429)]),
  userAgent: z.string().max(512).optional(),
  ip: z.string().max(45).optional(),
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
  networkAsn: z.union([z.string().max(10), z.number().int()]).optional(),
  networkOrganization: z.string().max(160).optional(),
}).strict();

function authorized(request: Request) {
  const secret = process.env.BOT_OPERATIONS_SECRET;
  if (!secret || secret.length < 32) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(request.headers.get("authorization") ?? ""), hash("Bearer " + secret));
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 403, headers: noStore });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400, headers: noStore });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return new Response(null, { status: 413, headers: noStore });
      }
      chunks.push(value);
    }

    let payload: unknown;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return new Response(null, { status: 400, headers: noStore }); }
    const parsed = event.safeParse(payload);
    if (!parsed.success) return new Response(null, { status: 400, headers: noStore });
    const row = parsed.data;
    const timestamp = new Date(row.timestamp);
    if (timestamp.getTime() > Date.now() + 300_000 ||
      timestamp.getTime() < Date.now() - BOT_ACTIVITY_RETENTION_DAYS * 86_400_000) {
      return new Response(null, { status: 400, headers: noStore });
    }
    const observation = new Request("https://bot-event.invalid" + row.path, { method: row.method });
    const target = botTarget(observation);
    const declaredName = declaredSearchCrawler(row.userAgent ?? null);
    const catalog = recognizedCrawler(declaredName);
    const id = "edge:" + getPublicEnvironment() + ":" + row.ray;
    await recordBotAttempt(observation, {
      crawler: null,
      identityKey: "UNKNOWN:" + (declaredName ?? "UNATTRIBUTED"),
      name: declaredName, ...crawlerPolicy(declaredName, false),
      // A WAF outcome records the decision. The declared crawler identity is unverified.
      verification: declaredName ? "DECLARED" : "UNVERIFIED",
      evidence: "CLOUDFLARE_BLOCKED_EVENT",
      declaredName, userAgent: catalog?.agent ?? declaredName,
      ip: row.ip && isIP(row.ip) && row.ip.toLowerCase() !== "2a06:98c0:3600::103" ? row.ip : null,
      country: row.country === "XX" ? null : row.country ?? null, edgeRay: row.ray,
      networkAsn: botNetworkAsn(row.networkAsn), networkOrganization: botNetworkOrganization(row.networkOrganization),
      networkSource: "AUTHENTICATED_EDGE_EVENT",
    }, target, row.status === 429 ? "EDGE_RATE_LIMIT" : "EDGE_BLOCK", { id, status: row.status, timestamp });
    return new Response(null, { status: 204, headers: noStore });
  } catch {
    console.error("[bot-security] edge event unavailable");
    return new Response(null, { status: 503, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 403, headers: noStore });
  try {
    return Response.json({ deleted: await pruneBotActivity() }, { headers: noStore });
  } catch {
    return new Response(null, { status: 503, headers: noStore });
  }
}
