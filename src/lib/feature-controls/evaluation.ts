import { featureControlRegistry, type FeatureControlEnvironment, type FeatureControlKey } from "./registry";

export const FEATURE_CONTROL_TTL_MS = 10_000;
type State = { enabled: boolean; verifiedAt: number; expiresAt: number };
/** No outage observation is allowed to replace a database-verified state. */
export function createFeatureControlEvaluator(
  read: (key: FeatureControlKey, environment: FeatureControlEnvironment) => Promise<boolean | null>,
  now = Date.now,
) {
  const states = new Map<string, State>();
  const generations = new Map<string, number>();
  const inFlight = new Map<string, Promise<boolean>>();
  const idFor = (key: FeatureControlKey, environment: FeatureControlEnvironment) => `${environment}:${key}`;
  function remember(key: FeatureControlKey, environment: FeatureControlEnvironment, enabled: boolean) {
    const id = idFor(key, environment);
    generations.set(id, (generations.get(id) ?? 0) + 1);
    states.set(id, { enabled, verifiedAt: now(), expiresAt: now() + FEATURE_CONTROL_TTL_MS });
  }
  function invalidate(key: FeatureControlKey, environment: FeatureControlEnvironment) {
    const id = idFor(key, environment);
    generations.set(id, (generations.get(id) ?? 0) + 1);
    const state = states.get(id);
    if (state) state.expiresAt = 0;
  }
  async function evaluate(key: FeatureControlKey, environment: FeatureControlEnvironment): Promise<boolean> {
    const id = idFor(key, environment);
    const state = states.get(id);
    if (state && state.expiresAt > now()) return state.enabled;
    const pending = inFlight.get(id);
    if (pending) return pending;
    const generation = generations.get(id) ?? 0;
    generations.set(id, generation);
    const operation = (async () => {
      try {
        const enabled = await read(key, environment);
        if (generation !== (generations.get(id) ?? 0)) return states.get(id)?.enabled ?? false;
        if (enabled === null) return false;
        states.set(id, { enabled, verifiedAt: now(), expiresAt: now() + FEATURE_CONTROL_TTL_MS });
        return enabled;
      } catch {
        const known = states.get(id);
        if (!known || !known.enabled) return false;
        // Critical provider spend/processors must be verified after cache expiry.
        // Other controls tolerate a short, bounded outage rather than flickering.
        const risk = featureControlRegistry[key].risk;
        const grace = risk === "Critical" ? FEATURE_CONTROL_TTL_MS : risk === "High" ? 60_000 : 300_000;
        return now() - known.verifiedAt < grace;
      }
    })();
    inFlight.set(id, operation);
    try { return await operation; }
    finally { if (inFlight.get(id) === operation) inFlight.delete(id); }
  }
  return { evaluate, remember, invalidate, clear: () => { states.clear(); for (const id of generations.keys()) generations.set(id, generations.get(id)! + 1); } };
}
