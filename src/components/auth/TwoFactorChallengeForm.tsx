"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { MessageBanner } from "@/components/ui/MessageBanner";

function safeCallback(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function TwoFactorChallengeFallback() {
  const { t } = useLocale();

  return (
    <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow">
      {t.twoFactorLoadingChallenge}
    </div>
  );
}

export function TwoFactorChallengeForm() {
  const { t } = useLocale();
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallback(params.get("callbackUrl")),
    [params],
  );
  const [code, setCode] = useState("");
  const [showHelperText, setShowHelperText] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated")
      router.replace(
        `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    if (
      status === "authenticated" &&
      (!session.user.twoFactorEnabled || session.user.twoFactorVerified)
    )
      router.replace(callbackUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setShowHelperText(false);
    try {
      const response = await fetch("/api/auth/two-factor/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || t.twoFactorInvalidCode);
        return;
      }
      await update({ twoFactorVerified: true });
      router.replace(
        session?.user.status === "PENDING_DELETION"
          ? "/account/pending-deletion"
          : callbackUrl,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#004BB8]">
        {t.twoFactorEyebrow}
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-950">
        {t.twoFactorTitle}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {t.twoFactorSubtitle}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-slate-800">
          {t.twoFactorCodeLabel}
          <input
            autoComplete="one-time-code"
            maxLength={32}
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9-]/g, "")
                  .slice(0, 32),
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.18em] text-slate-950 outline-none focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15"
          />
        </label>
        {showHelperText ? (
          <p className="text-sm text-slate-600">{t.twoFactorHelperText}</p>
        ) : null}
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        <Button className="w-full" disabled={busy || code.length < 6}>
          {busy ? t.twoFactorVerifying : t.twoFactorSubmit}
        </Button>
      </form>
      <div className="mt-5 flex justify-end text-sm">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="font-semibold text-slate-600 transition hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
        >
          {t.twoFactorBackToLogin}
        </button>
      </div>
    </div>
  );
}
