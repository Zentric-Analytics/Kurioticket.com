"use client";
import { savedFlightLocalSummary } from "@/shared/flights/savedFlightTime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { observeAccountResume } from "@/lib/accountResume";
import Link from "next/link";
import { useLocale } from "@/components/layout/LocaleProvider";
import { invalidateSavedCarsClientCache } from "@/lib/saved-car-events";
import { invalidateSavedFlightsClientCache } from "@/lib/saved-flight-events";
import { recordCustomerSectionVisit } from "@/lib/customerInteractionClient";

type Item = { originAirport?: string; destinationAirport?: string; id: string; type?: string; label?: string | null; airlineName?: string; hotelName?: string; modelName?: string; pickupLocation?: string; destination?: string | null; subtitle?: string; href?: string; payload?: unknown };
const savedHref = (item: Item) => {
  if (item.href) return item.href;
  if (item.type !== "car" || !item.payload || typeof item.payload !== "object") return undefined;
  const payload = item.payload as { result?: { id?: unknown }; searchParams?: unknown };
  if (!payload.result || typeof payload.result.id !== "string" || !payload.searchParams || typeof payload.searchParams !== "object") return undefined;
  const params = new URLSearchParams(Object.entries(payload.searchParams as Record<string, unknown>).flatMap(([key, value]) => typeof value === "string" || typeof value === "number" ? [[key, String(value)]] : []));
  return `/cars/details/${encodeURIComponent(payload.result.id)}?${params.toString()}`;
};
const sectionKeys = { saved: "saved_items", recent: "recent" } as const;
export function SavedRecentContent() {
  const { t } = useLocale();
  const [tab, setTab] = useState<"saved" | "recent">("saved");
  const [saved, setSaved] = useState<Item[]>([]);
  const [recent, setRecent] = useState<Item[]>([]);
  const [error, setError] = useState(false);
  const { data: session, status } = useSession();
  const account = status === "authenticated" ? session?.user?.id ?? null : null;
  const owner = useRef(account);
  useLayoutEffect(() => { owner.current = account; return () => { owner.current = null; }; }, [account]);
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  const revision = useRef(0), pending = useRef(0);
  const load = useCallback(async () => {
    if (!account || pending.current) return;
    const requested = ++revision.current;
    try {
      const [s, r] = await Promise.all([fetch("/api/dashboard/saved", { cache: "no-store" }), fetch("/api/account/recent-searches", { cache: "no-store" })]);
      if (requested !== revision.current || owner.current !== account) return;
      if (s.status === 401 || r.status === 401) { setSaved([]); setRecent([]); setDataOwner(null); }
      if (!s.ok || !r.ok) throw new Error();
      const [savedData, recentData] = await Promise.all([s.json(), r.json()]);
      if (requested !== revision.current || owner.current !== account) return;
      setSaved(savedData.items ?? []); setRecent(recentData.items ?? []); setDataOwner(account);
      setError(false);
    } catch { if (requested === revision.current && owner.current === account) setError(true); }
  }, [account]);
  // The initial request hydrates private account data after the client session is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); return observeAccountResume(() => { void load(); }, window, document); }, [load]);
  const mutate = async (task: () => Promise<Response>, apply: () => void) => {
    if (!account) return;
    pending.current++; revision.current++;
    try { const response = await task(); if (!response.ok && response.status !== 404) throw new Error(); if (owner.current === account) { apply(); setError(false); } }
    catch { if (owner.current === account) setError(true); }
    finally { pending.current--; }
  };
  const removeSaved = async (item: Item) => mutate(() => fetch("/api/dashboard/saved", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: item.type, id: item.id }) }), () => { setSaved(x => x.filter(y => y.id !== item.id)); if (item.type === "car") invalidateSavedCarsClientCache(); if (item.type === "flight") invalidateSavedFlightsClientCache(); });
  const removeRecent = async (id: string) => mutate(() => fetch("/api/account/recent-searches", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }), () => setRecent(x => x.filter(y => y.id !== id)));
  const clearRecent = async () => mutate(() => fetch("/api/account/recent-searches?clear=all", { method: "DELETE" }), () => setRecent([]));
  const selectTab = (next: keyof typeof sectionKeys) => {
    setTab(next);
    recordCustomerSectionVisit(sectionKeys[tab], sectionKeys[next]);
  };
  const items = account && account === dataOwner ? tab === "saved" ? saved : recent : [];
  return <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <h1 className="mt-2 text-3xl font-bold text-navy">{t.savedTripsPageTitle}</h1>
    <p className="mt-2 text-slate-600">{t.savedTripsRecentSearchesSubtitle}</p>
    <div className="mt-7 flex items-center gap-2 border-b border-slate-200" role="tablist" aria-label={t.savedTripsTabsLabel}>
      {(["saved", "recent"] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => selectTab(value)} className={`px-4 py-3 font-semibold capitalize ${tab === value ? "border-b-2 border-teal text-navy" : "text-slate-500"}`}>{value === "saved" ? t.savedTripsTabSaved : t.savedTripsTabHistory}</button>)}
      {tab === "recent" && recent.length > 0 ? <button className="ml-auto text-sm font-semibold text-red-700" onClick={() => void clearRecent()}>{t.savedTripsClearAllRecent}</button> : null}
    </div>
    {error ? <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-800"><p>{t["accountDashboard.trips.state.error.body"]}</p><button className="mt-2 font-semibold underline" onClick={() => void load()}>{t["accountDashboard.trips.state.error.retry"]}</button></div> : null}
    {!error && items.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center"><h2 className="text-xl font-bold text-navy">{tab === "saved" ? t.savedTripsEmptyTitle : t.savedTripsNoRecentTitle}</h2><p className="mt-2 text-slate-600">{tab === "saved" ? t.savedTripsEmptyDescription : t.savedTripsNoRecentDescription}</p></div> : null}
    <ul className="mt-6 grid gap-3">{items.map(item => {
      const href = savedHref(item);
      const typeLabel = item.type === "flight" ? t.savedTripsTypeFlight
        : item.type === "hotel" ? t.savedTripsTypeHotel
        : item.type === "car" ? t.cars
        : item.subtitle || (tab === "saved" ? t.savedTripsTabSaved : t.savedTripsRecentSearchesTitle);
      const label = item.label || item.airlineName || item.hotelName || item.modelName || item.destination || item.pickupLocation || typeLabel;
      const removeLabel = tab === "saved" ? t.savedTripsRemoveSavedTrip : t.savedTripsRemoveRecentSearch;
      return <li key={`${item.type ?? "recent"}-${item.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0 flex-1"><strong className="block truncate text-navy">{label}</strong><span className="text-sm capitalize text-slate-500">{typeLabel}</span>{item.type === "flight" && savedFlightLocalSummary(item) ? <p className="mt-1 text-sm text-slate-600">{savedFlightLocalSummary(item)}</p> : null}</div>
        {href ? <Link className="font-semibold text-teal" href={href}>{t.savedTripsRepeatSearch}</Link> : null}
        <button className="font-semibold text-red-700" aria-label={`${removeLabel}: ${label}`} onClick={() => void (tab === "saved" ? removeSaved(item) : removeRecent(item.id))}>{removeLabel}</button>
      </li>;
    })}</ul>
  </section>;
}
