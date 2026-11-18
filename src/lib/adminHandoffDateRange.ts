/** UI-only range presets. Operational handoff reads still accept strict from/to ISO timestamps. */
export type HandoffDateRange = "today" | "7d" | "30d" | "all" | "custom";
type Raw = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * Keep older investigation deep-links with explicit from/to as Custom.
 * For rolling 7/30-day pagination, preserve the server-materialized from
 * timestamp so that cursor validation sees the exact same query scope.
 */
export function resolveHandoffDateRange(raw: Raw, now = new Date()): {
  range: HandoffDateRange;
  from: string | null;
  to: string | null;
} {
  const supplied = one(raw.range);
  const from = one(raw.from);
  const to = one(raw.to);
  const range: HandoffDateRange =
    supplied === "today" || supplied === "7d" || supplied === "30d" || supplied === "all"
      ? supplied
      : from || to ? "custom" : "today";

  if (range === "all") return { range, from: null, to: null };
  if (range === "custom") return { range, from: from || null, to: to || null };
  if (range === "today") {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { range, from: start.toISOString(), to: null };
  }

  if (from) return { range, from, to: null };
  const start = new Date(now.getTime() - (range === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000);
  return { range, from: start.toISOString(), to: null };
}

/** Include the UI preset in links but omit it from the strict backend query. */
export function withHandoffDateScope(raw: Raw, now = new Date()): Raw {
  const { range, from, to } = resolveHandoffDateRange(raw, now);
  const scoped: Raw = { ...raw, range };
  delete scoped.from;
  delete scoped.to;
  if (from) scoped.from = from;
  if (to) scoped.to = to;
  return scoped;
}
