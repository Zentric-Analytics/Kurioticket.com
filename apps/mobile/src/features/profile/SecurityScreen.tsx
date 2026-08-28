import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { travelApi, TravelApiError, type AccountDeletionRequest, type SecurityEvent, type SecurityOverview, type SecuritySession, type TwoFactorSetup, type MobilePasskey } from "../../api/travelApi";
import { clearSession, readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { localizedAccountActivityLabel } from "../../localization/accountActivityLabels";
import { formatSecurityDate, securityCopy } from "./securityLocalization";
import { PasswordResetFlow, passwordResetNavigationCopy } from "./PasswordResetFlow";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";
import { signInHref } from "../auth/signInIntent";

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
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
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
  const [verification, setVerification] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [deletion, setDeletion] = useState<AccountDeletionRequest | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const preferenceRequest = useRef(0);
  const passwordRequest = useRef(0);
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
    const timer = setTimeout(() => setLandingMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [landingMessage]);

  const clearPasswordFeedback = () => { setPasswordError(""); setPasswordMessage(""); };
  const clearPasswordDraft = () => { setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setVisible(false); clearPasswordFeedback(); };
  const openPassword = () => { passwordRequest.current += 1; clearPasswordDraft(); setPasswordMode(overview?.hasPassword ? "change" : "reset"); setPasswordOpen(true); };
  const closePassword = () => { passwordRequest.current += 1; setPasswordOpen(false); setPasswordMode("change"); clearPasswordDraft(); };
  const openDevices = () => { devicesRequest.current += 1; setDevicesError(""); setDevicesOpen(true); };
  const closeDevices = () => { devicesRequest.current += 1; setDevicesOpen(false); setDevicesError(""); };
  const openTwoFactor = () => { twoFactorRequest.current += 1; setTwoFactorError(""); setTwoFactorOpen(true); };
  const closeTwoFactor = () => { twoFactorRequest.current += 1; setTwoFactorOpen(false); setTwoFactorError(""); };
  const closeDeletion = () => { deletionRequest.current += 1; setDeletionOpen(false); setDeletionError(""); };
  const loadPasskeys = async (request = passkeysRequest.current) => { try { const result=await travelApi.passkeys(); if(request===passkeysRequest.current)setPasskeys(result.passkeys); } catch(e) { if(!await unauth(e)&&request===passkeysRequest.current)setPasskeysError(e instanceof TravelApiError?e.message:c.passkeysLoadError); } };
  const openPasskeys = () => { const request=++passkeysRequest.current;setPasskeysError("");setPasskeysMessage("");setPasskeysOpen(true);void loadPasskeys(request); };
  const closePasskeys = () => { passkeysRequest.current+=1;setPasskeysOpen(false);setPasskeysError("");setPasskeysMessage(""); };

  const passwordReady = Boolean(passwords.currentPassword) && passwords.newPassword.length >= 8 && passwords.confirmPassword.length >= 8 && passwords.newPassword === passwords.confirmPassword && passwords.currentPassword !== passwords.newPassword;
  const change = async () => {
    if (submitting) return;
    if (!passwordReady) { setPasswordError(c.passwordInvalid); return; }
    const request = passwordRequest.current; setSubmitting(true); setPasswordError("");
    try {
      await travelApi.changePassword(passwords);
      if (request !== passwordRequest.current) { await load({ showLandingFeedback: false, showLoading: false }); return; }
      closePassword(); setLandingMessage(c.passwordSuccess);
      AccessibilityInfo.announceForAccessibility(c.passwordSuccess);
      await load({ showLandingFeedback: false, showLoading: false });
    } catch (e) { if (!await unauth(e) && request === passwordRequest.current) setPasswordError(e instanceof TravelApiError ? e.message : c.loadError); } finally { setSubmitting(false); }
  };
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
  const startTwoFactor = async () => { if (submitting) return; const request = twoFactorRequest.current; setSubmitting(true); setTwoFactorError(""); try { const result = await travelApi.startTwoFactorSetup(); if (request === twoFactorRequest.current) setSetup(result.setup); } catch(e) { if(!await unauth(e) && request === twoFactorRequest.current) setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError); } finally { setSubmitting(false); } };
  const confirmTwoFactor = async () => { if(submitting)return;if(!/^\d{6}$/.test(authenticatorCode)){setTwoFactorError(c.codeInvalid);return;}const request=twoFactorRequest.current;setSubmitting(true);setTwoFactorError("");try{const result=await travelApi.confirmTwoFactor(authenticatorCode);if(request===twoFactorRequest.current){setRecoveryCodes(result.recoveryCodes);setSetup(null);setAuthenticatorCode("");}await load({showLandingFeedback:false,showLoading:false});}catch(e){if(!await unauth(e)&&request===twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError);}finally{setSubmitting(false);} };
  const disableTwoFactor = () => { const request=twoFactorRequest.current; Alert.alert(c.disableTitle,c.disableBody,[{text:c.cancel,style:"cancel"},{text:c.disable,style:"destructive",onPress:()=>void (async()=>{if(submitting)return;setSubmitting(true);setTwoFactorError("");try{await travelApi.disableTwoFactor({code:verification,password:verification});if(request===twoFactorRequest.current){setVerification("");closeTwoFactor();}await load({showLandingFeedback:false,showLoading:false});}catch(e){if(!await unauth(e)&&request===twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError);}finally{setSubmitting(false);}})()}]); };
  const openDeletion = async () => { const request=++deletionRequest.current;setDeletionError("");setDeletionOpen(true);try{const result=await travelApi.getDeletionRequest();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);} };
  const requestDeletion = () => { const request=deletionRequest.current; Alert.alert(c.deletionConfirmTitle,c.deletionConfirmBody,[{text:c.cancel,style:"cancel"},{text:c.deleteAccount,style:"destructive",onPress:()=>void (async()=>{if(submitting)return;setSubmitting(true);setDeletionError("");try{const result=await travelApi.requestDeletion();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);}})()}]); };
  const reactivate = async () => { if(submitting)return;const request=deletionRequest.current;setSubmitting(true);setDeletionError("");try{await travelApi.reactivateDeletion();await clearSession();setDeletion(null);closeDeletion();router.replace(signInHref("/security"));}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);} };
  const date = (value: string) => formatSecurityDate(value, locale);
  const eventLabel = (event: SecurityEvent) => localizedAccountActivityLabel(event.type, locale, c.unknown);
  const field = (key: keyof typeof passwords, label: string) => <TextInput accessibilityLabel={label} secureTextEntry={!visible} value={passwords[key]} onChangeText={(value) => { setPasswords((v) => ({ ...v, [key]: value })); setPasswordError(""); }} placeholder={label} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />;

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <Header title={c.title} backLabel={c.back} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.intro, { color: theme.muted }]}>{c.intro}</Text>
      {loading ? <Text style={{ color: theme.muted }}>{c.loading}</Text> : null}
      <Feedback error={landingError} message={landingMessage} retry={c.retry} onRetry={load} />
      {overview ? <>
        <View style={styles.landingBlocks}>
          <SecurityBlock label={c.password} description={c.passwordHelp} accessibilityValue={overview.hasPassword ? c.configured : c.notConfigured} onPress={openPassword} />
          <SecurityBlock label={c.twoFactor} description={c.twoFactorHelp} accessibilityValue={overview.twoFactorEnabled ? c.enabled : c.disabled} onPress={openTwoFactor} />
          <SecurityBlock label={c.passkeys} description={c.passkeysHelp} onPress={openPasskeys} />
          <SecurityBlock label={c.activeSessions} description={c.activeSessionsHelp} onPress={openDevices} />
          <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}><View style={styles.rowCopy}><Text style={[styles.rowLabel, { color: theme.text }]}>{c.notifications}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{c.alertsHelp}</Text>{saving ? <Text style={[styles.saving, { color: theme.muted }]}>{c.saving}</Text> : null}</View><Switch accessibilityLabel={`${c.notifications}. ${c.alertsHelp}`} accessibilityRole="switch" accessibilityState={{ checked: overview.securityEmailAlerts, busy: saving }} value={overview.securityEmailAlerts} onValueChange={(value) => void toggle(value)} /></View>
          <SecurityBlock label={c.activity} description={c.activityHelp} onPress={() => setActivityOpen(true)} />
          <SecurityBlock label={c.signOutAll} description={c.signOutAllHelp} destructive chevron={false} onPress={all} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={c.deleteAccount} onPress={() => void openDeletion()} style={({ pressed }) => [styles.deleteButton, { borderColor: flowColors.red }, pressed && styles.pressed]}><Text style={styles.deleteButtonText}>{c.deleteAccount}</Text></Pressable>
      </> : null}
    </ScrollView>

    <ScreenModal visible={passkeysOpen} title={c.passkeys} closeLabel={c.close} onClose={closePasskeys}>
      <Text style={[styles.intro,{color:theme.muted}]}>{c.passkeysHelp}</Text><Feedback error={passkeysError} message={passkeysMessage}/>
      <Button label={c.addPasskey} disabled onPress={()=>{}} />
      <Text style={{color:theme.muted}}>{c.passkeyPreviewRequired}</Text>
      {passkeys.map(item=><View key={item.id} style={[styles.device,{borderBottomColor:theme.border}]}><Text style={[styles.rowLabel,{color:theme.text}]}>{item.name}</Text><Text style={{color:theme.muted}}>{item.label}</Text><Text style={{color:theme.muted}}>{c.created} {date(item.createdAt)}</Text></View>)}
    </ScreenModal>
    <ScreenModal visible={passwordOpen} title={passwordMode === "reset" ? resetCopy.title : c.change} closeLabel={c.close} onClose={closePassword}>
      <Feedback error={passwordError} message={passwordMessage} />
      {overview?.hasPassword && passwordMode === "change" ? <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={styles.form}>{field("currentPassword", c.current)}{field("newPassword", c.next)}{field("confirmPassword", c.confirm)}<Pressable accessibilityRole="button" accessibilityLabel={visible ? c.hide : c.show} onPress={() => setVisible((v) => !v)} style={styles.textAction}><Text style={styles.link}>{visible ? c.hide : c.show}</Text></Pressable><Text style={{ color: theme.muted }}>{c.passwordRules}</Text><Button label={submitting ? c.changing : c.change} disabled={submitting} onPress={() => void change()} /><View style={[styles.resetAlternative, { borderTopColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel={resetCopy.entry} onPress={() => { clearPasswordDraft(); setPasswordMode("reset"); }} style={styles.textAction}><Text style={styles.link}>{resetCopy.entry}</Text></Pressable><Text style={[styles.rowDetail, { color: theme.muted }]}>{resetCopy.entryHelp}</Text></View></View></KeyboardAvoidingView> : <PasswordResetFlow active={passwordOpen && passwordMode === "reset"} copy={c} onUnauthorized={unauth} onSuccess={async () => { closePassword(); setLandingMessage(resetCopy.success); await load({ showLandingFeedback: false, showLoading: false }); }} />}
      {overview?.hasPassword && passwordMode === "reset" ? <Pressable accessibilityRole="button" accessibilityLabel={resetCopy.back} onPress={() => { clearPasswordDraft(); setPasswordMode("change"); }} style={styles.textAction}><Text style={styles.link}>{resetCopy.back}</Text></Pressable> : null}
    </ScreenModal>
    <ScreenModal visible={devicesOpen} title={c.yourDevices} closeLabel={c.close} onClose={closeDevices}>
      <Text style={[styles.intro, { color: theme.muted }]}>{c.devicesHelp}</Text><Feedback error={devicesError} message="" />
      {sessions.map((item) => <View key={item.id} style={[styles.device, { borderBottomColor: theme.border }]}><View style={styles.deviceHeading}><Text style={[styles.rowLabel,{color:theme.text}]}>{item.deviceLabel}</Text>{item.isCurrent ? <Text style={styles.current}>{c.currentDevice}</Text> : null}</View><Text style={{ color: theme.muted }}>{item.client} · {item.browser} · {item.os}</Text>{item.maskedIp ? <Text style={{ color: theme.muted }}>{item.maskedIp}</Text> : null}<Text style={{ color: theme.muted }}>{c.lastActive}: {date(item.lastSeenAt)}</Text>{!item.isCurrent ? <Pressable accessibilityRole="button" accessibilityLabel={`${c.remove}: ${item.deviceLabel}`} onPress={() => remove(item)} style={styles.removeTouch}><Text style={styles.danger}>{c.remove}</Text></Pressable> : null}</View>)}
    </ScreenModal>
    <ScreenModal visible={activityOpen} title={c.activity} closeLabel={c.close} onClose={() => setActivityOpen(false)}>
      {events.length ? events.map((event) => <EventRow key={event.id} label={eventLabel(event)} date={date(event.occurredAt)} />) : <Text style={[styles.empty, { color: theme.muted }]}>{c.empty}</Text>}
    </ScreenModal>
    <ScreenModal visible={twoFactorOpen} title={c.twoFactor} closeLabel={c.close} onClose={closeTwoFactor}>
      <Feedback error={twoFactorError} message="" />
      {recoveryCodes.length ? <View style={styles.form}><Text style={[styles.rowLabel,{color:theme.text}]}>{c.recoveryTitle}</Text><Text style={{color:theme.muted}}>{c.recoveryHelp}</Text>{recoveryCodes.map(code=><Text key={code} selectable style={{color:theme.text}}>{code}</Text>)}</View> : overview?.twoFactorEnabled ? <View style={styles.form}><Text style={[styles.success]}>{c.enabled}</Text><Text style={{color:theme.muted}}>{c.disableHelp}</Text><TextInput accessibilityLabel={c.verification} secureTextEntry value={verification} onChangeText={setVerification} placeholder={c.verification} placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><Button label={c.disable} disabled={submitting||!verification} onPress={disableTwoFactor}/></View> : setup ? <View style={styles.form}><Text style={{color:theme.muted}}>{c.setupInstructions}</Text><Text selectable style={[styles.setupKey,{color:theme.text}]}>{setup.manualSetupKey}</Text><Text style={{color:theme.muted}}>{setup.otpauthUri}</Text><TextInput accessibilityLabel={c.authenticatorCode} keyboardType="number-pad" maxLength={6} value={authenticatorCode} onChangeText={value=>setAuthenticatorCode(value.replace(/\D/g,""))} placeholder={c.authenticatorCode} placeholderTextColor={theme.muted} style={[styles.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surface}]}/><Button label={c.confirmSetup} disabled={submitting||authenticatorCode.length!==6} onPress={()=>void confirmTwoFactor()}/></View> : <View style={styles.form}><Text style={{color:theme.muted}}>{c.twoFactorSetupHelp}</Text><Button label={c.setupTwoFactor} disabled={submitting} onPress={()=>void startTwoFactor()}/></View>}
    </ScreenModal>
    <ScreenModal visible={deletionOpen} title={c.deleteAccount} closeLabel={c.close} onClose={closeDeletion}>
      <Feedback error={deletionError} message=""/><Text style={{color:theme.muted}}>{c.deletionHelp}</Text>
      {deletion ? <View style={styles.form}><Text style={[styles.rowLabel,{color:theme.text}]}>{c.pendingDeletion}: {deletion.status}</Text><Text style={{color:theme.muted}}>{c.scheduledDate}: {date(deletion.deletionScheduledAt)}</Text>{deletion.canReactivate?<Button label={c.keepAccount} disabled={submitting} onPress={()=>void reactivate()}/>:null}</View> : <Pressable accessibilityRole="button" onPress={requestDeletion} style={({pressed})=>[styles.deleteButton,{borderColor:flowColors.red},pressed&&styles.pressed]}><Text style={styles.deleteButtonText}>{c.requestDeletion}</Text></Pressable>}
    </ScreenModal>
  </SafeAreaView>;
}

function Header({ title, backLabel, onBack, close = false }: { title: string; backLabel: string; onBack: () => void; close?: boolean }) { const { theme } = useAppTheme(); return <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.iconButton}><FlowIcon name={close ? "close" : "back"} color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text><View style={styles.iconButton} /></View>; }
function ScreenModal({ visible, title, closeLabel, onClose, children }: { visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) { const { theme } = useAppTheme(); const insets = useSafeAreaInsets(); const push = useRef(new Animated.Value(24)).current; useEffect(() => { if (visible) { push.setValue(24); Animated.timing(push, { toValue: 0, duration: 220, useNativeDriver: true }).start(); } }, [push, visible]); return <Modal animationType="none" presentationStyle="overFullScreen" transparent visible={visible} onRequestClose={onClose}><Animated.View accessibilityViewIsModal style={[styles.safe, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: push }] }]}><Header title={title} backLabel={closeLabel} onBack={onClose} close /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{children}</ScrollView></Animated.View></Modal>; }
function SecurityBlock({ label, description, onPress, accessibilityValue, destructive = false, chevron = true }: { label: string; description: string; onPress: () => void; accessibilityValue?: string; destructive?: boolean; chevron?: boolean }) { const { theme } = useAppTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined} onPress={onPress} style={({ pressed }) => [styles.securityBlock, { borderBottomColor: theme.border }, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={[styles.rowLabel, { color: destructive ? flowColors.red : theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{description}</Text></View>{chevron ? <FlowIcon name="chevron" color={theme.muted} size={18} /> : null}</Pressable>; }
function EventRow({ label, date }: { label: string; date: string }) { const { theme } = useAppTheme(); return <View style={[styles.event, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{date}</Text></View>; }
function Feedback({ error, message, retry, onRetry }: { error: string; message: string; retry?: string; onRetry?: () => Promise<void> }) { return <>{error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry && onRetry ? <Pressable accessibilityRole="button" onPress={() => void onRetry()} style={styles.textAction}><Text style={styles.link}>{retry}</Text></Pressable> : null}</View> : null}{message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}</>; }
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, disabled && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "800" }, scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }, intro: { fontSize: 15, lineHeight: 22, marginBottom: 18 }, landingBlocks: {}, securityBlock: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, rowCopy: { flex: 1, gap: 7 }, rowLabel: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: "700" }, rowDetail: { fontSize: 14, lineHeight: 20 }, notificationRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, saving: { fontSize: 12 }, deleteButton: { minHeight: 50, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 32 }, deleteButtonText: { color: flowColors.red, fontSize: 16, fontWeight: "800" }, event: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 }, empty: { paddingVertical: 12 }, modalContent: { padding: 20, paddingBottom: 48, gap: 16 }, form: { gap: 12 }, resetAlternative: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 12, gap: 2 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }, link: { color: "#1769E0", fontWeight: "700" }, button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 }, disabledButton: { opacity: 0.45 }, buttonText: { color: "white", fontWeight: "800" }, error: { color: "#B42318", fontWeight: "600" }, success: { color: "#067647", fontWeight: "600" }, device: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, gap: 5 }, deviceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, current: { color: "#1769E0", fontSize: 12, fontWeight: "700" }, removeTouch: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 3 }, danger: { color: "#B42318", fontWeight: "700" }, setupKey: { fontSize: 17, fontWeight: "700", letterSpacing: 1 }, pressed: { opacity: 0.65 },
});