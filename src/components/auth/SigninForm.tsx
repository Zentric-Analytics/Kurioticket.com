"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";
import { signinSchema } from "@/lib/validation";

type SigninFormProps = {
  callbackUrl?: string;
  googleEnabled?: boolean;
  initialErrorKey?: string;
  initialMessageKey?: string;
};

type LoginStep = "credentials" | "code";

type Credentials = {
  email: string;
  password: string;
};

const invalidLoginKey = "loginInvalidCredentials";
const rateLimitedKey = "loginRateLimited";
const codeSentKey = "loginCodeSent";
const codeFailedKey = "loginCodeFailed";
const processingKey = "loginProcessing";
const resendSuccessKey = "loginResendSuccess";

type MessageState = {
  key: string;
  params?: Record<string, string | number>;
};

export function SigninForm({
  callbackUrl = "/",
  googleEnabled = false,
  initialErrorKey = "",
  initialMessageKey = "",
}: SigninFormProps) {
  const [step, setStep] = useState<LoginStep>("credentials");
  const [emailForCode, setEmailForCode] = useState("");
  const [code, setCode] = useState("");
  const { t } = useLocale();
  const [error, setError] = useState<MessageState | null>(
    initialErrorKey ? { key: initialErrorKey } : null,
  );
  const [message, setMessage] = useState<MessageState | null>(
    initialMessageKey ? { key: initialMessageKey } : null,
  );
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
    setError(null);
    setMessage({ key: processingKey });

    const parsed = signinSchema.safeParse({
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });

    if (!parsed.success) {
      credentialsInFlightRef.current = false;
      setLoading(false);
      setMessage(null);
      setError({ key: invalidLoginKey });
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
        setMessage(null);
        setError({ key: result.errorKey });
        return;
      }

      if (result.redirectTo?.startsWith("/auth/verify-email")) {
        setMessage({ key: codeSentKey });
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
      setMessage({ key: codeSentKey });
      setLoading(false);
      credentialsInFlightRef.current = false;
    } catch (error) {
      console.error("[signin]", error);
      credentialsInFlightRef.current = false;
      setLoading(false);
      setMessage(null);
      setError({ key: invalidLoginKey });
    }
  }

  async function submitCode(formData: FormData) {
    if (codeInFlightRef.current) return;
    codeInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    const loginCode = String(formData.get("code") || "").trim();
    const email = credentialsRef.current?.email || emailForCode;

    if (!email || !/^\d{6}$/.test(loginCode)) {
      codeInFlightRef.current = false;
      setLoading(false);
      setError({ key: "loginEnterCode" });
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
        setError({
          key: result?.error === "RateLimited" ? rateLimitedKey : codeFailedKey,
        });
        return;
      }

      credentialsRef.current = null;
      setMessage({ key: "loginVerifiedRedirecting" });
      startTransition(() => {
        window.location.href = result.url || callbackUrl;
      });
    } catch (error) {
      console.error("[signin:verify-login]", error);
      codeInFlightRef.current = false;
      setLoading(false);
      setError({ key: codeFailedKey });
    }
  }

  async function resendCode() {
    if (resendInFlightRef.current || cooldownSeconds > 0) return;

    const credentials = credentialsRef.current;
    if (!credentials) {
      setError({ key: "loginStartOverError" });
      return;
    }

    resendInFlightRef.current = true;
    setResending(true);
    setError(null);
    setMessage({ key: "loginSendingNewCode" });

    try {
      const result = await requestLoginCode(credentials);
      if (!result.ok) {
        setMessage(null);
        setError({ key: result.errorKey });
        return;
      }

      setCooldownSeconds(result.cooldownSeconds || 30);
      setMessage({ key: resendSuccessKey });
    } catch (error) {
      console.error("[signin:resend-login-code]", error);
      setMessage(null);
      setError({ key: "loginUnableSendNewCode" });
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
    setError(null);
    setMessage(null);
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
        errorKey:
          response.status === 429
            ? rateLimitedKey
            : getLoginErrorKey(data.error),
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
      <h1 className="text-2xl font-bold text-navy">{t.loginPageTitle}</h1>

      <p className="mt-2 text-sm text-muted">{t.loginPageSubtitle}</p>

      {step === "credentials" ? (
        <form action={submitCredentials} className="mt-5 grid gap-4">
          <Field label={t.loginEmailLabel}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
            />
          </Field>

          <Field label={t.loginPasswordLabel}>
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
            {t.loginForgotPassword}
          </Link>

          {message ? (
            <StatusMessage>{formatTranslation(t, message)}</StatusMessage>
          ) : null}
          {error ? (
            <ErrorMessage>{formatTranslation(t, error)}</ErrorMessage>
          ) : null}

          <Button disabled={busy}>
            {busy ? t.loginCheckingDetails : t.loginSubmit}
          </Button>
        </form>
      ) : (
        <form action={submitCode} className="mt-5 grid gap-4">
          <div className="rounded-md bg-teal/10 px-3 py-2 text-sm text-teal-dark">
            <p className="font-semibold">{t.loginCodeSent}</p>
            <p className="mt-1 text-teal-dark/80">
              {formatTranslation(t, {
                key: "loginCodeInstructions",
                params: { email: emailForCode, minutes: 10 },
              })}
            </p>
          </div>

          <Field label={t.loginVerificationCodeLabel}>
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

          {message && message.key !== codeSentKey ? (
            <StatusMessage>{formatTranslation(t, message)}</StatusMessage>
          ) : null}
          {error ? (
            <ErrorMessage>{formatTranslation(t, error)}</ErrorMessage>
          ) : null}

          <Button disabled={busy || code.length !== 6}>
            {busy ? t.loginVerifying : t.loginVerifyLogin}
          </Button>

          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              onClick={resendCode}
              disabled={busy || resending || cooldownSeconds > 0}
            >
              {resending
                ? t.loginSendingCode
                : cooldownSeconds > 0
                  ? formatTranslation(t, {
                      key: "loginResendIn",
                      params: { seconds: cooldownSeconds },
                    })
                  : t.loginResendCode}
            </button>

            <button
              type="button"
              className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              onClick={startOver}
              disabled={busy || resending}
            >
              {t.loginUseDifferentDetails}
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
              callbackUrl: callbackUrl || "/",
              prompt: "select_account",
            })
          }
          disabled={busy}
        >
          {t.loginGoogle}
        </Button>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        {t.loginSignupPrompt}{" "}
        <Link
          className="cursor-pointer font-semibold text-teal-dark transition-colors hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          href="/auth/signup"
        >
          {t.loginCreateAccount}
        </Link>
      </p>
    </Card>
  );
}

function formatTranslation(
  translations: Record<string, string>,
  message: MessageState,
) {
  const template = translations[message.key] ?? message.key;

  if (!message.params) {
    return template;
  }

  return Object.entries(message.params).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function getLoginErrorKey(error: unknown) {
  switch (String(error || "")) {
    case "Too many sign-in attempts. Please wait and try again.":
      return rateLimitedKey;
    case "This account is not available. Please contact support.":
      return "loginErrorAccountUnavailable";
    case "Unable to send login code right now. Please try again.":
      return "loginUnableSendLoginCode";
    default:
      return invalidLoginKey;
  }
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
    (data as Record<string, unknown>).cooldownSeconds || 0,
  );

  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
    return fallback;
  }

  return Math.ceil(cooldownSeconds);
}
