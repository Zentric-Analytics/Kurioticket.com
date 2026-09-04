import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { fetchLegalDocument, type MobileLegalDocument } from "../../api/legalApi";
import { PageContentState } from "../../components/PageContentState";
import { PRIVACY_URL, TERMS_URL } from "../../config/legalUrls";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowStyles } from "../flow/flowStyles";
import { buildLegalHtml } from "./legalHtml";

type LegalScreenProps = { slug: MobileLegalDocument["slug"] };

export function LegalScreen({ slug }: LegalScreenProps) {
  const { theme } = useAppTheme();
  const { locale, t } = useMobileLocalization();
  const [document, setDocument] = useState<MobileLegalDocument | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const title = t(slug === "terms-of-service" ? "terms" : "privacy");
  const pageName = slug === "terms-of-service" ? "terms of service" : "privacy policy";
  const publicUrl = slug === "terms-of-service" ? TERMS_URL : PRIVACY_URL;
  const localePresentation = mobileLocales.find((option) => option.code === locale) ?? mobileLocales[0];
  const openInBrowserLabel = `${title}. ${t("externalLinkHint")}`;
  const load = useCallback(() => {
    setDocument(null);
    setStatus("loading");
    void fetchLegalDocument(slug, locale)
      .then((value) => { setDocument(value); setStatus("loaded"); })
      .catch(() => setStatus("error"));
  }, [locale, slug]);
  useEffect(load, [load]);

  return <SafeAreaView style={[flowStyles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => router.dismissTo("/(tabs)/profile")} style={flowStyles.iconButton}><FlowIcon name="back" color={theme.icon} /></Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[flowStyles.title, styles.title, { color: theme.text }]}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={openInBrowserLabel} onPress={() => void Linking.openURL(publicUrl)} style={flowStyles.iconButton}><FlowIcon name="external" color={theme.icon} size={21} /></Pressable>
    </View>
    {status === "loading" ? <PageContentState state="loading" pageName={pageName} /> : null}
    {status === "error" ? <PageContentState state="error" pageName={pageName} onRetry={load} /> : null}
    {status === "loaded" && document ? <WebView
      testID="legal-document-webview"
      source={{ html: buildLegalHtml(document, { dark: theme.dark, lang: localePresentation.intl, direction: localePresentation.direction }), baseUrl: "about:blank" }}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      incognito
      originWhitelist={["*"]}
      onShouldStartLoadWithRequest={({ url }) => url === "about:blank"}
      startInLoadingState
      renderLoading={() => <PageContentState state="loading" pageName={pageName} />}
      onError={() => { setDocument(null); setStatus("error"); }}
      style={{ backgroundColor: theme.background }}
    /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, textAlign: "center" },
});
