import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from "react-native";
import { usePathname, useSegments } from "expo-router";
import { pageViewKey } from "@/lib/pageViewCatalog";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Minus, Plus, X } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { visitorIdentity } from "./visitorIdentity";

function useConsentSnapshot() {
  const [state, setState] = useState(visitorIdentity.snapshot);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) setState(visitorIdentity.snapshot()); };
    const unsubscribe = visitorIdentity.subscribe(update);
    void visitorIdentity.load().then(update);
    return () => { active = false; unsubscribe(); };
  }, []);
  return state;
}

function Action({ label, onPress, secondary = false, disabled = false }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.action, { backgroundColor: secondary ? theme.surface : "#004BB8", borderColor: secondary ? theme.border : "#004BB8", opacity: disabled ? 0.6 : 1 }]}>
    <Text style={[styles.actionText, { color: secondary ? theme.text : "#FFFFFF" }]}>{label}</Text>
  </Pressable>;
}

function Category({ title, subtitle, description, analytics, unavailable, checked, disabled, onChange }: {
  title: string; subtitle: string; description: string; analytics?: boolean; unavailable?: boolean; checked?: boolean;
  disabled?: boolean; onChange?: (value: boolean) => void;
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const ExpandIcon = expanded ? Minus : Plus;
  return <View style={[styles.category, { borderColor: theme.border }]}>
    <View style={styles.categoryRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.categoryLabel}>
        <ExpandIcon size={17} color={theme.dark ? "#8EB7FF" : "#004BB8"} accessible={false} />
        <View style={styles.flex}>
          <Text style={[styles.label, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text>
        </View>
      </Pressable>
      {analytics ? <Switch accessibilityLabel="Analytics sharing"
        accessibilityHint="Allow optional app usage and travel activity measurement, including account-linked activity when signed in."
        accessibilityRole="switch" accessibilityState={{ checked: !!checked, disabled: !!disabled }}
        disabled={disabled} value={!!checked} onValueChange={onChange}
        trackColor={{ false: theme.dark ? "#33435D" : "#ADB8C8", true: "#004BB8" }} thumbColor="#FFFFFF" />
        : <Text style={[styles.active, { color: unavailable ? theme.muted : theme.dark ? "#91D9B5" : "#17664A" }]}>{unavailable ? "Not available" : "Always active"}</Text>}
    </View>
    {expanded ? <Text style={[styles.description, { color: theme.muted, borderTopColor: theme.border }]}>{description}</Text> : null}
  </View>;
}

/** One native presentation for initial consent and settings. Existing identity
 * storage and network permissions remain authoritative; the draft is local UI. */
function PrivacySheet({ visible, initial, editing, onOpen, onClose, onDone, current }: {
  visible: boolean; initial: boolean; editing: boolean; onOpen: () => void; onClose: () => void;
  onDone: () => void; current: boolean;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const savingRef = useRef(false);

  const close = () => {
    if (savingRef.current) return;
    setDraft(current);
    setError(false);
    if (editing) onClose();
  };
  async function choose(value: boolean) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(false);
    try {
      await visitorIdentity.choose(value);
      onDone();
    } catch {
      // Existing coordinator fails closed on storage errors. Never treat
      // an unsuccessful opt-in as granted or silently retry it.
      setError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const details = editing || !initial;
  const title = details ? "Privacy preferences" : "We value your privacy";

  return <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen"
    statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
    <View style={[styles.overlay, { paddingTop: insets.top + 8, paddingLeft: insets.left, paddingRight: insets.right }]} accessibilityViewIsModal onAccessibilityEscape={close}>
      <View style={[styles.sheet, { backgroundColor: theme.surface, maxHeight: Math.min(height - insets.top - 8, 680) }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text accessibilityRole="header" style={[styles.title, styles.flex, { color: theme.text }]}>{title}</Text>
          {details ? <Pressable accessibilityRole="button" accessibilityLabel="Close privacy preferences" disabled={saving} onPress={close} style={[styles.close, { backgroundColor: theme.background }]}>
            <X size={20} color={theme.icon} accessible={false} />
          </Pressable> : null}
        </View>
        <ScrollView bounces={false} overScrollMode="never" style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={[styles.body, { color: theme.muted }]}>{details
            ? "Choose how Kurioticket uses app data to support and improve your experience. Optional sharing is your choice."
            : "Essential app functions keep Kurioticket secure and working. With your permission, optional analytics helps us understand and improve your experience. You can change your choice at any time under Profile → About & legal."}</Text>
          {details ? <>
            <View style={styles.actions}><View style={styles.flex}><Action label="Essential only" disabled={saving} onPress={() => void choose(false)} /></View><View style={styles.flex}><Action label="Accept all" disabled={saving} onPress={() => void choose(true)} /></View></View>
            <Text accessibilityRole="header" style={[styles.label, { color: theme.text }]}>Manage your preferences</Text>
            <Category title="Essential app functions" subtitle="Keeps Kurioticket secure and working"
              description="Supports security, sign-in, requested travel searches and necessary search-to-provider handoff records. This does not enable optional behavioural analytics." />
            <Category title="Analytics sharing" subtitle={initial && current ? "Review your choice · not enabled until saved" : "Helps us understand your experience"}
              description="With your permission, we measure app engagement and travel activity, including account-linked activity when you sign in. Turning analytics off does not prevent requested searches or necessary records."
              analytics checked={draft} disabled={saving} onChange={setDraft} />
            <Category title="Performance sharing" subtitle="Helps measure speed and reliability" description="Optional performance measurement could help us understand loading times, responsiveness and technical issues. This separate preference is not available yet and is not enabled by Accept all. Essential service diagnostics are separate." unavailable />
             <Category title="Marketing sharing" subtitle="Helps measure campaigns and relevant promotions" description="Optional marketing measurement is not available yet and is not enabled by Accept all." unavailable />
          </> : null}
          {saving ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.muted }]}>Saving your choice…</Text> : null}
          {error ? <Text accessibilityRole="alert" style={[styles.body, { color: theme.text }]}>We couldn't save your preferences. Optional analytics is off for now. Please try again.</Text> : null}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {details ? <Action label={initial && draft ? "Allow analytics" : "Save preferences"} disabled={saving} onPress={() => void choose(draft)} /> : <>
            <Action label="Privacy preferences" secondary disabled={saving} onPress={onOpen} />
            <View style={styles.actions}>
              <View style={styles.flex}><Action label="Essential only" disabled={saving} onPress={() => void choose(false)} /></View>
              <View style={styles.flex}><Action label="Accept all" disabled={saving} onPress={() => void choose(true)} /></View>
            </View>
          </>}
        </View>
      </View>
    </View>
  </Modal>;
}

/** Prompt once per review version on the first eligible customer screen.
 * Exclude bootstrap, auth, recovery, legal and provider handoff screens. */
export function NativeFirstVisitPrivacyPrompt() {
  const state = useConsentSnapshot();
  const pathname = usePathname();
  const segments = useSegments() as readonly string[];
  const key = pageViewKey(pathname, "native");
  const focused = Boolean(key && !["privacy_policy", "cookie_policy", "terms", "legal", "security", "personal_information"].includes(key)
    && pathname !== "/home" && (pathname !== "/" || segments.includes("(tabs)")));
  const [editing, setEditing] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [initialDraft, setInitialDraft] = useState(false);
  useEffect(() => {
    if (focused && state.loaded && state.reviewRequired && !started && !completed) {
      // Preserve prior refusals. A suggestion is never the stored permission.
      setInitialDraft(state.choice !== "declined");
      setStarted(true);
    }
  }, [focused, state.loaded, state.reviewRequired, state.choice, started, completed]);
  if (!started || completed) return null;
  return <PrivacySheet visible={focused} initial editing={editing} current={initialDraft}
    onOpen={() => setEditing(true)} onClose={() => setEditing(false)}
    onDone={() => { setCompleted(true); setEditing(false); }} />;
}

/** Discreet withdrawal/review control within the existing About & legal card. */
export function AnalyticsConsentControl() {
  const { theme } = useAppTheme();
  const state = useConsentSnapshot();
  const [editing, setEditing] = useState(false);
  const enabled = state.choice === "granted";
  const status = state.reviewRequired && state.loaded ? "Review your privacy choice before optional analytics can connect." : state.error
    ? enabled ? "Analytics sharing is on, but this device is not connected. Try again." : state.pending ? "Analytics sharing is off. Withdrawal will finish when connected." : "Unable to save analytics sharing. Please try again."
    : state.pending ? enabled ? "Connecting analytics…" : "Finishing withdrawal…"
      : enabled ? state.tracking ? "Analytics is ready on this device." : "Analytics sharing is on, but this device is not connected. Try again." : "";
  const canRetry = state.error || (state.loaded && enabled && !state.reviewRequired && !state.tracking && !state.pending);

  return <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Manage analytics consent" disabled={!state.loaded}
      accessibilityState={{ disabled: !state.loaded }} onPress={() => setEditing(true)} style={styles.settingsRow}>
      <View style={styles.flex}>
        <Text style={[styles.label, { color: theme.text }]}>Manage analytics consent</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{!state.loaded ? "Loading preferences…" : state.reviewRequired ? "Review your choice" : enabled ? "Optional analytics on" : "Optional analytics off"}</Text>
      </View>
      <ChevronRight size={20} color={theme.icon} accessible={false} />
    </Pressable>
    {status ? <Text accessibilityRole={state.error ? "alert" : undefined} accessibilityLiveRegion="polite" style={[styles.settingsStatus, { color: theme.muted }]}>{status}</Text> : null}
    {canRetry ? <Pressable accessibilityRole="button" accessibilityLabel="Retry analytics connection" onPress={() => { void visitorIdentity.refresh(); }} style={styles.retry}><Text style={[styles.label, { color: theme.text }]}>Try again</Text></Pressable> : null}
    {editing ? <PrivacySheet visible initial={false} editing current={enabled}
      onOpen={() => setEditing(true)} onClose={() => setEditing(false)} onDone={() => setEditing(false)} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2, 16, 35, 0.46)" },
  sheet: { width: "100%", maxWidth: 600, alignSelf: "center", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: appFonts.semibold, fontSize: 22, lineHeight: 29, letterSpacing: -0.5 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 20, gap: 12 },
  body: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: appFonts.semibold, fontSize: 14, lineHeight: 20 },
  subtitle: { fontFamily: appFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  active: { fontFamily: appFonts.semibold, fontSize: 12, maxWidth: 82, textAlign: "right" },
  category: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, minHeight: 68, paddingVertical: 8 },
  categoryLabel: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  description: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, fontFamily: appFonts.regular, fontSize: 13, lineHeight: 20 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  actions: { flexDirection: "row", gap: 8 },
  action: { minHeight: 48, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 10, paddingVertical: 12 },
  actionText: { fontFamily: appFonts.semibold, fontSize: 14, lineHeight: 20, textAlign: "center" },
  settingsRow: { minHeight: 64, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  settingsStatus: { paddingHorizontal: 14, paddingBottom: 12, fontFamily: appFonts.regular, fontSize: 13, lineHeight: 19 },
  retry: { minHeight: 44, paddingHorizontal: 14, paddingBottom: 12, justifyContent: "center", alignSelf: "flex-start" },
});
