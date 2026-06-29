"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function TwoFactorChallengeForm() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(() => safeCallback(params.get("callbackUrl")), [params]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Open your authenticator app and enter the current 6-digit code, or use a recovery code.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    if (status === "authenticated" && (!session.user.twoFactorEnabled || session.user.twoFactorVerified)) router.replace(callbackUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/two-factor/confirm", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "The code is invalid or already used."); return; }
      await update({ twoFactorVerified: true });
      router.replace(session?.user.status === "PENDING_DELETION" ? "/account/pending-deletion" : callbackUrl);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Two-factor authentication</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">Enter your authenticator code</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Use the 6-digit code from your authenticator app, or enter one saved recovery code to finish signing in.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">Authenticator or recovery code
          <input autoComplete="one-time-code" maxLength={32} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.18em] text-slate-950" />
        </label>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <Button className="w-full" disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Verify and continue"}</Button>
      </form>
      <div className="mt-5 flex justify-end text-sm">
        <button type="button" onClick={() => signOut({ callbackUrl: "/auth/signin" })} className="font-semibold text-slate-600">Back / sign out</button>
      </div>
    </div>
  );
}
