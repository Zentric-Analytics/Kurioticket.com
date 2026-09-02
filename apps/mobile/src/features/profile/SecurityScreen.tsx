import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { travelApi, TravelApiError, type AccountDeletionRequest, type SecurityEvent, type SecurityOverview, type SecuritySession, type TwoFactorSetup, type MobilePasskey } from "../../api/travelApi";
import { clearSession, readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { localizedAccountActivityLabel } from "../../localization/accountActivityLabels";
import { formatSecurityDate, securityCopy } from "./securityLocalization";
import { PasswordResetFlow, passwordResetNavigationCopy } from "./PasswordResetFlow";
import { PasswordChangeFlow } from "./PasswordChangeFlow";
import { PasskeysManager } from "./PasskeysManager";
import { TwoFactorEnabledFlow } from "./TwoFactorEnabledFlow";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { signInHref } from "../auth/signInIntent";

function shortFeedbackMessage(message: string) {
  const firstSentence = message.match(/^.*?[.!?。！？](?=\s|$)/u)?.[0] ?? message;
  return firstSentence.trim().replace(/[.!?。！？]+$/u, "");
}

export function SecurityScreen() {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = securityCopy[locale];
  const resetCopy = passwordResetNavigationCopy(locale);
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [landingError, setLandingError] = useState("");
  const [landingMessage, setLandingMessage] = useState("");
  const [devicesError, setDevicesError] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const [passkeysError, setPasskeysError] = useState("");
  const [passkeysMessage, setPasskeysMessage] = useState("");
  const [passkeys, setPasskeys] = useState<MobilePasskey[]>([]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"change" | "reset">("change");
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [passkeysOpen, setPasskeysOpen] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [deletion, setDeletion] = useState<AccountDeletionRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const preferenceRequest = useRef(0);
  const devicesRequest = useRef(0);
  const twoFactorRequest = useRef(0);
  const deletionRequest = useRef(0);
  const passkeysRequest = useRef(0);

  const unauth = useCallback(async (e: unknown) => {
    if (e instanceof TravelApiError && e.status === 401) {
      await clearSession();
      router.replace(signInHref("/security"));
      return true;
    }
    return false;
  }, []);
  const load = useCallback(async ({ showLandingFeedback = true, showLoading = true }: { showLandingFeedback?: boolean; showLoading?: boolean } = {}) => {
    if (showLoading) setLoading(true); if (showLandingFeedback) setLandingError("");
    try {
      if (!await readSession()) { router.replace(signInHref("/security")); return; }
      const [o, s, a] = await Promise.all([travelApi.securityOverview(), travelApi.securitySessions(), travelApi.securityActivity()]);
      setOverview(o.overview); setSessions(s.sessions); setEvents(a.events);
    } catch (e) { if (!await unauth(e) && showLandingFeedback) setLandingError(c.loadError); } finally { if (showLoading) setLoading(false); }
  }, [c.loadError, unauth]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!landingMessage) return;
    const timer = setTimeout(() => setLandingMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [landingMessage]);

  const openPassword = () => { setPasswordMode(overview?.hasPassword ? "change" : "reset"); setPasswordOpen(true); };
  const closePassword = () => { setPasswordOpen(false); setPasswordMode("change"); };
  const openDevices = () => { devicesRequest.current += 1; setDevicesError(""); setDevicesOpen(true); };
  const closeDevices = () => { devicesRequest.current += 1; setDevicesOpen(false); setDevicesError(""); };
  const clearTwoFactorState = () => { setSetup(null); setAuthenticatorCode(""); setRecoveryCodes([]); setTwoFactorError(""); };
  const openTwoFactor = () => { twoFactorRequest.current += 1; clearTwoFactorState(); setTwoFactorOpen(true); };
  const closeTwoFactor = () => { twoFactorRequest.current += 1; setTwoFactorOpen(false); clearTwoFactorState(); };
  const closeDeletion = () => { deletionRequest.current += 1; setDeletionOpen(false); setDeletionError(""); };
  const loadPasskeys = async (request = passkeysRequest.current) => { try { const result=await travelApi.passkeys(); if(request===passkeysRequest.current)setPasskeys(result.passkeys); } catch(e) { if(!await unauth(e)&&request===passkeysRequest.current)setPasskeysError(e instanceof TravelApiError?e.message:c.passkeysLoadError); } };
  const openPasskeys = () => { const request=++passkeysRequest.current;setPasskeysError("");setPasskeysMessage("");setPasskeysOpen(true);void loadPasskeys(request); };
  const closePasskeys = () => { passkeysRequest.current+=1;setPasskeysOpen(false);setPasskeysError("");setPasskeysMessage(""); };

  const toggle = async (value: boolean) => {
    if (!overview) return;
    const previous = overview.securityEmailAlerts; const id = ++preferenceRequest.current;
    setOverview({ ...overview, securityEmailAlerts: value }); setSaving(true); setLandingMessage(""); setLandingError("");
    try {
      const r = await travelApi.updateSecurityPreference(value);
      if (id === preferenceRequest.current) { setOverview((v) => v ? { ...v, securityEmailAlerts: r.preferences.securityEmailAlerts } : v); setLandingMessage(c.saved); AccessibilityInfo.announceForAccessibility(c.saved); }
    } catch (e) {
      if (id === preferenceRequest.current) { setOverview((v) => v ? { ...v, securityEmailAlerts: previous } : v); if (!await unauth(e)) setLandingError(c.saveFailed); }
    } finally { if (id === preferenceRequest.current) setSaving(false); }
  };
  const remove = (item: SecuritySession) => { const request = devicesRequest.current; Alert.alert(c.removeTitle, c.removeBody, [{ text: c.cancel, style: "cancel" }, { text: c.remove, style: "destructive", onPress: () => void travelApi.revokeSecuritySession(item.id).then(() => load({ showLandingFeedback: false, showLoading: false })).catch(async (e) => { if (!await unauth(e) && request === devicesRequest.current) setDevicesError(c.removeFailed); }) }]); };
  const all = () => Alert.alert(c.signOutTitle, c.signOutBody, [{ text: c.cancel, style: "cancel" }, { text: c.signOutAll, style: "destructive", onPress: () => void travelApi.revokeAllSecuritySessions().then(async () => { await clearSession(); router.replace(signInHref("/(tabs)/profile")); }).catch(async (e) => { if (!await unauth(e)) setLandingError(c.signOutFailed); }) }]);
  const startTwoFactor = async () => { if (submitting) return; const request = twoFactorRequest.current; setSubmitting(true); setTwoFactorError(""); try { const result = await travelApi.startTwoFactorSetup(); if (request === twoFactorRequest.current) setSetup(result.setup); } catch(e) { if(!await unauth(e) && request === twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError); } finally { setSubmitting(false); } };
  const confirmTwoFactor = async () => { if(submitting)return;if(!/^\d{6}$/.test(authenticatorCode)){setTwoFactorError(c.codeInvalid);return;}const request=twoFactorRequest.current;setSubmitting(true);setTwoFactorError("");try{const result=await travelApi.confirmTwoFactor(authenticatorCode);if(request===twoFactorRequest.current){Keyboard.dismiss();setRecoveryCodes(result.recoveryCodes);setSetup(null);setAuthenticatorCode("");AccessibilityInfo.announceForAccessibility(c.recoveryHelp);}await load({showLandingFeedback:false,showLoading:false});}catch(e){if(!await unauth(e)&&request===twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError);}finally{setSubmitting(false);} };
  const openDeletion = async () => { const request=++deletionRequest.current;setDeletionError("");setDeletionOpen(true);try{const result=await travelApi.getDeletionRequest();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);} };
  const requestDeletion = () => { const request=deletionRequest.current; Alert.alert(c.deletionConfirmTitle,c.deletionConfirmBody,[{text:c.cancel,style:"cancel"},{text:c.deleteAccount,style:"destructive",onPress:()=>void (async()=>{if(submitting)return;setSubmitting(true);setDeletionError("");try{const result=await travelApi.requestDeletion();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);}})()}]); };
  const reactivate = async () => { if(submitting)return;const request=deletionRequest.current;setSubmitting(true);setDeletionError("");try{await travelApi.reactivateDeletion();await clearSession();setDeletion(null);closeDeletion();router.replace(signInHref("/security"));}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);} };
  const date = (value: string) => formatSecurityDate(value, locale);
  const eventLabel = (event: SecurityEvent) => localizedAccountActivityLabel(event.type, locale, c.unknown);

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <Header title={c.title} backLabel={c.back} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.intro, { color: theme.muted }]}>{c.intro}</Text>
      {loading ? <Text style={{ color: theme.muted }}>{c.loading}</Text> : null}
      <Feedback error={landingError} message="" retry={c.retry} onRetry={load} />
      {overview ? <>
        <View style={styles.landingBlocks}>
          <SecurityBlock label={c.password} description={c.passwordHelp} accessibilityValue={overview.hasPassword ? c.configured : c.notConfigured} onPress={openPassword} />
          <SecurityBlock label={c.twoFactor} description={c.twoFactorHelp} status={overview.twoFactorEnabled ? c.enabled : undefined} accessibilityValue={overview.twoFactorEnabled ? c.enabled : c.disabled} onPress={openTwoFactor} />
          <SecurityBlock label={c.passkeys} description={c.passkeysHelp} onPress={openPasskeys} />
          <SecurityBlock label={c.activeSessions} description={c.activeSessionsHelp} onPress={openDevices} />
          <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}><View style={styles.rowCopy}><Text style={[styles.rowLabel, { color: theme.text }]}>{c.notifications}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{c.alertsHelp}</Text>{saving ? <Text style={[styles.saving, { color: theme.muted }]}>{c.saving}</Text> : null}</View><Switch accessibilityLabel={`${c.notifications}. ${c.alertsHelp}`} accessibilityRole="switch" accessibilityState={{ checked: overview.securityEmailAlerts, busy: saving }} value={overview.securityEmailAlerts} onValueChange={(value) => void toggle(value)} /></View>
          <SecurityBlock label={c.activity} description={c.activityHelp} onPress={() => setActivityOpen(true)} />
          <SecurityBlock label={c.signOutAll} description={c.signOutAllHelp} destructive chevron={false} onPress={all} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={c.deleteAccount} onPress={() => void openDeletion()} style={({ pressed }) => [styles.deleteButton, { borderColor: flowColors.red }, pressed && styles.pressed]}><Text style={styles.deleteButtonText}>{c.deleteAccount}</Text></Pressable>
      </> : null}
    </ScrollView>
    <FloatingNotice message={landingMessage} />

    <ScreenModal visible={passkeysOpen} title={c.passkeys} closeLabel={c.close} onClose={closePasskeys}>
      <Text style={[styles.intro,{color:theme.muted}]}>{c.passkeysHelp}</Text><Feedback error={passkeysError} message={passkeysMessage}/>
      <PasskeysManager
        active={passkeysOpen}
        passkeys={passkeys}
        hasPassword={Boolean(overview?.hasPassword)}
        twoFactorEnabled={Boolean(overview?.twoFactorEnabled)}
        onReload={() => loadPasskeys()}
        onUnauthorized={unauth}
        onError={setPasskeysError}
        onMessage={setPasskeysMessage}
      />
    </ScreenModal>
    <ScreenModal visible={passwordOpen} title={passwordMode === "reset" ? resetCopy.title : c.change} closeLabel={c.close} onClose={closePassword}>
      {overview?.hasPassword && passwordMode === "change" ? (
        <PasswordChangeFlow
          active={passwordOpen && passwordMode === "change"}
          copy={c}
          recoveryLabel={resetCopy.entry}
          recoveryHelp={resetCopy.entryHelp}
          onRecovery={() => setPasswordMode("reset")}
          onUnauthorized={unauth}
          onSuccess={async () => {
            closePassword();
            setLandingMessage(shortFeedbackMessage(c.passwordSuccess));
            await load({ showLandingFeedback: false, showLoading: false });
          }}
        />
      ) : (
        <PasswordResetFlow active={passwordOpen && passwordMode === "reset"} copy={c} onUnauthorized={unauth} onSuccess={async () => { closePassword(); await load({ showLandingFeedback: false, showLoading: false }); }} />
      )}
    </ScreenModal>
    <ScreenModal visible={devicesOpen} title={c.yourDevices} closeLabel={c.close} onClose={closeDevices}>
      <Text style={[styles.intro, { color: theme.muted }]}>{c.devicesHelp}</Text><Feedback error={devicesError} message="" />
      {sessions.map((item) => <View key={item.id} style={[styles.device, { borderBottomColor: theme.border }]}><View style={styles.deviceHeading}><Text style={[styles.rowLabel,{color:theme.text}]}>{item.deviceLabel}</Text>{item.isCurrent ? <Text style={styles.current}>{c.currentDevice}</Text> : null}</View><Text style={{ color: theme.muted }}>{item.client} · {item.browser} · {item.os}</Text>{item.maskedIp ? <Text style={{ color: theme.muted }}>{item.maskedIp}</Text> : null}<Text style={{ color: theme.muted }}>{c.lastActive}: {date(item.lastSeenAt)}</Text>{!item.isCurrent ? <Pressable accessibilityRole="button" accessibilityLabel={`${c.remove}: ${item.deviceLabel}`} onPress={() => remove(item)} style={styles.removeTouch}><Text style={styles.danger}>{c.remove}</Text></Pressable> : null}</View>)}
    </ScreenModal>
    <ScreenModal visible={activityOpen} title={c.activity} closeLabel={c.close} onClose={() => setActivityOpen(false)}>
      {events.length ? events.map((event) => <EventRow key={event.id} label={eventLabel(event)} date={date(event.occurredAt)} />) : <Text style={[styles.empty, { color: theme.muted }]}>{c.empty}</Text>}
    </ScreenModal>
    <ScreenModal visible={twoFactorOpen} title={c.twoFactor} closeLabel={c.close} onClose={closeTwoFactor}>
      {recoveryCodes.length ? <View style={styles.form}><Text style={[styles.rowLabel,{color:theme.text}]}>{c.recoveryTitle}</Text><Text style={{color:theme.muted}}>{c.recoveryHelp}</Text>{recoveryCodes.map(code=><Text key={code} selectable style={{color:theme.text}}>{code}</Text>)}<Button label={c.close} onPress={closeTwoFactor}/></View> : overview?.twoFactorEnabled ? <TwoFactorEnabledFlow active={twoFactorOpen && Boolean(overview?.twoFactorEnabled)} copy={c} onUnauthorized={unauth} onDisabled={async () => { closeTwoFactor(); await load({showLandingFeedback:false,showLoading:false}); }} /> : <><Feedback error={twoFactorError} message="" />{setup ? <View style={styles.form}><Text style={{color:theme.muted}}>{c.scanQrInstructions}</Text><View accessible accessibilityRole="image" accessibilityLabel={c.twoFactorQrAccessibilityLabel} style={styles.qrCode}><QRCode value={setup.otpauthUri} size={200} quietZone={12} backgroundColor="#FFFFFF" /></View><Text style={{color:theme.muted}}>{c.manualSetupInstructions}</Text><Text selectable style={[styles.setupKey,{color:theme.text}]}>{setup.manualSetupKey}</Text><TextInput accessibilityLabel={c.authenticatorCode} keyboardType="number-pad" maxLength={6} value={authenticatorCode} onChangeText={value=>setAuthenticatorCode(value.replace(/\D/g,""))} placeholder={c.authenticatorCode} placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><Button label={c.confirmSetup} disabled={submitting||authenticatorCode.length!==6} onPress={()=>void confirmTwoFactor()}/></View> : <View style={styles.form}><Text style={{color:theme.muted}}>{c.twoFactorSetupHelp}</Text><Button label={c.setupTwoFactor} disabled={submitting} onPress={()=>void startTwoFactor()}/></View>}</>}
    </ScreenModal>
    <ScreenModal visible={deletionOpen} title={c.deleteAccount} closeLabel={c.close} onClose={closeDeletion}>
      <Feedback error={deletionError} message=""/><Text style={{color:theme.muted}}>{c.deletionHelp}</Text>
      {deletion ? <View style={styles.form}><Text style={[styles.rowLabel,{color:theme.text}]}>{c.pendingDeletion}: {deletion.status}</Text><Text style={{color:theme.muted}}>{c.scheduledDate}: {date(deletion.deletionScheduledAt)}</Text>{deletion.canReactivate?<Button label={c.keepAccount} disabled={submitting} onPress={()=>void reactivate()}/>:null}</View> : <Pressable accessibilityRole="button" onPress={requestDeletion} style={({pressed})=>[styles.deleteButton,{borderColor:flowColors.red},pressed&&styles.pressed]}><Text style={styles.deleteButtonText}>{c.requestDeletion}</Text></Pressable>}
    </ScreenModal>
  </SafeAreaView>;
}

