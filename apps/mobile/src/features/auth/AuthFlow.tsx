import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, ForgotPasswordScreen, PasswordScreen, SuccessScreen, TwoFactorLoginScreen, VerificationScreen } from "./AuthFormScreens";
import { requireGoogleWebClientId } from "./googleConfig";

type Step = "welcome" | "email" | "verify" | "password" | "forgotPassword" | "twoFactor" | "create" | "success";
export function AuthFlow({ initialStep = "welcome", successRoute = "/" }: { initialStep?: "welcome" | "email"; successRoute?: "/" | import("./signInIntent").ProtectedRoute } = {}) {
  const [step, setStep] = useState<Step>(initialStep); const [email, setEmail] = useState(""); const [challengeToken, setChallengeToken] = useState(""); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28); const [forceGoogleAccountSelection, setForceGoogleAccountSelection] = useState(false);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError || (e instanceof Error && e.name === "NativeGoogleSignInError") ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => void run(async () => { const normalized = normalizeEmail(value); const result = await authApi.requestCode(normalized); setEmail(normalized); setCooldown(result.cooldownSeconds || 28); setStep("verify"); });
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
      if ("requiresTwoFactor" in authResult) { setChallengeToken(authResult.challengeToken); setStep("twoFactor"); return; }
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
  if (step === "email") return <EmailScreen initialEmail={email} onBack={() => initialStep === "email" ? router.back() : setStep("welcome")} onContinue={requestCode} loading={loading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { const result = await authApi.password(email, password); if ("requiresTwoFactor" in result) { setChallengeToken(result.challengeToken); setStep("twoFactor"); } else setStep("success"); })} onForgot={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); setStep("forgotPassword"); })} loading={loading} error={error} />;
  if (step === "forgotPassword") return <ForgotPasswordScreen email={email} onBack={() => setStep("password")} onResend={() => void run(async () => { await authApi.sendForgotPasswordCode(email, proof); })} onReset={(input) => void run(async () => { await authApi.resetForgotPassword({ email, ...input }); setProof(""); setStep("password"); Alert.alert("Password reset", "Your password was reset. Sign in with your new password."); })} loading={loading} error={error} />;
  if (step === "twoFactor") return <TwoFactorLoginScreen onBack={() => { setChallengeToken(""); setStep("password"); }} onVerify={(code) => void run(async () => { await authApi.twoFactor(challengeToken, code); setStep("success"); })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
