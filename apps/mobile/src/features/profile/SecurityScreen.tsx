import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Monitor, MoreHorizontal, Smartphone } from "lucide-react-native";
import { travelApi, TravelApiError, type AccountDeletionRequest, type SecurityEvent, type SecurityOverview, type SecuritySession, type TwoFactorSetup, type MobilePasskey } from "../../api/travelApi";
import { clearSession, readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { localizedAccountActivityLabel } from "../../localization/accountActivityLabels";
import { formatSecurityDate, securityCopy, type SecurityCopy } from "./securityLocalization";
import { PasswordResetFlow, passwordResetNavigationCopy } from "./PasswordResetFlow";
import { PasswordChangeFlow } from "./PasswordChangeFlow";
import { PasskeysManager, type PasskeysManagerHandle } from "./PasskeysManager";
import { TwoFactorEnabledFlow } from "./TwoFactorEnabledFlow";
import { TwoFactorSetupFlow } from "./TwoFactorSetupFlow";
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
  const [passkeys, setPasskeys] = useState<MobilePasskey[]>([]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"change" | "reset">("change");
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [managedSession, setManagedSession] = useState<SecuritySession | null>(null);
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
  const passkeysManager = useRef<PasskeysManagerHandle>(null);
  const clearPasskeysError = useCallback(() => setPasskeysError(""), []);

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
  const closeDevices = () => { devicesRequest.current += 1; setDevicesOpen(false); setManagedSession(null); setDevicesError(""); };
  const clearTwoFactorState = () => { setSetup(null); setAuthenticatorCode(""); setRecoveryCodes([]); setTwoFactorError(""); };
  const openTwoFactor = () => { twoFactorRequest.current += 1; clearTwoFactorState(); setTwoFactorOpen(true); };
  const closeTwoFactor = () => { twoFactorRequest.current += 1; clearTwoFactorState(); setTwoFactorOpen(false); };
  const closeDeletion = () => { deletionRequest.current += 1; setDeletionOpen(false); setDeletionError(""); };
  const loadPasskeys = async (request = passkeysRequest.current) => { try { const result=await travelApi.passkeys(); if(request===passkeysRequest.current)setPasskeys(result.passkeys); } catch(e) { if(!await unauth(e)&&request===passkeysRequest.current)setPasskeysError(e instanceof TravelApiError&&e.status>0&&e.status<500&&e.code!=="invalid-response"?e.message:c.passkeysLoadError); } };
  const openPasskeys = () => { const request=++passkeysRequest.current;setPasskeysError("");setPasskeysOpen(true);void loadPasskeys(request); };
  const closePasskeys = () => { passkeysRequest.current+=1;setPasskeysOpen(false);setPasskeysError(""); };

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
  const remove = (item: SecuritySession) => { const request = devicesRequest.current; Alert.alert(c.removeTitle, c.removeBody, [{ text: c.cancel, style: "cancel" }, { text: c.removeSession, style: "destructive", onPress: () => void travelApi.revokeSecuritySession(item.id).then(() => load({ showLandingFeedback: false, showLoading: false })).catch(async (e) => { if (!await unauth(e) && request === devicesRequest.current) setDevicesError(c.removeFailed); }) }]); };
  const signOutOthers = () => { const request=devicesRequest.current;Alert.alert(c.signOutOthersTitle,c.signOutOthersBody,[{text:c.cancel,style:"cancel"},{text:c.signOutOthersConfirm,style:"destructive",onPress:()=>void travelApi.revokeOtherSecuritySessions().then(()=>{if(request!==devicesRequest.current)return;setSessions(current=>current.filter(item=>item.isCurrent));setManagedSession(null);setDevicesError("");void load({showLandingFeedback:false,showLoading:false});}).catch(async(e)=>{if(!await unauth(e)&&request===devicesRequest.current)setDevicesError(c.signOutOthersFailed);})}]); };
  const all = () => Alert.alert(c.signOutTitle, c.signOutBody, [{ text: c.cancel, style: "cancel" }, { text: c.signOutAll, style: "destructive", onPress: () => void travelApi.revokeAllSecuritySessions().then(async () => { await clearSession(); router.replace(signInHref("/(tabs)/profile")); }).catch(async (e) => { if (!await unauth(e)) setLandingError(c.signOutFailed); }) }]);
  const startTwoFactor = async () => { if (submitting) return; const request = twoFactorRequest.current; setSubmitting(true); setTwoFactorError(""); try { const result = await travelApi.startTwoFactorSetup(); if (request === twoFactorRequest.current) setSetup(result.setup); } catch(e) { if(!await unauth(e) && request === twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError); } finally { setSubmitting(false); } };
  const confirmTwoFactor = async () => { if(submitting)return;if(!/^\d{6}$/.test(authenticatorCode)){setTwoFactorError(c.codeInvalid);return;}const request=twoFactorRequest.current;setSubmitting(true);setTwoFactorError("");try{const result=await travelApi.confirmTwoFactor(authenticatorCode);if(request===twoFactorRequest.current){Keyboard.dismiss();setRecoveryCodes(result.recoveryCodes);setSetup(null);setAuthenticatorCode("");AccessibilityInfo.announceForAccessibility(c.recoveryHelp);}await load({showLandingFeedback:false,showLoading:false});}catch(e){if(!await unauth(e)&&request===twoFactorRequest.current)setTwoFactorError(e instanceof TravelApiError?e.message:c.twoFactorError);}finally{setSubmitting(false);} };
  const openDeletion = async () => { const request=++deletionRequest.current;setDeletionError("");setDeletionOpen(true);try{const result=await travelApi.getDeletionRequest();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);} };
  const requestDeletion = () => { const request=deletionRequest.current; Alert.alert(c.deletionConfirmTitle,c.deletionConfirmBody,[{text:c.cancel,style:"cancel"},{text:c.deleteAccount,style:"destructive",onPress:()=>void (async()=>{if(submitting)return;setSubmitting(true);setDeletionError("");try{const result=await travelApi.requestDeletion();if(request===deletionRequest.current)setDeletion(result.request);}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);}})()}]); };
  const reactivate = async () => { if(submitting)return;const request=deletionRequest.current;setSubmitting(true);setDeletionError("");try{await travelApi.reactivateDeletion();await clearSession();setDeletion(null);closeDeletion();router.replace(signInHref("/security"));}catch(e){if(!await unauth(e)&&request===deletionRequest.current)setDeletionError(e instanceof TravelApiError?e.message:c.deletionError);}finally{setSubmitting(false);} };
  const date = (value: string) => formatSecurityDate(value, locale);
  const currentSession = sessions.find(item => item.isCurrent === true);
  const otherSessions = sessions.filter(item => item.isCurrent === false).sort((a,b) => new Date(b.lastSeenAt).getTime()-new Date(a.lastSeenAt).getTime());
  const eventLabel = (event: SecurityEvent) => localizedAccountActivityLabel(event.type, locale, c.unknown);
  const twoFactorSetupFlow = <TwoFactorSetupFlow
    active={twoFactorOpen && (!Boolean(overview?.twoFactorEnabled) || recoveryCodes.length > 0)}
    copy={c}
    setup={setup}
    recoveryCodes={recoveryCodes}
    authenticatorCode={authenticatorCode}
    error={setup ? twoFactorError : ""}
    submitting={submitting}
    onStart={() => void startTwoFactor()}
    onCodeChange={(value) => { setAuthenticatorCode(value); setTwoFactorError(""); }}
    onConfirm={() => void confirmTwoFactor()}
    onClose={closeTwoFactor}
  />;

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

    <ScreenModal visible={passkeysOpen} title={c.passkeys} closeLabel={c.close} avoidKeyboard onClose={() => { if (!passkeysManager.current?.cancelInternal()) closePasskeys(); }}>
      <Text style={[styles.passkeysIntro,{color:theme.muted}]}>{c.passkeysHelp}</Text>
      <PasskeysManager
        ref={passkeysManager}
        active={passkeysOpen}
        passkeys={passkeys}
        loadError={passkeysError}
        hasPassword={Boolean(overview?.hasPassword)}
        twoFactorEnabled={Boolean(overview?.twoFactorEnabled)}
        onReload={() => loadPasskeys()}
        onUnauthorized={unauth}
        onClearLoadError={clearPasskeysError}
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
    <ScreenModal visible={devicesOpen} title={c.activeSessions} closeLabel={c.close} onClose={closeDevices}>
      <View style={styles.devicesContent}>
        <Text style={[styles.devicesIntro, { color: theme.muted }]}>{c.devicesHelp}</Text>
        {devicesError ? <Text accessibilityRole="alert" style={styles.error}>{devicesError}</Text> : null}
        {currentSession ? <><Text style={[styles.sectionHeading,{color:theme.muted}]}>{c.thisDevice}</Text><SessionRow item={currentSession} copy={c} date={date(currentSession.lastSeenAt)} onManage={setManagedSession}/></> : null}
        {otherSessions.length ? <><Text style={[styles.sectionHeading,{color:theme.muted}]}>{c.otherSessions}</Text>{otherSessions.map(item=><SessionRow key={item.id} item={item} copy={c} date={date(item.lastSeenAt)} onManage={setManagedSession}/>)}<Pressable accessibilityRole="button" onPress={signOutOthers} style={({pressed})=>[styles.signOutOthers,pressed&&styles.pressed]}><Text style={styles.danger}>{c.signOutOthers}</Text></Pressable></> : null}
        {!sessions.length ? <View style={[styles.devicesEmpty, { borderColor: theme.border, backgroundColor: theme.surface }]}><Smartphone size={22} color={theme.muted}/><Text style={[styles.rowLabel, { color: theme.text }]}>{c.noActiveSessions}</Text><Text style={[styles.rowDetail, { color: theme.muted, textAlign: "center" }]}>{c.noActiveSessionsHelp}</Text></View> : null}
      </View>
    </ScreenModal>
    <BottomSheet visible={Boolean(managedSession)} dismissLabel={c.close} onDismiss={() => setManagedSession(null)}>
      <Text style={[styles.sheetTitle, { color: theme.text }]}>{managedSession ? sessionPresentation(managedSession,c).label : c.sessionDetails}</Text>
      {managedSession ? <><Text style={[styles.rowDetail,{color:theme.muted}]}>{sessionPresentation(managedSession,c).details}</Text>{managedSession.maskedIp?<Text style={[styles.rowDetail,{color:theme.muted}]}>{managedSession.maskedIp}</Text>:null}<Text style={[styles.rowDetail,{color:theme.muted}]}>{managedSession.isCurrent?`${c.currentDevice} · ${c.activeNow}`:`${c.lastActive} ${date(managedSession.lastSeenAt)}`}</Text></> : null}
      {managedSession && !managedSession.isCurrent?<Pressable accessibilityRole="button" onPress={() => { const item=managedSession;setManagedSession(null);remove(item); }} style={styles.sheetAction}><Text style={styles.danger}>{c.removeSession}</Text></Pressable>:null}
    </BottomSheet>
    <ScreenModal visible={activityOpen} title={c.activity} closeLabel={c.close} onClose={() => setActivityOpen(false)}>
      {events.length ? events.map((event) => <EventRow key={event.id} label={eventLabel(event)} date={date(event.occurredAt)} />) : <Text style={[styles.empty, { color: theme.muted }]}>{c.empty}</Text>}
    </ScreenModal>
    <ScreenModal visible={twoFactorOpen} title={c.twoFactor} closeLabel={c.close} onClose={closeTwoFactor} avoidKeyboard>
      {!setup && !recoveryCodes.length && !overview?.twoFactorEnabled ? <Feedback error={twoFactorError} message="" /> : null}
      {overview?.twoFactorEnabled ? (
        recoveryCodes.length ? twoFactorSetupFlow : <TwoFactorEnabledFlow active={twoFactorOpen && Boolean(overview?.twoFactorEnabled)} hasPassword={Boolean(overview?.hasPassword)} copy={c} onUnauthorized={unauth} onDisabled={async () => { closeTwoFactor(); await load({showLandingFeedback:false,showLoading:false}); }} />
      ) : twoFactorSetupFlow}
    </ScreenModal>
    <ScreenModal visible={deletionOpen} title={c.deleteAccount} closeLabel={c.close} onClose={closeDeletion}>
      <Feedback error={deletionError} message=""/><Text style={{color:theme.muted}}>{c.deletionHelp}</Text>
      {deletion ? <View style={styles.form}><Text style={[styles.rowLabel,{color:theme.text}]}>{c.pendingDeletion}: {deletion.status}</Text><Text style={{color:theme.muted}}>{c.scheduledDate}: {date(deletion.deletionScheduledAt)}</Text>{deletion.canReactivate?<Button label={c.keepAccount} disabled={submitting} onPress={()=>void reactivate()}/>:null}</View> : <Pressable accessibilityRole="button" onPress={requestDeletion} style={({pressed})=>[styles.deleteButton,{borderColor:flowColors.red},pressed&&styles.pressed]}><Text style={styles.deleteButtonText}>{c.requestDeletion}</Text></Pressable>}
    </ScreenModal>
  </SafeAreaView>;
}

