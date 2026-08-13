import { getRequiredDealsJourneyStateV2 } from "./dealsJourneyEngineV2";
import {
  parseDealsTripPlanV2,
  serializeDealsTripPlanV2,
  type DealsTripPlanV2,
} from "./dealsTripPlanV2";

const STORAGE_KEY = "kurioticket:deals:guided-v2-handoff";

export type DealsHandoffSnapshotReadV2 =
  | { status: "valid"; plan: DealsTripPlanV2 }
  | {
      status:
        | "missing"
        | "malformed"
        | "fingerprint-mismatch"
        | "expired"
        | "hotel"
        | "flight"
        | "car";
    };

export function writeDealsHandoffSnapshotV2(
  storage: Storage,
  plan: DealsTripPlanV2,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, serializeDealsTripPlanV2(plan));
    return true;
  } catch {
    return false;
  }
}

export function readDealsHandoffSnapshotV2(
  storage: Storage,
  expectedFingerprint: string,
  now = Date.now(),
): DealsHandoffSnapshotReadV2 {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: "missing" };
  }
  if (raw === null) return { status: "missing" };
  const plan = parseDealsTripPlanV2(raw);
  if (!plan) return { status: "malformed" };
  if (plan.searchFingerprint !== expectedFingerprint)
    return { status: "fingerprint-mismatch" };
  if (plan.expiresAt <= now) return { status: "expired" };
  const required = getRequiredDealsJourneyStateV2(plan, now);
  if (required === "hotel") return { status: "hotel" };
  if (required.startsWith("flight-")) return { status: "flight" };
  if (required === "car") return { status: "car" };
  return { status: "valid", plan };
}
