"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { forgotPasswordSchema } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            parsed.data
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          String(
            data.error ||
              "Unable to request a password reset right now."
          )
        );
        return;
      }

      setMessage(
        "If an account exists for this email, password reset instructions have been sent."
      );
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Reset your password
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        Enter your email to receive a secure
        password reset link.
      </p>

      <form
        action={submit}
        className="mt-6 grid gap-4"
      >
        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-12 rounded-xl border-slate-300"
          />
        </Field>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <Button
          disabled={loading}
          className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800"
        >
          {loading
            ? "Sending..."
            : "Send reset link"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Remembered your password?{" "}
        <Link
          href="/auth/signin"
          className="font-semibold text-cyan-700"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}