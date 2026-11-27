import { validActivityIdentity } from "./adminIdentityActivity";
import type { RawActivityQuery } from "./adminActivityDateQuery";

const activityQueryKeys = ["tab", "range", "stage", "product", "from", "to", "q", "order", "directory"] as const;

/** The ID must come from the server's verified recorded-history resolver.
 * Keep repeated filters intact so the canonical route rejects an invalid scope. */
export function recordedGuestActivityHref(id: string, full: boolean, input: RawActivityQuery): string | null {
  if (!validActivityIdentity("guest", id)) return null;
  const query = new URLSearchParams();
  for (const key of [...activityQueryKeys, ...(full ? ["cursor"] : [])]) {
    const value = input[key];
    if (typeof value === "string") query.append(key, value);
    else if (Array.isArray(value)) for (const item of value) query.append(key, item);
  }
  const path = "/admin/users/guest/" + encodeURIComponent(id) + "/activity" + (full ? "/all" : "");
  return path + (query.size ? "?" + query.toString() : "");
}
