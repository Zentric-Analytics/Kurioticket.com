import type { MobilePriceAlert } from "../../api/travelApi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type DateOnly = { year: number; month: number; day: number };

function dateOnly(value: unknown): DateOnly | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day ? { year, month, day } : null;
}

export function formatPriceAlertDateRange(departure: unknown, returning?: unknown) {
  const start = dateOnly(departure); const end = dateOnly(returning);
  if (!start) return null;
  if (!end) return `${MONTHS[start.month - 1]} ${start.day}, ${start.year}`;
  if (start.year !== end.year) return `${MONTHS[start.month - 1]} ${start.day}, ${start.year} – ${MONTHS[end.month - 1]} ${end.day}, ${end.year}`;
  if (start.month === end.month) return `${MONTHS[start.month - 1]} ${start.day}–${end.day}, ${start.year}`;
  return `${MONTHS[start.month - 1]} ${start.day} – ${MONTHS[end.month - 1]} ${end.day}, ${start.year}`;
}

export function formatTravelerCount(value: unknown) {
  const count = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(count) && count > 0 ? `${count} ${count === 1 ? "traveler" : "travelers"}` : null;
}

function cabinLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().split("-").map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`).join(" ") : null;
}

export function priceAlertTripSummary(alert: MobilePriceAlert) {
  if (alert.type !== "FLIGHT") return { primary: "Hotel alert", secondary: null };
  const query = alert.query || {};
  const tripType = query.tripType === "one-way" ? "one-way" : "round-trip";
  const dates = formatPriceAlertDateRange(query.departureDate, tripType === "one-way" ? undefined : query.returnDate);
  const travelers = formatTravelerCount(query.travelers);
  return {
    primary: [tripType === "one-way" ? "One way" : "Round trip", dates].filter(Boolean).join(" · "),
    secondary: [travelers, cabinLabel(query.cabinClass)].filter(Boolean).join(" · ") || null,
  };
}

function finiteAmount(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function amountText(amount: number) {
  return Number(amount.toFixed(2)).toString();
}

export function formatPriceAlertAmount(currency: unknown, value: unknown) {
  const amount = finiteAmount(value);
  return typeof currency === "string" && currency.trim() && amount !== null ? `${currency.trim()} ${amountText(amount)}` : null;
}

export function priceDifferencePresentation(currency: unknown, target: unknown, lastSeen: unknown) {
  const targetAmount = finiteAmount(target); const lastSeenAmount = finiteAmount(lastSeen);
  if (typeof currency !== "string" || !currency.trim() || targetAmount === null || lastSeenAmount === null) return null;
  const difference = Number((lastSeenAmount - targetAmount).toFixed(2));
  if (difference === 0) return "At target";
  return `${currency.trim()} ${amountText(Math.abs(difference))} ${difference > 0 ? "above" : "below"} target`;
}

export function formatLastChecked(value: unknown, now = new Date()) {
  if (typeof value !== "string") return null;
  const checkedMs = Date.parse(value); const nowMs = now.getTime();
  if (!Number.isFinite(checkedMs) || !Number.isFinite(nowMs)) return null;
  const elapsed = Math.max(0, nowMs - checkedMs);
  if (elapsed < 60_000) return "just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} min ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} hr ago`;
  if (elapsed < 172_800_000) return "yesterday";
  const checked = new Date(checkedMs);
  return `${MONTHS[checked.getMonth()]} ${checked.getDate()}`;
}

export function statusLabel(status: MobilePriceAlert["status"]) {
  return ({ ACTIVE: "Active", PAUSED: "Paused", TRIGGERED: "Triggered", EXPIRED: "Expired" } as const)[status];
}
