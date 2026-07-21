"use client";

import { useState } from "react";
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

export function UserStatusActions({
  userId,
  email,
  role,
  status,
  isSelf,
  isProtectedAdmin,
}: UserStatusActionsProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const confirmationTarget = email?.trim() || userId;
  const canChangeRole = !isSelf && !isProtectedAdmin && role === "ADMIN";
  const canChangeStatus = !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const canHardDelete =
    status === "DELETED" && !isSelf && !isProtectedAdmin && role !== "ADMIN";
  const confirmationMatches = email?.trim()
    ? confirmation.trim().toLowerCase() === email.trim().toLowerCase()
    : confirmation === userId;

  async function updateStatus(nextStatus: "ACTIVE" | "SUSPENDED" | "DELETED") {
    const actionLabel =
      nextStatus === "ACTIVE"
        ? "reactivate"
        : nextStatus === "SUSPENDED"
          ? "suspend"
          : "soft delete";
    if (
      nextStatus !== "ACTIVE" &&
      !window.confirm(`Confirm ${actionLabel} for this user?`)
    )
      return;

    setLoading(nextStatus);
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage(data.error || "Action failed.");
      return;
    }
    setMessage(data.message || "Updated.");
    window.location.reload();
  }

  async function updateRole(nextRole: "USER" | "SUPPORT") {
    if (!window.confirm(`Confirm role change to ${nextRole} for this user?`))
      return;

    setLoading(`ROLE_${nextRole}`);
    setMessage("");
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await response.json();
    setLoading("");
    if (!response.ok) {
      setMessage(data.error || "Role update failed.");
      return;
    }
    setMessage(data.message || "Role updated.");
    window.location.reload();
  }

  async function permanentlyDeleteUser() {
    setLoading("PERMANENT_DELETE");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}/permanent`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        email?.trim()
          ? { confirmEmail: confirmation }
          : { confirmUserId: confirmation },
      ),
    });
    const data = await response.json().catch(() => ({}));
    setLoading("");

    if (!response.ok) {
      setMessage(data.error || "Permanent delete failed.");
      return;
    }

    setMessage(data.message || "User permanently deleted.");
    window.location.reload();
  }

  if (isSelf)
    return (
      <span className="text-xs font-semibold text-slate-500">Current admin</span>
    );

  if (isProtectedAdmin) {
    return (
      <span className="text-xs font-semibold text-slate-500">Protected admin</span>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canChangeRole
          ? editableRoles.map((editableRole) => (
              <AdminButton
                key={editableRole}
                size="sm"
                variant={editableRole === "USER" ? "secondary" : "ghost"}
                disabled={Boolean(loading)}
                onClick={() => updateRole(editableRole)}
              >
                {loading === `ROLE_${editableRole}`
                  ? "..."
                  : editableRole === "USER"
                    ? "Demote to User"
                    : `Make ${editableRole}`}
              </AdminButton>
            ))
          : null}
        {canChangeStatus && status !== "ACTIVE" ? (
          <AdminButton
            size="sm"
            variant="secondary"
            disabled={Boolean(loading)}
            onClick={() => updateStatus("ACTIVE")}
          >
            {loading === "ACTIVE" ? "..." : "Reactivate"}
          </AdminButton>
        ) : null}
        {canChangeStatus && status !== "SUSPENDED" ? (
          <AdminButton
            size="sm"
            variant="secondary"
            disabled={Boolean(loading)}
            onClick={() => updateStatus("SUSPENDED")}
          >
            {loading === "SUSPENDED" ? "..." : "Suspend"}
          </AdminButton>
        ) : null}
        {canChangeStatus && status !== "DELETED" ? (
          <AdminButton
            size="sm"
            variant="ghost"
            disabled={Boolean(loading)}
            onClick={() => updateStatus("DELETED")}
          >
            {loading === "DELETED" ? "..." : "Soft delete"}
          </AdminButton>
        ) : null}
        {role === "ADMIN" ? (
          <span className="text-xs font-semibold text-slate-500">
            Demote before status changes or permanent deletion.
          </span>
        ) : null}
        {canHardDelete ? (
          <AdminButton
            size="sm"
            variant="destructive"
            disabled={Boolean(loading)}
            onClick={() => {
              setMessage("");
              setShowPermanentDelete((value) => !value);
            }}
          >
            Permanent delete
          </AdminButton>
        ) : null}
      </div>
      {showPermanentDelete && canHardDelete ? (
        <div className="grid gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950">
          <p className="font-semibold">
            This permanently removes the user record and cannot be undone.
          </p>
          <label className="grid gap-1">
            <span>
              Type {email?.trim() ? "this email" : "this user id"} to confirm:
            </span>
            <code className="break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-rose-900">
              {confirmationTarget}
            </code>
            <AdminInput
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-9 bg-white text-sm"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              size="sm"
              variant="destructive"
              disabled={loading === "PERMANENT_DELETE" || !confirmationMatches}
              onClick={permanentlyDeleteUser}
            >
              {loading === "PERMANENT_DELETE"
                ? "Deleting..."
                : "Confirm permanent delete"}
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              disabled={Boolean(loading)}
              onClick={() => setShowPermanentDelete(false)}
            >
              Cancel
            </AdminButton>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="text-xs font-semibold text-slate-500">{message}</p>
      ) : null}
    </div>
  );
}
