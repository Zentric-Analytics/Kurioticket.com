import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Search, SlidersHorizontal } from "lucide-react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { ui } from "./SearchUi";
import type { FlightResultsStateKind } from "./flightResultsStateModel";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { flightResultsUiCopy } from "./flightResultsSummary";

export function FlightResultsState({
  state,
  onRetry,
  onEditSearch,
  onClearFilters,
  onAdjustFilters,
}: {
  state: Exclude<FlightResultsStateKind, "loading">;
  onRetry: () => void;
  onEditSearch: () => void;
  onClearFilters: () => void;
  onAdjustFilters: () => void;
}) {
  const { theme } = useAppTheme();
  const { locale } = useMobileLocalization();
  const copy = flightResultsUiCopy(locale);

  const filtered = state === "filtered-empty";
  const error = state === "error";
  const Icon = filtered ? SlidersHorizontal : error ? AlertCircle : Search;
  const title = filtered ? copy.noFilterTitle : error ? copy.loadErrorTitle : copy.noResultsTitle;
  const body = filtered
    ? copy.noFilterBody
    : error
      ? copy.loadErrorBody
      : copy.noResultsBody;

  return (
    <View accessibilityLiveRegion="polite" style={styles.state}>
      <View style={[styles.icon, { backgroundColor: theme.surface }]}>
        <Icon size={21} color={error ? theme.textSecondary : ui.blue} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      <View style={styles.actions}>
        <StateAction
          accessibilityLabel={filtered ? copy.clearFilters : error ? copy.tryAgain : copy.editSearch}
          label={filtered ? copy.clearFilters : error ? copy.tryAgain : copy.editSearch}
          onPress={filtered ? onClearFilters : error ? onRetry : onEditSearch}
        />
        {filtered ? (
          <StateAction accessibilityLabel={copy.adjustFilters} label={copy.adjustFilters} onPress={onAdjustFilters} secondary />
        ) : error ? (
          <StateAction accessibilityLabel={copy.editSearch} label={copy.editSearch} onPress={onEditSearch} secondary />
        ) : null}
      </View>
    </View>
  );
}

function StateAction({ accessibilityLabel, label, onPress, secondary = false }: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        secondary
          ? { borderColor: theme.border, backgroundColor: theme.surface }
          : { borderColor: ui.blue, backgroundColor: ui.blue },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, { color: secondary ? theme.textPrimary : "white" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  state: { minHeight: 210, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, paddingVertical: 28 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: "800", textAlign: "center" },
  body: { marginTop: 4, fontSize: 13, lineHeight: 18, textAlign: "center" },
  actions: { width: "100%", maxWidth: 280, marginTop: 18, gap: 9 },
  action: { minHeight: 46, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  actionText: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  pressed: { opacity: 0.68 },
});
