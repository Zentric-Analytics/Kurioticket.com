/** Return context is navigation only, never authorization or a backend scope.
 * Accept only an individual Activity route and reconstruct its known filters.
 */
export function activityJourneyReturnHref(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 16384 || /[\u0000-\u001f\u007f#]/.test(input)) return null;
  const [pathname, query = ""] = input.split("?");
  if (!/^\/admin\/users\/(?:user|guest)\/[a-z0-9_-]{6,80}\/activity$/i.test(pathname)) return null;
  const candidates = new URLSearchParams(query);
  const safe = new URLSearchParams();
  for (const key of ["tab", "range", "stage", "product", "from", "to", "q", "directory"]) {
    const value = candidates.get(key);
    if (value && value.length <= (key === "directory" ? 1000 : key === "q" ? 120 : 40)
      && !/[\u0000-\u001f\u007f]/.test(value)) safe.set(key, value);
  }
  return pathname + (safe.size ? "?" + safe.toString() : "");
}
