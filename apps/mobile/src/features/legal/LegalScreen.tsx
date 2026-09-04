import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { fetchLegalDocument, type MobileLegalDocument } from "../../api/legalApi";
import { PageContentState } from "../../components/PageContentState";
import { PRIVACY_URL, TERMS_URL } from "../../config/legalUrls";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../../theme/AppTheme";
import { FlowIcon } from "../flow/FlowIcon";
import { flowColors, flowStyles } from "../flow/flowStyles";
import { buildLegalHtml } from "./legalHtml";
import { legalScreenCopy } from "./legalScreenCopy";

type LegalScreenProps = { slug: MobileLegalDocument["slug"] };
type LoadState = "api-loading" | "webview-loading" | "ready" | "error";

export function LegalScreen({ slug }: LegalScreenProps) {
  const { theme } = useAppTheme();
  const { locale, t } = useMobileLocalization();
  const [document, setDocument] = useState<MobileLegalDocument | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("api-loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const title = t(slug === "terms-of-service" ? "terms" : "privacy");
  const pageName = slug === "terms-of-service" ? "terms of service" : "privacy policy";
  const publicUrl = slug === "terms-of-service" ? TERMS_URL : PRIVACY_URL;
  const copy = legalScreenCopy[locale];
  const localePresentation = mobileLocales.find((option) => option.code === locale) ?? mobileLocales[0];
  const html = useMemo(() => document ? buildLegalHtml(document, {
    dark: theme.dark,
    lang: localePresentation.intl,
    direction: localePresentation.direction,
  }) : null, [document, localePresentation.direction, localePresentation.intl, theme.dark]);

  const loadInitial = useCallback(() => {
    setDocument(null);
    setRefreshFailed(false);
    setLoadState("api-loading");
    void fetchLegalDocument(slug, locale)
      .then((value) => { setDocument(value); setLoadState("webview-loading"); })
      .catch(() => setLoadState("error"));
  }, [locale, slug]);

  const refresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshFailed(false);
    void fetchLegalDocument(slug, locale)
      .then((value) => setDocument(value))
      .catch(() => setRefreshFailed(true))
      .finally(() => setRefreshing(false));
  }, [locale, refreshing, slug]);

  useEffect(loadInitial, [loadInitial]);

  const shareOrOpen = useCallback(() => {
    void Share.share({ title, message: `${title}\n${publicUrl}`, url: publicUrl });
  }, [publicUrl, title]);

  const handleWebViewError = useCallback(() => {
    setDocument(null);
    setLoadState("error");
  }, []);

  return <SafeAreaView style={[flowStyles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View testID="legal-native-header" style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => router.back()} style={flowStyles.iconButton}>
        <FlowIcon name="back" color={theme.icon} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[flowStyles.title, styles.title, { color: theme.text }]}>{title}</Text>
      <View style={flowStyles.iconButton} />
    </View>

    <View style={styles.documentArea}>
      {html ? <WebView
        testID="legal-document-webview"
        source={{ html, baseUrl: "about:blank" }}
        javaScriptEnabled={false}
        domStorageEnabled={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        incognito
        originWhitelist={["about:blank"]}
        onShouldStartLoadWithRequest={({ url }) => url.startsWith("about:blank")}
        onLoad={() => setLoadState("ready")}
        onError={handleWebViewError}
        style={{ backgroundColor: theme.background }}
      /> : null}
      {loadState === "api-loading" || loadState === "webview-loading" ? <View style={[StyleSheet.absoluteFill, styles.stateOverlay, { backgroundColor: theme.background }]}>
        <PageContentState state="loading" pageName={pageName} />
      </View> : null}
      {loadState === "error" ? <PageContentState state="error" pageName={pageName} onRetry={loadInitial} /> : null}
    </View>

    {document && loadState !== "error" ? <View testID="legal-action-toolbar" style={[styles.toolbar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.shareOpen} onPress={shareOrOpen} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <FlowIcon name="share" color={flowColors.blue} size={19} />
        <Text style={styles.actionText}>{copy.shareOpen}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.refresh} onPress={refresh} disabled={refreshing} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        {refreshing ? <ActivityIndicator size="small" color={flowColors.blue} /> : <FlowIcon name="refresh" color={flowColors.blue} size={19} />}
        <Text style={styles.actionText}>{copy.refresh}</Text>
      </Pressable>
      {refreshFailed ? <View style={styles.refreshError} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Text style={[styles.refreshErrorText, { color: theme.muted }]}>{copy.refreshFailed}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t("retry")} onPress={refresh}><Text style={styles.retryText}>{t("retry")}</Text></Pressable>
      </View> : null}
    </View> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, textAlign: "center" },
  documentArea: { flex: 1 },
  stateOverlay: { zIndex: 2 },
  toolbar: { minHeight: 54, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth },
  action: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, paddingHorizontal: 14 },
  actionText: { color: flowColors.blue, fontSize: 14, lineHeight: 19, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  refreshError: { width: "100%", minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  refreshErrorText: { flexShrink: 1, fontSize: 12, lineHeight: 17 },
  retryText: { color: flowColors.blue, fontSize: 12, lineHeight: 17, fontWeight: "800" },
});
