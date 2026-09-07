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
}: {
  email: string;
  onSaved: (email: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
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
  const [requesting, setRequesting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [confirmRetryAt, setConfirmRetryAt] = useState(0);
  const [sendingUntil, setSendingUntil] = useState(0);
  const [sentUntil, setSentUntil] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const mounted = useRef(true);
  const started = useRef(false);
  const remaining = Math.max(
    0,
    Math.ceil((Math.max(retryAt, lockedUntil) - now) / 1000),
  );
  const isCodeStep = step !== 2;
  useEffect(
    () => onDirtyChange(step > 1 || code.length > 0),
    [step, code, onDirtyChange],
  );
  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timeout);
  }, [error]);
  useEffect(() => {
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      void run("request");
    }
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (
      !retryAt &&
      !confirmRetryAt &&
      !sendingUntil &&
      !sentUntil &&
      !lockedUntil
    )
      return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (sendingUntil && time >= sendingUntil) setSendingUntil(0);
      if (sentUntil && time >= sentUntil) setSentUntil(0);
      if (lockedUntil && time >= lockedUntil) setLockedUntil(0);
      if (retryAt && time >= retryAt) setRetryAt(0);
      if (confirmRetryAt && time >= confirmRetryAt) setConfirmRetryAt(0);
    }, 250);
    return () => clearInterval(timer);
  }, [retryAt, confirmRetryAt, sendingUntil, sentUntil, lockedUntil]);

  async function run(action: "request" | "confirm", isResend = false) {
    if (
      pending.current ||
      (action === "request" && (remaining > 0 || lockedUntil > Date.now())) ||
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
    setRequesting(action === "request");
    onBusyChange(true);
    setError("");
    try {
      if (action === "request") {
        setNow(Date.now());
        setCode("");
        setSendingUntil(isResend ? Date.now() + 3000 : 0);
        setSentUntil(0);
        const [result] = await Promise.all([
          (async () =>
            step === 1
              ? await travelApi.requestCurrentEmailCode()
              : await travelApi.requestEmailChange(target, ownershipProof))(),
          isResend
            ? new Promise<void>((resolve) => setTimeout(resolve, 3000))
            : Promise.resolve(),
        ]);
        if (!mounted.current) return;
        if (step !== 1) {
          setRequestedEmail(target);
          setStep(3);
        }
        setSendingUntil(0);
        setSentUntil(isResend ? Date.now() + 1000 : 0);
        setLockedUntil(result.resendLimitReached ? Date.now() + 60_000 : 0);
        setCodeSent(true);
        if (result.resendLimitReached) setError(c.emailMaxResends);
        setNow(Date.now());
        setRetryAt(
          Date.now() +
            (result.resendLimitReached ? 60_000 : isResend ? 31_000 : 30_000),
        );
        AccessibilityInfo.announceForAccessibility(c.emailCodeSent);
      } else if (step === 1) {
        const result = await travelApi.verifyCurrentEmailCode(code);
        if (!mounted.current) return;
        setOwnershipProof(result.ownershipProof);
        setStep(2);
        setLockedUntil(0);
        setSentUntil(0);
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
        setLockedUntil(0);
        setSentUntil(0);
        setError(c.emailRestart);
        AccessibilityInfo.announceForAccessibility(c.emailRestart);
        return;
      }
      if (apiError?.status === 429) {
        const seconds = Number(apiError.details?.retryAfterSeconds);
        if (apiError.details?.code === "MAX_RESENDS") {
          // Resend limits do not invalidate a code delivered before reopening.
          if (step === 1 && action === "request") setCodeSent(true);
          setLockedUntil(
            Date.now() +
              (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000,
          );
          setNow(Date.now());
          setError(c.emailMaxResends);
          return;
        }
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
        setSendingUntil(0);
        setBusy(false);
        setRequesting(false);
        onBusyChange(false);
      }
    }
  }
  const borderColor = theme.dark ? "#75839B" : "#818A99";
  const feedback = error ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[s.feedback, { color: theme.dark ? "#FF8A80" : "#D92D20" }]}
    >
      {error}
    </Text>
  ) : null;
  return (
    <View style={s.layout}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
      >
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
              : requesting
                ? c.emailSending
                : c.emailVerifyCurrent
            : c.emailNewHelp}
        </Text>
        {isCodeStep ? (
          <>
            <Text style={[s.label, { color: theme.text }]}>{c.emailCode}</Text>
            <View
              style={[
                s.verificationField,
                {
                  backgroundColor: theme.surface,
                  borderColor: focused ? flowColors.blue : borderColor,
                },
              ]}
            >
              <TextInput
                key={String(step) + String(codeSent)}
                autoFocus
                accessibilityLabel={c.emailCode}
                value={code}
                editable={!busy || requesting}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                keyboardType="number-pad"
                maxLength={6}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                onSubmitEditing={() => void run("confirm")}
                placeholder="000000"
                placeholderTextColor={theme.muted}
                style={[s.verificationInput, { color: theme.text }]}
              />
              <Pressable
                disabled={busy || remaining > 0 || lockedUntil > now}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: busy || remaining > 0 || lockedUntil > now,
                }}
                onPress={() => void run("request", codeSent)}
                style={s.resendHit}
              >
                <Text
                  style={[
                    s.resendLabel,
                    { color: remaining > 0 ? theme.muted : flowColors.blue },
                  ]}
                >
                  {requesting && sendingUntil > now
                    ? c.emailSendingShort +
                      " " +
                      Math.ceil((sendingUntil - now) / 1000) +
                      "s"
                    : requesting
                      ? c.emailSendingShort
                      : sentUntil > now
                        ? c.emailSentShort
                        : remaining > 0
                          ? c.emailResendIn + " " + remaining + "s"
                          : codeSent
                            ? c.emailResend
                            : c.emailSendCode}
                </Text>
              </Pressable>
            </View>
            {feedback}
          </>
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
            {feedback}
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
        <PersonalDetailsSaveButton
          label={c.emailContinue}
          dirty={
            isCodeStep
              ? codeSent && /^\d{6}$/.test(code)
              : canRequestEmailChange(newEmail, email)
          }
          saving={busy}
          blocked={
            isCodeStep
              ? confirmRetryAt > now
              : remaining > 0 || lockedUntil > now
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
  verificationField: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  verificationInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingRight: 8,
    fontFamily: appFonts.regular,
    fontSize: 20,
    letterSpacing: 3,
  },
  resendHit: {
    minHeight: 44,
    paddingHorizontal: 6,
    maxWidth: "48%",
    justifyContent: "center",
  },
  resendLabel: {
    fontFamily: appFonts.medium,
    fontSize: 13,
    textAlign: "right",
  },
  note: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 16,
  },
  feedback: {
    fontFamily: appFonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  links: { marginTop: 8 },
  linkHit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { fontFamily: appFonts.medium, fontSize: 14, color: flowColors.blue },
  footer: { padding: 20, paddingTop: 12 },
});
