"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

type LoginStep = "credentials" | "code";

type Credentials = {
  email: string;
  password: string;
};

const invalidLoginMessage =
  "We could not sign you in. Check your email and password, then try again.";
const rateLimitedMessage = "Too many attempts. Please wait a moment and try again.";
const codeSentMessage = "We sent a verification code to your email.";
const codeFailedMessage = "That code did not work. Check the code and try again.";
const processingMessage =
  "Checking your details and sending a verification code…";
const resendSuccessMessage = "We sent a new code if this account can sign in.";

export function SigninForm({
  callbackUrl = "/",
  googleEnabled = false,
  initialError = "",
  initialMessage = "",
}: SigninFormProps) {
  const [step, setStep] = useState<LoginStep>("credentials");
  const [emailForCode, setEmailForCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPending, startTransition] = useTransition();
  const credentialsInFlightRef = useRef(false);
  const codeInFlightRef = useRef(false);
  const resendInFlightRef = useRef(false);
  const credentialsRef = useRef<Credentials | null>(null);

  const busy = loading || isPending;

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  async function submitCredentials(formData: FormData) {
    if (credentialsInFlightRef.current) return;
    credentialsInFlightRef.current = true;
    setLoading(true);
    setError("");
    setMessage(processingMessage);

    const parsed = signinSchema.safeParse({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      credentialsInFlightRef.current = false;
      setLoading(false);
      setMessage("");
      setError(invalidLoginMessage);
      return;
    }

    try {
      const result = await requestLoginCode({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (!result.ok) {
        credentialsInFlightRef.current = false;
        setLoading(false);
        setMessage("");
        setError(result.error);
        return;
      }

      if (result.redirectTo?.startsWith("/auth/verify-email")) {
        setMessage("We sent a verification code to your email.");
        startTransition(() => {
          window.location.href = result.redirectTo || "/auth/verify-email";
        });
        return;
      }

      credentialsRef.current = parsed.data;
      setEmailForCode(parsed.data.email);
      setCode("");
      setCooldownSeconds(result.cooldownSeconds || 30);
      setStep("code");
      setMessage(codeSentMessage);
      setLoading(false);
      credentialsInFlightRef.current = false;
    } catch (error) {
      console.error("[signin]", error);
      credentialsInFlightRef.current = false;
      setLoading(false);
      setMessage("");
      setError(invalidLoginMessage);
    }
  }

  async function submitCode(formData: FormData) {
    if (codeInFlightRef.current) return;
    codeInFlightRef.current = true;
    setLoading(true);
    setError("");
    setMessage("");

    const loginCode = String(formData.get("code") || "").trim();
    const email = credentialsRef.current?.email || emailForCode;

    if (!email || !/^\d{6}$/.test(loginCode)) {
      codeInFlightRef.current = false;
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
        codeInFlightRef.current = false;
        setLoading(false);
        setError(
          result?.error === "RateLimited" ? rateLimitedMessage : codeFailedMessage
        );
        return;
      }

      credentialsRef.current = null;
      setMessage("Verified. Redirecting…");
      startTransition(() => {
        window.location.href = result.url || callbackUrl;
      });
    } catch (error) {
      console.error("[signin:verify-login]", error);
      codeInFlightRef.current = false;
      setLoading(false);
      setError(codeFailedMessage);
    }
  }

  async function resendCode() {
    if (resendInFlightRef.current || cooldownSeconds > 0) return;

    const credentials = credentialsRef.current;
    if (!credentials) {
      setError("Start over so we can check your details before sending a new code.");
      return;
    }

    resendInFlightRef.current = true;
    setResending(true);
    setError("");
    setMessage("Sending a new verification code…");

    try {
      const result = await requestLoginCode(credentials);
      if (!result.ok) {
        setMessage("");
        setError(result.error);
        return;
      }

      setCooldownSeconds(result.cooldownSeconds || 30);
      setMessage(resendSuccessMessage);
    } catch (error) {
      console.error("[signin:resend-login-code]", error);
      setMessage("");
      setError("Unable to send a new code right now. Please try again.");
    } finally {
      resendInFlightRef.current = false;
      setResending(false);
    }
  }

  function startOver() {
    credentialsRef.current = null;
    credentialsInFlightRef.current = false;
    codeInFlightRef.current = false;
    resendInFlightRef.current = false;
    setStep("credentials");
    setEmailForCode("");
    setCode("");
    setCooldownSeconds(0);
    setError("");
    setMessage("");
    setLoading(false);
    setResending(false);
  }

  async function requestLoginCode(credentials: Credentials) {
    const response = await fetch("/api/auth/request-login-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...credentials,
        callbackUrl,
      }),
    });

    const data = await response.json().catch(() => ({}));
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    const cooldownSeconds = parseCooldownSeconds(data, retryAfter);

    if (!response.ok) {
      return {
        ok: false as const,
        error:
          response.status === 429
            ? rateLimitedMessage
            : String(data.error || invalidLoginMessage),
        cooldownSeconds,
      };
    }

    return {
      ok: true as const,
      redirectTo: typeof data.redirectTo === "string" ? data.redirectTo : "",
      cooldownSeconds,
    };
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="text-2xl font-bold text-navy">Log in</h1>

      <p className="mt-2 text-sm text-muted">
        Save searches, manage alerts, and access your travel dashboard.
      </p>

      {step === "credentials" ? (
        <form action={submitCredentials} className="mt-5 grid gap-4">
          <Field label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
            />
          </Field>

          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </Field>

          <Link
            className="cursor-pointer text-sm font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>

          {message ? <StatusMessage>{message}</StatusMessage> : null}
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}

          <Button disabled={busy}>
            {busy ? "Checking details…" : "Log in"}
          </Button>
        </form>
      ) : (
        <form action={submitCode} className="mt-5 grid gap-4">
          <div className="rounded-md bg-teal/10 px-3 py-2 text-sm text-teal-dark">
            <p className="font-semibold">{codeSentMessage}</p>
            <p className="mt-1 text-teal-dark/80">
              Enter the 6-digit code sent to {emailForCode}. Codes expire after 10 minutes.
            </p>
          </div>

          <Field label="Verification code">
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
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={busy}
            />
          </Field>

          {message && message !== codeSentMessage ? <StatusMessage>{message}</StatusMessage> : null}
          {error ? <ErrorMessage>{error}</ErrorMessage> : null}

          <Button disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify login"}
          </Button>

          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              onClick={resendCode}
              disabled={busy || resending || cooldownSeconds > 0}
            >
              {resending
                ? "Sending code…"
                : cooldownSeconds > 0
                  ? `Resend in ${cooldownSeconds}s`
                  : "Resend code"}
            </button>

            <button
              type="button"
              className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              onClick={startOver}
              disabled={busy || resending}
            >
              Use different details
            </button>
          </div>
        </form>
      )}

      {googleEnabled && step === "credentials" ? (
        <Button
          variant="secondary"
          className="mt-3 w-full hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-violet-500"
          onClick={() =>
            signIn("google", {
              callbackUrl:
                callbackUrl || "/",
              prompt:
                "select_account",
            })
          }
          disabled={busy}
        >
          Continue with Google
        </Button>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        New to Kurioticket?{" "}
        <Link className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" href="/auth/signup">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

function StatusMessage({ children }: { children: string }) {
  return (
    <p
      className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark"
      aria-live="polite"
    >
      {children}
    </p>
  );
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p className="text-sm text-danger" aria-live="polite">
      {children}
    </p>
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
