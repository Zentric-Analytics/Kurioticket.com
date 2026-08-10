import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { featureControlKeys, featureControlRegistry, isFeatureControlKey, type FeatureControlEnvironment, type FeatureControlKey } from "./registry";

const TTL_MS = 10_000;
const cache = new Map<string, { enabled: boolean; expiresAt: number }>();
const cacheKey = (key: FeatureControlKey, environment: FeatureControlEnvironment) => `${environment}:${key}`;
export const getRuntimeFeatureEnvironment = (): FeatureControlEnvironment => getPublicEnvironment() === "staging" ? "STAGING" : "PRODUCTION";

export class UnknownFeatureControlError extends Error { constructor() { super("Unknown feature control."); this.name = "UnknownFeatureControlError"; } }
export function resetFeatureControlCache() { cache.clear(); }
export function invalidateFeatureControl(key: FeatureControlKey, environment: FeatureControlEnvironment) { cache.delete(cacheKey(key, environment)); }

export async function isFeatureEnabled(key: FeatureControlKey, environment = getRuntimeFeatureEnvironment()): Promise<boolean> {
  if (!isFeatureControlKey(key)) throw new UnknownFeatureControlError();
  const id = cacheKey(key, environment);
  const hit = cache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit.enabled;
  const definition = featureControlRegistry[key];
  const fallback = environment === "STAGING" ? definition.defaultStaging : definition.defaultProduction;
  try {
    const row = await getPrisma().featureFlag.findUnique({ where: { key_environment: { key, environment } }, select: { enabled: true } });
    const enabled = row?.enabled ?? fallback;
    cache.set(id, { enabled, expiresAt: Date.now() + TTL_MS });
    return enabled;
  } catch (error) {
    console.error("[feature-controls:evaluation-fallback]", { key, environment, errorName: error instanceof Error ? error.name : "unknown" });
    cache.set(id, { enabled: fallback, expiresAt: Date.now() + TTL_MS });
    return fallback;
  }
}

export async function listFeatureControls() {
  let rows: Array<{ id: string; key: string; environment: FeatureControlEnvironment; enabled: boolean; updatedAt: Date }> = [];
  try { rows = await getPrisma().featureFlag.findMany({ where: { key: { in: [...featureControlKeys] } }, select: { id: true, key: true, environment: true, enabled: true, updatedAt: true } }); } catch { /* defaults make the read-only UI safe */ }
  return featureControlKeys.map((key) => ({ key, ...featureControlRegistry[key], states: Object.fromEntries((["STAGING", "PRODUCTION"] as const).map((environment) => {
    const row = rows.find((candidate) => candidate.key === key && candidate.environment === environment);
    return [environment, { enabled: row?.enabled ?? (environment === "STAGING" ? featureControlRegistry[key].defaultStaging : featureControlRegistry[key].defaultProduction), updatedAt: row?.updatedAt?.toISOString() ?? null }];
  })) as Record<FeatureControlEnvironment, { enabled: boolean; updatedAt: string | null }> }));
}

export async function getPublicFeatureAvailability() {
  const environment = getRuntimeFeatureEnvironment();
  const mapping = { flightSearch: "FLIGHT_SEARCH_ENABLED", hotelSearch: "HOTEL_SEARCH_ENABLED", carSearch: "CAR_SEARCH_ENABLED", deals: "DEALS_ENABLED", priceAlerts: "PRICE_ALERTS_ENABLED", routeWatch: "ROUTE_WATCH_ENABLED" } as const;
  return Object.fromEntries(await Promise.all(Object.entries(mapping).map(async ([name, key]) => [name, await isFeatureEnabled(key, environment)]))) as Record<keyof typeof mapping, boolean>;
}

export type FeatureMutationActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export async function mutateFeatureControl(input: { key: FeatureControlKey; environment: FeatureControlEnvironment; enabled: boolean; reason?: string; actor: FeatureMutationActor }) {
  const definition = featureControlRegistry[input.key];
  const result = await getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.environment}:${input.key}`}))`;
    let row = await tx.featureFlag.findUnique({ where: { key_environment: { key: input.key, environment: input.environment } } });
    if (!row) row = await tx.featureFlag.create({ data: { key: input.key, environment: input.environment, name: definition.name, description: definition.description, enabled: input.environment === "STAGING" ? definition.defaultStaging : definition.defaultProduction } });
    if (row.enabled === input.enabled) return { changed: false as const, state: row };
    const updated = await tx.featureFlag.update({ where: { id: row.id }, data: { enabled: input.enabled, name: definition.name, description: definition.description } });
    await tx.adminAuditLog.create({ data: { adminUserId: input.actor.id, adminEmail: input.actor.email.toLowerCase(), action: "FEATURE_CONTROL_UPDATED", targetType: "FeatureFlag", targetId: row.id, metadata: { featureKey: input.key, environment: input.environment, previousEnabled: row.enabled, nextEnabled: input.enabled, reason: input.reason || null, category: definition.category, riskLevel: definition.risk } as Prisma.InputJsonValue, ipAddress: input.actor.ipAddress, userAgent: input.actor.userAgent } });
    return { changed: true as const, state: updated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  invalidateFeatureControl(input.key, input.environment);
  return result;
}
