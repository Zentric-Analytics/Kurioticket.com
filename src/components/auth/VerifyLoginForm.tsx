"use client";

import {
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";

type VerifyLoginFormProps = {
  email: string;
  callbackUrl?: string;
};

export function VerifyLoginForm({
  email,
  callbackUrl = "/dashboard",
}: VerifyLoginFormProps) {
  const [code, setCode] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  async function submit(
    formData: FormData,
  ) {
    setLoading(true);
    setError("");
    setMessage("");

    const loginCode = String(
      formData.get("code") ||
        "",
    ).trim();

    if (
      !email ||
      !/^\d{6}$/.test(
        loginCode,
      )
    ) {
      setLoading(false);

      setError(
        "Enter the 6-digit login code.",
      );

      return;
    }

    const result =
      await signIn(
        "credentials",
        {
          redirect: false,
          email,
          loginCode,
          callbackUrl,
        },
      );

    setLoading(false);

    if (!result?.ok) {
      setError(
        result?.error ===
          "RateLimited"
          ? "Too many login code attempts. Please wait and try again."
          : "The login code is invalid or expired.",
      );

      return;
    }

    setMessage(
      "Verified. Redirecting...",
    );

    startTransition(() => {
      window.location.href =
        result.url ||
        callbackUrl;
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">
        Verify your login
      </h1>

      <p className="mt-2 text-sm text-muted">
        Enter the 6-digit code
        we sent to your email.
        Codes expire after 10
        minutes.
      </p>

      <form
        action={submit}
        className="mt-5 grid gap-4"
      >
        <Field label="Login code">
          <Input
            name="code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(
              event,
            ) =>
              setCode(
                event.target.value
                  .replace(
                    /\D/g,
                    "",
                  )
                  .slice(
                    0,
                    6,
                  ),
              )
            }
            disabled={
              loading ||
              isPending
            }
          />
        </Field>

        {error ? (
          <p
            className="text-sm text-danger"
            aria-live="polite"
          >
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

        <Button
          disabled={
            loading ||
            isPending ||
            code.length !== 6
          }
        >
          {loading ||
          isPending
            ? "Verifying..."
            : "Verify login"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Need to start over?{" "}
        <Link
          className="font-semibold text-teal-dark"
          href="/auth/signin"
        >
          Log in again
        </Link>
      </p>
    </Card>
  );
}