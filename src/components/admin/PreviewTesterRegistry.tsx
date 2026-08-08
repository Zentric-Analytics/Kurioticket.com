"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TEAM_ACCESS_ROLE_DEFINITIONS, TEAM_ACCESS_ROLES, effectiveCapabilities, type TeamAccessRole } from "@/lib/teamAccessRoles";

type Actor = { email: string | null; name: string | null } | null;
type Tester = { id: string; email: string; status: string; roles: TeamAccessRole[]; expiresAt: Date | null; approvedAt: Date | null; suspendedAt: Date | null; revokedAt: Date | null; updatedAt: Date; reason: string | null; approvedByAdmin: Actor; suspendedByAdmin: Actor; revokedByAdmin: Actor };

export function PreviewTesterRegistry({ testers }: { testers: Tester[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [roleInfo, setRoleInfo] = useState<TeamAccessRole | null>(null);

  async function add(formData: FormData) {
    setError("");
    const roles = TEAM_ACCESS_ROLES.filter((role) => formData.get(`role-${role}`) === "on");
    const response = await fetch("/api/admin/preview-testers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), roles, expiresAt: formData.get("expiresAt") || null, reason: formData.get("reason") }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to add team member."); return; }
    router.refresh();
  }

  async function change(id: string, updatedAt: Date, action: string) {
    if ((action === "suspend" || action === "revoke") && !window.confirm(`Confirm ${action} for this Team Access member?`)) return;
    setError("");
    const response = await fetch(`/api/admin/preview-testers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, updatedAt }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to update team member."); return; }
    router.refresh();
  }

  async function update(formData: FormData) {
    const id = String(formData.get("id") || "");
    const roles = TEAM_ACCESS_ROLES.filter((role) => formData.get(`role-${role}`) === "on");
    setError("");
    const response = await fetch(`/api/admin/preview-testers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update", updatedAt: formData.get("updatedAt"), roles, expiresAt: formData.get("expiresAt") || null, reason: formData.get("reason") }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to update team member."); return; }
    router.refresh();
  }

  return <div className="grid gap-6">
    <form action={add} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
      <div className="grid gap-2"><label className="font-medium">Email</label><input required type="email" name="email" placeholder="Team member email" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
      <div className="grid gap-2"><label className="font-medium">Access expiration</label><input type="datetime-local" name="expiresAt" className="rounded-xl border border-slate-200 px-3 py-2" /></div>
      <div className="grid gap-2 md:col-span-2"><span className="font-medium">Roles</span><div className="flex flex-wrap gap-3">{TEAM_ACCESS_ROLES.map((role) => <label key={role} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><input type="checkbox" name={`role-${role}`} defaultChecked={role === "TESTER"} /><span>{TEAM_ACCESS_ROLE_DEFINITIONS[role].label}</span><button type="button" onClick={() => setRoleInfo(role)} aria-label={`Explain ${TEAM_ACCESS_ROLE_DEFINITIONS[role].label} role`} className="rounded-full p-1 text-amber-600 hover:bg-amber-50"><Lightbulb size={17} /></button></label>)}</div></div>
      <input name="reason" maxLength={500} placeholder="Approval reason (optional)" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
      <Button type="submit">Add team member</Button>
    </form>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[1500px] text-left text-sm"><thead><tr><th className="p-3">Email</th><th>Status</th><th>Roles & effective access</th><th>Approved</th><th>Suspended</th><th>Revoked</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{testers.map((tester) => <tr className="border-t align-top" key={tester.id}><td className="p-3 font-medium">{tester.email}</td><td className="p-3">{tester.expiresAt && new Date(tester.expiresAt) <= new Date() ? "EXPIRED" : tester.status}</td><td className="p-3"><form action={update} className="grid gap-3"><input type="hidden" name="id" value={tester.id} /><input type="hidden" name="updatedAt" value={new Date(tester.updatedAt).toISOString()} /><div className="flex flex-wrap gap-2">{TEAM_ACCESS_ROLES.map((role) => <label key={role} className="flex items-center gap-2 rounded-lg border px-2 py-1"><input type="checkbox" name={`role-${role}`} defaultChecked={tester.roles.includes(role)} /><span>{TEAM_ACCESS_ROLE_DEFINITIONS[role].label}</span><button type="button" onClick={() => setRoleInfo(role)} aria-label={`Explain ${TEAM_ACCESS_ROLE_DEFINITIONS[role].label} role`} className="text-amber-600"><Lightbulb size={16} /></button></label>)}</div><EffectiveAccess roles={tester.roles} /><input type="datetime-local" name="expiresAt" defaultValue={tester.expiresAt ? new Date(tester.expiresAt).toISOString().slice(0, 16) : ""} className="rounded border px-2 py-1" /><input name="reason" maxLength={500} defaultValue={tester.reason || ""} placeholder="Reason" className="rounded border px-2 py-1" /><Button type="submit">Save roles</Button></form></td><td className="p-3">{actorTimestamp(tester.approvedByAdmin, tester.approvedAt)}</td><td className="p-3">{actorTimestamp(tester.suspendedByAdmin, tester.suspendedAt)}</td><td className="p-3">{actorTimestamp(tester.revokedByAdmin, tester.revokedAt)}</td><td className="p-3">{new Date(tester.updatedAt).toLocaleString()}</td><td className="flex gap-2 p-2"><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "reactivate")}>Activate</Button><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "suspend")}>Suspend</Button><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "revoke")}>Revoke</Button></td></tr>)}</tbody></table></div>
    {roleInfo ? <RoleInfo role={roleInfo} onClose={() => setRoleInfo(null)} /> : null}
  </div>;
}

function EffectiveAccess({ roles }: { roles: TeamAccessRole[] }) {
  const capabilities = effectiveCapabilities(roles);
  return <div className="rounded-lg bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck size={16} />Effective access</div><ul className="grid gap-1 text-xs text-slate-600">{capabilities.map((capability) => <li key={capability}>• {capability.replaceAll("_", " ").toLowerCase()}</li>)}</ul></div>;
}

function RoleInfo({ role, onClose }: { role: TeamAccessRole; onClose: () => void }) {
  const definition = TEAM_ACCESS_ROLE_DEFINITIONS[role];
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={onClose}><div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Lightbulb className="text-amber-500" size={20} /><h2 className="text-xl font-semibold">{definition.label}</h2></div><p className="mt-2 text-sm text-slate-600">{definition.summary}</p></div><Button type="button" onClick={onClose}>Close</Button></div><section className="mt-5"><h3 className="font-semibold">This role grants</h3><ul className="mt-2 grid gap-2 text-sm text-slate-700">{definition.grants.map((item) => <li key={item}>✓ {item}</li>)}</ul></section><section className="mt-5"><h3 className="font-semibold">This role does not grant</h3><ul className="mt-2 grid gap-2 text-sm text-slate-700">{definition.doesNotGrant.map((item) => <li key={item}>— {item}</li>)}</ul></section></div></div>;
}

function actorTimestamp(actor: Actor, timestamp: Date | null) {
  if (!timestamp) return "—";
  return `${actor?.name || actor?.email || "Unknown"} · ${new Date(timestamp).toLocaleString()}`;
}
