const journeyIdleWindowMs = 30 * 60 * 1000;

export const clientJourneyEventTypes = ["RESULTS_VIEWED", "OFFER_SELECTED"] as const;
export type ClientJourneyEventType = (typeof clientJourneyEventTypes)[number];

export function getJourneyActivityCutoff(now = new Date()) {
  return new Date(now.getTime() - journeyIdleWindowMs);
}

export function journeyEventKey(namespace: "client" | "search" | "redirect", value: string) {
  return `${namespace}:${value}`;
}
