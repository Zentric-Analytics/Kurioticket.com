"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";

export function SigninForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      redirect: false,
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });
    setLoading(false);
    if (result?.error) {
      setError("We could not sign you in with those details.");
      return;
    }
    window.location.href = "/dashboard";
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
      <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
        Continue with Google
      </Button>
      <p className="mt-4 text-sm text-muted">
        New to Curioticket? <Link className="font-semibold text-teal-dark" href="/auth/signup">Create an account</Link>
      </p>
    </Card>
  );
}
