"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";

export function SignupForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") || ""),
        email,
        password,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error || "Unable to create account.");
      return;
    }

    await signIn("credentials", { redirect: false, email, password });
    window.location.href = "/onboarding";
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Create your account</h1>
      <p className="mt-2 text-sm text-muted">No passport, government ID, phone number, or address needed.</p>
      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Full name">
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <p className="text-xs leading-5 text-muted">
          By creating an account, you agree to the <Link className="font-semibold text-teal-dark" href="/legal/terms-of-service">Terms</Link>, <Link className="font-semibold text-teal-dark" href="/legal/privacy-policy">Privacy Policy</Link>, and partner redirect disclosures.
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button disabled={loading}>{loading ? "Creating account..." : "Sign Up"}</Button>
      </form>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}>
        Continue with Google
      </Button>
      <p className="mt-4 text-sm text-muted">
        Already have an account? <Link className="font-semibold text-teal-dark" href="/auth/signin">Log in</Link>
      </p>
    </Card>
  );
}
