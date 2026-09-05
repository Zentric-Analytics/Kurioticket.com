import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, ForgotPasswordScreen, PasswordScreen, SuccessScreen, TwoFactorLoginScreen, VerificationScreen } from "./AuthFormScreens";
import { requireGoogleWebClientId } from "./googleConfig";
import { cancelPasskeyAutoFill, isPasskeyAutoFillAvailable, startPasskeyAutoFill, waitForPasskeyAutoFillStart } from "../passkeys/passkeyAutoFill";

const PASSKEY_AUTOFILL_REFRESH_MS = 4 * 60_000;
const PASSKEY_AUTOFILL_FOCUS_FALLBACK_MS = 350;

type Step = "welcome" | "email" | "verify" | "password" | "forgotPassword" | "twoFactor" | "create" | "success";
type TwoFactorOrigin = "password" | "google";
export function isTerminalTwoFactorError(error: unknown) { return error instanceof AuthApiError && (error.status === 410 || error.status === 429); }
export function AuthFlow({ initialStep = "welcome", successRoute = "/" }: { initialStep?: "welcome" | "email"; successRoute?: "/" | import("./signInIntent").ProtectedRoute } = {}) {
  const [step, setStep] = useState<Step>(initialStep); const [credentialAutoFillActive, setCredentialAutoFillActive] = useState(false); const passkeyAttempt = useRef(0); const passkeyController = useRef<AbortController | null>(null); const passkeyPriming = useRef(false); const [email, setEmail] = useState(""); const [challengeToken, setChallengeToken] = useState(""); const [twoFactorOrigin, setTwoFactorOrigin] = useState<TwoFactorOrigin>("password"); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28); const [forceGoogleAccountSelection, setForceGoogleAccountSelection] = useState(false); const [resetNotice, setResetNotice] = useState("");

  const stopPasskeyAutoFill = useCallback(() => {
    passkeyAttempt.current += 1;
    passkeyPriming.current = false;
    passkeyController.current?.abort();
    passkeyController.current = null;
    cancelPasskeyAutoFill();
  }, []);

  const startSilentPasskeyAutoFill = useCallback(async () => {
    if (step !== "email" || !isPasskeyAutoFillAvailable() || passkeyPriming.current) return false;

    const generation = ++passkeyAttempt.current;
    const controller = new AbortController();
    passkeyController.current?.abort();
    cancelPasskeyAutoFill();
    passkeyController.current = controller;
    passkeyPriming.current = true;

    try {
      const { options } = await authApi.passkeyOptions(controller.signal);
      if (generation !== passkeyAttempt.current) return false;
      const assertionPromise = startPasskeyAutoFill({ rpId: options.rpId, challenge: options.challenge });
      const started = await waitForPasskeyAutoFillStart();
      if (!started || generation !== passkeyAttempt.current) return false;
      setCredentialAutoFillActive(true);
      void assertionPromise.then(async (assertion) => {
        if (!assertion || generation !== passkeyAttempt.current) return;
        await authApi.passkeyVerify(assertion, controller.signal);
        if (generation === passkeyAttempt.current) setStep("success");
      }).catch(() => {
        // AutoFill-assisted discovery is intentionally silent. If there is no matching
        // passkey, the user simply continues with the normal email flow.
      });
      return true;
    } catch {
      // Failing to prime AutoFill must not block or alter the normal email flow.
      return false;
    } finally {
      passkeyPriming.current = false;
    }
  }, [step]);

  const prepareCredentialAutoFill = useCallback(async () => {
    if (step !== "email" || !isPasskeyAutoFillAvailable()) return;
    await Promise.race([
      startSilentPasskeyAutoFill(),
      new Promise<void>((resolve) => setTimeout(resolve, PASSKEY_AUTOFILL_FOCUS_FALLBACK_MS)),
    ]);
  }, [startSilentPasskeyAutoFill, step]);

  const handleCredentialFocus = useCallback(() => {
    if (step !== "email" || credentialAutoFillActive || passkeyPriming.current || !isPasskeyAutoFillAvailable()) return;
    void startSilentPasskeyAutoFill();
  }, [credentialAutoFillActive, startSilentPasskeyAutoFill, step]);

  useEffect(() => {
    if (step === "email") return;
    setCredentialAutoFillActive(false);
    stopPasskeyAutoFill();
  }, [step, stopPasskeyAutoFill]);
  useEffect(() => {
    if (step !== "email" || !credentialAutoFillActive || !isPasskeyAutoFillAvailable()) return;
    const timer = setInterval(() => { void startSilentPasskeyAutoFill(); }, PASSKEY_AUTOFILL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [credentialAutoFillActive, startSilentPasskeyAutoFill, step]);
  useEffect(() => () => stopPasskeyAutoFill(), [stopPasskeyAutoFill]);
  useEffect(() => { if (!resetNotice) return; const timer = setTimeout(() => setResetNotice(""), 2000); return () => clearTimeout(timer); }, [resetNotice]);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError || (e instanceof Error && e.name === "NativeGoogleSignInError") ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => {
    setCredentialAutoFillActive(false);
    stopPasskeyAutoFill();
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
  if (step === "email") return <EmailScreen initialEmail={email} onBack={() => initialStep === "email" ? router.back() : setStep("welcome")} onContinue={requestCode} onCredentialReady={prepareCredentialAutoFill} onCredentialFocus={handleCredentialFocus} loading={loading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen notice={resetNotice} onBack={() => { setProof(""); setResetNotice(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { setResetNotice(""); const result = await authApi.password(email, password); if ("requiresTwoFactor" in result) { setTwoFactorOrigin("password"); setChallengeToken(result.challengeToken); setStep("twoFactor"); } else setStep("success"); })} onForgot={() => void run(async () => { setResetNotice(""); await authApi.sendForgotPasswordCode(email, proof); setStep("forgotPassword"); })} loading={loading} error={error} />;
  if (step === "forgotPassword") return <ForgotPasswordScreen email={email} onBack={() => setStep("password")} onResend={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); })} onReset={(input) => void run(async () => { await authApi.resetForgotPassword({ email, ...input }); setProof(""); setResetNotice("Password reset. Sign in again."); setStep("password"); })} loading={loading} error={error} />;
  if (step === "twoFactor") return <TwoFactorLoginScreen onBack={() => { setChallengeToken(""); setError(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); }} onVerify={(code) => void run(async () => { try { await authApi.twoFactor(challengeToken, code); setStep("success"); } catch (twoFactorError) { if (isTerminalTwoFactorError(twoFactorError)) { setChallengeToken(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); if (twoFactorOrigin === "password") setResetNotice("Two-factor check expired. Sign in again."); else setError("Two-factor check expired. Try Google sign-in again."); return; } throw twoFactorError; } })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
