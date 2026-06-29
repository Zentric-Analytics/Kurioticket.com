"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "your account email";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${name.length > 2 ? "•••" : "•"}@${domain}`;
}
function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function TwoFactorChallengeForm() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(() => safeCallback(params.get("callbackUrl")), [params]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("We sent a 6-digit code to your email.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    if (status === "authenticated" && session.user.twoFactorEnabled && !session.user.twoFactorVerified) void requestCode(false);
    if (status === "authenticated" && (!session.user.twoFactorEnabled || session.user.twoFactorVerified)) router.replace(callbackUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestCode(showMessage = true) {
    if (cooldown > 0 && showMessage) return;
    setError("");
    const response = await fetch("/api/auth/two-factor/request", { method: "POST", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || "Unable to send a verification code right now."); return; }
    setCooldown(Number(data.cooldownSeconds || 60));
    if (showMessage) setMessage(data.recentlySent ? "A code was already sent recently." : "A new verification code was sent.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/two-factor/confirm", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "The verification code is invalid or expired."); return; }
      await update({ twoFactorVerified: true });
      router.replace(session?.user.status === "PENDING_DELETION" ? "/account/pending-deletion" : callbackUrl);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Two-factor authentication</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">Check your email</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{maskEmail(session?.user.email)}</span> to finish signing in.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">Verification code
          <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] text-slate-950" />
        </label>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <Button className="w-full" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and continue"}</Button>
      </form>
      <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
        <button type="button" disabled={cooldown > 0} onClick={() => void requestCode(true)} className="font-semibold text-blue-700 disabled:text-slate-400">{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
        <button type="button" onClick={() => signOut({ callbackUrl: "/auth/signin" })} className="font-semibold text-slate-600">Back / sign out</button>
      </div>
    </div>
  );
}
