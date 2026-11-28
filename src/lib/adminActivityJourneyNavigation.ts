/** Return context is navigation only, never authorization or a backend scope.
 * Accept only a selected identity's Activity or Journey History route.
 */
function returnValueLimit(key: string) {
  return key === "directory" ? 1000 : key === "activityReturn" ? 7000 : key === "activityCursor" ? 1100 : key === "cursor" || key === "usersReturn" ? 2048
    : key === "provider" || key === "q" ? 120 : 40;
}

export function activityJourneyReturnHref(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 16384 || /[\u0000-\u001f\u007f#]/.test(input)) return null;
  const [pathname, query = ""] = input.split("?");
  const target = /^\/admin\/users\/(?:user|guest)\/[a-z0-9_-]{6,80}\/(activity(?:\/all)?|journeys)$/i.exec(pathname);
  if (!target) return null;
  const candidates = new URLSearchParams(query);
  const safe = new URLSearchParams();
  const keys = target[1].toLowerCase().startsWith("activity")
    ? ["tab", "range", "stage", "product", "interface", "from", "to", "q", "directory", "usersReturn", ...(target[1].toLowerCase() === "activity/all" ? ["cursor"] : [])]
    : ["range", "stage", "product", "provider", "from", "to", "cursor", "activityCursor", "activityReturn"];
  for (const key of keys) {
    const value = candidates.get(key);
    const max = returnValueLimit(key);
    if (value && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value)) safe.set(key, value);
  }
  return pathname + (safe.size ? "?" + safe.toString() : "");
}

/** Encode decoded filter values once, avoiding nested percent-encoding expansion. */
export function encodeActivityJourneyReturn(input: unknown): string | null {
  const href = activityJourneyReturnHref(input);
  if (!href) return null;
  const [path, query = ""] = href.split("?");
  const json = JSON.stringify({path, filters:Object.fromEntries(new URLSearchParams(query))});
  const bytes = new TextEncoder().encode(json);
  const token = "v1." + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  // The final path, date/environment scope and token fit comfortably below 8KB.
  return token.length <= 7000 ? token : null;
}

export function decodeActivityJourneyReturn(input: unknown): string | null {
  // Retain existing short links created before compact return contexts.
  if (typeof input === "string" && input.startsWith("/")) return activityJourneyReturnHref(input);
  if (typeof input !== "string" || input.length > 7000 || !/^v1\.[A-Za-z0-9_-]+$/.test(input)) return null;
  try {
    const bytes = Uint8Array.from(atob(input.slice(3).replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(bytes));
    if (!data || typeof data.path !== "string" || !data.filters || typeof data.filters !== "object" || Array.isArray(data.filters)) return null;
    const entries = Object.entries(data.filters);
    if (entries.length > 11 || entries.some(([key,value]) => typeof value !== "string" || value.length > returnValueLimit(key))) return null;
    const query = new URLSearchParams(entries as [string,string][]);
    return activityJourneyReturnHref(data.path + (query.size ? "?" + query : ""));
  } catch {
    return null;
  }
}
