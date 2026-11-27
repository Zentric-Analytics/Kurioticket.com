import { BlockList, isIP } from "node:net";

const commonGoogle = "https://developers.google.com/static/crawling/ipranges/common-crawlers.json";
const sources = new Map([
  ["CHATGPT_USER", "https://openai.com/chatgpt-user.json"],
  ["GPTBOT", "https://openai.com/gptbot.json"],
  ["OAI-SEARCHBOT", "https://openai.com/searchbot.json"],
  ["PERPLEXITYBOT", "https://www.perplexity.ai/perplexitybot.json"],
  ["PERPLEXITY_USER", "https://www.perplexity.ai/perplexity-user.json"],
  ["GOOGLEOTHER", commonGoogle],
  ["GOOGLE_INSPECTION_TOOL", commonGoogle],
  ["MEDIAPARTNERS_GOOGLE", "https://developers.google.com/static/crawling/ipranges/special-crawlers.json"],
]);

const cache = new Map<string, { ranges: BlockList | null; expires: number }>();
const refreshing = new Map<string, Promise<BlockList | null>>();

async function loadRanges(url: string): Promise<BlockList | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000), redirect: "error", cache: "no-store" });
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 262144) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const rows = JSON.parse(Buffer.concat(chunks).toString("utf8"))?.prefixes;
  if (!Array.isArray(rows) || !rows.length || rows.length > 4096) return null;
  const ranges = new BlockList();
  for (const row of rows) {
    const cidr = row?.ipv4Prefix ?? row?.ipv6Prefix;
    if (typeof cidr !== "string") return null;
    const match = /^([^/]+)\/(\d{1,3})$/.exec(cidr);
    if (!match) return null;
    const family = isIP(match[1]), bits = Number(match[2]);
    if (!family || bits < (family === 4 ? 8 : 16) || bits > (family === 4 ? 32 : 128)) return null;
    ranges.addSubnet(match[1], bits, family === 4 ? "ipv4" : "ipv6");
  }
  return ranges;
}

/** Checks the provider's published crawler network using the authenticated ingress IP. */
export async function confirmedOperatorNetwork(token: string | null, ip: string | null) {
  const url = token && sources.get(token);
  if (!url || !ip || !isIP(ip)) return false;
  const entry = cache.get(url);
  let ranges = entry?.ranges;
  if (!entry || entry.expires <= Date.now()) {
    let pending = refreshing.get(url);
    if (!pending) {
      pending = loadRanges(url).catch(() => null).then(result => {
        cache.set(url, { ranges: result, expires: Date.now() + (result ? 3600000 : 60000) });
        return result;
      }).finally(() => refreshing.delete(url));
      refreshing.set(url, pending);
    }
    ranges = await pending;
  }
  return ranges?.check(ip, isIP(ip) === 4 ? "ipv4" : "ipv6") ?? false;
}
