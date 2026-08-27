import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlowIcon } from "../src/features/flow/FlowIcon";
import { useMobileLocalization } from "../src/localization/MobileLocalizationProvider";
import { mobileLocales } from "../src/localization/mobileLocalizationCatalog";
import { useAppTheme } from "../src/theme/AppTheme";

export default function LanguageScreen() {
  const { theme } = useAppTheme();
  const { locale, setLocale, t } = useMobileLocalization();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.touch}>
          <FlowIcon name="back" color={theme.icon} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t("language")}</Text>
        <View style={styles.touch} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {mobileLocales.map((option) => {
          const selected = locale === option.code;
          return (
            <Pressable
              key={option.code}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}, ${option.description}${selected ? ", selected" : ""}`}
              accessibilityState={{ checked: selected }}
              onPress={() => void setLocale(option.code)}
              style={[
                styles.row,
                { borderBottomColor: theme.border },
                selected && { backgroundColor: theme.priceAlertSurface },
              ]}
            >
              <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.flagSlot}>
                <Text style={styles.flag}>{option.flag}</Text>
              </View>
              <View style={styles.textSlot}>
                <Text style={[styles.label, { color: theme.text }]}>{option.label}</Text>
                <Text numberOfLines={1} style={[styles.description, { color: theme.textMuted }]}>{option.description}</Text>
              </View>
              <View style={styles.checkSlot}>
                {selected ? <FlowIcon name="check" color="#0754F7" /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { height: 62, flexDirection: "row", alignItems: "center" },
  touch: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800" },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  row: {
    minHeight: 74,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flagSlot: { width: 30, alignItems: "center", justifyContent: "center", marginRight: 12 },
  flag: { fontSize: 27, lineHeight: 32 },
  textSlot: { flex: 1 },
  label: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  checkSlot: { width: 30, alignItems: "flex-end", justifyContent: "center" },
});
