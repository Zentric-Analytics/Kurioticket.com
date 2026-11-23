import { adminTodayStart } from "./adminTimeZone";
/** Presentation-only queue date-range selection. Backend receives only ISO from/to. */
export type AdminQueueRange = "24h" | "today" | "7d" | "30d" | "custom" | "all";

export const adminQueueRangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;

export type AdminQueueWindow = { range: AdminQueueRange; from: string; to: string };

export function isAdminQueueRange(value: string): value is AdminQueueRange {
  return value === "24h" || adminQueueRangeOptions.some(option => option.value === value);
}

/** A missing range means Today (midnight UTC to now), or custom for legacy dated URLs. */
export function resolveAdminQueueWindow(
  raw: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
  timeZone = "UTC",
): AdminQueueWindow {
  const range: AdminQueueRange = isAdminQueueRange(raw.range || "")
    ? raw.range as AdminQueueRange
    : raw.from || raw.to ? "custom" : "today";
  if (range === "all") return { range, from: "", to: "" };
  if (range === "custom") return { range, from: raw.from || "", to: raw.to || "" };
  // Reuse the exact applied interval across pagination and status-tab navigation.
  if (raw.from && raw.to) return { range, from: raw.from, to: raw.to };
  const to = now.toISOString();
  const dayStart = adminTodayStart(now, timeZone).toISOString();
  const durationMs = range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : 86400000;
  return { range, from: range === "today" ? dayStart : new Date(now.getTime() - durationMs).toISOString(), to };
}

export function toAdminQueueDateParams(window: AdminQueueWindow): URLSearchParams {
  const params = new URLSearchParams({ range: window.range });
  if (window.from) params.set("from", window.from);
  if (window.to) params.set("to", window.to);
  return params;
}

/** Browser local datetime inputs may be cleared; never silently send invalid dates. */
export function validateCustomQueueWindow(from: string, to: string): string | null {
  if (!from || !to) return "Choose both start and end dates.";
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Enter valid dates.";
  if (start >= end) return "Start must be earlier than end.";
  return null;
}

/** Local datetime input values have no zone; convert explicitly to ISO UTC. */
export function localQueueDateTime(iso: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
