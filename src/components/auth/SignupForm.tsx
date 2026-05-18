"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { signupSchema } from "@/lib/validation";

type SignupFormProps = {
  googleEnabled?: boolean;
};

export function SignupForm({ googleEnabled = false }: SignupFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const input = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };
    const parsed = signupSchema.safeParse(input);

    if (!parsed.success) {
      setLoading(false);
      setError(getPublicSignupValidationError(parsed.error.flatten().fieldErrors));
      return;
    }

    const { email, password } = parsed.data;
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(String(data.error || "Unable to create account right now."));
      return;
    }

    const signInResult = await signIn("credentials", { redirect: false, email, password, callbackUrl: "/onboarding" });
    setLoading(false);

    if (signInResult?.error === "EmailVerificationRequired") {
      window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`;
      return;
    }

    if (!signInResult?.ok) {
      setError("Your account was created, but automatic login failed. Please log in with your new password.");
      return;
    }

    window.location.href = signInResult.url || "/onboarding";
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
      {googleEnabled ? (
        <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}>
          Continue with Google
        </Button>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        Already have an account? <Link className="font-semibold text-teal-dark" href="/auth/signin">Log in</Link>
      </p>
    </Card>
  );
}

function getPublicSignupValidationError(fieldErrors: Record<string, string[] | undefined>) {
  if (fieldErrors.email?.length) return "Enter a valid email address.";
  if (fieldErrors.password?.length) return "Password must meet minimum requirements.";
  return "Unable to create account right now.";
}
