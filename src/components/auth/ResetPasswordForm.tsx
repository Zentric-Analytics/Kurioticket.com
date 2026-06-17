"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { resetPasswordSchema } from "@/lib/validation";

const invalidLinkMessage = "This reset link is invalid or expired. Please request a new password reset email.";

export function ResetPasswordForm({ token = "" }: { token?: string }) {
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
      setError("Enter a valid password and make sure both password fields match.");
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
        setError(String(data.error || "Unable to reset password right now."));
        return;
      }

      setMessage("Password reset successful. Redirecting to sign in...");
      startTransition(() => {
        window.location.href = "/auth/signin?reset=success";
      });
    } catch {
      setLoading(false);
      setError("Unable to reset password right now.");
    }
  }

  if (!hasToken) {
    return (
      <Card className="mx-auto w-full max-w-md p-5">
        <h1 className="text-2xl font-bold text-navy">Reset your password</h1>
        <p className="mt-4 text-sm text-muted">{invalidLinkMessage}</p>
        <p className="mt-4 text-sm text-muted">
          <Link className="font-semibold text-teal-dark" href="/auth/forgot-password">Request a new reset email</Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Create a new password</h1>
      <p className="mt-2 text-sm text-muted">Enter your new password below.</p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label="New password">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={loading || isPending} />
        </Field>

        <Field label="Confirm new password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required disabled={loading || isPending} />
        </Field>

        {error ? <p className="text-sm text-danger" aria-live="polite">{error}</p> : null}
        {message ? <p className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark" aria-live="polite">{message}</p> : null}

        <Button disabled={loading || isPending}>{loading || isPending ? "Resetting..." : "Reset password"}</Button>
      </form>

      <p className="mt-4 text-sm text-muted">Remember your password? <Link className="font-semibold text-teal-dark" href="/auth/signin">Log in</Link></p>
    </Card>
  );
}
