"use client";

import { getConfirmedBrowserAnalyticsSignal } from "@/lib/analyticsConsentClient";
import { deliverCustomerActivity } from "@/lib/customerActivityDelivery";
import type { DealsPackageMode } from "./dealsSearchParams";

/** Observe a validated guided submission, never its provider outcome. */
export function recordPackageSearchSubmission(mode: DealsPackageMode) {
  const consent = getConfirmedBrowserAnalyticsSignal();
  if (!consent || !globalThis.crypto?.randomUUID) return;
  deliverCustomerActivity("/api/activity/interactions", {
    action: "package_search_submitted", mode, eventId: crypto.randomUUID(),
  }, consent);
}
