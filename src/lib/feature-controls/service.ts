import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { featureControlKeys, featureControlRegistry, isFeatureControlKey, type FeatureControlEnvironment, type FeatureControlKey } from "./registry";
import { bootstrapFeatureControls } from "./bootstrap";
import { createFeatureControlEvaluator } from "./evaluation";

export const getRuntimeFeatureEnvironment = (): FeatureControlEnvironment => getPublicEnvironment() === "staging" ? "STAGING" : "PRODUCTION";
const bootstrapPromises = new Map<FeatureControlEnvironment, Promise<void>>();
async function ensureInitialized(environment = getRuntimeFeatureEnvironment()) {
  let pending = bootstrapPromises.get(environment);
  if (!pending) {
    pending = bootstrapFeatureControls(getPrisma(), environment).catch((error) => { bootstrapPromises.delete(environment); throw error; });
    bootstrapPromises.set(environment, pending);
  }
  return pending;
}
const evaluator = createFeatureControlEvaluator(async (key, environment) => {
  await ensureInitialized(environment);
  const row = await getPrisma().featureFlag.findUnique({ where: { key_environment: { key, environment } }, select: { enabled: true } });
  return row?.enabled ?? null;
});

export class UnknownFeatureControlError extends Error { constructor() { super("Unknown feature control."); this.name = "UnknownFeatureControlError"; } }
export function resetFeatureControlCache() { evaluator.clear(); }
export function invalidateFeatureControl(key: FeatureControlKey, environment: FeatureControlEnvironment) { evaluator.invalidate(key, environment); }

export async function isFeatureEnabled(key: FeatureControlKey): Promise<boolean> {
  return isFeatureEnabledInEnvironment(key, getRuntimeFeatureEnvironment());
}
export async function isFeatureEnabledInEnvironment(key: FeatureControlKey, environment: FeatureControlEnvironment): Promise<boolean> {
  if (!isFeatureControlKey(key)) throw new UnknownFeatureControlError();
  return evaluator.evaluate(key, environment);
}

export async function listFeatureControls() {
  const environment = getRuntimeFeatureEnvironment();
  let rows: Array<{ id: string; key: string; enabled: boolean; updatedAt: Date }> = [];
  let dataAvailable = true;
  try { await ensureInitialized(); rows = await getPrisma().featureFlag.findMany({ where: { environment, key: { in: [...featureControlKeys] } }, select: { id: true, key: true, enabled: true, updatedAt: true } }); } catch { dataAvailable = false; /* registry defaults keep the read-only display safe */ }
  return { environment, dataAvailable, controls: featureControlKeys.map((key) => { const row = rows.find((candidate) => candidate.key === key); return { key, ...featureControlRegistry[key], state: { enabled: row?.enabled ?? (environment === "STAGING" ? featureControlRegistry[key].defaultStaging : featureControlRegistry[key].defaultProduction), updatedAt: row?.updatedAt?.toISOString() ?? null } }; }) };
}

export async function getPublicFeatureAvailability() {
  const mapping = { flightSearch: "FLIGHT_SEARCH_ENABLED", hotelSearch: "HOTEL_SEARCH_ENABLED", carSearch: "CAR_SEARCH_ENABLED", deals: "DEALS_ENABLED", priceAlerts: "PRICE_ALERTS_ENABLED" } as const;
  return Object.fromEntries(await Promise.all(Object.entries(mapping).map(async ([name, key]) => [name, await isFeatureEnabled(key)]))) as Record<keyof typeof mapping, boolean>;
}

export type FeatureMutationActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export async function mutateFeatureControl(input: { key: FeatureControlKey; environment: FeatureControlEnvironment; enabled: boolean; reason?: string; actor: FeatureMutationActor }) {
  const definition = featureControlRegistry[input.key];
  const result = await getPrisma().$transaction(async (tx) => {
    // Preserve the transaction lock without asking Prisma to decode PostgreSQL void.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.environment}:${input.key}`}))`;
    let row = await tx.featureFlag.findUnique({ where: { key_environment: { key: input.key, environment: input.environment } } });
    if (!row) row = await tx.featureFlag.create({ data: { key: input.key, environment: input.environment, name: definition.name, description: definition.description, enabled: input.environment === "STAGING" ? definition.defaultStaging : definition.defaultProduction } });
    if (row.enabled === input.enabled) return { changed: false as const, state: row };
    const updated = await tx.featureFlag.update({ where: { id: row.id }, data: { enabled: input.enabled, name: definition.name, description: definition.description } });
    await tx.adminAuditLog.create({ data: { adminUserId: input.actor.id, adminEmail: input.actor.email.toLowerCase(), action: "FEATURE_CONTROL_UPDATED", targetType: "FeatureFlag", targetId: row.id, metadata: { featureKey: input.key, environment: input.environment, previousEnabled: row.enabled, nextEnabled: input.enabled, reason: input.reason || null, category: definition.category, riskLevel: definition.risk } as Prisma.InputJsonValue, ipAddress: input.actor.ipAddress, userAgent: input.actor.userAgent } });
    return { changed: true as const, state: updated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  evaluator.remember(input.key, input.environment, result.state.enabled);
  return result;
}
