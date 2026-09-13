import type { TravelResultPolicy } from "./searchContract";
import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";

type ResultWithPolicy = { searchPolicy?: TravelResultPolicy };
const withPolicy = (result: unknown): ResultWithPolicy =>
  typeof result === "object" && result !== null ? result as ResultWithPolicy : {};

/** Resolve server-owned actions without allowing malformed provider URLs to
 * become client navigation targets. KAYAK remains restricted to its approved
 * sandbox click-out URLs and is never sent to an internal bookable flow. */
export function resultActionHref(result: unknown, internalHref: string | null) {
  const policy = withPolicy(result).searchPolicy;
  if (policy?.action.kind !== "provider") return internalHref;
  if (policy.source === "kayak-sandbox") return sandboxBookingUrl(policy.action.href);
  try {
    const url = new URL(policy.action.href);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export const isKayakSandboxResult = (result: unknown) =>
  withPolicy(result).searchPolicy?.source === "kayak-sandbox";
