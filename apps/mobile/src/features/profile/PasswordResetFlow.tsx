import { useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { TravelApiError } from "../../api/travelApi";
import { securityPasswordResetApi } from "../../api/securityPasswordResetApi";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";

type Props = {
  copy: SecurityCopy;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

export function PasswordResetFlow({ copy: c, onUnauthorized, onSuccess }: Props) {
  const { theme } = useAppTheme();
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  const sendCode = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await securityPasswordResetApi.sendCode();
      setStage("verify");
      setMessage("A 6-digit verification code was sent to your verified account email. It expires in 5 minutes.");
      AccessibilityInfo.announceForAccessibility("Verification code sent.");
    } catch (e) {
      if (!await onUnauthorized(e)) setError(e instanceof TravelApiError ? e.message : c.loadError);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (submitting) return;
    if (!/^\d{6}$/.test(code)) { setError(c.codeInvalid); return; }
    if (newPassword.length < 8 || newPassword !== confirmPassword) { setError(c.passwordInvalid); return; }
    setSubmitting(true);
    setError("");
    try {
      await securityPasswordResetApi.reset({ code, newPassword, confirmPassword });
      AccessibilityInfo.announceForAccessibility(c.passwordSuccess);
      await onSuccess();
    } catch (e) {
      if (!await onUnauthorized(e)) setError(e instanceof TravelApiError ? e.message : c.loadError);
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "request") {
    return <View style={styles.form}>
      <Text style={{ color: theme.muted }}>{c.oauth}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button label={submitting ? c.sendingCode : c.sendCode} disabled={submitting} onPress={() => void sendCode()} />
    </View>;
  }

  return <View style={styles.form}>
    {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TextInput accessibilityLabel={c.verificationCode} keyboardType="number-pad" maxLength={6} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ""))} placeholder={c.verificationCode} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <TextInput accessibilityLabel={c.next} secureTextEntry={!visible} value={newPassword} onChangeText={setNewPassword} placeholder={c.next} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <TextInput accessibilityLabel={c.confirm} secureTextEntry={!visible} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={c.confirm} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? c.hide : c.show} onPress={() => setVisible((value) => !value)} style={styles.textAction}><Text style={styles.link}>{visible ? c.hide : c.show}</Text></Pressable>
    <Text style={{ color: theme.muted }}>{c.passwordRules}</Text>
    <Button label={submitting ? c.resetting : c.resetPassword} disabled={submitting || code.length !== 6 || newPassword.length < 8 || confirmPassword.length < 8} onPress={() => void resetPassword()} />
    <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void sendCode()} style={styles.textAction}><Text style={styles.link}>{c.resendCode}</Text></Pressable>
  </View>;
}

function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" },
  link: { color: "#1769E0", fontWeight: "700" },
  button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  buttonText: { color: "white", fontWeight: "800" },
  error: { color: "#B42318", fontWeight: "600" },
  success: { color: "#067647", fontWeight: "600" },
  pressed: { opacity: 0.65 },
});
