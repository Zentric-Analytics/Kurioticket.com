import { hotelDestinations } from "../../../../../src/data/hotelDestinations";
import { destinationById, destinationByAirportCode } from "../explore/destinationCatalogue";
import type { PopularDestinationStay } from "./PopularDestinationStaysData";
import type { RegionalDestinationRoute } from "./RegionalDestinationRoutesData";

type Section<T> = { source: "cms" | "fallback"; items: T[] };
export type PublishedHome = { destinations: Section<PopularDestinationStay>; flightRoutes: Section<RegionalDestinationRoute & { title: string; routeNote: string; savedDestinationId?: string }> };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 300) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : "";
function image(value: unknown, origin: string) {
  const path = text(value, 2000);
  if (!path || path.startsWith("//")) return null;
  try { const url = new URL(path, origin); const localApiAsset = url.protocol === "http:" && url.origin === new URL(origin).origin; return (url.protocol === "https:" || localApiAsset) && !url.username && !url.password ? { uri: url.href } : null; } catch { return null; }
}
function section<T>(value: unknown, parse: (row: Record<string, unknown>) => T | null): Section<T> {
  const data = record(value);
  if (!["cms", "fallback"].includes(String(data.source)) || !Array.isArray(data.items) || data.items.length > 500) throw new Error("Invalid published content");
  const seen = new Set<string>();
  return { source: data.source as Section<T>["source"], items: data.items.flatMap(value => {
    const row = record(value), id = text(row.id, 120);
    if (!id || seen.has(id)) return [];
    const item = parse(row); if (!item) return []; seen.add(id); return [item];
  }) };
}
export function parsePublishedHome(value: unknown, origin: string): PublishedHome {
  const data = record(value);
  return {
    destinations: section(data.destinations, row => {
      const canonicalDestinationId = text(row.canonicalDestinationId, 120);
      const canonical = hotelDestinations.find(item => item.id === canonicalDestinationId);
      const asset = image(row.image, origin);
      if (!canonical || row.destinationSearchValue !== canonical.searchValue || !asset || !text(row.city) || !text(row.country)) return null;
      const savedId = canonicalDestinationId === "br-rio" ? "br-rio-de-janeiro" : canonicalDestinationId;
      return { id: String(row.id), canonicalDestinationId, destinationSearchValue: canonical.searchValue,
        city: text(row.city), country: text(row.country), image: asset, imageAlt: text(row.imageAlt) || text(row.city),
        ...(destinationById.has(savedId) ? { savedDestinationId: savedId } : {}) };
    }),
    flightRoutes: section(data.flightRoutes, row => {
      const originCode = text(row.originCode, 3), destinationCode = text(row.destinationCode, 3), asset = image(row.image, origin);
      if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destinationCode) || originCode === destinationCode || !asset || !text(row.originCity) || !text(row.destinationCity)) return null;
      return { id: String(row.id), originCode, destinationCode, originCity: text(row.originCity), destinationCity: text(row.destinationCity), title: text(row.title) || text(row.destinationCity), routeNote: text(row.routeNote), savedDestinationId: destinationByAirportCode.get(destinationCode)?.id, image: asset, imageAlt: text(row.imageAlt) || text(row.destinationCity) };
    }),
  };
}
export function parsePublishedFaqs(value: unknown) {
  return section(value, row => text(row.question, 500) && text(row.answer, 10_000) ? { id: String(row.id), question: text(row.question, 500), answer: text(row.answer, 10_000) } : null);
}
export function createPublishedResource<T>(load: () => Promise<unknown>, parse: (value: unknown) => T) {
  let snapshot: { state: "loading" | "available" | "unavailable"; data: T | null } = { state: "loading", data: null };
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: typeof snapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  return {
    snapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh: () => {
      if (pending) return pending;
      publish({ state: "loading", data: null });
      pending = load().then(value => publish({ state: "available", data: parse(value) }))
        .catch(() => publish({ state: "unavailable", data: null })).finally(() => { pending = null; });
      return pending;
    },
  };
}
