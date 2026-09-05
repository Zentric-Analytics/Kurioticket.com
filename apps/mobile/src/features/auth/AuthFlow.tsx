import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError, isPreviewPasskeySignIn, tracePreviewPasskey } from "./authApi";
import type { PasskeyAuthenticationOptions, PasskeyAssertion } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, ForgotPasswordScreen, PasswordScreen, SuccessScreen, TwoFactorLoginScreen, VerificationScreen } from "./AuthFormScreens";
import { requireGoogleWebClientId } from "./googleConfig";
import { isNativePasskeyUsernameFieldAvailable } from "../passkeys/NativePasskeyUsernameField";
import { previewPasskeyErrorMessage } from "./previewPasskeySignIn";
import { createPasskeyFieldRecovery } from "./passkeyFieldRecovery";

const PASSKEY_OPTIONS_REFRESH_MS = 4 * 60_000;
const PASSKEY_EMAIL_REFRESH_AGE_MS = 3 * 60_000;
const PASSKEY_OPTIONS_RETRY_MS = 30_000;

type Step = "welcome" | "email" | "verify" | "password" | "forgotPassword" | "twoFactor" | "create" | "success";
type TwoFactorOrigin = "password" | "google";
export function isTerminalTwoFactorError(error: unknown) { return error instanceof AuthApiError && (error.status === 410 || error.status === 429); }
export function AuthFlow({ initialStep = "welcome", successRoute = "/" }: { initialStep?: "welcome" | "email"; successRoute?: "/" | import("./signInIntent").ProtectedRoute } = {}) {
  const [step, setStep] = useState<Step>(initialStep); const [passkeyOptions, setPasskeyOptions] = useState<PasskeyAuthenticationOptions | null>(null); const [passkeyOptionsAcquiredAt, setPasskeyOptionsAcquiredAt] = useState(0); const passkeyOptionsGeneration = useRef(0); const passkeyOptionsController = useRef<AbortController | null>(null); const passkeyVerifyGeneration = useRef(0); const passkeyVerifyController = useRef<AbortController | null>(null); const [email, setEmail] = useState(""); const [challengeToken, setChallengeToken] = useState(""); const [twoFactorOrigin, setTwoFactorOrigin] = useState<TwoFactorOrigin>("password"); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28); const [forceGoogleAccountSelection, setForceGoogleAccountSelection] = useState(false); const [resetNotice, setResetNotice] = useState("");

  const refreshPasskeyOptions = useCallback(async () => {
    if (!isNativePasskeyUsernameFieldAvailable()) return;
    const generation = ++passkeyOptionsGeneration.current;
    const controller = new AbortController();
    passkeyOptionsController.current?.abort();
    passkeyOptionsController.current = controller;
    try {
      const { options } = await authApi.passkeyOptions(controller.signal);
      if (generation === passkeyOptionsGeneration.current) {
        setPasskeyOptions(options);
        setPasskeyOptionsAcquiredAt(Date.now());
      }
    } catch {
      // Passkey AutoFill is optional. A failed background prefetch must never alter
      // the ordinary email sign-in path or display a passkey-specific error.
    } finally {
      if (generation === passkeyOptionsGeneration.current) passkeyOptionsController.current = null;
    }
  }, []);

  const recoveryContext = useRef({ step, loading, challenge: passkeyOptions?.challenge });
  recoveryContext.current = { step, loading, challenge: passkeyOptions?.challenge };
  const passkeyRecovery = useMemo(() => createPasskeyFieldRecovery({
    currentChallenge: () => recoveryContext.current.challenge,
    canRearm: () => isPreviewPasskeySignIn() && recoveryContext.current.step === "email"
      && !recoveryContext.current.loading && !passkeyVerifyController.current && !passkeyOptionsController.current,
    refresh: refreshPasskeyOptions,
    schedule: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer); },
  }), [refreshPasskeyOptions]);
  useEffect(() => {
    if (step !== "email" || loading) passkeyRecovery.cancel();
    return () => passkeyRecovery.cancel();
  }, [step, loading, passkeyRecovery]);

  useEffect(() => {
    if ((step !== "welcome" && step !== "email") || !isNativePasskeyUsernameFieldAvailable()) return;

    const age = passkeyOptions && passkeyOptionsAcquiredAt
      ? Math.max(0, Date.now() - passkeyOptionsAcquiredAt)
      : Number.POSITIVE_INFINITY;
    const needsRefresh = !passkeyOptions
      || !passkeyOptionsAcquiredAt
      || age >= PASSKEY_OPTIONS_REFRESH_MS
      || (step === "email" && age >= PASSKEY_EMAIL_REFRESH_AGE_MS);

    if (needsRefresh) {
      void refreshPasskeyOptions();
      const retryTimer = setTimeout(() => { void refreshPasskeyOptions(); }, PASSKEY_OPTIONS_RETRY_MS);
      return () => clearTimeout(retryTimer);
    }

    const delay = Math.max(0, PASSKEY_OPTIONS_REFRESH_MS - age);
    const timer = setTimeout(() => { void refreshPasskeyOptions(); }, delay);
    return () => clearTimeout(timer);
  }, [passkeyOptions, passkeyOptionsAcquiredAt, refreshPasskeyOptions, step]);

  const emailPasskeyOptions = step === "email"
    && passkeyOptions
    && passkeyOptionsAcquiredAt
    && Date.now() - passkeyOptionsAcquiredAt < PASSKEY_OPTIONS_REFRESH_MS
    ? passkeyOptions
    : null;

  const stopPasskeyVerification = useCallback(() => {
    if (passkeyVerifyController.current && isPreviewPasskeySignIn()) setLoading(false);
    passkeyVerifyGeneration.current += 1;
    passkeyVerifyController.current?.abort();
    passkeyVerifyController.current = null;
  }, []);

  const continuePasskeyAssertion = useCallback((assertion: PasskeyAssertion) => {
    if (step !== "email") return;
    passkeyRecovery.cancel();
    const generation = ++passkeyVerifyGeneration.current;
    const controller = new AbortController();
    passkeyVerifyController.current?.abort();
    passkeyVerifyController.current = controller;
    if (isPreviewPasskeySignIn()) { setLoading(true); setError(""); }
    void authApi.passkeyVerify(assertion, controller.signal).then(() => {
      if (generation === passkeyVerifyGeneration.current) {
        tracePreviewPasskey("auth_success_screen");
        setStep("success");
      }
    }).catch((error: unknown) => {
      if (generation !== passkeyVerifyGeneration.current || controller.signal.aborted) return;
      tracePreviewPasskey("sign_in_failed", error);
      if (isPreviewPasskeySignIn()) {
        setError(previewPasskeyErrorMessage(error instanceof AuthApiError ? error.status : undefined));
        void refreshPasskeyOptions();
      }
    }).finally(() => {
      if (generation === passkeyVerifyGeneration.current) {
        passkeyVerifyController.current = null;
        if (isPreviewPasskeySignIn()) setLoading(false);
      }
    });
  }, [step, refreshPasskeyOptions, passkeyRecovery]);

  useEffect(() => {
    if (step === "email") return;
    stopPasskeyVerification();
  }, [step, stopPasskeyVerification]);
  useEffect(() => () => {
    passkeyOptionsGeneration.current += 1;
    passkeyOptionsController.current?.abort();
    stopPasskeyVerification();
  }, [stopPasskeyVerification]);
  useEffect(() => { if (!resetNotice) return; const timer = setTimeout(() => setResetNotice(""), 2000); return () => clearTimeout(timer); }, [resetNotice]);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError || (e instanceof Error && e.name === "NativeGoogleSignInError") ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => {
    passkeyRecovery.cancel();
    stopPasskeyVerification();
    void run(async () => { const normalized = normalizeEmail(value); const result = await authApi.requestCode(normalized); setEmail(normalized); setCooldown(result.cooldownSeconds || 28); setStep("verify"); });
  };
  const verify = useCallback((code: string) => { void run(async () => { const result = await authApi.verifyCode(email, code); setProof(result.verificationToken); setStep(result.accountType === "existing" ? "password" : "create"); }); }, [email, loading]);
  const done = useCallback(() => {
    void writeOnboardingCompleted().finally(() => {
      tracePreviewPasskey("navigation_requested");
      router.dismissTo(successRoute);
    });
  }, [successRoute]);
  const continueGoogle = () => void run(async () => {
    requireGoogleWebClientId();
    const { resetNativeGoogleSignInSelection, startNativeGoogleSignIn } = await import("./googleSignIn");
    const result = await startNativeGoogleSignIn({ forceAccountSelection: forceGoogleAccountSelection });
    if (result.status === "cancelled") return;
    try {
      const authResult = await authApi.google(result.idToken, result.nonce);
      if ("requiresTwoFactor" in authResult) { setTwoFactorOrigin("google"); setChallengeToken(authResult.challengeToken); setStep("twoFactor"); return; }
    } catch (googleError) {
      if (googleError instanceof AuthApiError && googleError.code === "PREVIEW_ACCESS_REQUIRED") {
        await resetNativeGoogleSignInSelection().catch(() => {});
        setForceGoogleAccountSelection(true);
      }
      throw googleError;
    }
    setForceGoogleAccountSelection(false);
    setStep("success");
  });
  if (step === "welcome") return <AuthWelcomeScreen busy={loading} error={error} onEmail={() => setStep("email")} onGoogle={continueGoogle} onGuest={() => void writeOnboardingCompleted().then(() => router.replace("/"))} />;
  if (step === "email") return <EmailScreen initialEmail={email} passkeyOptions={emailPasskeyOptions} onPasskey={continuePasskeyAssertion} onPasskeyDiagnostic={passkeyRecovery.diagnostic} onCredentialInteraction={passkeyRecovery.interact} onBack={() => { passkeyRecovery.cancel(); if (initialStep === "email") router.back(); else setStep("welcome"); }} onContinue={requestCode} loading={loading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen notice={resetNotice} onBack={() => { setProof(""); setResetNotice(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { setResetNotice(""); const result = await authApi.password(email, password); if ("requiresTwoFactor" in result) { setTwoFactorOrigin("password"); setChallengeToken(result.challengeToken); setStep("twoFactor"); } else setStep("success"); })} onForgot={() => void run(async () => { setResetNotice(""); await authApi.sendForgotPasswordCode(email, proof); setStep("forgotPassword"); })} loading={loading} error={error} />;
  if (step === "forgotPassword") return <ForgotPasswordScreen email={email} onBack={() => setStep("password")} onResend={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); })} onReset={(input) => void run(async () => { await authApi.resetForgotPassword({ email, ...input }); setProof(""); setResetNotice("Password reset. Sign in again."); setStep("password"); })} loading={loading} error={error} />;
  if (step === "twoFactor") return <TwoFactorLoginScreen onBack={() => { setChallengeToken(""); setError(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); }} onVerify={(code) => void run(async () => { try { await authApi.twoFactor(challengeToken, code); setStep("success"); } catch (twoFactorError) { if (isTerminalTwoFactorError(twoFactorError)) { setChallengeToken(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); if (twoFactorOrigin === "password") setResetNotice("Two-factor check expired. Sign in again."); else setError("Two-factor check expired. Try Google sign-in again."); return; } throw twoFactorError; } })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
