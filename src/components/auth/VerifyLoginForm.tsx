"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";

type VerifyLoginFormProps = {
  email: string;
  callbackUrl?: string;
};

const rateLimitedMessage = "Too many attempts. Please wait a moment and try again.";
const codeFailedMessage = "That code did not work. Check the code and try again.";
const resendSuccessMessage = "We sent a new code if this account can sign in.";

export function VerifyLoginForm({
  email,
  callbackUrl = "/",
}: VerifyLoginFormProps) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [resendPassword, setResendPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(30);
  const [isPending, startTransition] = useTransition();
  const verifyInFlightRef = useRef(false);
  const resendInFlightRef = useRef(false);

  const busy = loading || isPending;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  async function submit(formData: FormData) {
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    const loginCode = String(formData.get("code") || "").trim();

    if (!email || !/^\d{6}$/.test(loginCode)) {
      verifyInFlightRef.current = false;
      setLoading(false);
      setError("Enter the 6-digit login code.");
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        loginCode,
        callbackUrl,
      });

      if (!result?.ok) {
        verifyInFlightRef.current = false;
        setLoading(false);
        setError(
          result?.error === "RateLimited" ? rateLimitedMessage : codeFailedMessage
        );
        return;
      }

      setResendPassword("");
      setMessage("Verified. Redirecting…");

      startTransition(() => {
        window.location.href = result.url || callbackUrl;
      });
    } catch (error) {
      console.error("[verify-login]", error);
      verifyInFlightRef.current = false;
      setLoading(false);
      setError(codeFailedMessage);
    }
  }

  async function resendCode() {
    if (resendInFlightRef.current || cooldownSeconds > 0) return;

    if (!email || !resendPassword) {
      setError("Enter your password to request a new login code.");
      return;
    }

    resendInFlightRef.current = true;
    setResending(true);
    setError("");
    setMessage("Sending a new verification code…");

    try {
      const response = await fetch("/api/auth/request-login-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: resendPassword,
          callbackUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
      const nextCooldown = parseCooldownSeconds(data, retryAfter);

      if (!response.ok) {
        setMessage("");
        setError(response.status === 429 ? rateLimitedMessage : "Unable to send a new code right now. Please try again.");
        if (nextCooldown > 0) {
          setCooldownSeconds(nextCooldown);
        }
        return;
      }

      setCooldownSeconds(nextCooldown || 30);
      setMessage(resendSuccessMessage);
    } catch (error) {
      console.error("[verify-login:resend]", error);
      setMessage("");
      setError("Unable to send a new code right now. Please try again.");
    } finally {
      resendInFlightRef.current = false;
      setResending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">
        {t.verifyLoginPageTitle}
      </h1>

      <p className="mt-2 text-sm text-muted">
        {t.verifyLoginPageSubtitle}
      </p>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.verifyLoginCodeLabel}>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            disabled={busy}
          />
        </Field>

        {error ? (
          <p className="text-sm text-danger" aria-live="polite">
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

        <Button disabled={busy || code.length !== 6}>
          {busy
            ? t.verifyLoginSubmitting
            : t.verifyLoginSubmit}
        </Button>
      </form>

      <div className="mt-4 grid gap-3 rounded-md border border-teal/20 p-3">
        <p className="text-sm text-muted">
          {t.verifyLoginNewCodePrompt}
        </p>
        <Field label={t.verifyLoginPasswordLabel}>
          <Input
            type="password"
            autoComplete="current-password"
            value={resendPassword}
            onChange={(event) => setResendPassword(event.target.value)}
            disabled={busy || resending}
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={resendCode}
          disabled={busy || resending || cooldownSeconds > 0}
        >
          {resending
            ? t.verifyLoginSendingCode
            : cooldownSeconds > 0
              ? t.verifyLoginResendIn.replaceAll("{{seconds}}", String(cooldownSeconds))
              : t.verifyLoginResendCode}
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">
        {t.verifyLoginStartOverPrompt}{" "}
        <Link
          className="font-semibold text-teal-dark"
          href="/auth/signin"
        >
          {t.verifyLoginAgainLink}
        </Link>
      </p>
    </Card>
  );
}

function parseRetryAfter(value: string | null) {
  if (!value) return 0;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function parseCooldownSeconds(data: unknown, fallback: number) {
  if (!data || typeof data !== "object") return fallback;
  const cooldownSeconds = Number(
    (data as Record<string, unknown>).cooldownSeconds || 0
  );

  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
    return fallback;
  }

  return Math.ceil(cooldownSeconds);
}

export default VerifyLoginForm;
