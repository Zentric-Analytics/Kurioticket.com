import Constants from "expo-constants";
import { StyleSheet, Text } from "react-native";
import { useMobileLocalization } from "../../localization/MobileLocalization";
import { useAppTheme } from "../../theme/AppTheme";

export function AppVersionFooter() {
  const { theme } = useAppTheme();
  const { t } = useMobileLocalization();
  const version = Constants.expoConfig?.version;
  if (!version) return null;
  const label = `${t("version")} ${version}`;
  return <Text accessibilityLabel={label} style={[styles.text, { color: theme.muted }]}>{label}</Text>;
}

const styles = StyleSheet.create({ text: { marginTop: 14, textAlign: "center", fontSize: 12, lineHeight: 18 } });
