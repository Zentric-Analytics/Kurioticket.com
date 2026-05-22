"use client";

import { useState, useTransition } from "react";
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
  initialMessage?: string;
};

export function SigninForm({
  callbackUrl = "/",
  googleEnabled = false,
  initialError = "",
  initialMessage = "",
}: SigninFormProps) {
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const parsed = signinSchema.safeParse({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      setLoading(false);
      setError(
        "We could not sign you in. Check your email and password, then try again."
      );
      return;
    }

    try {
      const response = await fetch("/api/auth/request-login-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...parsed.data,
          callbackUrl,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(
          String(
            data.error ||
              "We could not sign you in. Check your email and password, then try again."
          )
        );
        return;
      }

      const redirectTo = String(
        data.redirectTo ||
          `/auth/verify-login?email=${encodeURIComponent(
            parsed.data.email
          )}&callbackUrl=${encodeURIComponent(callbackUrl)}`
      );

      setMessage("Code sent. Redirecting to verification...");

      startTransition(() => {
        window.location.href = redirectTo;
      });
    } catch (error) {
      console.error("[signin]", error);
      setLoading(false);
      setError(
        "We could not sign you in. Check your email and password, then try again."
      );
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Log in</h1>

      <p className="mt-2 text-sm text-muted">
        Save searches, manage alerts, and access your travel dashboard.
      </p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading || isPending}
          />
        </Field>

        <Field label="Password">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading || isPending}
          />
        </Field>

        <Link
          className="text-sm font-semibold text-teal-dark"
          href="/auth/forgot-password"
        >
          Forgot password?
        </Link>

        {message ? (
          <p
            className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-danger" aria-live="polite">
            {error}
          </p>
        ) : null}

        <Button disabled={loading || isPending}>
          {loading || isPending ? "Signing in..." : "Log in"}
        </Button>
      </form>

      {googleEnabled ? (
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </Button>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        New to Curioticket?{" "}
        <Link className="font-semibold text-teal-dark" href="/auth/signup">
          Create an account
        </Link>
      </p>
    </Card>
  );
}