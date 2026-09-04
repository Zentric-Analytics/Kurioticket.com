import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, ForgotPasswordScreen, PasswordScreen, SuccessScreen, TwoFactorLoginScreen, VerificationScreen } from "./AuthFormScreens";
import { requireGoogleWebClientId } from "./googleConfig";
import { getNativePasskey, isNativePasskeySupported, isPasskeyCancellation, isPasskeyNoCredential } from "../passkeys/nativePasskeys";

type Step = "welcome" | "email" | "verify" | "password" | "forgotPassword" | "twoFactor" | "create" | "success";
type TwoFactorOrigin = "password" | "google";
export function isTerminalTwoFactorError(error: unknown) { return error instanceof AuthApiError && (error.status === 410 || error.status === 429); }
export function AuthFlow({ initialStep = "welcome", successRoute = "/" }: { initialStep?: "welcome" | "email"; successRoute?: "/" | import("./signInIntent").ProtectedRoute } = {}) {
  const [step, setStep] = useState<Step>(initialStep); const [passkeySupported, setPasskeySupported] = useState(false); const [passkeyLoading, setPasskeyLoading] = useState(false); const passkeyAttempt = useRef(0); const passkeyController = useRef<AbortController | null>(null); const passkeyBusy = useRef(false); const [email, setEmail] = useState(""); const [challengeToken, setChallengeToken] = useState(""); const [twoFactorOrigin, setTwoFactorOrigin] = useState<TwoFactorOrigin>("password"); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28); const [forceGoogleAccountSelection, setForceGoogleAccountSelection] = useState(false); const [resetNotice, setResetNotice] = useState("");
  useEffect(() => {
    let current = true;
    void isNativePasskeySupported().then((supported) => { if (current) setPasskeySupported(supported); });
    return () => { current = false; passkeyAttempt.current += 1; passkeyController.current?.abort(); };
  }, []);
  useEffect(() => {
    if (step === "email") return;
    passkeyAttempt.current += 1;
    passkeyController.current?.abort();
    passkeyController.current = null;
    passkeyBusy.current = false;
    setPasskeyLoading(false);
  }, [step]);
  useEffect(() => { if (!resetNotice) return; const timer = setTimeout(() => setResetNotice(""), 2000); return () => clearTimeout(timer); }, [resetNotice]);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError || (e instanceof Error && e.name === "NativeGoogleSignInError") ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => void run(async () => { const normalized = normalizeEmail(value); const result = await authApi.requestCode(normalized); setEmail(normalized); setCooldown(result.cooldownSeconds || 28); setStep("verify"); });
  const verify = useCallback((code: string) => { void run(async () => { const result = await authApi.verifyCode(email, code); setProof(result.verificationToken); setStep(result.accountType === "existing" ? "password" : "create"); }); }, [email, loading]);
  const done = useCallback(() => {
    void writeOnboardingCompleted().finally(() => router.dismissTo(successRoute));
  }, [successRoute]);
  const continuePasskey = () => {
    if (passkeyBusy.current || step !== "email") return;
    passkeyBusy.current = true;
    const generation = ++passkeyAttempt.current;
    const controller = new AbortController();
    passkeyController.current?.abort();
    passkeyController.current = controller;
    setPasskeyLoading(true); setError("");
    void (async () => {
      try {
        const { options } = await authApi.passkeyOptions(controller.signal);
        if (generation !== passkeyAttempt.current) return;
        const assertion = await getNativePasskey(options, controller.signal);
        if (!assertion || generation !== passkeyAttempt.current) return;
        await authApi.passkeyVerify(assertion, controller.signal);
        if (generation === passkeyAttempt.current) setStep("success");
      } catch (passkeyError) {
        if (generation !== passkeyAttempt.current || isPasskeyCancellation(passkeyError)) return;
        if (isPasskeyNoCredential(passkeyError)) setError("No Kurioticket passkey was found on this device. Continue with email instead.");
        else if (passkeyError instanceof AuthApiError && passkeyError.status === 429) setError("Too many passkey attempts. Please wait and try again.");
        else setError(passkeyError instanceof AuthApiError ? passkeyError.message : "Passkey sign-in could not be completed. Continue with email instead.");
      } finally {
        if (generation === passkeyAttempt.current) { passkeyBusy.current = false; passkeyController.current = null; setPasskeyLoading(false); }
      }
    })();
  };
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
  if (step === "email") return <EmailScreen initialEmail={email} onBack={() => initialStep === "email" ? router.back() : setStep("welcome")} onContinue={requestCode} onPasskey={passkeySupported ? continuePasskey : undefined} loading={loading} passkeyLoading={passkeyLoading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen notice={resetNotice} onBack={() => { setProof(""); setResetNotice(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { setResetNotice(""); const result = await authApi.password(email, password); if ("requiresTwoFactor" in result) { setTwoFactorOrigin("password"); setChallengeToken(result.challengeToken); setStep("twoFactor"); } else setStep("success"); })} onForgot={() => void run(async () => { setResetNotice(""); await authApi.sendForgotPasswordCode(email, proof); setStep("forgotPassword"); })} loading={loading} error={error} />;
  if (step === "forgotPassword") return <ForgotPasswordScreen email={email} onBack={() => setStep("password")} onResend={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); })} onReset={(input) => void run(async () => { await authApi.resetForgotPassword({ email, ...input }); setProof(""); setResetNotice("Password reset. Sign in again."); setStep("password"); })} loading={loading} error={error} />;
  if (step === "twoFactor") return <TwoFactorLoginScreen onBack={() => { setChallengeToken(""); setError(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); }} onVerify={(code) => void run(async () => { try { await authApi.twoFactor(challengeToken, code); setStep("success"); } catch (twoFactorError) { if (isTerminalTwoFactorError(twoFactorError)) { setChallengeToken(""); setStep(twoFactorOrigin === "google" ? "welcome" : "password"); if (twoFactorOrigin === "password") setResetNotice("Two-factor check expired. Sign in again."); else setError("Two-factor check expired. Try Google sign-in again."); return; } throw twoFactorError; } })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
