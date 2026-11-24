import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { fetchLegalDocument, type MobileLegalDocument } from "../../api/legalApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import { appFonts } from "../../theme/typography";
import { buildLegalHtml } from "./legalHtml";
import { legalScreenCopy } from "./legalScreenCopy";

/** Read the existing canonical policy without starting a website cookie
 * session. This sits inside the same native consent modal; no route change,
 * extra modal, or consent mutation is required to return to the draft. */
export function CookiePolicyReader({ onClose }: { onClose: () => void }) {
  const { theme } = useAppTheme();
  const { locale, direction } = useMobileLocalization();
  const insets = useSafeAreaInsets();
  const [document, setDocument] = useState<MobileLegalDocument | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setDocument(null);
    setFailed(false);
    void fetchLegalDocument("cookie-policy", locale)
      .then(value => { if (active) setDocument(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [locale, attempt]);
  const html = document ? buildLegalHtml(document, {
    dark: theme.dark,
    lang: mobileLocales.find(option => option.code === locale)?.intl ?? "en-US",
    direction,
    tableOfContentsFallback: legalScreenCopy[locale].tableOfContents,
  }) : null;
  return <View accessibilityViewIsModal style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{document?.title ?? "Cookie policy"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close cookie policy" onPress={onClose} style={styles.close}>
        <X color={theme.icon} size={22} accessible={false}/>
      </Pressable>
    </View>
    {failed ? <View style={styles.center}>
      <Text accessibilityRole="alert" style={[styles.body, { color: theme.text }]}>Unable to load the Cookie policy. Please try again.</Text>
      <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={styles.close}>
        <Text style={[styles.body, { color: theme.dark ? "#8EB7FF" : "#004BB8" }]}>Try again</Text>
      </Pressable>
    </View> : html ? <WebView
      source={{ html, baseUrl: "about:blank" }}
      style={{ flex: 1, backgroundColor: theme.background }}
      originWhitelist={["about:blank"]}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      onShouldStartLoadWithRequest={({ url }) => url === "about:blank" || url.startsWith("about:blank#")}
      onError={() => setFailed(true)}
    /> : <View style={styles.center}><ActivityIndicator color={theme.icon}/><Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.muted }]}>Loading Cookie policy…</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontFamily: appFonts.semibold, fontSize: 19, flex: 1 },
  close: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  body: { fontFamily: appFonts.regular, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
