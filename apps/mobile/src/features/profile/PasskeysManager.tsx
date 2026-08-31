import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { travelApi, TravelApiError, type MobilePasskey } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";
import { flowColors } from "../flow/flowStyles";
import { formatSecurityDate } from "./securityLocalization";
import { passkeyCopyForLocale } from "./passkeyLocalization";
import {
  createNativePasskey,
  defaultPasskeyName,
  isNativePasskeySupported,
  isPasskeyCancellation,
} from "./nativePasskeys";

type Purpose = "setup" | "removal";
type Stage = "list" | "verify" | "rename";

type Props = {
  active: boolean;
  passkeys: MobilePasskey[];
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  onReload: () => Promise<void>;
  onUnauthorized: (error: unknown) => Promise<boolean>;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
};

export function PasskeysManager({
  active,
  passkeys,
  hasPassword,
  twoFactorEnabled,
  onReload,
  onUnauthorized,
  onError,
  onMessage,
}: Props) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const copy = passkeyCopyForLocale(locale);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("list");
  const [purpose, setPurpose] = useState<Purpose>("setup");
  const [target, setTarget] = useState<MobilePasskey | null>(null);
  const [verification, setVerification] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const nativeAbort = useRef<AbortController | null>(null);

  const clearSensitive = useCallback(() => {
    nativeAbort.current?.abort();
    nativeAbort.current = null;
    setVerification("");
    setEmailCodeSent(false);
    setRenameValue("");
    setTarget(null);
    setPurpose("setup");
    setBusy(false);
  }, []);

  const cancelFlow = useCallback(() => {
    request.current += 1;
    clearSensitive();
    onError("");
    onMessage("");
    setStage("list");
  }, [clearSensitive, onError, onMessage]);

  useEffect(() => {
    const current = ++request.current;
    if (!active) {
      clearSensitive();
      setSupported(null);
      setStage("list");
      return;
    }
    onError("");
    onMessage("");
    void isNativePasskeySupported().then((value) => {
      if (current === request.current) setSupported(value);
    });
    return () => {
      request.current += 1;
      nativeAbort.current?.abort();
      nativeAbort.current = null;
    };
  }, [active, clearSensitive, onError, onMessage]);

  const beginVerification = (nextPurpose: Purpose, item: MobilePasskey | null = null) => {
    request.current += 1;
    clearSensitive();
    onError("");
    onMessage("");
    setPurpose(nextPurpose);
    setTarget(item);
    setStage("verify");
  };

  const fail = async (error: unknown, fallback: string, current: number) => {
    if (current !== request.current) return;
    if (await onUnauthorized(error)) return;
    if (current !== request.current) return;
    onError(error instanceof TravelApiError ? error.message : fallback);
  };

  const finish = async (message: string, current: number) => {
    if (current !== request.current) return;
    Keyboard.dismiss();
    clearSensitive();
    setStage("list");
    onError("");
    onMessage(message);
    AccessibilityInfo.announceForAccessibility(message);
    await onReload();
  };

  const registerPasskey = async (reauthToken: string, current: number) => {
    const result = await travelApi.passkeyRegistrationOptions(reauthToken);
    if (current !== request.current) return;
    const controller = new AbortController();
    nativeAbort.current = controller;
    const response = await createNativePasskey(result.options, controller.signal);
    nativeAbort.current = null;
    if (current !== request.current) return;
    if (!response) {
      clearSensitive();
      setStage("list");
      return;
    }
    await travelApi.verifyPasskeyRegistration({
      name: defaultPasskeyName({ ios: copy.iosDefaultName, android: copy.androidDefaultName }),
      response,
    });
    await finish(copy.added, current);
  };

  const removePasskey = async (reauthToken: string, current: number) => {
    if (!target) throw new Error(copy.operationFailed);
    await travelApi.removePasskey(target.id, reauthToken);
    await finish(copy.removed, current);
  };

  const submitVerification = async () => {
    if (busy) return;
    const value = twoFactorEnabled || !hasPassword ? verification.trim() : verification;
    if (!value) {
      onError(copy.verificationRequired);
      return;
    }
    const current = ++request.current;
    setBusy(true);
    onError("");
    onMessage("");
    try {
      const result = await travelApi.passkeyReauth({
        action: "verify",
        purpose,
        ...(twoFactorEnabled || !hasPassword ? { code: value } : { password: value }),
      });
      if (current !== request.current) return;
      if (!result.reauthToken) throw new Error(copy.verificationRequired);
      if (purpose === "setup") await registerPasskey(result.reauthToken, current);
      else await removePasskey(result.reauthToken, current);
    } catch (error) {
      if (isPasskeyCancellation(error)) {
        if (current === request.current) cancelFlow();
      } else {
        await fail(error, purpose === "setup" ? copy.registrationFailed : copy.operationFailed, current);
      }
    } finally {
      if (current === request.current) setBusy(false);
    }
  };

  const sendEmailCode = async () => {
    if (busy) return;
    const current = ++request.current;
    setBusy(true);
    onError("");
    onMessage("");
    try {
      await travelApi.passkeyReauth({ action: "send-email-code", purpose });
      if (current !== request.current) return;
      setEmailCodeSent(true);
      onMessage(copy.emailCodeSent);
      AccessibilityInfo.announceForAccessibility(copy.emailCodeSent);
    } catch (error) {
      await fail(error, copy.operationFailed, current);
    } finally {
      if (current === request.current) setBusy(false);
    }
  };

  const beginRename = (item: MobilePasskey) => {
    request.current += 1;
    clearSensitive();
    onError("");
    onMessage("");
    setTarget(item);
    setRenameValue(item.name);
    setStage("rename");
  };

  const saveRename = async () => {
    if (busy || !target) return;
    const name = renameValue.trim();
    if (!name || name.length > 80) {
      onError(copy.invalidName);
      return;
    }
    const current = ++request.current;
    setBusy(true);
    onError("");
    try {
      await travelApi.renamePasskey(target.id, name);
      await finish(copy.renamed, current);
    } catch (error) {
      await fail(error, copy.operationFailed, current);
    } finally {
      if (current === request.current) setBusy(false);
    }
  };

  const confirmRemoval = (item: MobilePasskey) => {
    Alert.alert(copy.removeTitle, copy.removeBody, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.remove, style: "destructive", onPress: () => beginVerification("removal", item) },
    ]);
  };

  if (stage === "rename") {
    return <View style={styles.form}>
      <Text style={[styles.heading, { color: theme.text }]}>{copy.renameTitle}</Text>
      <TextInput
        accessibilityLabel={copy.passkeyName}
        autoCapitalize="sentences"
        maxLength={80}
        value={renameValue}
        onChangeText={(value) => { setRenameValue(value); onError(""); }}
        placeholder={copy.passkeyName}
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <ActionButton label={copy.saveName} loading={busy} disabled={busy} onPress={() => void saveRename()} />
      <TextAction label={copy.backToPasskeys} onPress={cancelFlow} />
    </View>;
  }

  if (stage === "verify") {
    const usesEmail = !twoFactorEnabled && !hasPassword;
    const help = twoFactorEnabled ? copy.verifyTotp : hasPassword ? copy.verifyPassword : copy.verifyEmail;
    const verificationLabel = usesEmail || twoFactorEnabled ? copy.verificationCode : copy.currentPassword;
    return <View style={styles.form}>
      <Text style={[styles.heading, { color: theme.text }]}>{copy.verifyTitle}</Text>
      <Text style={[styles.detail, { color: theme.muted }]}>{help}</Text>
      {usesEmail && !emailCodeSent ?
        <ActionButton label={copy.sendEmailCode} loading={busy} disabled={busy} onPress={() => void sendEmailCode()} /> :
        <>
          <TextInput
            accessibilityLabel={verificationLabel}
            keyboardType={usesEmail ? "number-pad" : "default"}
            maxLength={usesEmail ? 6 : undefined}
            secureTextEntry={!usesEmail && !twoFactorEnabled}
            autoCapitalize="none"
            value={verification}
            onChangeText={(value) => { setVerification(value); onError(""); }}
            placeholder={verificationLabel}
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          />
          <ActionButton label={copy.continue} loading={busy} disabled={busy} onPress={() => void submitVerification()} />
        </>}
      <TextAction label={copy.backToPasskeys} onPress={cancelFlow} />
    </View>;
  }

  return <View style={styles.form}>
    <ActionButton
      label={copy.addPasskey}
      loading={supported === null}
      disabled={supported !== true || busy}
      onPress={() => beginVerification("setup")}
    />
    {supported === null ? <Text style={[styles.detail, { color: theme.muted }]}>{copy.checkingSupport}</Text> : null}
    {supported === false ? <Text accessibilityRole="alert" style={[styles.detail, { color: theme.muted }]}>{copy.unsupported}</Text> : null}
    {!passkeys.length ? <Text style={[styles.detail, { color: theme.muted }]}>{copy.noPasskeys}</Text> : null}
    {passkeys.map((item) => <View key={item.id} style={[styles.passkey, { borderBottomColor: theme.border }]}>
      <Text style={[styles.heading, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.detail, { color: theme.muted }]}>{item.label}</Text>
      <Text style={[styles.detail, { color: theme.muted }]}>{copy.created} {formatSecurityDate(item.createdAt, locale)}</Text>
      <Text style={[styles.detail, { color: theme.muted }]}>{copy.lastUsed}: {item.lastUsedAt ? formatSecurityDate(item.lastUsedAt, locale) : copy.neverUsed}</Text>
      <View style={styles.actions}>
        <TextAction label={copy.rename} onPress={() => beginRename(item)} />
        <TextAction label={copy.remove} destructive onPress={() => confirmRemoval(item)} />
      </View>
    </View>)}
  </View>;
}

function ActionButton({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const inactive = disabled || loading;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: inactive, busy: loading }}
    disabled={inactive}
    onPress={onPress}
    style={({ pressed }) => [styles.button, inactive && styles.disabled, pressed && styles.pressed]}
  >
    <View style={styles.buttonContent}>
      <Text style={styles.buttonText}>{label}</Text>
      {loading ? <ActivityIndicator size="small" color="white" /> : null}
    </View>
  </Pressable>;
}

function TextAction({ label, onPress, destructive = false }: { label: string; onPress: () => void; destructive?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
    <Text style={[styles.actionText, destructive && styles.destructive]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  detail: { fontSize: 14, lineHeight: 20 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.65 },
  passkey: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, gap: 5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 4 },
  textAction: { minHeight: 44, justifyContent: "center" },
  actionText: { color: "#1769E0", fontWeight: "700" },
  destructive: { color: flowColors.red },
});
