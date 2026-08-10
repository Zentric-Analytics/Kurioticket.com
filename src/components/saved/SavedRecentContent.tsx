"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; type?: string; label?: string | null; airlineName?: string; hotelName?: string; destination?: string | null; subtitle?: string; href?: string };
export function SavedRecentContent() {
  const [tab, setTab] = useState<"saved" | "recent">("saved");
  const [saved, setSaved] = useState<Item[]>([]);
  const [recent, setRecent] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([fetch("/api/dashboard/saved"), fetch("/api/account/recent-searches")]);
      if (!s.ok || !r.ok) throw new Error();
      setSaved((await s.json()).items ?? []); setRecent((await r.json()).items ?? []);
    } catch { setError("Unable to load your saved and recent travel."); }
  }, []);
  // The initial request hydrates private account data after the client session is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const removeSaved = async (item: Item) => { const response = await fetch("/api/dashboard/saved", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: item.type, id: item.id }) }); if (response.ok) setSaved(x => x.filter(y => y.id !== item.id)); };
  const removeRecent = async (id: string) => { const response = await fetch("/api/account/recent-searches", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); if (response.ok) setRecent(x => x.filter(y => y.id !== id)); };
  const clearRecent = async () => { const response = await fetch("/api/account/recent-searches?clear=all", { method: "DELETE" }); if (response.ok) setRecent([]); };
  const items = tab === "saved" ? saved : recent;
  return <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-teal">Your travel</p>
    <h1 className="mt-2 text-3xl font-bold text-navy">Saved &amp; Recent</h1>
    <p className="mt-2 text-slate-600">Saved items are things you chose to keep. Recent shows searches you recently performed.</p>
    <div className="mt-7 flex items-center gap-2 border-b border-slate-200" role="tablist" aria-label="Saved and recent travel">
      {(["saved", "recent"] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`px-4 py-3 font-semibold capitalize ${tab === value ? "border-b-2 border-teal text-navy" : "text-slate-500"}`}>{value}</button>)}
      {tab === "recent" && recent.length > 0 ? <button className="ml-auto text-sm font-semibold text-red-700" onClick={() => void clearRecent()}>Clear recent</button> : null}
    </div>
    {error ? <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{error}</p> : null}
    {!error && items.length === 0 ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center"><h2 className="text-xl font-bold text-navy">No {tab} travel yet</h2><p className="mt-2 text-slate-600">{tab === "saved" ? "Use Save on a flight, hotel, or search to keep it here." : "Your latest searches will appear here."}</p></div> : null}
    <ul className="mt-6 grid gap-3">{items.map(item => <li key={`${item.type ?? "recent"}-${item.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1"><strong className="block truncate text-navy">{item.label || item.airlineName || item.hotelName || item.destination || "Saved search"}</strong><span className="text-sm capitalize text-slate-500">{item.type || item.subtitle || "Recent search"}</span></div>{item.href ? <Link className="font-semibold text-teal" href={item.href}>Search again</Link> : null}<button className="font-semibold text-red-700" onClick={() => void (tab === "saved" ? removeSaved(item) : removeRecent(item.id))}>Remove</button></li>)}</ul>
  </section>;
}
