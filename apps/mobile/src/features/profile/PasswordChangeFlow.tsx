import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import {
  securityPasswordChangeApi,
  type PasswordChangeChallenge,
} from "../../api/securityPasswordChangeApi";
import { TravelApiError } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";
import { passwordFlowCopy } from "./passwordFlowLocalization";

type Props = {
  active: boolean;
  copy: SecurityCopy;
  recoveryLabel?: string;
  recoveryHelp?: string;
  onRecovery: () => void;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

type PasswordKey = "currentPassword" | "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<PasswordKey, string>>;

function EyeIcon({ hidden, color }: { hidden: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="2.7" fill="none" stroke={color} strokeWidth={1.8} />
      {hidden ? <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={1.8} strokeLinecap="round" /> : null}
    </Svg>
  );
}

function PasswordField({ label, value, hidden, error, onChange, onToggle, showLabel, hideLabel, returnKeyType }: {
  label: string;
  value: string;
  hidden: boolean;
  error?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  returnKeyType?: "next" | "done";
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      <View style={[styles.passwordInputShell, { borderColor: error ? "#B42318" : theme.border, backgroundColor: theme.surface }]}>
        <TextInput accessibilityLabel={label} secureTextEntry={hidden} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType={returnKeyType} style={[styles.passwordInput, { color: theme.text }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={hidden ? `${showLabel}: ${label}` : `${hideLabel}: ${label}`} accessibilityState={{ expanded: !hidden }} hitSlop={8} onPress={onToggle} style={styles.eyeButton}>
          <EyeIcon hidden={hidden} color={theme.muted} />
        </Pressable>
      </View>
      <View style={styles.fieldFeedback}>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, loading && styles.disabled, pressed && !loading && styles.pressed]}><View style={styles.primaryContent}><Text style={styles.primaryText}>{label}</Text>{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}</View></Pressable>;
}

export function PasswordChangeFlow({ active, copy, onRecovery, onUnauthorized, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const f = passwordFlowCopy[locale];
  const requestGeneration = useRef(0);
  const [stage, setStage] = useState<"form" | "verify">("form");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [hidden, setHidden] = useState<Record<PasswordKey, boolean>>({ currentPassword: true, newPassword: true, confirmPassword: true });
  const [challenge, setChallenge] = useState<PasswordChangeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wrongCurrentAttempts, setWrongCurrentAttempts] = useState(0);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [resendUntil, setResendUntil] = useState(0);
  const [resendRemaining, setResendRemaining] = useState(0);

  const clearAll = () => {
    requestGeneration.current += 1;
    setStage("form"); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setHidden({ currentPassword: true, newPassword: true, confirmPassword: true }); setChallenge(null); setCode(""); setFieldErrors({}); setCodeError(""); setGeneralError(""); setMessage(""); setSubmitting(false); setWrongCurrentAttempts(0); setRecoveryAvailable(false); setResendUntil(0); setResendRemaining(0);
  };

  useEffect(() => {
    if (!active) { clearAll(); return; }
    requestGeneration.current += 1; setStage("form"); setFieldErrors({}); setCodeError(""); setGeneralError(""); setMessage(""); setWrongCurrentAttempts(0); setRecoveryAvailable(false);
    return () => { requestGeneration.current += 1; };
  }, [active]);

  useEffect(() => {
    if (!active || stage !== "verify" || !resendUntil) return;
    const update = () => setResendRemaining(Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 250); return () => clearInterval(timer);
  }, [active, resendUntil, stage]);

  const patch = (key: PasswordKey, value: string) => { setPasswords((current) => ({ ...current, [key]: value })); setFieldErrors((current) => ({ ...current, [key]: undefined })); setGeneralError(""); };

  const validateForm = () => {
    const errors: FieldErrors = {};
    if (!passwords.currentPassword) errors.currentPassword = f.currentRequired;
    if (passwords.newPassword.length < 8) errors.newPassword = f.newTooShort;
    else if (passwords.currentPassword && passwords.currentPassword === passwords.newPassword) errors.newPassword = f.newSame;
    if (!passwords.confirmPassword) errors.confirmPassword = f.confirmRequired;
    else if (passwords.newPassword !== passwords.confirmPassword) errors.confirmPassword = f.confirmMismatch;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const start = async () => {
    if (submitting || !validateForm()) return;
    const generation = requestGeneration.current; setSubmitting(true); setGeneralError(""); setMessage("");
    try {
      const result = await securityPasswordChangeApi.start(passwords);
      if (generation !== requestGeneration.current) return;
      Keyboard.dismiss(); setChallenge(result); setPasswords((current) => ({ ...current, currentPassword: "" })); setWrongCurrentAttempts(0); setRecoveryAvailable(false); setCode(""); setCodeError(""); setResendUntil(Date.now() + result.resendAfterSeconds * 1000); setStage("verify"); AccessibilityInfo.announceForAccessibility(f.verifyBody(result.maskedEmail));
    } catch (e) {
      if (generation !== requestGeneration.current || await onUnauthorized(e)) return;
      if (e instanceof TravelApiError) {
        const details = e.details ?? {};
        if (details.field === "newPassword" || e.message.includes("different from your current")) setFieldErrors((current) => ({ ...current, newPassword: f.newSame }));
        else if (details.field === "currentPassword" || e.message.toLowerCase().includes("current password")) {
          const attempts = wrongCurrentAttempts + 1; setWrongCurrentAttempts(attempts); setFieldErrors((current) => ({ ...current, currentPassword: f.currentIncorrect })); if (attempts >= 3) setRecoveryAvailable(true);
        } else setGeneralError(e.message);
      } else setGeneralError(copy.loadError);
    } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  const resend = async () => {
    if (submitting || !challenge || resendRemaining > 0) return;
    const generation = requestGeneration.current; setSubmitting(true); setCodeError(""); setGeneralError(""); setMessage("");
    try {
      const result = await securityPasswordChangeApi.resend({ challengeId: challenge.challengeId, newPassword: passwords.newPassword });
      if (generation !== requestGeneration.current) return;
      setChallenge(result); setCode(""); setResendUntil(Date.now() + result.resendAfterSeconds * 1000); setMessage(f.codeSent); AccessibilityInfo.announceForAccessibility(f.codeSent);
    } catch (e) {
      if (generation !== requestGeneration.current || await onUnauthorized(e)) return;
      if (e instanceof TravelApiError) { const retryAfter = (e as TravelApiError & { retryAfterSeconds?: number }).retryAfterSeconds; if (e.status === 429 && retryAfter) setResendUntil(Date.now() + retryAfter * 1000); if (e.status === 410) { setStage("form"); setChallenge(null); setCode(""); } setGeneralError(e.message); } else setGeneralError(copy.loadError);
    } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  const confirm = async () => {
    if (submitting || !challenge) return;
    if (!/^\d{6}$/.test(code)) { setCodeError(copy.codeInvalid); return; }
    const generation = requestGeneration.current; setSubmitting(true); setCodeError(""); setGeneralError(""); setMessage("");
    try {
      await securityPasswordChangeApi.confirm({ challengeId: challenge.challengeId, code, newPassword: passwords.newPassword, confirmPassword: passwords.confirmPassword });
      if (generation !== requestGeneration.current) return;
      Keyboard.dismiss(); AccessibilityInfo.announceForAccessibility(copy.passwordSuccess); await onSuccess();
    } catch (e) {
      if (generation !== requestGeneration.current || await onUnauthorized(e)) return;
      if (e instanceof TravelApiError && (e.details?.field === "verificationCode" || e.status === 400)) setCodeError(e.message); else setGeneralError(e instanceof TravelApiError ? e.message : copy.loadError);
    } finally { if (generation === requestGeneration.current) setSubmitting(false); }
  };

  if (stage === "verify" && challenge) return <View style={styles.form}><Text style={[styles.supporting, { color: theme.muted }]}>{f.verifyBody(challenge.maskedEmail)}</Text>{generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}<View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: theme.text }]}>{f.codeLabel}</Text><TextInput accessibilityLabel={f.codeLabel} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setCodeError(""); setGeneralError(""); setMessage(""); }} autoFocus style={[styles.codeInput, { color: theme.text, borderColor: codeError ? "#B42318" : theme.border, backgroundColor: theme.surface }]} /><View style={styles.fieldFeedback}>{codeError ? <Text accessibilityRole="alert" style={styles.error}>{codeError}</Text> : null}</View></View><PrimaryButton label={f.verifyChangeAction} loading={submitting} onPress={() => void confirm()} /><Pressable accessibilityRole="button" accessibilityState={{ disabled: resendRemaining > 0 || submitting }} disabled={resendRemaining > 0 || submitting} onPress={() => void resend()} style={({ pressed }) => [styles.resendAction, pressed && resendRemaining === 0 && styles.pressed]}><Text style={[styles.resendText, { color: resendRemaining > 0 ? theme.muted : "#1769E0" }]}>{resendRemaining > 0 ? f.resendIn(resendRemaining) : f.resend}</Text></Pressable><Text style={[styles.expiryHint, { color: theme.muted }]}>{f.expiryHint}</Text></View>;

  return <View style={styles.form}><Text style={[styles.rules, { color: theme.muted }]}>{copy.passwordRules}</Text>{generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}<PasswordField label={copy.current} value={passwords.currentPassword} hidden={hidden.currentPassword} error={fieldErrors.currentPassword} onChange={(value) => patch("currentPassword", value)} onToggle={() => setHidden((current) => ({ ...current, currentPassword: !current.currentPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="next" /><PasswordField label={copy.next} value={passwords.newPassword} hidden={hidden.newPassword} error={fieldErrors.newPassword} onChange={(value) => patch("newPassword", value)} onToggle={() => setHidden((current) => ({ ...current, newPassword: !current.newPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="next" /><PasswordField label={copy.confirm} value={passwords.confirmPassword} hidden={hidden.confirmPassword} error={fieldErrors.confirmPassword} onChange={(value) => patch("confirmPassword", value)} onToggle={() => setHidden((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} showLabel={copy.show} hideLabel={copy.hide} returnKeyType="done" /><PrimaryButton label={copy.change} loading={submitting} onPress={() => void start()} />{recoveryAvailable ? <Pressable accessibilityRole="button" accessibilityLabel={f.tryAnotherWay} onPress={onRecovery} style={styles.recoveryAction}><Text style={styles.link}>{f.tryAnotherWay}</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  form: { gap: 12 }, rules: { fontSize: 14, lineHeight: 21, marginBottom: 2 }, fieldGroup: { gap: 7 }, fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: "700" }, fieldFeedback: { minHeight: 20, justifyContent: "center" }, passwordInputShell: { minHeight: 52, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center" }, passwordInput: { minHeight: 50, flex: 1, fontSize: 16, paddingHorizontal: 13, paddingVertical: 0 }, eyeButton: { width: 48, minHeight: 50, alignItems: "center", justifyContent: "center" }, primaryButton: { minHeight: 52, borderRadius: 11, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", marginTop: 2 }, primaryContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.68 }, error: { color: "#B42318", fontSize: 14, lineHeight: 20, fontWeight: "600" }, success: { color: "#067647", fontSize: 14, lineHeight: 20, fontWeight: "700" }, supporting: { fontSize: 14, lineHeight: 21 }, codeInput: { minHeight: 56, borderWidth: 1, borderRadius: 11, paddingHorizontal: 16, fontSize: 22, fontWeight: "700", letterSpacing: 9, textAlign: "center" }, resendAction: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 8 }, resendText: { fontSize: 14, fontWeight: "700" }, expiryHint: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: -8 }, recoveryAction: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 10 }, link: { color: "#1769E0", fontSize: 15, fontWeight: "800" },
});
