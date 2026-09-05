import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError } from "./authApi";
import type { PasskeyAuthenticationOptions, PasskeyAssertion } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, ForgotPasswordScreen, PasswordScreen, SuccessScreen, TwoFactorLoginScreen, VerificationScreen } from "./AuthFormScreens";
import { requireGoogleWebClientId } from "./googleConfig";
import { isNativePasskeyUsernameFieldAvailable } from "../passkeys/NativePasskeyUsernameField";
import { cancelPasskeyAutoFill, isPasskeyAutoFillAvailable, startPasskeyAutoFill, waitForPasskeyAutoFillStart } from "../passkeys/passkeyAutoFill";

const PASSKEY_OPTIONS_REFRESH_MS = 4 * 60_000;
const PASSKEY_EMAIL_REFRESH_AGE_MS = 3 * 60_000;
const PASSKEY_OPTIONS_RETRY_MS = 30_000;
const LEGACY_PASSKEY_FOCUS_FALLBACK_MS = 350;

type Step = "welcome" | "email" | "verify" | "password" | "forgotPassword" | "twoFactor" | "create" | "success";
type TwoFactorOrigin = "password" | "google";
export function isTerminalTwoFactorError(error: unknown) { return error instanceof AuthApiError && (error.status === 410 || error.status === 429); }
export function AuthFlow({ initialStep = "welcome", successRoute = "/" }: { initialStep?: "welcome" | "email"; successRoute?: "/" | import("./signInIntent").ProtectedRoute } = {}) {
  const [step, setStep] = useState<Step>(initialStep); const [passkeyOptions, setPasskeyOptions] = useState<PasskeyAuthenticationOptions | null>(null); const [passkeyOptionsAcquiredAt, setPasskeyOptionsAcquiredAt] = useState(0); const passkeyOptionsGeneration = useRef(0); const passkeyOptionsController = useRef<AbortController | null>(null); const passkeyVerifyGeneration = useRef(0); const passkeyVerifyController = useRef<AbortController | null>(null); const [legacyPasskeyAutoFillActive, setLegacyPasskeyAutoFillActive] = useState(false); const legacyPasskeyAttempt = useRef(0); const legacyPasskeyController = useRef<AbortController | null>(null); const legacyPasskeyPriming = useRef(false); const [email, setEmail] = useState(""); const [challengeToken, setChallengeToken] = useState(""); const [twoFactorOrigin, setTwoFactorOrigin] = useState<TwoFactorOrigin>("password"); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28); const [forceGoogleAccountSelection, setForceGoogleAccountSelection] = useState(false); const [resetNotice, setResetNotice] = useState("");

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

  // Newer binaries let the native username field own the challenge and AutoFill
  // lifecycle. Keep that path unchanged and refresh before the five-minute expiry.
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
    passkeyVerifyGeneration.current += 1;
    passkeyVerifyController.current?.abort();
    passkeyVerifyController.current = null;
  }, []);

  const continuePasskeyAssertion = useCallback((assertion: PasskeyAssertion) => {
    if (step !== "email") return;
    const generation = ++passkeyVerifyGeneration.current;
    const controller = new AbortController();
    passkeyVerifyController.current?.abort();
    passkeyVerifyController.current = controller;
    void authApi.passkeyVerify(assertion, controller.signal).then(() => {
      if (generation === passkeyVerifyGeneration.current) setStep("success");
    }).catch(() => {
      // Selection/cancellation/verification failures stay silent. The credential
      // field remains an ordinary email field when no usable passkey is returned.
    }).finally(() => {
      if (generation === passkeyVerifyGeneration.current) passkeyVerifyController.current = null;
    });
  }, [step]);

  const stopLegacyPasskeyAutoFill = useCallback(() => {
    legacyPasskeyAttempt.current += 1;
    legacyPasskeyPriming.current = false;
    legacyPasskeyController.current?.abort();
    legacyPasskeyController.current = null;
    cancelPasskeyAutoFill();
    setLegacyPasskeyAutoFillActive(false);
  }, []);

  const startLegacyPasskeyAutoFill = useCallback(async () => {
    // PR #5034 moved this lifecycle into a native username view. Installed binaries
    // from before that native change do not contain the view, but they do contain
    // the older KurioticketPasskeyAutoFill module. Reuse it instead of degrading to
    // browser/password AutoFill and an email OTP.
    if (step !== "email" || isNativePasskeyUsernameFieldAvailable() || !isPasskeyAutoFillAvailable() || legacyPasskeyPriming.current) return false;

    const generation = ++legacyPasskeyAttempt.current;
    const controller = new AbortController();
    legacyPasskeyController.current?.abort();
    cancelPasskeyAutoFill();
    legacyPasskeyController.current = controller;
    legacyPasskeyPriming.current = true;

    try {
      const { options } = await authApi.passkeyOptions(controller.signal);
      if (generation !== legacyPasskeyAttempt.current) return false;
      const assertionPromise = startPasskeyAutoFill({ rpId: options.rpId, challenge: options.challenge });
      const started = await waitForPasskeyAutoFillStart();
      if (generation !== legacyPasskeyAttempt.current) return false;
      setLegacyPasskeyAutoFillActive(true);
      void assertionPromise.then((assertion) => {
        if (!assertion || generation !== legacyPasskeyAttempt.current) return;
        continuePasskeyAssertion(assertion);
      }).catch(() => {
        // Assisted discovery is intentionally silent. Email remains the fallback.
      }).finally(() => {
        if (generation === legacyPasskeyAttempt.current) setLegacyPasskeyAutoFillActive(false);
      });
      return started;
    } catch {
      // A compatibility failure must never block ordinary email sign-in.
      return false;
    } finally {
      if (generation === legacyPasskeyAttempt.current) legacyPasskeyPriming.current = false;
    }
  }, [continuePasskeyAssertion, step]);

  const prepareLegacyCredentialAutoFill = useCallback(async () => {
    if (step !== "email" || isNativePasskeyUsernameFieldAvailable() || !isPasskeyAutoFillAvailable()) return;
    await Promise.race([
      startLegacyPasskeyAutoFill(),
      new Promise<void>((resolve) => setTimeout(resolve, LEGACY_PASSKEY_FOCUS_FALLBACK_MS)),
    ]);
  }, [startLegacyPasskeyAutoFill, step]);

  const handleLegacyCredentialFocus = useCallback(() => {
    if (step !== "email" || isNativePasskeyUsernameFieldAvailable() || legacyPasskeyAutoFillActive || legacyPasskeyPriming.current || !isPasskeyAutoFillAvailable()) return;
    void startLegacyPasskeyAutoFill();
  }, [legacyPasskeyAutoFillActive, startLegacyPasskeyAutoFill, step]);

  useEffect(() => {
    if (step === "email") return;
    stopLegacyPasskeyAutoFill();
    stopPasskeyVerification();
  }, [step, stopLegacyPasskeyAutoFill, stopPasskeyVerification]);
  useEffect(() => {
    if (step !== "email" || isNativePasskeyUsernameFieldAvailable() || !legacyPasskeyAutoFillActive || !isPasskeyAutoFillAvailable()) return;
    const timer = setInterval(() => { void startLegacyPasskeyAutoFill(); }, PASSKEY_OPTIONS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [legacyPasskeyAutoFillActive, startLegacyPasskeyAutoFill, step]);
  useEffect(() => () => {
    passkeyOptionsGeneration.current += 1;
    passkeyOptionsController.current?.abort();
    legacyPasskeyAttempt.current += 1;
    legacyPasskeyController.current?.abort();
    cancelPasskeyAutoFill();
    stopPasskeyVerification();
  }, [stopPasskeyVerification]);
  useEffect(() => { if (!resetNotice) return; const timer = setTimeout(() => setResetNotice(""), 2000); return () => clearTimeout(timer); }, [resetNotice]);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError || (e instanceof Error && e.name === "NativeGoogleSignInError") ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => {
    stopLegacyPasskeyAutoFill();
    stopPasskeyVerification();
    void run(async () => { const normalized = normalizeEmail(value); const result = await authApi.requestCode(normalized); setEmail(normalized); setCooldown(result.cooldownSeconds || 28); setStep("verify"); });
  };
  const verify = useCallback((code: string) => { void run(async () => { const result = await authApi.verifyCode(email, code); setProof(result.verificationToken); setStep(result.accountType === "existing" ? "password" : "create"); }); }, [email, loading]);
  const done = useCallback(() => {
    void writeOnboardingCompleted().finally(() => router.dismissTo(successRoute));
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
  if (step === "email") return <EmailScreen initialEmail={email} passkeyOptions={emailPasskeyOptions} onPasskey={continuePasskeyAssertion} onCredentialReady={prepareLegacyCredentialAutoFill} onCredentialFocus={handleLegacyCredentialFocus} onBack={() => initialStep === "email" ? router.back() : setStep("welcome")} onContinue={requestCode} loading={loading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen notice={resetNotice} onBack={() => { setProof(""); setResetNotice(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { setResetNotice(""); const result = await authApi.password(email, password); if ("requiresTwoFactor" in result) { setTwoFactorOrigin("password"); setChallengeToken(result.challengeToken); setStep("twoFactor"); } else setStep("success"); })} onForgot={() => void run(async () => { setResetNotice(""); await authApi.sendForgotPasswordCode(email, proof); setStep("forgotPassword"); })} loading={loading} error={error} />;
  if (step === "forgotPassword") return <ForgotPasswordScreen email={email} onBack={() => setStep("password")} onResend={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); })} onReset={(input) => void run(async () => { await authApi.resetForgotPassword({ email, ...input }); setProof(""); setResetNotice("Password reset. Sign in again."); setStep("password"); })} loading={loading} error={error} />;
  if (step === "twoFactor") return <TwoFactorLoginScreen onBack={() => { setChallengeToken(""); setError(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); }} onVerify={(code) => void run(async () => { try { await authApi.twoFactor(challengeToken, code); setStep("success"); } catch (twoFactorError) { if (isTerminalTwoFactorError(twoFactorError)) { setChallengeToken(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); if (twoFactorOrigin === "password") setResetNotice("Two-factor check expired. Sign in again."); else setError("Two-factor check expired. Try Google sign-in again."); return; } throw twoFactorError; } })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
