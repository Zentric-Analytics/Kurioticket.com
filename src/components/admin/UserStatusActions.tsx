"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type UserStatusActionsProps = {
  userId: string;
  email?: string | null;
  role: string;
  status: string;
  isSelf: boolean;
};

export function UserStatusActions({ userId, email, role, status, isSelf }: UserStatusActionsProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const confirmationTarget = email?.trim() || userId;
  const canHardDelete = status === "DELETED" && !isSelf && role !== "ADMIN";
  const confirmationMatches = email?.trim()
    ? confirmation.trim().toLowerCase() === email.trim().toLowerCase()
    : confirmation === userId;

  async function updateStatus(nextStatus: "ACTIVE" | "SUSPENDED" | "DELETED") {
    const actionLabel = nextStatus === "ACTIVE" ? "reactivate" : nextStatus === "SUSPENDED" ? "suspend" : "soft delete";
    if (nextStatus !== "ACTIVE" && !window.confirm(`Confirm ${actionLabel} for this user?`)) return;

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

  async function permanentlyDeleteUser() {
    setLoading("PERMANENT_DELETE");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}/permanent`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email?.trim() ? { confirmEmail: confirmation } : { confirmUserId: confirmation }),
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

  if (isSelf) return <span className="text-xs font-semibold text-muted">Current admin</span>;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" ? <Button size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => updateStatus("ACTIVE")}>{loading === "ACTIVE" ? "..." : "Reactivate"}</Button> : null}
        {status !== "SUSPENDED" ? <Button size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => updateStatus("SUSPENDED")}>{loading === "SUSPENDED" ? "..." : "Suspend"}</Button> : null}
        {status !== "DELETED" ? <Button size="sm" variant="ghost" disabled={Boolean(loading)} onClick={() => updateStatus("DELETED")}>{loading === "DELETED" ? "..." : "Soft delete"}</Button> : null}
        {canHardDelete ? (
          <Button
            size="sm"
            variant="danger"
            disabled={Boolean(loading)}
            onClick={() => {
              setMessage("");
              setShowPermanentDelete((value) => !value);
            }}
          >
            Permanent delete
          </Button>
        ) : null}
      </div>
      {showPermanentDelete && canHardDelete ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-950">
          <p className="font-semibold">This permanently removes the user record and cannot be undone.</p>
          <label className="grid gap-1">
            <span>Type {email?.trim() ? "this email" : "this user id"} to confirm:</span>
            <code className="break-all rounded bg-white px-2 py-1 font-mono text-[11px] text-red-900">{confirmationTarget}</code>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="rounded-md border border-red-200 px-2 py-1 text-sm text-navy"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="danger" disabled={loading === "PERMANENT_DELETE" || !confirmationMatches} onClick={permanentlyDeleteUser}>
              {loading === "PERMANENT_DELETE" ? "Deleting..." : "Confirm permanent delete"}
            </Button>
            <Button size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => setShowPermanentDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {message ? <p className="text-xs font-semibold text-muted">{message}</p> : null}
    </div>
  );
}
