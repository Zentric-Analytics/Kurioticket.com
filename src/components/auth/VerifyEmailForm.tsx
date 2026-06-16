"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";

export function VerifyEmailForm({ email }: { email: string }) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: String(formData.get("code") || "") }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(String(data.error || "The verification code is invalid or expired."));
      return;
    }

    setMessage("Email verified. You can now log in and access your dashboard.");
    window.setTimeout(() => {
      window.location.href = "/auth/signin?callbackUrl=/dashboard";
    }, 900);
  }

  async function resendCode() {
    setResending(true);
    setError("");
    setMessage("");
    await fetch("/api/auth/verify-email", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResending(false);
    setMessage("If this email needs verification, a new code has been sent.");
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">{t.verifyEmailPageTitle}</h1>
      <p className="mt-2 text-sm text-muted">{t.verifyEmailPageSubtitle}</p>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.verifyEmailCodeLabel}>
          <Input
            name="code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-teal-dark">{message}</p> : null}
        <Button disabled={loading || code.length !== 6}>{loading ? t.verifyEmailSubmitting : t.verifyEmailSubmit}</Button>
      </form>
      <Button type="button" variant="secondary" className="mt-3 w-full" disabled={resending} onClick={resendCode}>
        {resending ? t.verifyEmailResendSending : t.verifyEmailResendCode}
      </Button>
      <p className="mt-4 text-sm text-muted">
        {t.verifyEmailAlreadyVerifiedPrompt} <Link className="font-semibold text-teal-dark" href="/auth/signin?callbackUrl=/dashboard">{t.verifyEmailLoginLink}</Link>
      </p>
    </Card>
  );
}
