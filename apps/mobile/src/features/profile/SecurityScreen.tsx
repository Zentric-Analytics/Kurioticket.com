import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { travelApi, TravelApiError, type SecurityEvent, type SecurityOverview, type SecuritySession } from "../../api/travelApi";
import { clearSession, readSession } from "../../storage/sessionStorage";
import { useAppTheme } from "../../theme/AppTheme";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors } from "../flow/flowStyles";

const WEB = "https://kurioticket.com/dashboard/security";
const copy = {
  "en-us": { title: "Security", intro: "Manage sign-in and account security for your Kurioticket account.", loading: "Loading security settings…", loadError: "Unable to load security settings.", retry: "Try again", back: "Go back", close: "Close", password: "Password", passwordHelp: "Change the password used to sign in to your account.", configured: "Configured", notConfigured: "Not configured", current: "Current password", next: "New password", confirm: "Confirm new password", show: "Show password", hide: "Hide password", change: "Change password", changing: "Changing…", passwordRules: "Use at least 8 characters and choose a different password.", passwordInvalid: "Check that passwords match, contain at least 8 characters, and differ from the current password.", passwordSuccess: "Password changed. Other devices were signed out.", oauth: "This account does not have a password. Use password reset to create one.", reset: "Email password reset link", resetSent: "If the account can receive reset email, instructions were sent.", twoFactor: "Two-factor authentication", twoFactorHelp: "Add extra protection with an authenticator app.", passkeys: "Passkeys", passkeysHelp: "Use your device screen lock, Face ID, fingerprint, password manager, or security key to sign in faster and more securely.", activeSessions: "Active sessions", activeSessionsHelp: "Review devices signed in to your account.", yourDevices: "Your devices", devicesHelp: "Review devices that have recently accessed your account.", currentDevice: "Current device", lastActive: "Last active", remove: "Remove device", removeTitle: "Remove this device?", removeBody: "This device will need to sign in again.", cancel: "Cancel", removeFailed: "Unable to remove this device.", signOutAll: "Sign out everywhere", signOutAllHelp: "End every web and mobile session connected to your account.", signOutTitle: "Sign out everywhere?", signOutBody: "Every web and mobile session, including this device, will be ended.", signOutFailed: "Unable to sign out every device. Try again.", notifications: "Security notifications", alertsHelp: "Receive important email about account security.", saving: "Saving…", saved: "Saved", saveFailed: "Unable to save. Your previous setting is unchanged.", activity: "Security activity", activityHelp: "Review recent sign-ins and security changes.", empty: "No recent security activity.", deleteAccount: "Delete account", openFailed: "Unable to open the secure web experience.", unknown: "Security update" },
  "es-es": { title: "Seguridad", intro: "Gestiona el acceso y la seguridad de tu cuenta de Kurioticket.", loading: "Cargando configuración de seguridad…", loadError: "No se pudo cargar la configuración de seguridad.", retry: "Intentar de nuevo", back: "Volver", close: "Cerrar", password: "Contraseña", passwordHelp: "Cambia la contraseña que usas para acceder a tu cuenta.", configured: "Configurada", notConfigured: "No configurada", current: "Contraseña actual", next: "Nueva contraseña", confirm: "Confirmar nueva contraseña", show: "Mostrar contraseña", hide: "Ocultar contraseña", change: "Cambiar contraseña", changing: "Cambiando…", passwordRules: "Usa al menos 8 caracteres y elige una contraseña diferente.", passwordInvalid: "Comprueba que coincidan, tengan al menos 8 caracteres y sean diferentes de la actual.", passwordSuccess: "Contraseña cambiada. Se cerraron las otras sesiones.", oauth: "Esta cuenta no tiene contraseña. Usa el restablecimiento para crear una.", reset: "Enviar enlace de restablecimiento", resetSent: "Si la cuenta puede recibir el correo, se enviaron instrucciones.", twoFactor: "Autenticación en dos pasos", twoFactorHelp: "Añade protección adicional con una aplicación de autenticación.", passkeys: "Llaves de acceso", passkeysHelp: "Usa el bloqueo de pantalla, Face ID, huella digital, gestor de contraseñas o llave de seguridad para acceder de forma más rápida y segura.", activeSessions: "Sesiones activas", activeSessionsHelp: "Revisa los dispositivos con sesiones abiertas en tu cuenta.", yourDevices: "Tus dispositivos", devicesHelp: "Revisa los dispositivos que han accedido recientemente a tu cuenta.", currentDevice: "Dispositivo actual", lastActive: "Última actividad", remove: "Eliminar dispositivo", removeTitle: "¿Eliminar este dispositivo?", removeBody: "Este dispositivo tendrá que iniciar sesión de nuevo.", cancel: "Cancelar", removeFailed: "No se pudo eliminar el dispositivo.", signOutAll: "Cerrar sesión en todas partes", signOutAllHelp: "Finaliza todas las sesiones web y móviles conectadas a tu cuenta.", signOutTitle: "¿Cerrar sesión en todas partes?", signOutBody: "Finalizarán todas las sesiones web y móviles, incluida esta.", signOutFailed: "No se pudo cerrar sesión en todos los dispositivos. Inténtalo de nuevo.", notifications: "Notificaciones de seguridad", alertsHelp: "Recibe correos importantes sobre la seguridad de la cuenta.", saving: "Guardando…", saved: "Guardado", saveFailed: "No se pudo guardar. Se mantiene la opción anterior.", activity: "Actividad de seguridad", activityHelp: "Revisa los inicios de sesión y cambios de seguridad recientes.", empty: "No hay actividad de seguridad reciente.", deleteAccount: "Eliminar cuenta", openFailed: "No se pudo abrir la experiencia web segura.", unknown: "Actualización de seguridad" },
} as const;
const eventLabels: Record<string, { en: string; es: string }> = { PASSWORD_CHANGED: { en: "Password changed", es: "Contraseña cambiada" }, SIGN_IN: { en: "Signed in", es: "Inicio de sesión" }, MOBILE_SESSION_CREATED: { en: "Mobile session started", es: "Sesión móvil iniciada" }, SESSION_REVOKED: { en: "Device removed", es: "Dispositivo eliminado" }, ALL_SESSIONS_REVOKED: { en: "Signed out everywhere", es: "Sesión cerrada en todas partes" } };

