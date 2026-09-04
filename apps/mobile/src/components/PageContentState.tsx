import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/AppTheme";
import { flowColors } from "../features/flow/flowStyles";

type PageContentStateProps =
  | { state: "loading"; pageName: string }
  | { state: "error"; pageName: string; onRetry: () => void };

/** A page-level initial-fetch state. The owning screen must render its header separately. */
export function PageContentState(props: PageContentStateProps) {
  const { theme } = useAppTheme();
  if (props.state === "loading") {
    const label = `Loading ${props.pageName}…`;
    return <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator color={flowColors.blue} />
      <Text style={[styles.message, { color: theme.muted }]}>{label}</Text>
    </View>;
  }

  return <View style={styles.container} accessibilityLiveRegion="assertive">
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Couldn't load {props.pageName}</Text>
    <Text accessibilityRole="alert" style={[styles.message, { color: theme.muted }]}>Check your connection and try again.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={props.onRetry} style={styles.retry}>
      <Text style={styles.retryText}>Try again</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  retry: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  retryText: { color: flowColors.blue, fontWeight: "800" },
});