function Header({ title, backLabel, onBack, close = false }: { title: string; backLabel: string; onBack: () => void; close?: boolean }) { const { theme } = useAppTheme(); return <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.iconButton}><FlowIcon name={close ? "close" : "back"} color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text><View style={styles.iconButton} /></View>; }
function ScreenModal({ visible, title, closeLabel, onClose, children }: { visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) { const { theme } = useAppTheme(); const insets = useSafeAreaInsets(); const push = useRef(new Animated.Value(24)).current; useEffect(() => { if (visible) { push.setValue(24); Animated.timing(push, { toValue: 0, duration: 220, useNativeDriver: true }).start(); } }, [push, visible]); return <Modal animationType="none" presentationStyle="overFullScreen" transparent visible={visible} onRequestClose={onClose}><Animated.View accessibilityViewIsModal style={[styles.safe, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: push }] }]}><Header title={title} backLabel={closeLabel} onBack={onClose} close /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{children}</ScrollView></Animated.View></Modal>; }
function SecurityBlock({ label, description, onPress, accessibilityValue, status, destructive = false, chevron = true }: { label: string; description: string; onPress: () => void; accessibilityValue?: string; status?: string; destructive?: boolean; chevron?: boolean }) { const { theme } = useAppTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined} onPress={onPress} style={({ pressed }) => [styles.securityBlock, { borderBottomColor: theme.border }, pressed && styles.pressed]}><View style={styles.rowCopy}><View style={styles.rowHeading}><Text style={[styles.rowLabel, { color: destructive ? flowColors.red : theme.text }]}>{label}</Text>{status ? <Text style={styles.status}>{status}</Text> : null}</View><Text style={[styles.rowDetail, { color: theme.muted }]}>{description}</Text></View>{chevron ? <FlowIcon name="chevron" color={theme.muted} size={18} /> : null}</Pressable>; }
function EventRow({ label, date }: { label: string; date: string }) { const { theme } = useAppTheme(); return <View style={[styles.event, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{date}</Text></View>; }
function Feedback({ error, message, retry, onRetry }: { error: string; message: string; retry?: string; onRetry?: () => Promise<void> }) {
  const opacity = useRef(new Animated.Value(error || message ? 1 : 0)).current;
  const [displayed, setDisplayed] = useState(error || message);
  const current = error || message;
  useEffect(() => {
    opacity.stopAnimation();
    if (current) {
      setDisplayed(current);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => { if (finished) setDisplayed(""); });
  }, [current, opacity]);
  return <View style={styles.feedbackSlot}><Animated.Text accessibilityRole="alert" style={[error ? styles.error : styles.success, { opacity }]}>{displayed || " "}</Animated.Text>{error && retry && onRetry ? <Pressable accessibilityRole="button" onPress={() => void onRetry()} style={styles.textAction}><Text style={styles.link}>{retry}</Text></Pressable> : null}</View>;
}
function FloatingNotice({ message }: { message: string }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const [displayed, setDisplayed] = useState(message);
  useEffect(() => {
    opacity.stopAnimation(); translateY.stopAnimation();
    if (message) {
      setDisplayed(message); opacity.setValue(0); translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setDisplayed(""); });
  }, [message, opacity, translateY]);
  if (!displayed) return null;
  return <Animated.View pointerEvents="none" style={[styles.toastPosition, { top: insets.top + 64, opacity, transform: [{ translateY }] }]}><View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text accessibilityLiveRegion="polite" style={styles.toastText}>{displayed}</Text></View></Animated.View>;
}
function Button({ label, onPress, disabled = false, loading = false }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) { const inactive = disabled || loading; return <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.button, inactive && styles.disabledButton, pressed && styles.pressed]}><View style={styles.buttonContent}><Text style={styles.buttonText}>{label}</Text>{loading ? <ActivityIndicator size="small" color="white" /> : null}</View></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "800" }, scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }, intro: { fontSize: 15, lineHeight: 22, marginBottom: 18 }, landingBlocks: {}, securityBlock: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, rowCopy: { flex: 1, gap: 7 }, rowHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, rowLabel: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: "700" }, status: { color: "#067647", fontSize: 14, fontWeight: "700" }, rowDetail: { fontSize: 14, lineHeight: 20 }, notificationRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, saving: { fontSize: 12 }, deleteButton: { minHeight: 50, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 32 }, deleteButtonText: { color: flowColors.red, fontSize: 16, fontWeight: "800" }, event: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 }, empty: { paddingVertical: 12 }, modalContent: { padding: 20, paddingBottom: 48, gap: 16 }, form: { gap: 12 }, feedbackSlot: { minHeight: 20, justifyContent: "center" }, resetAlternative: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 12, gap: 2 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }, link: { color: "#1769E0", fontWeight: "700" }, button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 }, buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, disabledButton: { opacity: 0.55 }, buttonText: { color: "white", fontWeight: "800" }, error: { color: "#B42318", fontWeight: "600", lineHeight: 20 }, success: { color: "#067647", fontWeight: "600", lineHeight: 20 }, toastPosition: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 20 }, toast: { maxWidth: 560, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, toastText: { color: "#067647", fontWeight: "700", textAlign: "center" }, device: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, gap: 5 }, deviceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, current: { color: "#1769E0", fontSize: 12, fontWeight: "700" }, removeTouch: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 3 }, danger: { color: "#B42318", fontWeight: "700" }, qrCode: { alignSelf: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 8 }, setupKey: { fontSize: 17, fontWeight: "700", letterSpacing: 1 }, pressed: { opacity: 0.65 },
});