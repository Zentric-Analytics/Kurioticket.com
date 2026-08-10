"use client";

import { useState } from "react";
import type { FeatureControlEnvironment, FeatureControlKey } from "@/lib/feature-controls/registry";

type Control = { key: FeatureControlKey; name: string; description: string; category: string; risk: string; kind: string; states: Record<FeatureControlEnvironment, { enabled: boolean; updatedAt: string | null }> };

export function FeatureControlsPanel({ initialControls, canControlProduction }: { initialControls: Control[]; canControlProduction: boolean }) {
  const [controls, setControls] = useState(initialControls);
  const [pending, setPending] = useState<{ control: Control; environment: FeatureControlEnvironment; enabled: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const categories = ["Travel Search", "Travel Automation"];
  async function submit() {
    if (!pending) return;
    setSaving(true); setError("");
    const response = await fetch("/api/admin/feature-controls", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: pending.control.key, environment: pending.environment, enabled: pending.enabled, ...(reason.trim() ? { reason: reason.trim() } : {}) }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "The control could not be changed."); setSaving(false); return; }
    setControls((current) => current.map((control) => control.key === pending.control.key ? { ...control, states: { ...control.states, [pending.environment]: { enabled: body.enabled, updatedAt: new Date().toISOString() } } } : control));
    setPending(null); setReason(""); setSaving(false);
  }
  return <div className="space-y-6">
    {categories.map((category) => <section key={category}><h3 className="text-lg font-black text-slate-950">{category}</h3><div className="mt-3 grid gap-3">{controls.filter((c) => c.category === category).map((control) => <article key={control.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-3"><div className="max-w-2xl"><h4 className="font-bold text-slate-950">{control.name}</h4><p className="mt-1 text-sm text-slate-600">{control.description}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">{control.risk} risk · {control.kind}</p></div><div className="grid min-w-72 grid-cols-2 gap-2">{(["STAGING", "PRODUCTION"] as const).map((environment) => { const state = control.states[environment]; const permitted = environment === "STAGING" || canControlProduction; return <div key={environment} className="rounded-lg bg-white p-3 text-center"><div className="text-xs font-black text-slate-500">{environment}</div><button disabled={!permitted} onClick={() => setPending({ control, environment, enabled: !state.enabled })} className={`mt-2 rounded-full px-3 py-1 text-sm font-bold ${state.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"} disabled:cursor-not-allowed disabled:opacity-50`}>{state.enabled ? "Enabled" : "Disabled"}</button><div className="mt-1 text-[11px] text-slate-500">{state.updatedAt ? `Changed ${new Date(state.updatedAt).toLocaleDateString()}` : "Registry default"}</div></div>; })}</div></div></article>)}</div></section>)}
    {pending && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-black">{pending.enabled ? "Enable" : "Disable"} {pending.control.name}?</h3><p className="mt-2 text-sm font-bold text-slate-500">Environment: {pending.environment}</p><p className="mt-3 text-sm text-slate-700">{pending.control.description}</p><label className="mt-4 block text-sm font-bold">Reason {pending.environment === "PRODUCTION" ? "(required)" : "(optional)"}<textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>{error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={() => { setPending(null); setError(""); setReason(""); }} className="rounded-xl px-4 py-2 font-bold">Cancel</button><button disabled={saving || (pending.environment === "PRODUCTION" && !reason.trim())} onClick={submit} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Confirm change"}</button></div></div></div>}
  </div>;
}
