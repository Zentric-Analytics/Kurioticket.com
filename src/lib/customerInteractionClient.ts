"use client";

import { analyticsConsentStorageKey } from "@/lib/analyticsConsentClient";

type Action = "local_saved" | "local_unsaved" | "share_link_copied" | "share_sheet_completed";
type Product = "FLIGHT" | "HOTEL" | "CAR";

/** Optional observed interactions. No raw travel query, share URL, account ID,
 * or browser fingerprint is transmitted. The server independently establishes
 * consent and ownership before writing a record.
 */
export function recordCustomerInteraction(input: {
  action: Action; product: Product; resultId: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(analyticsConsentStorageKey) !== "granted") return;
    if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(input.resultId)) return;
    const eventId = window.crypto.randomUUID();
    void fetch("/api/activity/interactions", {
      method: "POST", cache: "no-store", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...input, eventId }),
    }).catch(() => undefined);
  } catch {
    // Local saves and sharing must continue without optional analytics.
  }
}
