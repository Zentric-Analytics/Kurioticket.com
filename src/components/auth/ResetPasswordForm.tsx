"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { resetPasswordSchema } from "@/lib/validation";

export function ResetPasswordForm({ email = "" }: { email?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    const parsed = resetPasswordSchema.safeParse({
      email: String(formData.get("email") || ""),
      code: String(formData.get("code") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError("Enter a valid email, 6-digit code, and password that meets requirements.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(String(data.error || "Unable to reset password right now."));
      return;
    }

    window.location.href = "/auth/signin?reset=success";
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Create a new password</h1>
      <p className="mt-2 text-sm text-muted">Enter the 6-digit code we emailed you. Codes expire after 10 minutes.</p>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" defaultValue={email} required />
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
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </Field>
        <Field label="New password">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button disabled={loading || code.length !== 6}>{loading ? "Resetting..." : "Reset password"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Remember your password? <Link className="font-semibold text-teal-dark" href="/auth/signin">Log in</Link>
      </p>
    </Card>
  );
}
