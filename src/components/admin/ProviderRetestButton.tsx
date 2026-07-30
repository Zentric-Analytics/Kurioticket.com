"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminPageShell";

export function ProviderRetestButton() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function retest() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/providers/duffel/retest", { method: "POST" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || "Retest failed.");
      return;
    }
    setMessage(data.provider?.connected ? "Duffel is healthy." : "Duffel is not healthy. Check server logs and credentials.");
    window.location.reload();
  }

  return (
    <div className="grid gap-2">
      <AdminButton type="button" onClick={retest} disabled={loading}>{loading ? "Retesting..." : "Retest Duffel"}</AdminButton>
      {message ? <p className="text-sm font-semibold text-slate-500">{message}</p> : null}
    </div>
  );
}
