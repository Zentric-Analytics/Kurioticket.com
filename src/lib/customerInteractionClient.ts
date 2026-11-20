"use client";

import { analyticsConsentStorageKey } from "@/lib/analyticsConsentClient";
import { journeyRequestId } from "@/lib/journeyEventClient";

type Action = "local_saved" | "local_unsaved" | "saved_item_confirmed" | "saved_item_removed" | "share_link_copied" | "share_sheet_completed";
type Product = "FLIGHT" | "HOTEL" | "CAR";

/** Optional observed interactions. No raw travel query, share URL, account ID,
 * or browser fingerprint is transmitted. The server independently establishes
 * consent and ownership before writing a record.
 */
export function recordCustomerInteraction(input: {
  action: Action; product: Product; resultId: string; requestId?: string | null;
}): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(analyticsConsentStorageKey) !== "granted") return;
    if (!input.resultId || input.resultId.length > 4096) return;
    const eventId = window.crypto.randomUUID();
    // Provider result IDs may contain opaque punctuation or exceed the API's
    // public reference limit. Hash those rather than transmitting raw payloads.
    const safe = /^[a-zA-Z0-9._:-]{1,128}$/.test(input.resultId);
    void (async () => {
      const resultId = safe ? input.resultId : Array.from(new Uint8Array(
        await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.resultId)),
      ), byte => byte.toString(16).padStart(2, "0")).join("");
      await fetch("/api/activity/interactions", {
        method: "POST", cache: "no-store", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: input.action, product: input.product, resultId, eventId,
          ...(journeyRequestId(input.requestId) ? { requestId: journeyRequestId(input.requestId) } : {}) }),
      });
    })().catch(() => undefined);
  } catch {
    // Local saves and sharing must continue without optional analytics.
  }
}
