"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TeamAccessExpiryPicker } from "./TeamAccessExpiryPicker";
import { formatUtcAuditTimestamp } from "@/lib/teamAccessExpiration";
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

  return (
    <div className="grid min-w-0 gap-5">
      <form action={add} className="grid min-w-0 grid-cols-1 items-end gap-x-4 gap-y-3 rounded-xl border border-[#D8E1EC] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 max-w-[360px] gap-1.5">
          <label htmlFor="team-add-email" className="text-[13px] font-semibold text-[#020617]">Email</label>
          <input id="team-add-email" required type="email" name="email" placeholder="Team member email"
            className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] px-3 text-[13px] focus:border-[#004BB8] focus:outline-2 focus:outline-offset-1 focus:outline-[#004BB8]" />
        </div>
        <div className="min-w-0 max-w-[280px]">
          <TeamAccessExpiryPicker id="team-add-expiry" />
        </div>
        <fieldset className="min-w-0 self-end sm:col-span-2 lg:col-span-1">
          <legend className="mb-2 text-[13px] font-semibold text-[#020617]">Roles</legend>
          <div className="flex flex-wrap items-center gap-2">
            {TEAM_ACCESS_ROLES.map((role) => (
              <div key={role} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#D8E1EC] bg-white px-2.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#334155]">
                  <input type="checkbox" name={`role-${role}`} defaultChecked={role === "TESTER"} />
                  {TEAM_ACCESS_ROLE_DEFINITIONS[role].label}
                </label>
                <button type="button" onClick={() => setRoleInfo(role)}
                  aria-label={`Explain ${TEAM_ACCESS_ROLE_DEFINITIONS[role].label} role`}
                  className="rounded-full p-1 text-amber-600 hover:bg-amber-50">
                  <Lightbulb size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </fieldset>
        <div data-testid="team-access-approval-actions" className="grid min-w-0 items-center gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:col-span-3">
          <div className="min-w-0">
            <label htmlFor="team-add-reason" className="sr-only">Approval reason (optional)</label>
            <input id="team-add-reason" name="reason" maxLength={500} placeholder="Approval reason (optional)"
              className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] px-3 text-[13px] focus:border-[#004BB8] focus:outline-2 focus:outline-offset-1 focus:outline-[#004BB8]" />
          </div>
          <Button type="submit" size="sm" className="h-10 w-full shrink-0 whitespace-nowrap px-4 sm:w-auto">Add team member</Button>
        </div>
      </form>

      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}

      <section aria-label="Team members" className="relative min-w-0 overflow-visible rounded-xl border border-[#D8E1EC] bg-white">
        <div className="border-b border-[#E7ECF5] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[#020617]">Team members</h2>
          <p className="mt-1 text-[12px] text-[#64748B]">Select a member to view access details and manage roles.</p>
        </div>
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(110px,0.7fr)_minmax(0,1.3fr)_90px] gap-3 border-b border-[#E7ECF5] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] md:grid">
          <span>Email</span><span>Status</span><span>Roles</span><span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-[#E7ECF5]">
          {testers.map((tester) => {
            const effectiveStatus = tester.expiresAt && new Date(tester.expiresAt) <= new Date() ? "EXPIRED" : tester.status;
            return (
              <details key={tester.id} data-team-member={tester.id} className="group min-w-0">
                <summary className="grid min-w-0 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-[#FAFBFD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] md:grid-cols-[minmax(0,2fr)_minmax(110px,0.7fr)_minmax(0,1.3fr)_90px] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 break-all text-[13px] font-semibold text-[#020617]">{tester.email}</span>
                  <span className="text-right text-[12px] font-semibold text-[#004BB8] md:order-last">
                    <span className="group-open:hidden">Manage</span><span className="hidden group-open:inline">Close</span>
                  </span>
                  <span className="text-[12px] font-medium text-[#475569]">{effectiveStatus}</span>
                  <span className="min-w-0 text-[12px] text-[#475569]">
                    {tester.roles.map(role => TEAM_ACCESS_ROLE_DEFINITIONS[role].label).join(", ")}
                  </span>
                </summary>
                <div className="min-w-0 border-t border-[#E7ECF5] bg-[#FAFBFD] px-4 py-4">
                  <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <form action={update} className="grid min-w-0 gap-3">
                      <h3 className="text-[13px] font-semibold text-[#020617]">Edit member access</h3>
                      <input type="hidden" name="id" value={tester.id} />
                      <input type="hidden" name="updatedAt" value={new Date(tester.updatedAt).toISOString()} />
                      <fieldset className="min-w-0">
                        <legend className="mb-2 text-[12px] font-medium text-[#475569]">Assigned roles</legend>
                        <div className="flex flex-wrap gap-2">
                          {TEAM_ACCESS_ROLES.map((role) => (
                            <div key={role} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#D8E1EC] bg-white px-2.5">
                              <label className="inline-flex cursor-pointer items-center gap-2 text-[12px]">
                                <input type="checkbox" name={`role-${role}`} defaultChecked={tester.roles.includes(role)} />
                                {TEAM_ACCESS_ROLE_DEFINITIONS[role].label}
                              </label>
                              <button type="button" onClick={() => setRoleInfo(role)}
                                aria-label={`Explain ${TEAM_ACCESS_ROLE_DEFINITIONS[role].label} role`}
                                className="rounded-full p-1 text-amber-600 hover:bg-amber-50">
                                <Lightbulb size={15} aria-hidden="true" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </fieldset>
                      <div className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                        <div className="min-w-0">
                          <TeamAccessExpiryPicker id={`team-edit-expiry-${tester.id}`}
                            initialValue={tester.expiresAt ? new Date(tester.expiresAt).toISOString() : ""} compact />
                        </div>
                        <label className="grid min-w-0 max-w-[360px] gap-1 text-[12px] font-medium text-[#475569]">
                          Reason
                          <input name="reason" maxLength={500} defaultValue={tester.reason || ""} placeholder="Reason"
                            className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[12px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#004BB8]" />
                        </label>
                      </div>
                      <div><Button type="submit">Save roles</Button></div>
                    </form>
                    <div className="grid min-w-0 content-start gap-3">
                      <EffectiveAccess roles={tester.roles} />
                      <dl className="grid min-w-0 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-2">
                        <div className="min-w-0"><dt className="font-medium text-[#64748B]">Approved</dt><dd className="mt-1 break-words text-[#334155]">{actorTimestamp(tester.approvedByAdmin, tester.approvedAt)}</dd></div>
                        <div className="min-w-0"><dt className="font-medium text-[#64748B]">Updated</dt><dd className="mt-1 break-words text-[#334155]">{formatUtcAuditTimestamp(tester.updatedAt)}</dd></div>
                        <div className="min-w-0"><dt className="font-medium text-[#64748B]">Suspended</dt><dd className="mt-1 break-words text-[#334155]">{actorTimestamp(tester.suspendedByAdmin, tester.suspendedAt)}</dd></div>
                        <div className="min-w-0"><dt className="font-medium text-[#64748B]">Revoked</dt><dd className="mt-1 break-words text-[#334155]">{actorTimestamp(tester.revokedByAdmin, tester.revokedAt)}</dd></div>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E7ECF5] pt-3">
                    <Button type="button" onClick={() => change(tester.id, tester.updatedAt, "reactivate")}>Activate</Button>
                    <Button type="button" onClick={() => change(tester.id, tester.updatedAt, "suspend")}>Suspend</Button>
                    <Button type="button" onClick={() => change(tester.id, tester.updatedAt, "revoke")}>Revoke</Button>
                  </div>
                </div>
              </details>
            );
          })}
          {!testers.length ? <p className="px-4 py-5 text-[13px] text-[#64748B]">No team members have been added.</p> : null}
        </div>
      </section>
      {roleInfo ? <RoleInfo role={roleInfo} onClose={() => setRoleInfo(null)} /> : null}
    </div>
  );
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
  return `${actor?.name || actor?.email || "Unknown"} · ${formatUtcAuditTimestamp(timestamp)}`;
}
