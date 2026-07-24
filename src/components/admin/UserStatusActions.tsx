"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { AdminButton, AdminInput } from "@/components/admin/AdminPageShell";

type UserStatusActionsProps = {
  userId: string;
  email?: string | null;
  role: string;
  status: string;
  isSelf: boolean;
  isProtectedAdmin: boolean;
};

const editableRoles = ["USER", "SUPPORT"] as const;

export function UserStatusActions({ userId, email, role, status, isSelf, isProtectedAdmin }: UserStatusActionsProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const confirmationTarget = email?.trim() || userId;
  const canChangeRole = !isSelf && !isProtectedAdmin && role === "ADMIN";
  const canChangeStatus = !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const canHardDelete = status === "DELETED" && !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const confirmationMatches = email?.trim() ? confirmation.trim().toLowerCase() === email.trim().toLowerCase() : confirmation === userId;

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({ top: rect.bottom + 8, left: Math.max(16, rect.right - 288) });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  async function updateStatus(nextStatus: "ACTIVE" | "SUSPENDED" | "DELETED") {
    const actionLabel = nextStatus === "ACTIVE" ? "reactivate" : nextStatus === "SUSPENDED" ? "suspend" : "soft delete";
    if (nextStatus !== "ACTIVE" && !window.confirm(`Confirm ${actionLabel} for this user?`)) return;
    setLoading(nextStatus);
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    const data = await response.json();
    setLoading("");
    if (!response.ok) { setMessage(data.error || "Action failed."); return; }
    setMessage(data.message || "Updated.");
    window.location.reload();
  }

  async function updateRole(nextRole: "USER" | "SUPPORT") {
    if (!window.confirm(`Confirm role change to ${nextRole} for this user?`)) return;
    setLoading(`ROLE_${nextRole}`);
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole }) });
    const data = await response.json();
    setLoading("");
    if (!response.ok) { setMessage(data.error || "Role update failed."); return; }
    setMessage(data.message || "Role updated.");
    window.location.reload();
  }

  async function permanentlyDeleteUser() {
    setLoading("PERMANENT_DELETE");
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/permanent`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(email?.trim() ? { confirmEmail: confirmation } : { confirmUserId: confirmation }) });
    const data = await response.json().catch(() => ({}));
    setLoading("");
    if (!response.ok) { setMessage(data.error || "Permanent delete failed."); return; }
    setMessage(data.message || "User permanently deleted.");
    window.location.reload();
  }

  if (isSelf) return <span className="text-xs font-semibold text-slate-500">Current admin</span>;
  if (isProtectedAdmin) return <span className="text-xs font-semibold text-slate-500">Protected admin</span>;

  return (
    <div ref={buttonRef} className="relative inline-flex justify-end">
      <AdminButton type="button" size="sm" variant="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => { setMessage(""); setOpen((value) => !value); }}>
        Manage
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </AdminButton>
      {open && typeof document !== "undefined" ? createPortal(
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close user actions" onClick={() => setOpen(false)} />
          <div role="menu" className="fixed z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl ring-1 ring-slate-950/5" style={{ top: menuPosition.top, left: menuPosition.left }}>
            <button type="button" role="menuitem" disabled className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-400">View profile · Coming soon</button>
            <div className="my-1 border-t border-slate-100" />
            {canChangeRole ? editableRoles.map((editableRole) => (
              <button key={editableRole} type="button" role="menuitem" disabled={Boolean(loading)} onClick={() => updateRole(editableRole)} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {loading === `ROLE_${editableRole}` ? "Updating..." : editableRole === "USER" ? "Demote to User" : `Make ${editableRole}`}
              </button>
            )) : null}
            {canChangeStatus && status !== "SUSPENDED" ? <button type="button" role="menuitem" disabled={Boolean(loading)} onClick={() => updateStatus("SUSPENDED")} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{loading === "SUSPENDED" ? "Suspending..." : "Suspend account"}</button> : null}
            {canChangeStatus && status !== "ACTIVE" ? <button type="button" role="menuitem" disabled={Boolean(loading)} onClick={() => updateStatus("ACTIVE")} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{loading === "ACTIVE" ? "Reactivating..." : "Reactivate account"}</button> : null}
            {role === "ADMIN" ? <p className="px-3 py-2 text-xs font-semibold text-slate-500">Demote before status changes or permanent deletion.</p> : null}
            <div className="my-1 border-t border-slate-100" />
            {canChangeStatus && status !== "DELETED" ? <button type="button" role="menuitem" disabled={Boolean(loading)} onClick={() => updateStatus("DELETED")} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">{loading === "DELETED" ? "Deleting..." : "Soft delete"}</button> : null}
            {canHardDelete ? <button type="button" role="menuitem" disabled={Boolean(loading)} onClick={() => { setMessage(""); setShowPermanentDelete((value) => !value); }} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300">Permanent delete</button> : null}
            {showPermanentDelete && canHardDelete ? (
              <div className="mt-2 grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950">
                <p className="font-semibold">This permanently removes the user record and cannot be undone.</p>
                <label className="grid gap-1"><span>Type {email?.trim() ? "this email" : "this user id"} to confirm:</span><code className="break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-rose-900">{confirmationTarget}</code><AdminInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-9 bg-white text-sm" autoComplete="off" /></label>
                <div className="flex flex-wrap gap-2"><AdminButton size="sm" variant="destructive" disabled={loading === "PERMANENT_DELETE" || !confirmationMatches} onClick={permanentlyDeleteUser}>{loading === "PERMANENT_DELETE" ? "Deleting..." : "Confirm permanent delete"}</AdminButton><AdminButton size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => setShowPermanentDelete(false)}>Cancel</AdminButton></div>
              </div>
            ) : null}
            {message ? <p className="px-3 py-2 text-xs font-semibold text-slate-500">{message}</p> : null}
          </div>
        </>, document.body) : null}
    </div>
  );
}
