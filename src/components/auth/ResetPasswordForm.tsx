"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { resetPasswordSchema } from "@/lib/validation";

export function ResetPasswordForm({
  email = "",
}: {
  email?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const parsed = resetPasswordSchema.safeParse({
      email: String(formData.get("email") || ""),
      code: String(formData.get("code") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError(
        "Enter a valid email, 6-digit code, and a valid password."
      );
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(
          String(data.error || "Unable to reset password right now.")
        );
        return;
      }

      setMessage(
        "Password reset successful. Redirecting to sign in..."
      );

      startTransition(() => {
        window.location.href = "/auth/signin?reset=success";
      });
    } catch (err) {
      console.error("[reset-password]", err);
      setLoading(false);
      setError("Unable to reset password right now.");
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">
        Create a new password
      </h1>

      <p className="mt-2 text-sm text-muted">
        Enter the 6-digit code we emailed you and your new password.
      </p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
            disabled={loading || isPending}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Reset code">
          <Input
            name="code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            disabled={loading || isPending}
          />
        </Field>

        <Field label="New password">
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading || isPending}
          />
        </Field>

        {error ? (
          <p className="text-sm text-danger" aria-live="polite">
            {error}
          </p>
        ) : null}

        {message ? (
          <p
            className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <Button disabled={loading || isPending || code.length !== 6}>
          {loading || isPending
            ? "Resetting..."
            : "Reset password"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Remember your password?{" "}
        <Link
          className="font-semibold text-teal-dark"
          href="/auth/signin"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}