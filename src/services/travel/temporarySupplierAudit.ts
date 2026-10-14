/** TEMPORARY: remove after the authorized staging supplier-field comparison. */
import { createHash } from "node:crypto";
import type { KayakSearch, SandboxOffer } from "./kayakSandbox";
import { kayakCarCardModel, kayakFlightCardModel, kayakHotelCardModel } from "@/components/results/kayakCardModels";

const EXPIRES_AT = Date.parse("2026-10-14T06:00:00Z");
const captured = new Set<string>();
const PRIVATE_FIELD = /(^|_)(id|ids|ip|email|phone|name_of_passenger|token|key|secret|password|authorization|cookie|session|tracking|reference|birth|passport|credential|bank|card)(_|$)|(?:Id|Ids|Token|Key|Secret|Url|Uri|CardNumber|AccountNumber)$/;
type Leaf = { path: string; type: string; fingerprint: string; value?: number | boolean; length?: number };

/** No original strings, links, dictionary identifiers or passenger objects leave memory. */
export function auditFingerprints(input: unknown, prefix: string): { leaves: Leaf[]; bounded: boolean } {
  const leaves: Leaf[] = [];
  let bounded = false;
  const visit = (value: unknown, path: string, depth: number) => {
    if (depth > 12 || leaves.length >= 240) { bounded = true; return; }
    if (Array.isArray(value)) { for (const item of value) visit(item, `${path}[]`, depth + 1); return; }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (PRIVATE_FIELD.test(key) || /^(rawProviderReference|passengers|passenger)$/i.test(key) && typeof item === "object") continue;
        visit(item, `${path}.${key}`, depth + 1);
      }
      return;
    }
    if (!["string", "number", "boolean"].includes(typeof value)) return;
    if (typeof value === "string" && /api[-_]?key|access[-_]?token|authorization|bearer\s/i.test(value)) return;
    leaves.push({ path, type: typeof value, fingerprint: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
      ...(typeof value === "number" || typeof value === "boolean" ? { value } : { length: String(value).length }) });
  };
  visit(input, prefix, 0);
  return { leaves, bounded };
}

export function temporaryAuditAllowed(search: KayakSearch, env: Record<string, string | undefined> = process.env, now = Date.now()) {
  return env.NEXT_PUBLIC_APP_URL === "https://staging.kurioticket.com"
    && env.TRAVEL_PROVIDER_MODE === "staging" && env.KAYAK_SANDBOX_ENABLED === "true"
    && now < EXPIRES_AT && search.departure === "2026-11-18";
}

export function captureTemporarySupplierAudit(search: KayakSearch, data: Record<string, unknown>, sample: SandboxOffer) {
  if (!temporaryAuditAllowed(search) || captured.has(search.vertical)) return;
  captured.add(search.vertical);
  const rows = Array.isArray(data.results) ? data.results : [];
  const days = Math.max(1, "returnDate" in search && search.returnDate
    ? Math.round((Date.parse(search.returnDate) - Date.parse(search.departure)) / 86400000) : 1);
  const normalized = search.vertical === "flights" ? kayakFlightCardModel(sample, { adults: String(search.adults) })
    : search.vertical === "hotels" ? kayakHotelCardModel(sample, days) : kayakCarCardModel(sample, days, search.origin);
  const row = rows[0] as Record<string, unknown>;
  const optionField = search.vertical === "hotels" ? "rates" : "bookingOptions";
  const optionIndex = Number(sample.id.split(":").at(-1));
  const option = (Array.isArray(row[optionField]) ? row[optionField][optionIndex] : {}) as Record<string, unknown>;
  const source = { ...row, [optionField]: [option] };
  const inventory = [auditFingerprints(source, "raw.result"), auditFingerprints(normalized, "normalized")];
  const related = new Set<string>([String(option.providerCode), String(option.agencyCode), String(option.pickupLocationId), String(option.dropoffLocationId)]);
  const dictionaryRow = (name: string, id: string) => (data[name] as Record<string, unknown> | undefined)?.[id] as Record<string, unknown> | undefined;
  for (const reference of Array.isArray(row.legs) ? row.legs : []) {
    const id = String(reference.id); related.add(id);
    const leg = dictionaryRow("legs", id);
    for (const segmentReference of Array.isArray(leg?.segments) ? leg.segments : []) {
      const segmentId = String(segmentReference.id); related.add(segmentId);
      const segment = dictionaryRow("segments", segmentId);
      if (segment?.airline) related.add(String(segment.airline));
    }
  }
  for (const dictionary of ["segments", "legs", "airlines", "carLocations", "providers", "agencies"]) {
    const values = data[dictionary];
    if (values && typeof values === "object") {
      // Keys are transport identities; inventory values only, with anonymous paths.
      inventory.push(auditFingerprints(Object.entries(values).filter(([id]) => related.has(id)).map(([, value]) => value), `raw.${dictionary}`));
    }
  }
  const leaves = inventory.flatMap(item => item.leaves);
  const capture = `${search.vertical}-${Date.now()}`;
  console.info("[kayak-supplier-audit]", JSON.stringify({ capture, vertical: search.vertical, event: "summary", revision: process.env.RENDER_GIT_COMMIT, bounded: inventory.some(item => item.bounded), fields: leaves.length }));
  for (let offset = 0; offset < leaves.length; offset += 40) {
    console.info("[kayak-supplier-audit]", JSON.stringify({ capture, event: "fields", offset, leaves: leaves.slice(offset, offset + 40) }));
  }
}
