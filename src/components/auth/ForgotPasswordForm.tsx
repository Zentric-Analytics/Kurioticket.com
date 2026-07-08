"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";
import { forgotPasswordSchema } from "@/lib/validation";

export function ForgotPasswordForm() {
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const parsed = forgotPasswordSchema.safeParse({
      email: String(formData.get("email") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError(t.forgotPasswordInvalidEmail);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      setLoading(false);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(String(data.error || t.forgotPasswordUnableRequest));
        return;
      }

      setMessage(t.forgotPasswordSuccess);
    } catch {
      setLoading(false);
      setError(t.forgotPasswordUnableRequest);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">{t.forgotPasswordTitle}</h1>

      <p className="mt-2 text-sm text-muted">{t.forgotPasswordSubtitle}</p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.forgotPasswordEmailLabel}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            placeholder={t.forgotPasswordEmailPlaceholder}
          />
        </Field>

        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}

        {message ? (
          <MessageBanner tone="success">{message}</MessageBanner>
        ) : null}

        <Button disabled={loading}>
          {loading ? t.forgotPasswordSending : t.forgotPasswordSubmit}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t.forgotPasswordRemember}{" "}
        <Link
          className="font-semibold text-[#004BB8] transition-colors hover:text-[#021C2B] hover:underline"
          href="/auth/signin"
        >
          {t.forgotPasswordLoginLink}
        </Link>
      </p>
    </Card>
  );
}
