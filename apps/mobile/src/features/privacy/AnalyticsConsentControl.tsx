import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { visitorIdentity } from "./visitorIdentity";

/** The same opt-in control is available to guests and signed-in accounts. */
export function AnalyticsConsentControl() {
  const { theme } = useAppTheme();
  const [state, setState] = useState(visitorIdentity.snapshot);
  useEffect(() => {
    const update = () => setState(visitorIdentity.snapshot());
    const unsubscribe = visitorIdentity.subscribe(update);
    void visitorIdentity.load().then(update);
    return unsubscribe;
  }, []);
  const enabled = state.choice === "granted";
  const status = state.error
    ? enabled ? "Your choice is saved. The analytics connection is pending." : state.pending ? "Analytics sharing is off on this device. Withdrawal will finish when connected." : "Unable to save the analytics choice. Please try again."
    : state.pending ? enabled ? "Connecting analytics…" : "Finishing withdrawal…" : "";

  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={styles.row}>
      <FlowIcon strokeWidth={1.3} name="shield" color={theme.dark ? theme.icon : "#1A1A1A"} />
      <Text style={[styles.label, { color: theme.dark ? theme.text : "#1A1A1A" }]}>Analytics sharing</Text>
      <Switch
        accessibilityLabel="Analytics sharing"
        accessibilityHint="Allow optional device-based search and deal activity to be linked, including to your account when you sign in."
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled, disabled: !state.loaded }}
        disabled={!state.loaded}
        value={enabled}
        onValueChange={value => { void visitorIdentity.choose(value).catch(() => undefined); }}
      />
    </View>
    <Text style={[styles.description, { color: theme.muted }]}>Allow Kurioticket to connect your searches and provider handoffs on this device to help improve the service. This activity can be linked to your account when you sign in. You can turn this off at any time.</Text>
    {status ? <Text accessibilityRole={state.error ? "alert" : undefined} accessibilityLiveRegion="polite" style={[styles.status, { color: theme.muted }]}>{status}</Text> : null}
    {state.error ? <Pressable accessibilityRole="button" accessibilityLabel="Retry analytics connection" onPress={() => { void visitorIdentity.refresh(); }} style={styles.retry}><Text style={{ color: theme.text, fontWeight: "700" }}>Try again</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  row: { minHeight: 58, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flex: 1, fontWeight: "700" },
  description: { paddingHorizontal: 14, paddingBottom: 14, fontSize: 13, lineHeight: 19 },
  status: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 13, lineHeight: 18 },
  retry: { minHeight: 44, paddingHorizontal: 14, paddingBottom: 12, justifyContent: "center", alignSelf: "flex-start" },
});
