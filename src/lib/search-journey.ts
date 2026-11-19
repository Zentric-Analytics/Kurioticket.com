const journeyIdleWindowMs = 30 * 60 * 1000;

export const clientJourneyEventTypes = ["RESULTS_VIEWED", "OFFER_SELECTED"] as const;
export type ClientJourneyEventType = (typeof clientJourneyEventTypes)[number];
export type JourneyEventReceipt = { accepted: boolean; retryable?: boolean };

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only opaque request identifiers may become persistent search correlation keys. */
export function resolveSearchRequestId(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && requestIdPattern.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID();
}

export function isJourneySourcePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !/[?#\\\s\u0000-\u001f\u007f]/.test(value);
}

/** Handoff callers also use short page names; retain only a bounded path. */
export function journeySourcePath(value: string) {
  const path = value.split(/[?#]/, 1)[0];
  if (path.length > 240) return undefined;
  if (isJourneySourcePath(path)) return path;
  return /^[a-z0-9_-]{1,100}$/i.test(path) ? `/${path}` : undefined;
}

export function getJourneyActivityCutoff(now = new Date()) {
  return new Date(now.getTime() - journeyIdleWindowMs);
}

export function journeyEventKey(namespace: "client" | "search" | "redirect", value: string) {
  return `${namespace}:${value}`;
}