export function SecurityScreen() {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const c = copy[locale];
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const preferenceRequest = useRef(0);

  const unauth = useCallback(async (e: unknown) => {
    if (e instanceof TravelApiError && e.status === 401) {
      await clearSession();
      router.replace({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/security" } });
      return true;
    }
    return false;
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (!await readSession()) { router.replace({ pathname: "/(tabs)/profile/sign-in", params: { returnTo: "/security" } }); return; }
      const [o, s, a] = await Promise.all([travelApi.securityOverview(), travelApi.securitySessions(), travelApi.securityActivity()]);
      setOverview(o.overview); setSessions(s.sessions); setEvents(a.events);
    } catch (e) { if (!await unauth(e)) setError(c.loadError); } finally { setLoading(false); }
  }, [c.loadError, unauth]);
  useEffect(() => { void load(); }, [load]);

  const web = () => void Linking.canOpenURL(WEB).then((ok) => ok ? Linking.openURL(WEB) : Promise.reject()).catch(() => setError(c.openFailed));
  const change = async () => {
    if (submitting) return;
    if (passwords.newPassword.length < 8 || passwords.newPassword !== passwords.confirmPassword || passwords.currentPassword === passwords.newPassword) { setError(c.passwordInvalid); return; }
    setSubmitting(true); setError("");
    try {
      await travelApi.changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setVisible(false); setPasswordOpen(false); setMessage(c.passwordSuccess);
      AccessibilityInfo.announceForAccessibility(c.passwordSuccess);
      await load();
    } catch (e) { if (!await unauth(e)) setError(e instanceof TravelApiError ? e.message : c.loadError); } finally { setSubmitting(false); }
  };
  const reset = async () => {
    setError("");
    try { await travelApi.requestAccountPasswordReset(); setMessage(c.resetSent); AccessibilityInfo.announceForAccessibility(c.resetSent); } catch (e) { if (!await unauth(e)) setError(c.loadError); }
  };
  const toggle = async (value: boolean) => {
    if (!overview) return;
    const previous = overview.securityEmailAlerts; const id = ++preferenceRequest.current;
    setOverview({ ...overview, securityEmailAlerts: value }); setSaving(true); setMessage(""); setError("");
    try {
      const r = await travelApi.updateSecurityPreference(value);
      if (id === preferenceRequest.current) { setOverview((v) => v ? { ...v, securityEmailAlerts: r.preferences.securityEmailAlerts } : v); setMessage(c.saved); AccessibilityInfo.announceForAccessibility(c.saved); }
    } catch (e) {
      if (id === preferenceRequest.current) { setOverview((v) => v ? { ...v, securityEmailAlerts: previous } : v); if (!await unauth(e)) setError(c.saveFailed); }
    } finally { if (id === preferenceRequest.current) setSaving(false); }
  };
  const remove = (item: SecuritySession) => Alert.alert(c.removeTitle, c.removeBody, [{ text: c.cancel, style: "cancel" }, { text: c.remove, style: "destructive", onPress: () => void travelApi.revokeSecuritySession(item.id).then(() => load()).catch(async (e) => { if (!await unauth(e)) setError(c.removeFailed); }) }]);
  const all = () => Alert.alert(c.signOutTitle, c.signOutBody, [{ text: c.cancel, style: "cancel" }, { text: c.signOutAll, style: "destructive", onPress: () => void travelApi.revokeAllSecuritySessions().then(async () => { await clearSession(); router.replace("/(tabs)/profile/sign-in"); }).catch(async (e) => { if (!await unauth(e)) setError(c.signOutFailed); }) }]);
  const date = (value: string) => new Intl.DateTimeFormat(locale === "es-es" ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const eventLabel = (event: SecurityEvent) => eventLabels[event.type]?.[locale === "es-es" ? "es" : "en"] || c.unknown;
  const field = (key: keyof typeof passwords, label: string) => <TextInput accessibilityLabel={label} secureTextEntry={!visible} value={passwords[key]} onChangeText={(value) => setPasswords((v) => ({ ...v, [key]: value }))} placeholder={label} placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]} />;

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <Header title={c.title} backLabel={c.back} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[styles.intro, { color: theme.muted }]}>{c.intro}</Text>
      {loading ? <Text style={{ color: theme.muted }}>{c.loading}</Text> : null}
      <Feedback error={error} message={message} retry={c.retry} onRetry={load} />
      {overview ? <>
        <View style={styles.landingBlocks}>
          <SecurityBlock label={c.password} description={c.passwordHelp} accessibilityValue={overview.hasPassword ? c.configured : c.notConfigured} onPress={() => { setError(""); setPasswordOpen(true); }} />
          <SecurityBlock label={c.twoFactor} description={c.twoFactorHelp} onPress={web} />
          <SecurityBlock label={c.passkeys} description={c.passkeysHelp} onPress={web} />
          <SecurityBlock label={c.activeSessions} description={c.activeSessionsHelp} onPress={() => { setError(""); setDevicesOpen(true); }} />
          <View style={[styles.notificationRow, { borderBottomColor: theme.border }]}><View style={styles.rowCopy}><Text style={[styles.rowLabel, { color: theme.text }]}>{c.notifications}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{c.alertsHelp}</Text>{saving ? <Text style={[styles.saving, { color: theme.muted }]}>{c.saving}</Text> : null}</View><Switch accessibilityLabel={`${c.notifications}. ${c.alertsHelp}`} accessibilityRole="switch" accessibilityState={{ checked: overview.securityEmailAlerts, busy: saving }} value={overview.securityEmailAlerts} onValueChange={(value) => void toggle(value)} /></View>
          <SecurityBlock label={c.activity} description={c.activityHelp} onPress={() => setActivityOpen(true)} />
          <SecurityBlock label={c.signOutAll} description={c.signOutAllHelp} destructive chevron={false} onPress={all} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={c.deleteAccount} onPress={web} style={({ pressed }) => [styles.deleteButton, { borderColor: flowColors.red }, pressed && styles.pressed]}><Text style={styles.deleteButtonText}>{c.deleteAccount}</Text></Pressable>
      </> : null}
    </ScrollView>

    <ScreenModal visible={passwordOpen} title={c.change} closeLabel={c.close} onClose={() => setPasswordOpen(false)}>
      <Feedback error={error} message="" />
      {overview?.hasPassword ? <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={styles.form}>{field("currentPassword", c.current)}{field("newPassword", c.next)}{field("confirmPassword", c.confirm)}<Pressable accessibilityRole="button" accessibilityLabel={visible ? c.hide : c.show} onPress={() => setVisible((v) => !v)} style={styles.textAction}><Text style={styles.link}>{visible ? c.hide : c.show}</Text></Pressable><Text style={{ color: theme.muted }}>{c.passwordRules}</Text><Button label={submitting ? c.changing : c.change} disabled={submitting} onPress={() => void change()} /></View></KeyboardAvoidingView> : <View style={styles.form}><Text style={{ color: theme.muted }}>{c.oauth}</Text><Button label={c.reset} onPress={() => void reset()} /></View>}
    </ScreenModal>
    <ScreenModal visible={devicesOpen} title={c.yourDevices} closeLabel={c.close} onClose={() => setDevicesOpen(false)}>
      <Text style={[styles.intro, { color: theme.muted }]}>{c.devicesHelp}</Text><Feedback error={error} message="" />
      {sessions.map((item) => <View key={item.id} style={[styles.device, { borderBottomColor: theme.border }]}><View style={styles.deviceHeading}><Text style={[styles.rowLabel, { color: theme.text }]}>{item.deviceLabel}</Text>{item.isCurrent ? <Text style={styles.current}>{c.currentDevice}</Text> : null}</View><Text style={{ color: theme.muted }}>{item.client} · {item.browser} · {item.os}</Text>{item.maskedIp ? <Text style={{ color: theme.muted }}>{item.maskedIp}</Text> : null}<Text style={{ color: theme.muted }}>{c.lastActive}: {date(item.lastSeenAt)}</Text>{!item.isCurrent ? <Pressable accessibilityRole="button" accessibilityLabel={`${c.remove}: ${item.deviceLabel}`} onPress={() => remove(item)} style={styles.removeTouch}><Text style={styles.danger}>{c.remove}</Text></Pressable> : null}</View>)}
    </ScreenModal>
    <ScreenModal visible={activityOpen} title={c.activity} closeLabel={c.close} onClose={() => setActivityOpen(false)}>
      {events.length ? events.map((event) => <EventRow key={event.id} label={eventLabel(event)} date={date(event.occurredAt)} />) : <Text style={[styles.empty, { color: theme.muted }]}>{c.empty}</Text>}
    </ScreenModal>
  </SafeAreaView>;
}

