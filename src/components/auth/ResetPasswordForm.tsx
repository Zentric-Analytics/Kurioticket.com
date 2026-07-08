"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";
import { resetPasswordSchema } from "@/lib/validation";

export function ResetPasswordForm({ token = "" }: { token?: string }) {
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasToken = token.trim().length > 0;

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const parsed = resetPasswordSchema.safeParse({
      token,
      password: String(formData.get("password") || ""),
      confirmPassword: String(formData.get("confirmPassword") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError(t.resetPasswordValidationError);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        setError(String(data.error || t.resetPasswordUnable));
        return;
      }

      setMessage(t.resetPasswordSuccessMessage);
      startTransition(() => {
        window.location.href = "/auth/signin?reset=success";
      });
    } catch {
      setLoading(false);
      setError(t.resetPasswordUnable);
    }
  }

  if (!hasToken) {
    return (
      <Card className="mx-auto w-full max-w-md p-5">
        <h1 className="text-2xl font-bold text-navy">{t.resetPasswordTitle}</h1>
        <p className="mt-4 text-sm text-muted">{t.resetPasswordInvalidLink}</p>
        <p className="mt-4 text-sm text-muted">
          <Link
            className="font-semibold text-teal-dark"
            href="/auth/forgot-password"
          >
            {t.resetPasswordRequestNew}
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">
        {t.resetPasswordCreateTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{t.resetPasswordSubtitle}</p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.resetPasswordNewPasswordLabel}>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading || isPending}
          />
        </Field>

        <Field label={t.resetPasswordConfirmPasswordLabel}>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading || isPending}
          />
        </Field>

        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {message ? (
          <MessageBanner tone="success">{message}</MessageBanner>
        ) : null}

        <Button disabled={loading || isPending}>
          {loading || isPending
            ? t.resetPasswordResetting
            : t.resetPasswordSubmit}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t.resetPasswordRemember}{" "}
        <Link className="font-semibold text-teal-dark" href="/auth/signin">
          {t.resetPasswordLoginLink}
        </Link>
      </p>
    </Card>
  );
}
