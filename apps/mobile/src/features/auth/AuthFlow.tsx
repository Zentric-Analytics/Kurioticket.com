import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { writeOnboardingCompleted } from "../../storage/onboardingStorage";
import { authApi, AuthApiError } from "./authApi";
import { normalizeEmail } from "./authUtils";
import { AuthWelcomeScreen } from "./AuthWelcomeScreen";
import { CreateAccountScreen, EmailScreen, PasswordScreen, SuccessScreen, VerificationScreen } from "./AuthFormScreens";

type Step = "welcome" | "email" | "verify" | "password" | "create" | "success";
export function AuthFlow() {
  const [step, setStep] = useState<Step>("welcome"); const [email, setEmail] = useState(""); const [proof, setProof] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [cooldown, setCooldown] = useState(28);
  const run = async (task: () => Promise<void>) => { if (loading) return; setLoading(true); setError(""); try { await task(); } catch (e) { setError(e instanceof AuthApiError ? e.message : "Something went wrong. Please try again."); } finally { setLoading(false); } };
  const requestCode = (value: string) => void run(async () => { const normalized = normalizeEmail(value); const result = await authApi.requestCode(normalized); setEmail(normalized); setCooldown(result.cooldownSeconds || 28); setStep("verify"); });
  const verify = useCallback((code: string) => { void run(async () => { const result = await authApi.verifyCode(email, code); setProof(result.verificationToken); setStep(result.accountType === "existing" ? "password" : "create"); }); }, [email, loading]);
  const done = () => { void writeOnboardingCompleted().finally(() => router.replace("/")); };
  if (step === "welcome") return <AuthWelcomeScreen busy={loading} onEmail={() => setStep("email")} onGoogle={() => Alert.alert("Google sign-in unavailable", "Native Google OAuth client configuration is required before secure sign-in can begin.")} onGuest={() => void writeOnboardingCompleted().then(() => router.replace("/"))} />;
  if (step === "email") return <EmailScreen initialEmail={email} onBack={() => setStep("welcome")} onContinue={requestCode} loading={loading} error={error} />;
  if (step === "verify") return <VerificationScreen email={email} onBack={() => setStep("email")} onDifferentEmail={() => setStep("email")} onVerify={verify} onResend={() => requestCode(email)} loading={loading} error={error} initialCooldown={cooldown} />;
  if (step === "password") return <PasswordScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(password) => void run(async () => { await authApi.password(email, password); setStep("success"); })} onForgot={() => void run(async () => { await authApi.forgotPassword(email); Alert.alert("Check your email", "If an account exists, we sent password reset instructions."); })} loading={loading} error={error} />;
  if (step === "create") return <CreateAccountScreen onBack={() => { setProof(""); setStep("verify"); }} onSubmit={(name, phone) => void run(async () => { await authApi.register({ email, name, phone, verificationToken: proof }); setStep("success"); })} loading={loading} error={error} />;
  return <SuccessScreen onDone={done} />;
}
