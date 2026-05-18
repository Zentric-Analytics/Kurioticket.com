"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { forgotPasswordSchema } from "@/lib/validation";

export function ForgotPasswordForm() {
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
      setError("Enter a valid email address.");
      return;
    }

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(String(data.error || "Unable to request a password reset right now."));
      return;
    }

    setMessage("If an account exists for that email, a password reset code has been sent.");
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">Enter your email and we will send a 6-digit reset code if an account exists.</p>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-teal-dark">{message}</p> : null}
        <Button disabled={loading}>{loading ? "Sending..." : "Send reset code"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Have a code? <Link className="font-semibold text-teal-dark" href="/auth/reset-password">Reset password</Link>
      </p>
    </Card>
  );
}
