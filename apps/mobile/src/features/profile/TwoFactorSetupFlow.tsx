import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { TwoFactorSetup } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import type { SecurityCopy } from "./securityLocalization";
import { twoFactorPolishCopy } from "./twoFactorPolishCopy";

type Props = {
  active: boolean;
  copy: SecurityCopy;
  setup: TwoFactorSetup | null;
  recoveryCodes: string[];
  authenticatorCode: string;
  error: string;
  submitting: boolean;
  onStart: () => void;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function TwoFactorSetupFlow({ active, copy: c, setup, recoveryCodes, authenticatorCode, error, submitting, onStart, onCodeChange, onConfirm, onClose }: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const p = twoFactorPolishCopy[locale];

  if (!active) return null;

  if (recoveryCodes.length) {
    return <View style={styles.form}>
      <View style={styles.statusHeading}>
        <View style={styles.checkCircle}><Text style={styles.checkText}>✓</Text></View>
        <Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{p.enabledTitle}</Text>
      </View>
      <Text style={[styles.supporting, { color: theme.muted }]}>{c.recoveryHelp}</Text>
      <View style={styles.recoveryGrid}>
        {recoveryCodes.map((code) => <View key={code} style={[styles.recoveryCode, { borderColor: theme.border, backgroundColor: theme.surface }]}><Text selectable style={[styles.recoveryCodeText, { color: theme.text }]}>{code}</Text></View>)}
      </View>
      <Text style={[styles.copyHint, { color: theme.muted }]}>{p.copyHint}</Text>
      <PrimaryButton label={p.savedCodesAction} onPress={onClose} />
    </View>;
  }

  if (!setup) {
    return <View style={styles.form}>
      <Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{c.twoFactor}</Text>
      <Text style={[styles.supporting, { color: theme.muted }]}>{c.twoFactorSetupHelp}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={c.setupTwoFactor} loading={submitting} disabled={submitting} onPress={onStart} />
    </View>;
  }

  return <View style={styles.form}>
    <Text accessibilityRole="header" style={[styles.stageTitle, { color: theme.text }]}>{p.setupTitle}</Text>
    <Text style={[styles.supporting, { color: theme.muted }]}>{c.scanQrInstructions}</Text>
    <View accessible accessibilityRole="image" accessibilityLabel={c.twoFactorQrAccessibilityLabel} style={styles.qrCode}>
      <QRCode value={setup.otpauthUri} size={200} quietZone={12} backgroundColor="#FFFFFF" />
    </View>

    <View style={styles.manualBlock}>
      <Text style={[styles.manualTitle, { color: theme.text }]}>{p.cantScan}</Text>
      <Text style={[styles.supporting, { color: theme.muted }]}>{c.manualSetupInstructions}</Text>
      <Text style={[styles.label, { color: theme.text }]}>{p.setupKey}</Text>
      <View style={[styles.keyBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Text selectable style={[styles.setupKey, { color: theme.text }]}>{setup.manualSetupKey}</Text>
      </View>
      <Text style={[styles.copyHint, { color: theme.muted }]}>{p.copyHint}</Text>
    </View>

    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{c.authenticatorCode}</Text>
      <TextInput
        accessibilityLabel={c.authenticatorCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        value={authenticatorCode}
        onChangeText={(value) => onCodeChange(value.replace(/\D/g, ""))}
        placeholder={p.codePlaceholder}
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.text, borderColor: error ? "#B42318" : theme.border, backgroundColor: theme.surface }]}
      />
      <View style={styles.feedbackSlot}>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>
    </View>
    <PrimaryButton label={c.confirmSetup} loading={submitting} disabled={submitting || authenticatorCode.length !== 6} onPress={onConfirm} />
  </View>;
}

function PrimaryButton({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const inactive = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.button, inactive && styles.buttonDisabled, pressed && !inactive && styles.pressed]}><View style={styles.buttonContent}><Text style={styles.buttonText}>{label}</Text>{loading ? <ActivityIndicator size="small" color="white" /> : null}</View></Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  stageTitle: { fontSize: 20, lineHeight: 27, fontWeight: "800" },
  supporting: { fontSize: 15, lineHeight: 22 },
  statusHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E9F7EF", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#067647", fontSize: 17, fontWeight: "900" },
  qrCode: { alignSelf: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, marginVertical: 4 },
  manualBlock: { gap: 8, marginTop: 2 },
  manualTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  keyBox: { minHeight: 54, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, justifyContent: "center" },
  setupKey: { fontSize: 16, lineHeight: 23, fontWeight: "700", letterSpacing: 0.7 },
  copyHint: { fontSize: 12, lineHeight: 18 },
  fieldGroup: { gap: 7, marginTop: 4 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 11, paddingHorizontal: 14, fontSize: 16 },
  feedbackSlot: { minHeight: 20, justifyContent: "center" },
  error: { color: "#B42318", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  recoveryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recoveryCode: { width: "48%", minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 10 },
  recoveryCodeText: { fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  button: { minHeight: 52, borderRadius: 11, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  buttonDisabled: { opacity: 0.55 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800", textAlign: "center" },
  pressed: { opacity: 0.68 },
});
