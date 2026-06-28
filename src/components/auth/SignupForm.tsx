"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { useLocale } from "@/components/layout/LocaleProvider";
import { signupSchema } from "@/lib/validation";

type SignupFormProps = {
  googleEnabled?: boolean;
};

type MessageState = {
  key: string;
};

export function SignupForm({ googleEnabled = false }: SignupFormProps) {
  const { t } = useLocale();

  useEffect(() => {
    document.title = `${t.signupPageTitle} | Kurioticket`;
  }, [t.signupPageTitle]);

  const [error, setError] = useState<MessageState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const input = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    };

    const parsed = signupSchema.safeParse(input);

    if (!parsed.success) {
      setLoading(false);
      setError({ key: getPublicSignupValidationErrorKey(parsed.error.flatten().fieldErrors) });
      return;
    }

    const { email } = parsed.data;
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError({ key: getSignupErrorKey(data.error) });
      return;
    }

    setLoading(false);
    setMessage({ key: "signupVerificationRequiredRedirecting" });

    startTransition(() => {
      window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`;
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md p-5">
      <h1 className="break-words text-2xl font-bold text-navy">{t.signupPageTitle}</h1>

      <form action={submit} className="mt-5 grid gap-4">
        <Field label={t.signupFullNameLabel}>
          <Input name="name" autoComplete="name" required disabled={loading || isPending} />
        </Field>

        <Field label={t.signupEmailLabel}>
          <Input name="email" type="email" autoComplete="email" required disabled={loading || isPending} />
        </Field>

        <Field label={t.signupPasswordLabel}>
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={loading || isPending} />
        </Field>

        <p className="break-words text-xs leading-5 text-muted">
          {t.signupAgreementBeforeTerms}
          <Link className="font-semibold text-teal-dark" href="/legal/terms-of-service">
            {t.signupTermsLink}
          </Link>
          {t.signupAgreementBetweenLinks}
          <Link className="font-semibold text-teal-dark" href="/legal/privacy-policy">
            {t.signupPrivacyPolicyLink}
          </Link>
          {t.signupAgreementAfterPrivacy}
        </p>

        {error ? (
          <p className="break-words text-sm text-danger" aria-live="polite">
            {formatTranslation(t, error)}
          </p>
        ) : null}

        {message ? (
          <p className="break-words rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal-dark" aria-live="polite">
            {formatTranslation(t, message)}
          </p>
        ) : null}

        <Button disabled={loading || isPending}>{loading || isPending ? t.signupCreatingAccount : t.signupSubmit}</Button>
      </form>

      {googleEnabled ? (
        <Button variant="secondary" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}>
          {t.signupGoogle}
        </Button>
      ) : null}

      <p className="mt-4 break-words text-sm text-muted">
        {t.signupAlreadyHaveAccount}{" "}
        <Link className="font-semibold text-teal-dark" href="/auth/signin">
          {t.signupLoginLink}
        </Link>
      </p>
    </Card>
  );
}

function formatTranslation(translations: Record<string, string>, message: MessageState) {
  return translations[message.key] ?? message.key;
}

function getPublicSignupValidationErrorKey(fieldErrors: Record<string, string[] | undefined>) {
  if (fieldErrors.name?.length) return "signupErrorFullNameRequired";
  if (fieldErrors.email?.length) return "signupErrorInvalidEmail";
  if (fieldErrors.password?.length) return "signupErrorPasswordRequirements";
  return "signupErrorUnableCreate";
}

function getSignupErrorKey(error: unknown) {
  switch (String(error || "")) {
    case "Enter a valid email address.":
      return "signupErrorInvalidEmail";
    case "Password must meet minimum requirements.":
      return "signupErrorPasswordRequirements";
    case "Too many signup attempts. Please wait and try again.":
      return "signupErrorRateLimited";
    case "An account with this email already exists.":
      return "signupErrorDuplicateEmail";
    case "Unable to send verification code right now. Please try again.":
      return "signupErrorUnableSendVerification";
    case "Unable to create account right now.":
    default:
      return "signupErrorUnableCreate";
  }
}
