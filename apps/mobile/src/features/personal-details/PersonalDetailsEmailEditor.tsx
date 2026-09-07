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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newEmail, setNewEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [ownershipProof, setOwnershipProof] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [confirmRetryAt, setConfirmRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const mounted = useRef(true);
  const started = useRef(false);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const isCodeStep = step !== 2;
  useEffect(
    () => onDirtyChange(step > 1 || code.length > 0),
    [step, code, onDirtyChange],
  );
  useEffect(() => {
    mounted.current = true;
    if (!started.current && !submissionDisabled) {
      started.current = true;
      void run("request");
    }
    return () => {
      mounted.current = false;
    };
  }, [submissionDisabled]);
  useEffect(() => {
    if (!retryAt && !confirmRetryAt) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (retryAt && time >= retryAt) setRetryAt(0);
      if (confirmRetryAt && time >= confirmRetryAt) setConfirmRetryAt(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt, confirmRetryAt]);

  async function run(action: "request" | "confirm") {
    if (
      submissionDisabled ||
      pending.current ||
      (action === "request" && remaining > 0) ||
      (action === "confirm" && confirmRetryAt > Date.now())
    )
      return;
    const target = step === 3 ? requestedEmail : normalizedEmail(newEmail);
    if (
      action === "request" &&
      step !== 1 &&
      !canRequestEmailChange(target, email)
    )
      return;
    if (action === "confirm" && !/^\d{6}$/.test(code)) return;
    pending.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (action === "request") {
        const result =
          step === 1
            ? await travelApi.requestCurrentEmailCode()
            : await travelApi.requestEmailChange(target, ownershipProof);
        if (!mounted.current) return;
        if (step !== 1) {
          setRequestedEmail(target);
          setStep(3);
        }
        setCodeSent(true);
        setCode("");
        setNow(Date.now());
        setRetryAt(
          Date.now() + Math.max(30, result.cooldownSeconds || 30) * 1000,
        );
        AccessibilityInfo.announceForAccessibility(c.emailCodeSent);
      } else if (step === 1) {
        const result = await travelApi.verifyCurrentEmailCode(code);
        if (!mounted.current) return;
        setOwnershipProof(result.ownershipProof);
        setStep(2);
        setCode("");
        setCodeSent(false);
        setRetryAt(0);
        setConfirmRetryAt(0);
        AccessibilityInfo.announceForAccessibility(c.emailEnterNew);
      } else {
        const result = await travelApi.confirmEmailChange(
          requestedEmail,
          code,
          ownershipProof,
        );
        await updateStoredSessionEmail(result.email, result.userId).catch(
          () => {},
        );
        if (!mounted.current) return;
        Keyboard.dismiss();
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
      if (apiError?.details?.code === "OWNERSHIP_REQUIRED") {
        setStep(1);
        setOwnershipProof("");
        setCode("");
        setCodeSent(false);
        setRetryAt(0);
        setConfirmRetryAt(0);
        setError(c.emailRestart);
        AccessibilityInfo.announceForAccessibility(c.emailRestart);
        return;
      }
      if (apiError?.status === 429) {
        const seconds = Number(apiError.details?.retryAfterSeconds);
        setNow(Date.now());
        (action === "confirm" ? setConfirmRetryAt : setRetryAt)(
          Date.now() +
            (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000,
        );
        // A code from a prior opening can still be entered during resend cooldown.
        if (step === 1 && action === "request") setCodeSent(true);
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
  }
  const borderColor = theme.dark ? "#75839B" : "#818A99";
  return (
    <View style={s.layout}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
      >
        <Text style={[s.step, { color: theme.muted }]}>
          {c.emailStep.replace("{step}", String(step))}
        </Text>
        <Text
          accessibilityRole="header"
          style={[s.title, { color: theme.text }]}
        >
          {step === 1
            ? c.emailVerifyCurrent
            : step === 2
              ? c.emailEnterNew
              : c.emailVerifyNew}
        </Text>
        <Text style={[s.help, { color: theme.text }]}>
          {isCodeStep
            ? codeSent
              ? c.emailCodeSent + " " + (step === 1 ? email : requestedEmail)
              : busy
                ? c.emailSending
                : c.emailVerifyCurrent
            : c.emailNewHelp}
        </Text>
        {isCodeStep ? (
          <View style={s.codeArea}>
            <View pointerEvents="none" accessible={false} style={s.boxes}>
              {Array.from({ length: 6 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    s.box,
                    {
                      backgroundColor: theme.surface,
                      borderColor:
                        focused && index === Math.min(code.length, 5)
                          ? flowColors.blue
                          : borderColor,
                      borderWidth:
                        focused && index === Math.min(code.length, 5) ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={[s.digit, { color: theme.text }]}>
                    {code[index] || ""}
                  </Text>
                </View>
              ))}
            </View>
            <TextInput
              key={String(step) + String(codeSent)}
              autoFocus
              accessibilityLabel={c.emailCode}
              value={code}
              editable={!busy}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              keyboardType="number-pad"
              maxLength={6}
              caretHidden
              selectionColor="transparent"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              onSubmitEditing={() => void run("confirm")}
              style={s.codeInput}
            />
          </View>
        ) : (
          <>
            <Text style={[s.label, { color: theme.text }]}>{c.email}</Text>
            <TextInput
              key="new-email"
              autoFocus
              accessibilityLabel={c.email}
              value={newEmail}
              placeholder={c.emailNewPlaceholder}
              placeholderTextColor={theme.muted}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              maxLength={254}
              returnKeyType="done"
              onSubmitEditing={() => void run("request")}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChangeText={(value) => {
                setNewEmail(value);
                setError("");
              }}
              style={[
                s.input,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: focused ? flowColors.blue : borderColor,
                },
              ]}
            />
            <Text style={[s.note, { color: theme.muted }]}>
              {c.emailNextHelp}
            </Text>
          </>
        )}
        {isCodeStep && (
          <View style={s.links}>
            <Text style={[s.note, { color: theme.text }]}>
              {c.emailDeliveryHelp}
            </Text>
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
                  ? c.emailResendIn + " " + remaining + "s"
                  : codeSent
                    ? c.emailResend
                    : c.emailSendCode}
              </Text>
            </Pressable>
            {step === 3 && (
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                onPress={() => {
                  setStep(2);
                  setCode("");
                  setError("");
                }}
                style={s.linkHit}
              >
                <Text style={s.link}>{c.emailEditAddress}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
      <View style={s.footer}>
        {!!error && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[s.note, { color: theme.text, marginBottom: 12 }]}
          >
            {error}
          </Text>
        )}
        <PersonalDetailsSaveButton
          label={c.emailContinue}
          dirty={
            isCodeStep
              ? codeSent && /^\d{6}$/.test(code)
              : canRequestEmailChange(newEmail, email)
          }
          saving={busy}
          blocked={
            submissionDisabled ||
            (isCodeStep ? confirmRetryAt > now : remaining > 0)
          }
          onSave={() => void run(isCodeStep ? "confirm" : "request")}
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  layout: { flex: 1 },
  content: { padding: 20, paddingTop: 28 },
  step: { fontFamily: appFonts.medium, fontSize: 13, marginBottom: 16 },
  title: {
    fontFamily: appFonts.semibold,
    fontSize: 22,
    lineHeight: 29,
    marginBottom: 20,
  },
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
  codeArea: { height: 52 },
  boxes: { flexDirection: "row", gap: 10, height: 52 },
  box: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  digit: { fontFamily: appFonts.medium, fontSize: 22 },
  codeInput: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: 1,
  },
  note: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 16,
  },
  links: { marginTop: 8 },
  linkHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { fontFamily: appFonts.medium, fontSize: 14, color: flowColors.blue },
  footer: { padding: 20, paddingTop: 12 },
});
