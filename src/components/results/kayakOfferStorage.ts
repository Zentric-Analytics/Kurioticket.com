import { sandboxBookingUrl } from "@/services/travel/kayakSandboxPublic";
import type { KayakVertical, SandboxOffer } from "@/services/travel/kayakSandbox";

const PREFIX = "kurioticket:kayak-detail:";
const TTL_MS = 30 * 60 * 1000;
export type StoredKayakOffer = {offer:SandboxOffer;vertical:KayakVertical;criteria:Record<string,string>;savedAt:number};

export function saveKayakOffer(storage: Storage, value: Omit<StoredKayakOffer,"savedAt">) {
  try {
    storage.setItem(`${PREFIX}${value.offer.id}`,JSON.stringify({...value,savedAt:Date.now()}));
  } catch {
    // Navigation should still work when private browsing blocks session storage.
  }
}
export function readKayakOffer(storage: Storage, id: string, now = Date.now()): StoredKayakOffer | null {
  try {
    const value = JSON.parse(storage.getItem(`${PREFIX}${id}`) || "null") as StoredKayakOffer | null;
    if (!value || value.offer?.id !== id || !["flights","hotels","cars"].includes(value.vertical) || now-value.savedAt > TTL_MS) return null;
    const safeUrl = sandboxBookingUrl(value.offer.testUrl);
    if (!safeUrl) return null;
    return {...value,offer:{...value.offer,testUrl:safeUrl}};
  } catch { return null; }
}
