"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
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
      <h1 className="text-2xl font-bold text-navy">
        {t.forgotPasswordPageTitle}
      </h1>

      <p className="mt-2 text-sm text-muted">{t.forgotPasswordPageSubtitle}</p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.loginEmailLabel}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            placeholder="you@example.com"
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {message ? (
          <p
            className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <Button disabled={loading}>
          {loading ? t.forgotPasswordSending : t.forgotPasswordSubmit}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {t.forgotPasswordRememberPrompt}{" "}
        <Link className="font-semibold text-teal-dark" href="/auth/signin">
          {t.signupLoginLink}
        </Link>
      </p>
    </Card>
  );
}
