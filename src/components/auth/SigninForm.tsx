"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { signinSchema } from "@/lib/validation";

type SigninFormProps = {
  callbackUrl?: string;
  googleEnabled?: boolean;
  initialError?: string;
};

export function SigninForm({ callbackUrl = "/dashboard", googleEnabled = false, initialError = "" }: SigninFormProps) {
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");

    const parsed = signinSchema.safeParse({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError("We could not sign you in. Check your email and password, then try again.");
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackUrl,
    });

    setLoading(false);
    if (!result?.ok) {
      setError(result?.error === "This account is not available. Please contact support." ? result.error : "We could not sign you in. Check your email and password, then try again.");
      return;
    }

    window.location.href = result.url || callbackUrl;
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Log in</h1>
      <p className="mt-2 text-sm text-muted">Save searches, manage alerts, and access your travel dashboard.</p>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button disabled={loading}>{loading ? "Signing in..." : "Log in"}</Button>
      </form>
      {googleEnabled ? (
        <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl })}>
          Continue with Google
        </Button>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        New to Curioticket? <Link className="font-semibold text-teal-dark" href="/auth/signup">Create an account</Link>
      </p>
    </Card>
  );
}
