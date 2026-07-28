import { ReactNode, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthIcon, IconName } from "./AuthIcon";

export const authColors = { blue: "#075BE8", navy: "#061237", text: "#48526A", border: "#D7DCE5", paleBlue: "#EDF4FF", paleGreen: "#E7FAF1", green: "#00A968", danger: "#B42318" };

export function AuthButton({ label, onPress, loading, disabled, secondary, icon }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; icon?: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary ? styles.secondary : styles.primary, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
    <View style={styles.buttonContent}>{icon}{loading ? <ActivityIndicator color={secondary ? authColors.blue : "white"} /> : <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}</View>
  </Pressable>;
}

export function FormShell({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll}>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={onBack} style={styles.back}><AuthIcon name="back" color={authColors.navy} /></Pressable>
    <View style={styles.form}>{children}</View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

export function FormHeading({ icon, title, body, green }: { icon: IconName; title: string; body: ReactNode; green?: boolean }) {
  return <View style={styles.heading}><View style={[styles.iconCircle, green && styles.greenCircle]}><AuthIcon name={icon} color={green ? authColors.green : authColors.blue} size={28} /></View><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>;
}

export function Field({ label, error, right, ...props }: TextInputProps & { label: string; error?: string; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><View style={[styles.fieldBox, focused && styles.focused, error && styles.fieldError]}><TextInput {...props} accessibilityLabel={label} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} placeholderTextColor="#8A93A6" style={styles.input} />{right}</View><Text accessibilityLiveRegion="polite" style={styles.error}>{error || " "}</Text></View>;
}
export function ErrorText({ children }: { children?: string }) { return <Text accessibilityLiveRegion="assertive" style={styles.submitError}>{children || " "}</Text>; }
export function SecurityMessage() { return <View style={styles.security}><AuthIcon name="shield" color={authColors.green} size={18} /><Text style={styles.securityText}>Secure and encrypted</Text></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: "white" }, formScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }, back: { width: 48, height: 48, justifyContent: "center" },
  form: { width: "100%", maxWidth: 520, alignSelf: "center", paddingTop: 22, gap: 10 }, heading: { alignItems: "center", marginBottom: 30 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: authColors.paleBlue, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  greenCircle: { backgroundColor: authColors.paleGreen }, title: { color: authColors.navy, fontSize: 27, lineHeight: 33, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  body: { color: authColors.text, fontSize: 15, lineHeight: 21, textAlign: "center", marginTop: 6 }, fieldWrap: { gap: 6 }, label: { color: authColors.navy, fontSize: 14, fontWeight: "700" },
  fieldBox: { height: 54, borderWidth: 1, borderColor: authColors.border, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  focused: { borderColor: authColors.blue, borderWidth: 2 }, fieldError: { borderColor: authColors.danger }, input: { flex: 1, fontSize: 16, color: authColors.navy, paddingVertical: 0 },
  error: { minHeight: 17, color: authColors.danger, fontSize: 12 }, submitError: { minHeight: 19, color: authColors.danger, fontSize: 13, textAlign: "center" },
  button: { height: 54, borderRadius: 9, justifyContent: "center", paddingHorizontal: 18 }, primary: { backgroundColor: authColors.blue }, secondary: { backgroundColor: "white", borderColor: authColors.border, borderWidth: 1 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, buttonText: { color: "white", fontSize: 16, fontWeight: "700" }, secondaryText: { color: authColors.navy },
  disabled: { opacity: .48 }, pressed: { opacity: .78 }, security: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 8 }, securityText: { color: authColors.green, fontSize: 13, fontWeight: "600" },
});
