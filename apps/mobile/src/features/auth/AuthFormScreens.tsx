import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AuthIcon } from "./AuthIcon";
import { AuthButton, authColors, ErrorText, Field, FormHeading, FormShell, SecurityMessage } from "./AuthPrimitives";
import { formatCountdown, isValidEmail, sanitizeCode } from "./authUtils";

export function EmailScreen({ initialEmail, onBack, onContinue, loading, error }: { initialEmail: string; onBack: () => void; onContinue: (email: string) => void; loading: boolean; error?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const valid = isValidEmail(email);
  return <FormShell onBack={onBack}><FormHeading icon="mail" title="Enter your email" body={"We’ll send you a secure link or code to\nsign in or create your account."} />
    <Field autoFocus label="Email address" placeholder="you@example.com" value={email} onChangeText={setEmail} onBlur={() => setTouched(true)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={() => valid && onContinue(email)} error={touched && !valid ? "Enter a valid email address." : undefined} />
    <ErrorText>{error}</ErrorText><AuthButton label="Continue" onPress={() => onContinue(email)} loading={loading} disabled={!valid} />
    <Text style={styles.legal}>By continuing, you agree to our <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text></Text>
  </FormShell>;
}

export function VerificationScreen({ email, onBack, onVerify, onResend, onDifferentEmail, loading, error, initialCooldown = 28 }: { email: string; onBack: () => void; onVerify: (code: string) => void; onResend: () => void; onDifferentEmail: () => void; loading: boolean; error?: string; initialCooldown?: number }) {
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(initialCooldown);
  const input = useRef<TextInput>(null);
  useEffect(() => { if (seconds <= 0) return; const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(timer); }, [seconds > 0]);
  useEffect(() => { if (code.length === 6) onVerify(code); }, [code, onVerify]);
  const filled = code.length === 6;
  return <FormShell onBack={onBack}><FormHeading green={!filled} icon="send" title={filled ? "Enter verification code" : "Check your email"} body={<>{filled ? "Enter the 6-digit code we sent to" : "We’ve sent a 6-digit code to"}{"\n"}<Text style={styles.email}>{email}</Text></>} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Verification code, ${code.length} of 6 digits entered`} onPress={() => input.current?.focus()} style={styles.codeRow}>
      {Array.from({ length: 6 }, (_, i) => <View key={i} style={[styles.codeBox, i === code.length && !filled && styles.codeFocused]}><Text style={styles.codeDigit}>{code[i] || ""}</Text></View>)}
      <TextInput ref={input} autoFocus value={code} onChangeText={(value) => setCode(sanitizeCode(value))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} style={styles.hiddenInput} />
    </Pressable>
    {filled ? <SecurityMessage /> : null}<ErrorText>{error}</ErrorText>
    <View style={styles.resend}><Text style={styles.muted}>Didn’t receive the code?</Text><Pressable accessibilityRole="button" disabled={seconds > 0 || loading} onPress={() => { onResend(); setSeconds(initialCooldown); }}><Text style={[styles.action, seconds > 0 && styles.muted]}>{seconds > 0 ? `Resend code in ${formatCountdown(seconds)}` : "Resend code"}</Text></Pressable><Pressable accessibilityRole="button" onPress={onDifferentEmail}><Text style={styles.action}>Use a different email</Text></Pressable></View>
  </FormShell>;
}

export function PasswordScreen({ onBack, onSubmit, onForgot, loading, error }: { onBack: () => void; onSubmit: (password: string) => void; onForgot: () => void; loading: boolean; error?: string }) {
  const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false);
  return <FormShell onBack={onBack}><FormHeading icon="lock" title="Welcome back!" body="Enter your password to continue." />
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={() => password && onSubmit(password)} right={<Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} hitSlop={10} onPress={() => setVisible(!visible)}><AuthIcon name={visible ? "eyeOff" : "eye"} color={authColors.navy} size={21} /></Pressable>} />
    <Pressable accessibilityRole="button" onPress={onForgot} style={styles.forgot}><Text style={styles.action}>Forgot password?</Text></Pressable><ErrorText>{error}</ErrorText><AuthButton label="Sign in" onPress={() => onSubmit(password)} loading={loading} disabled={!password} /><SecurityMessage />
  </FormShell>;
}

export function CreateAccountScreen({ onBack, onSubmit, loading, error }: { onBack: () => void; onSubmit: (name: string, phone?: string) => void; loading: boolean; error?: string }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  return <FormShell onBack={onBack}><FormHeading icon="userPlus" title="Create your account" body="Complete a few details to get started." />
    <Field label="Full name" placeholder="John Doe" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name" />
    <Field label="Phone number (optional)" placeholder="+44 20 7946 0958" value={phone} onChangeText={(v) => setPhone(v.replace(/[^\d+ ()-]/g, ""))} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
    <ErrorText>{error}</ErrorText><AuthButton label="Create account" onPress={() => onSubmit(name.trim(), phone.trim() || undefined)} loading={loading} disabled={name.trim().length < 2} /><SecurityMessage />
  </FormShell>;
}

export function SuccessScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { void AccessibilityInfo.announceForAccessibility("Authentication successful. You’re all set."); const timer = setTimeout(onDone, 800); return () => clearTimeout(timer); }, [onDone]);
  return <View style={styles.success}><View style={styles.successCircle}><AuthIcon name="check" color="white" size={58} /></View><Text style={styles.successTitle}>You’re all set!</Text><Text style={styles.successBody}>Welcome to Kurioticket.{"\n"}Let’s explore the world together.</Text><View style={styles.progress}><View style={styles.progressFill} /></View><Text style={styles.muted}>Taking you to your account…</Text></View>;
}
const styles = StyleSheet.create({
  legal: { color: authColors.text, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 12 }, link: { color: authColors.blue, textDecorationLine: "underline" }, email: { color: authColors.navy, fontWeight: "800" },
  codeRow: { height: 58, flexDirection: "row", justifyContent: "center", gap: 8, position: "relative" }, codeBox: { width: 45, height: 52, borderWidth: 1, borderColor: authColors.border, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  codeFocused: { borderColor: authColors.blue, borderWidth: 2 }, codeDigit: { color: authColors.navy, fontSize: 22, fontWeight: "700" }, hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  resend: { alignItems: "center", gap: 11, marginTop: 14 }, muted: { color: authColors.text, fontSize: 14 }, action: { color: authColors.blue, fontSize: 14, fontWeight: "600" }, forgot: { alignSelf: "flex-end", marginTop: -8 },
  success: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center", padding: 28 }, successCircle: { width: 106, height: 106, borderRadius: 53, backgroundColor: "#10BF78", alignItems: "center", justifyContent: "center", shadowColor: "#10BF78", shadowOpacity: .2, shadowRadius: 15 },
  successTitle: { color: authColors.navy, fontSize: 28, fontWeight: "800", marginTop: 28 }, successBody: { color: authColors.text, fontSize: 16, lineHeight: 23, textAlign: "center", marginTop: 6 }, progress: { width: 190, height: 3, backgroundColor: "#E5EAF1", marginVertical: 38 }, progressFill: { width: "82%", height: 3, backgroundColor: authColors.blue },
});
