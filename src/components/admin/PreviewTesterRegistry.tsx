"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Actor = { email: string | null; name: string | null } | null;
type Tester = { id: string; email: string; status: string; allowGoogleSignIn: boolean; allowStagingEmail: boolean; expiresAt: Date | null; approvedAt: Date | null; suspendedAt: Date | null; revokedAt: Date | null; updatedAt: Date; reason: string | null; approvedByAdmin: Actor; suspendedByAdmin: Actor; revokedByAdmin: Actor };

export function PreviewTesterRegistry({ testers }: { testers: Tester[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function add(formData: FormData) {
    setError("");
    const response = await fetch("/api/admin/preview-testers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), allowGoogleSignIn: formData.get("allowGoogleSignIn") === "on", allowStagingEmail: formData.get("allowStagingEmail") === "on", expiresAt: formData.get("expiresAt") || null, reason: formData.get("reason") }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to add tester."); return; }
    router.refresh();
  }
  async function change(id: string, updatedAt: Date, action: string) {
    if ((action === "suspend" || action === "revoke") && !window.confirm(`Confirm ${action} for this Preview tester?`)) return;
    setError("");
    const response = await fetch(`/api/admin/preview-testers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, updatedAt }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to update tester."); return; }
    router.refresh();
  }
  async function update(formData: FormData) {
    const id = String(formData.get("id") || "");
    setError("");
    const response = await fetch(`/api/admin/preview-testers/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update", updatedAt: formData.get("updatedAt"), allowGoogleSignIn: formData.get("allowGoogleSignIn") === "on", allowStagingEmail: formData.get("allowStagingEmail") === "on", expiresAt: formData.get("expiresAt") || null, reason: formData.get("reason") }) });
    if (!response.ok) { const result = await response.json(); setError(result.error || "Unable to update tester."); return; }
    router.refresh();
  }
  return <div className="grid gap-6">
    <form action={add} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
      <input required type="email" name="email" placeholder="Tester email" className="rounded-xl border border-slate-200 px-3 py-2" />
      <input type="datetime-local" name="expiresAt" className="rounded-xl border border-slate-200 px-3 py-2" />
      <label><input type="checkbox" name="allowGoogleSignIn" /> Allow Google Sign-In</label>
      <label><input type="checkbox" name="allowStagingEmail" /> Allow staging email</label>
      <input name="reason" maxLength={500} placeholder="Approval reason (optional)" className="rounded-xl border border-slate-200 px-3 py-2" />
      <Button type="submit">Add tester</Button>
    </form>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[1600px] text-left text-sm"><thead><tr><th className="p-3">Email</th><th>Status</th><th>Permissions / expiry / reason</th><th>Approved</th><th>Suspended</th><th>Revoked</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{testers.map((tester) => <tr className="border-t align-top" key={tester.id}><td className="p-3">{tester.email}</td><td className="p-3">{tester.expiresAt && new Date(tester.expiresAt) <= new Date() ? "EXPIRED" : tester.status}</td><td className="p-3"><form action={update} className="grid gap-2"><input type="hidden" name="id" value={tester.id} /><input type="hidden" name="updatedAt" value={new Date(tester.updatedAt).toISOString()} /><label><input type="checkbox" name="allowGoogleSignIn" defaultChecked={tester.allowGoogleSignIn} /> Google Sign-In</label><label><input type="checkbox" name="allowStagingEmail" defaultChecked={tester.allowStagingEmail} /> Staging email</label><input type="datetime-local" name="expiresAt" defaultValue={tester.expiresAt ? new Date(tester.expiresAt).toISOString().slice(0, 16) : ""} className="rounded border px-2 py-1" /><input name="reason" maxLength={500} defaultValue={tester.reason || ""} placeholder="Reason" className="rounded border px-2 py-1" /><Button type="submit">Save</Button></form></td><td className="p-3">{actorTimestamp(tester.approvedByAdmin, tester.approvedAt)}</td><td className="p-3">{actorTimestamp(tester.suspendedByAdmin, tester.suspendedAt)}</td><td className="p-3">{actorTimestamp(tester.revokedByAdmin, tester.revokedAt)}</td><td className="p-3">{new Date(tester.updatedAt).toLocaleString()}</td><td className="flex gap-2 p-2"><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "reactivate")}>Activate</Button><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "suspend")}>Suspend</Button><Button type="button" onClick={() => change(tester.id, tester.updatedAt, "revoke")}>Revoke</Button></td></tr>)}</tbody></table></div>
  </div>;
}

function actorTimestamp(actor: Actor, timestamp: Date | null) {
  if (!timestamp) return "—";
  return `${actor?.name || actor?.email || "Unknown"} · ${new Date(timestamp).toLocaleString()}`;
}
