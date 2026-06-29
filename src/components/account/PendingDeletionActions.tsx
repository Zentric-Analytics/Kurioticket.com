"use client";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PendingDeletionActions({ deadline }: { deadline: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function reactivate() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/account/security/deletion-request/reactivate", { method: "POST", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(data.error || "Unable to reactivate account."); return; }
    router.push("/dashboard"); router.refresh();
  }
  return (
    <div className="mt-7 space-y-4">
      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">Welcome back. Clicking Reactivate account cancels deletion before {new Date(deadline).toLocaleString()} and restores normal app access.</div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reactivate} disabled={saving} className="focus-ring rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Reactivating…" : "Reactivate account"}</button>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="focus-ring rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800">Log out</button>
      </div>
      {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