function Header({ title, backLabel, onBack, close = false }: { title: string; backLabel: string; onBack: () => void; close?: boolean }) { const { theme } = useAppTheme(); return <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.iconButton}><FlowIcon name={close ? "close" : "back"} color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text><View style={styles.iconButton} /></View>; }
function ScreenModal({ visible, title, closeLabel, onClose, children, avoidKeyboard = false }: { visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode; avoidKeyboard?: boolean }) { const { theme } = useAppTheme(); const insets = useSafeAreaInsets(); const push = useRef(new Animated.Value(24)).current; useEffect(() => { if (visible) { push.setValue(24); Animated.timing(push, { toValue: 0, duration: 220, useNativeDriver: true }).start(); } }, [push, visible]); const content = <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{children}</ScrollView>; return <Modal animationType="none" presentationStyle="overFullScreen" transparent visible={visible} onRequestClose={onClose}><Animated.View accessibilityViewIsModal style={[styles.safe, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom, transform: [{ translateX: push }] }]}><Header title={title} backLabel={closeLabel} onBack={onClose} close />{avoidKeyboard ? <KeyboardAvoidingView style={styles.keyboardViewport} behavior={Platform.OS === "ios" ? "padding" : "height"}>{content}</KeyboardAvoidingView> : content}</Animated.View></Modal>; }
function SecurityBlock({ label, description, onPress, accessibilityValue, status, destructive = false, chevron = true }: { label: string; description: string; onPress: () => void; accessibilityValue?: string; status?: string; destructive?: boolean; chevron?: boolean }) { const { theme } = useAppTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined} onPress={onPress} style={({ pressed }) => [styles.securityBlock, { borderBottomColor: theme.border }, pressed && styles.pressed]}><View style={styles.rowCopy}><View style={styles.rowHeading}><Text style={[styles.rowLabel, { color: destructive ? flowColors.red : theme.text }]}>{label}</Text>{status ? <Text style={styles.status}>{status}</Text> : null}</View><Text style={[styles.rowDetail, { color: theme.muted }]}>{description}</Text></View>{chevron ? <FlowIcon name="chevron" color={theme.muted} size={18} /> : null}</Pressable>; }
function EventRow({ label, date }: { label: string; date: string }) { const { theme } = useAppTheme(); return <View style={[styles.event, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{date}</Text></View>; }
export function sessionDetails(item: SecuritySession, copy: SecurityCopy) {
  const known = (value: string | null | undefined) => value?.trim() && !/^unknown(?: platform)?$/i.test(value.trim()) ? value.trim() : null;
  if (item.client.toUpperCase() === "MOBILE") {
    const platform = item.platform?.toLowerCase() === "ios" ? copy.iphone : item.platform?.toLowerCase() === "android" ? copy.android : null;
    return [platform, copy.kurioticketApp].filter(Boolean).join(" · ");
  }
  return [known(item.browser), known(item.os)].filter(Boolean).join(" · ");
}
export function sessionPresentation(item: SecuritySession, copy: SecurityCopy) {
  const mobile=item.client.toUpperCase()==="MOBILE";
  const platform=item.platform?.toLowerCase();
  const label=mobile?(platform==="ios"?copy.iphone:platform==="android"?copy.android:copy.mobileDevice):(item.browser?.trim()&&!/^unknown/i.test(item.browser)?item.browser:copy.webBrowser);
  return {label,details:mobile?copy.kurioticketApp:sessionDetails(item,copy)};
}
function SessionRow({item,copy,date,onManage}:{item:SecuritySession;copy:SecurityCopy;date:string;onManage:(item:SecuritySession)=>void}) { const {theme}=useAppTheme();const mobile=item.client.toUpperCase()==="MOBILE";const presentation=sessionPresentation(item,copy);const activity=item.isCurrent?copy.activeNow:`${copy.lastActive} ${date}`;const accessibilityLabel=`${presentation.label}. ${item.isCurrent?`${copy.currentDevice}. `:""}${activity}. ${copy.opensSessionDetails}.`;return <View style={[styles.device,{borderColor:theme.border,backgroundColor:theme.surface}]}><Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={()=>onManage(item)} style={({pressed})=>[styles.deviceMain,pressed&&styles.pressed]}>{mobile?<Smartphone size={20} color={theme.icon}/>:<Monitor size={20} color={theme.icon}/>}<View style={styles.deviceCopy}><View style={styles.deviceHeading}><Text numberOfLines={1} style={[styles.rowLabel,{color:theme.text}]}>{presentation.label}</Text>{item.isCurrent?<Text style={styles.current}>{copy.currentDevice}</Text>:null}</View>{presentation.details?<Text numberOfLines={1} style={[styles.rowDetail,{color:theme.muted}]}>{presentation.details}</Text>:null}<Text style={[styles.deviceMeta,{color:theme.muted}]}>{activity}</Text></View></Pressable>{!item.isCurrent?<Pressable accessibilityRole="button" accessibilityLabel={`${copy.manageSession}: ${presentation.label}`} hitSlop={6} onPress={()=>onManage(item)} style={({pressed})=>[styles.manageSession,pressed&&styles.pressed]}><MoreHorizontal size={22} color={theme.icon}/></Pressable>:null}</View>;}
function BottomSheet({visible,onDismiss,dismissLabel,children}:{visible:boolean;onDismiss:()=>void;dismissLabel:string;children:ReactNode}){const{theme}=useAppTheme();return <Modal transparent animationType="slide" visible={visible} onRequestClose={onDismiss}><Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} style={styles.scrim} onPress={onDismiss}><Pressable accessibilityViewIsModal style={[styles.sheet,{backgroundColor:theme.surface}]} onPress={event=>event.stopPropagation()}>{children}</Pressable></Pressable></Modal>;}
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
  safe: { flex: 1 }, keyboardViewport: { flex: 1 }, header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "800" }, scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }, intro: { fontSize: 15, lineHeight: 22, marginBottom: 18 }, passkeysIntro: { fontSize: 15, lineHeight: 22 }, landingBlocks: {}, securityBlock: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, rowCopy: { flex: 1, gap: 7 }, rowHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, rowLabel: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: "700" }, status: { color: "#067647", fontSize: 14, fontWeight: "700" }, rowDetail: { fontSize: 14, lineHeight: 20 }, notificationRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, saving: { fontSize: 12 }, deleteButton: { minHeight: 50, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 32 }, deleteButtonText: { color: flowColors.red, fontSize: 16, fontWeight: "800" }, event: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 }, empty: { paddingVertical: 12 }, modalContent: { padding: 20, paddingBottom: 48, gap: 16 }, form: { gap: 12 }, feedbackSlot: { minHeight: 20, justifyContent: "center" }, resetAlternative: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 12, gap: 2 }, textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }, link: { color: "#1769E0", fontWeight: "700" }, button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 }, buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, disabledButton: { opacity: 0.55 }, buttonText: { color: "white", fontWeight: "800" }, error: { color: "#B42318", fontWeight: "600", lineHeight: 20 }, success: { color: "#067647", fontWeight: "600", lineHeight: 20 }, toastPosition: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 20 }, toast: { maxWidth: 560, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }, toastText: { color: "#067647", fontWeight: "700", textAlign: "center" }, devicesContent: { gap: 10 }, devicesIntro: { fontSize: 15, lineHeight: 22, marginBottom: 2 }, sectionHeading: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: "800", textTransform: "uppercase" }, device: { minHeight: 86, flexDirection: "row", alignItems: "stretch", borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" }, deviceMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, paddingRight: 6 }, deviceCopy: { flex: 1, minWidth: 0, gap: 3 }, deviceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, deviceMeta: { fontSize: 12, lineHeight: 17 }, current: { color: "#1769E0", backgroundColor: "#EAF2FF", borderRadius: 999, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "700" }, manageSession: { width: 48, minHeight: 48, alignSelf: "stretch", alignItems: "center", justifyContent: "flex-start", paddingTop: 8 }, signOutOthers: { minHeight: 48, justifyContent: "center", alignItems: "center", marginTop: 4 }, devicesEmpty: { alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 18 }, scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.34)", justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 8 }, sheetTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800" }, sheetAction: { minHeight: 48, justifyContent: "center", marginTop: 8 }, danger: { color: "#B42318", fontWeight: "700" }, pressed: { opacity: 0.65 },
});
