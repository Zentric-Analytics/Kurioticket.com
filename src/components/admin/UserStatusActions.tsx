"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function UserStatusActions({ userId, status, isSelf }: { userId: string; status: string; isSelf: boolean }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");

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

  if (isSelf) return <span className="text-xs font-semibold text-muted">Current admin</span>;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "ACTIVE" ? <Button size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => updateStatus("ACTIVE")}>{loading === "ACTIVE" ? "..." : "Reactivate"}</Button> : null}
        {status !== "SUSPENDED" ? <Button size="sm" variant="secondary" disabled={Boolean(loading)} onClick={() => updateStatus("SUSPENDED")}>{loading === "SUSPENDED" ? "..." : "Suspend"}</Button> : null}
        {status !== "DELETED" ? <Button size="sm" variant="ghost" disabled={Boolean(loading)} onClick={() => updateStatus("DELETED")}>{loading === "DELETED" ? "..." : "Soft delete"}</Button> : null}
      </div>
      {message ? <p className="text-xs font-semibold text-muted">{message}</p> : null}
    </div>
  );
}