function Header({ title, backLabel, onBack, close = false }: { title: string; backLabel: string; onBack: () => void; close?: boolean }) { const { theme } = useAppTheme(); return <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.iconButton}><FlowIcon name={close ? "close" : "back"} color={theme.icon} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text><View style={styles.iconButton} /></View>; }
function ScreenModal({ visible, title, closeLabel, onClose, children }: { visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) { const { theme } = useAppTheme(); return <Modal animationType="slide" presentationStyle="fullScreen" visible={visible} onRequestClose={onClose}><SafeAreaView accessibilityViewIsModal style={[styles.safe, { backgroundColor: theme.background }]}><Header title={title} backLabel={closeLabel} onBack={onClose} close /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{children}</ScrollView></SafeAreaView></Modal>; }
function SecurityBlock({ label, description, onPress, accessibilityValue, destructive = false, chevron = true }: { label: string; description: string; onPress: () => void; accessibilityValue?: string; destructive?: boolean; chevron?: boolean }) { const { theme } = useAppTheme(); return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined} onPress={onPress} style={({ pressed }) => [styles.securityBlock, { borderBottomColor: theme.border }, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={[styles.rowLabel, { color: destructive ? flowColors.red : theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{description}</Text></View>{chevron ? <FlowIcon name="chevron" color={theme.muted} size={18} /> : null}</Pressable>; }
function EventRow({ label, date }: { label: string; date: string }) { const { theme } = useAppTheme(); return <View style={[styles.event, { borderBottomColor: theme.border }]}><Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text><Text style={[styles.rowDetail, { color: theme.muted }]}>{date}</Text></View>; }
function Feedback({ error, message, retry, onRetry }: { error: string; message: string; retry?: string; onRetry?: () => Promise<void> }) { return <>{error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry && onRetry ? <Pressable accessibilityRole="button" onPress={() => void onRetry()} style={styles.textAction}><Text style={styles.link}>{retry}</Text></Pressable> : null}</View> : null}{message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}</>; }
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24, fontWeight: "800" }, scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }, intro: { fontSize: 15, lineHeight: 22, marginBottom: 18 }, landingBlocks: {}, securityBlock: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, rowCopy: { flex: 1, gap: 7 }, rowLabel: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: "700" }, rowDetail: { fontSize: 14, lineHeight: 20 }, notificationRow: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18 }, saving: { fontSize: 12 }, deleteButton: { minHeight: 50, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 32 }, deleteButtonText: { color: flowColors.red, fontSize: 16, fontWeight: "800" }, event: { gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 }, empty: { paddingVertical: 12 }, modalContent: { padding: 20, paddingBottom: 48, gap: 16 }, form: { gap: 12 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, textAction: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" }, link: { color: "#1769E0", fontWeight: "700" }, button: { minHeight: 50, borderRadius: 10, backgroundColor: "#1769E0", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 }, buttonText: { color: "white", fontWeight: "800" }, error: { color: "#B42318", fontWeight: "600" }, success: { color: "#067647", fontWeight: "600" }, device: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, gap: 5 }, deviceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, current: { color: "#1769E0", fontSize: 12, fontWeight: "700" }, removeTouch: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginTop: 3 }, danger: { color: "#B42318", fontWeight: "700" }, pressed: { opacity: 0.65 },
});
