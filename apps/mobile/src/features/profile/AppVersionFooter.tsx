import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
import { useSyncExternalStore } from "react";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import { useAppTheme } from "../../theme/AppTheme";
import { formatPreviewDiagnostics } from "../../diagnostics/buildDiagnostics";
import { getRuntimeDiagnostics } from "../../diagnostics/runtimeDiagnostics";
import { getUpdateCheckDiagnostics, subscribeToUpdateCheckDiagnostics } from "../../updates/updateCheckDiagnostics";

export function AppVersionFooter() {
  const { theme } = useAppTheme();
  const { t } = useMobileLocalization();
  const version = Constants.expoConfig?.version;
  const updateCheck = useSyncExternalStore(subscribeToUpdateCheckDiagnostics, getUpdateCheckDiagnostics, getUpdateCheckDiagnostics);
  if (!version) return null;
  const label = `${t("version")} ${version}`;
  const isPreview = Constants.expoConfig?.extra?.environment?.isPreview === true;
  if (!isPreview) return <Text accessibilityLabel={label} style={[styles.text, { color: theme.muted }]}>{label}</Text>;
  const lines = formatPreviewDiagnostics(getRuntimeDiagnostics(), updateCheck);
  return <View accessibilityLabel={lines.join(". ")} style={styles.preview}><Text style={[styles.heading, { color: theme.text }]}>Preview delivery diagnostics</Text>{lines.map(line => <Text key={line} style={[styles.detail, { color: theme.muted }]}>{line}</Text>)}</View>;
}

const styles = StyleSheet.create({ text: { marginTop: 14, textAlign: "center", fontSize: 12, lineHeight: 18 }, preview: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "rgba(7,84,247,0.06)" }, heading: { textAlign: "center", fontSize: 12, lineHeight: 18, fontWeight: "700", marginBottom: 3 }, detail: { textAlign: "center", fontSize: 11, lineHeight: 16 } });
