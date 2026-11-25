// Short-lived navigation context for a requested provider handoff. Not an
// analytics event or identity. Never write to browser storage or send anything
// until the customer actually requests a provider handoff.
export type OperationalHandoffProduct = "flight" | "hotel";
export type OperationalHandoffReference = { operationalRequestId?: string };
export type OperationalHandoffReader = () => OperationalHandoffReference;
const ttlMs = 30 * 60_000;
const maximumReferences = 64;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Reference = { requestId: string; expiresAt: number };
export function createOperationalHandoffContext(now = Date.now) {
  let actor: string | null = null;
  const entries = new Map<string, Reference>();
  const key = (product: OperationalHandoffProduct, resultId: string) => JSON.stringify([product, resultId]);
  return {
    setActor(next: string | null) {
      if (actor === next) return;
      entries.clear();
      actor = next;
    },
    remember(owner: string | null, product: OperationalHandoffProduct, resultId: string, requestId: unknown) {
      if (!owner || owner !== actor || !resultId || resultId.length > 4096) return;
      const k = key(product, resultId);
      entries.delete(k); // Missing context must not revive a previous search.
      const at = now();
      for (const [id, item] of entries) if (item.expiresAt <= at) entries.delete(id);
      if (typeof requestId !== "string" || !uuid.test(requestId)) return;
      while (entries.size >= maximumReferences) entries.delete(entries.keys().next().value!);
      entries.set(k, { requestId: requestId.toLowerCase(), expiresAt: at + ttlMs });
    },
    prepare(owner: string | null, product: OperationalHandoffProduct, resultId: string): OperationalHandoffReader {
      const k = key(product, resultId);
      const item = owner && owner === actor ? entries.get(k) : undefined;
      let eligible = Boolean(item && item.expiresAt > now());
      return () => {
        eligible = eligible && owner === actor && entries.get(k) === item && Boolean(item && item.expiresAt > now());
        return eligible && item ? { operationalRequestId: item.requestId } : {};
      };
    },
  };
}
