"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { signinSchema } from "@/lib/validation";

type SigninFormProps = {
  callbackUrl?: string;
  googleEnabled?: boolean;
  initialError?: string;
  initialMessage?: string;
};

export function SigninForm({
  callbackUrl = "/dashboard",
  googleEnabled = false,
  initialError = "",
  initialMessage = "",
}: SigninFormProps) {
  const [error, setError] = useState(initialError);
  const [message, setMessage] =
    useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");

    const parsed = signinSchema.safeParse({
      email: String(
        formData.get("email") || ""
      ),
      password: String(
        formData.get("password") || ""
      ),
    });

    if (!parsed.success) {
      setLoading(false);
      setError(
        "We could not sign you in. Check your email and password, then try again."
      );
      return;
    }

    const result = await signIn(
      "credentials",
      {
        redirect: false,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackUrl,
      }
    );

    setLoading(false);

    if (
      result?.error ===
      "EmailVerificationRequired"
    ) {
      window.location.href = `/auth/verify-email?email=${encodeURIComponent(
        parsed.data.email
      )}`;
      return;
    }

    if (!result?.ok) {
      setError(
        result?.error ===
          "This account is not available. Please contact support."
          ? result.error
          : result?.error === "RateLimited"
          ? "Too many sign-in attempts. Please wait and try again."
          : "We could not sign you in. Check your email and password, then try again."
      );
      return;
    }

    window.location.href =
      result.url || callbackUrl;
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden min-h-[620px] lg:block">
        <Image
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=80"
          alt="Premium airplane wing view above the clouds at sunrise"
          fill
          priority
          sizes="(max-width: 1024px) 0px, (max-width: 1536px) 52vw, 44vw"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/55 to-cyan-900/45" />

        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/90">
            CurioTicket
          </p>

          <p className="mt-3 max-w-md text-3xl font-semibold leading-tight">
            Find premium fares and stays for your next destination.
          </p>
        </div>
      </aside>

      <div className="flex min-h-[620px] items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg backdrop-blur sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Continue planning your next journey.
          </p>

          <form
            action={submit}
            className="mt-8 grid gap-5"
            aria-live="polite"
          >
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-12 rounded-xl border-slate-300 text-slate-900 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <Input
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  required
                  className="h-12 rounded-xl border-slate-300 pr-24 text-slate-900 transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Forgot password?
              </Link>
            </div>

            {message ? (
              <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700">
                {message}
              </p>
            ) : null}

            {error ? (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              {loading
                ? "Signing in..."
                : "Log in"}
            </Button>
          </form>

          {googleEnabled ? (
            <Button
              variant="secondary"
              className="mt-3 h-12 w-full rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() =>
                signIn("google", {
                  callbackUrl,
                })
              }
              disabled={loading}
            >
              Continue with Google
            </Button>
          ) : null}

          <div className="mt-5 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              New to CurioTicket?{" "}
              <Link
                className="font-semibold text-cyan-700 hover:text-cyan-800"
                href="/auth/signup"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}