import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { travelApi, TravelApiError } from "../../api/travelApi";
import { updateStoredSessionEmail } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { signInHref } from "../auth/signInIntent";
import { flowColors } from "../flow/flowStyles";
import { personalDetailsCopy } from "./translations";
import { PersonalDetailsSaveButton } from "./PersonalDetailsSaveButton";
import {
  canRequestEmailChange,
  emailChangeErrorKey,
  normalizedEmail,
} from "./emailChangeModel";

export function PersonalDetailsEmailEditor({
  email,
  onSaved,
  onDirtyChange,
  onBusyChange,
  submissionDisabled = false,
}: {
  email: string;
  onSaved: (email: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  submissionDisabled?: boolean;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = personalDetailsCopy(locale);
  const [newEmail, setNewEmail] = useState(email);
  const [requestedEmail, setRequestedEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [confirmRetryAt, setConfirmRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const mounted = useRef(true);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const changed = normalizedEmail(newEmail) !== normalizedEmail(email);
  useEffect(
    () => onDirtyChange(changed || verifying),
    [changed, verifying, onDirtyChange],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!retryAt && !confirmRetryAt) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (retryAt && Date.now() >= retryAt) setRetryAt(0);
      if (confirmRetryAt && Date.now() >= confirmRetryAt) setConfirmRetryAt(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt, confirmRetryAt]);

  const run = async (action: "request" | "confirm") => {
    if (
      submissionDisabled ||
      pending.current ||
      (action === "request" && remaining > 0) ||
      (action === "confirm" && confirmRetryAt > Date.now())
    )
      return;
    const target = verifying ? requestedEmail : normalizedEmail(newEmail);
    if (action === "request" && !canRequestEmailChange(target, email)) return;
    if (action === "confirm" && !/^\d{6}$/.test(code)) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    Keyboard.dismiss();
    try {
      if (action === "request") {
        const result = await travelApi.requestEmailChange(target);
        if (!mounted.current) return;
        setRequestedEmail(target);
        setVerifying(true);
        setFocused(false);
        setCode("");
        setNow(Date.now());
        setRetryAt(
          Date.now() + Math.max(30, result.cooldownSeconds || 30) * 1000,
        );
        AccessibilityInfo.announceForAccessibility(c.emailCodeSent);
      } else {
        const result = await travelApi.confirmEmailChange(requestedEmail, code);
        // The server is authoritative; a storage write failure must not invite
        // another change after the address was already confirmed.
        await updateStoredSessionEmail(result.email, result.userId).catch(
          () => {},
        );
        if (!mounted.current) return;
        onSaved(result.email);
        AccessibilityInfo.announceForAccessibility(c.emailSaved);
      }
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof TravelApiError && failure.status === 401) {
        router.replace(signInHref("/personal-information"));
        return;
      }
      const apiError = failure instanceof TravelApiError ? failure : null;
      if (apiError?.status === 429) {
        const seconds = Number(apiError.details?.retryAfterSeconds);
        setNow(Date.now());
        (action === "confirm" ? setConfirmRetryAt : setRetryAt)(
          Date.now() +
            (Number.isFinite(seconds) && seconds > 0 ? seconds : 30) * 1000,
        );
      }
      const message =
        c[emailChangeErrorKey(apiError?.status || 0, apiError?.details?.code)];
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      pending.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  };
  return (
    <View style={s.layout}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
      >
        <Text style={[s.help, { color: theme.muted }]}>
          {verifying
            ? `${c.emailCodeSent} ${requestedEmail}`
            : c.emailExplanation}
        </Text>
        <Text style={[s.label, { color: theme.muted }]}>
          {verifying ? c.emailCode : c.email}
        </Text>
        <TextInput
          key={verifying ? "code" : "email"}
          accessibilityLabel={verifying ? c.emailCode : c.email}
          value={verifying ? code : newEmail}
          editable={!busy}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={verifying ? "one-time-code" : "email"}
          textContentType={verifying ? "oneTimeCode" : "emailAddress"}
          keyboardType={verifying ? "number-pad" : "email-address"}
          maxLength={verifying ? 6 : 254}
          returnKeyType="done"
          onSubmitEditing={() => void run(verifying ? "confirm" : "request")}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(value) => {
            setError("");
            if (verifying) setCode(value.replace(/\D/g, "").slice(0, 6));
            else setNewEmail(value);
          }}
          style={[
            s.input,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: focused
                ? flowColors.blue
                : theme.dark
                  ? "#75839B"
                  : "#818A99",
            },
          ]}
        />
        {verifying && (
          <View style={s.links}>
            <Pressable
              disabled={submissionDisabled || busy || remaining > 0}
              accessibilityRole="button"
              accessibilityState={{
                disabled: submissionDisabled || busy || remaining > 0,
              }}
              onPress={() => void run("request")}
              style={s.linkHit}
            >
              <Text
                style={[
                  s.link,
                  { color: remaining > 0 ? theme.muted : flowColors.blue },
                ]}
              >
                {remaining > 0
                  ? `${c.emailResendIn} ${remaining}s`
                  : c.emailResend}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              onPress={() => {
                setVerifying(false);
                setCode("");
                setError("");
              }}
              style={s.linkHit}
            >
              <Text style={s.link}>{c.emailEditAddress}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={s.footer}>
        {!!error && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[s.help, { color: theme.text, marginBottom: 12 }]}
          >
            {error}
          </Text>
        )}
        <PersonalDetailsSaveButton
          label={verifying ? c.save : c.emailSendCode}
          dirty={
            verifying
              ? /^\d{6}$/.test(code)
              : canRequestEmailChange(newEmail, email)
          }
          saving={busy}
          blocked={
            submissionDisabled ||
            (verifying ? confirmRetryAt > now : remaining > 0)
          }
          onSave={() => void run(verifying ? "confirm" : "request")}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  layout: { flex: 1 },
  content: { padding: 20 },
  help: {
    fontFamily: appFonts.regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: { fontFamily: appFonts.medium, fontSize: 13, marginBottom: 8 },
  input: {
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    fontFamily: appFonts.regular,
    fontSize: 16,
  },
  links: { marginTop: 12, alignItems: "flex-start" },
  linkHit: { minHeight: 44, justifyContent: "center" },
  link: { fontFamily: appFonts.medium, fontSize: 14, color: flowColors.blue },
  footer: { padding: 20, paddingTop: 12 },
});
