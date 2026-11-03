/** Cursor history for explicit Previous / Next navigation. This is only
 * presentation state: the data reader validates the actual cursor and filters.
 * Keeping it outside the reader avoids weakening its query contract. */
const FIRST = "first";
const TOKEN = /^[A-Za-z0-9_-]{1,4096}$/;
const MAX_DEPTH = 20;
type Raw = Record<string, string | string[] | undefined>;

function trail(raw: Raw): string[] {
  const value = raw.pageTrail;
  if (typeof value !== "string" || value.length > 8192 || !value) return [];
  const tokens = value.split(".");
  return tokens.length <= MAX_DEPTH && tokens.every(x => x === FIRST || TOKEN.test(x)) ? tokens : [];
}

function base(raw: Raw) {
  const params = new URLSearchParams();
  for (const key of ["environment", "product", "identity", "userId", "visitorId", "provider", "correlation", "sourcePage", "from", "to", "limit"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 2048 && value.length > 0) params.set(key, value);
  }
  if (!params.has("limit")) params.set("limit", "50");
  return params;
}

export function handoffNextPageHref(raw: Raw, nextCursor: string) {
  const params = base(raw);
  const history = trail(raw);
  const previous = raw.cursor;
  history.push(typeof previous === "string" && TOKEN.test(previous) ? previous : FIRST);
  while (history.length > MAX_DEPTH || history.join(".").length > 8192) history.shift();
  params.set("pageTrail", history.join("."));
  params.set("cursor", nextCursor);
  return "/admin/redirects?" + params.toString();
}

export function handoffPreviousPageHref(raw: Raw): string | null {
  const history = trail(raw);
  if (!history.length) return null;
  const last = history.pop()!;
  const params = base(raw);
  if (last !== FIRST) params.set("cursor", last);
  if (history.length) params.set("pageTrail", history.join("."));
  return "/admin/redirects?" + params.toString();
}
