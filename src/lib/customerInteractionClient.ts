"use client";

import { getConfirmedBrowserAnalyticsSignal } from "@/lib/analyticsConsentClient";
import { deliverCustomerActivity } from "@/lib/customerActivityDelivery";
import { journeyRequestId } from "@/lib/journeyEventClient";
import { customerWebSectionHost, pageViewKey, type PageViewKey } from "@/lib/pageViewCatalog";
import type { JourneyObservedResult } from "@/lib/search-journey";

type Action = "local_saved" | "local_unsaved" | "saved_item_confirmed" | "saved_item_removed" | "share_link_copied" | "share_sheet_completed";
type Product = "FLIGHT" | "HOTEL" | "CAR";
export const beginCustomerInteraction = getConfirmedBrowserAnalyticsSignal;

/** Record committed in-page selections through the existing page history. */
export function recordCustomerSectionVisit(previousPageKey: PageViewKey, pageKey: PageViewKey): void {
  const consent = getConfirmedBrowserAnalyticsSignal();
  if (!consent || previousPageKey === pageKey || document.visibilityState !== "visible") return;
  const host = customerWebSectionHost(pageKey);
  if (!host || customerWebSectionHost(previousPageKey) !== host || pageViewKey(window.location.pathname, "web") !== host) return;
  try {
    const payload = { eventId: window.crypto.randomUUID(), pageKey, previousPageKey };
    deliverCustomerActivity("/api/activity/page-views", payload, consent);
  } catch { /* Section changes always work without optional analytics. */ }
}

/** Optional observed interactions. No raw travel query, share URL, account ID,
 * or browser fingerprint is transmitted. The server independently establishes
 * consent and ownership before writing a record.
 */
export function recordCustomerInteraction(consent: AbortSignal | null, input: {
  action: Action; product: Product; resultId: string; requestId?: string | null;
  observedResult?: JourneyObservedResult;
}): void {
  if (!consent || consent.aborted || consent !== getConfirmedBrowserAnalyticsSignal()) return;
  try {
    if (!input.resultId || input.resultId.length > 4096) return;
    const eventId = window.crypto.randomUUID();
    // Provider result IDs may contain opaque punctuation or exceed the API's
    // public reference limit. Hash those rather than transmitting raw payloads.
    const safe = /^[a-zA-Z0-9._:-]{1,128}$/.test(input.resultId);
    void (async () => {
      const resultId = safe ? input.resultId : Array.from(new Uint8Array(
        await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.resultId)),
      ), byte => byte.toString(16).padStart(2, "0")).join("");
      if (consent.aborted || consent !== getConfirmedBrowserAnalyticsSignal()) return;
      const requestId = journeyRequestId(input.requestId);
      const payload = { action: input.action, product: input.product, resultId, eventId,
        ...(requestId ? { requestId } : {}),
        ...(input.observedResult && /^[A-Z]{3}$/.test(input.observedResult.currency)
          && Number.isFinite(input.observedResult.amount) && input.observedResult.amount > 0
          && /^[^\u0000-\u001f\u007f<>]{1,100}$/.test(input.observedResult.provider)
          && /^[^\u0000-\u001f\u007f<>]{1,120}$/.test(input.observedResult.label)
          ? { observedResult: input.observedResult } : {}) };
      deliverCustomerActivity("/api/activity/interactions", payload, consent);
    })().catch(() => undefined);
  } catch {
    // Local saves and sharing must continue without optional analytics.
  }
}
