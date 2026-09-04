import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchLoadingPresentation, type SearchLoadingProduct } from "../../../../../src/shared/presentation/searchLoadingPresentation";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { useAppTheme } from "../../theme/AppTheme";

export function NativeTravelSearchLoadingScreen({ product }: { product: SearchLoadingProduct }) {
  const { locale, direction } = useMobileLocalization();
  const { theme } = useAppTheme();
  const presentation = searchLoadingPresentation(product, locale);
  const alignment = direction === "rtl" ? "right" : "center";

  return <SafeAreaView
    style={[styles.safe, { backgroundColor: theme.dark ? theme.background : "#F7FAFF" }]}
    accessibilityRole="progressbar"
    accessibilityState={{ busy: true }}
    accessibilityLabel={`${presentation.title}. ${presentation.supportingText}`}
    accessibilityLiveRegion="polite"
  >
    <View style={styles.content}>
      <Image
        source={require("../../../assets/kurioticket-logo-primary-light-bg.png")}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible={false}
        style={styles.logo}
      />
      <Text style={[styles.title, { color: theme.textPrimary, textAlign: alignment }]}>{presentation.title}</Text>
      <Text style={[styles.supporting, { color: theme.textSecondary, textAlign: alignment }]}>{presentation.supportingText}</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "center" },
  content: { alignItems: "center", alignSelf: "center", width: "100%", maxWidth: 420, paddingHorizontal: 32, transform: [{ translateY: -16 }] },
  logo: { width: 194, height: 56 },
  title: { width: "100%", marginTop: 31, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  supporting: { width: "100%", marginTop: 11, fontSize: 15, lineHeight: 22 },
});
