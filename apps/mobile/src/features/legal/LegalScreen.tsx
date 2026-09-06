import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WebView } from "react-native-webview";
import { fetchLegalDocument, type MobileLegalDocument } from "../../api/legalApi";
import { PageContentState } from "../../components/PageContentState";
import { getRuntimeEnvironment } from "../../config/environment";
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

function LegalShareIcon({ color, size = 22 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M12 15V3m0 0L8 7m4-4 4 4" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 10H6.5A2.5 2.5 0 0 0 4 12.5v6A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-6a2.5 2.5 0 0 0-2.5-2.5H16" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

export function LegalScreen({ slug }: LegalScreenProps) {
  const { theme } = useAppTheme();
  const { locale, t } = useMobileLocalization();
  const runtimeEnvironment = getRuntimeEnvironment();
  const previewWebMode = runtimeEnvironment.isPreview;
  const previewWebOrigin = runtimeEnvironment.apiBaseUrl.replace(/\/$/, "");
  const [document, setDocument] = useState<MobileLegalDocument | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("api-loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [webViewRevision, setWebViewRevision] = useState(0);
  const refreshPreviousDocument = useRef<MobileLegalDocument | null>(null);
  const refreshRenderPending = useRef(false);
  const title = t(slug === "terms-of-service" ? "terms" : "privacy");
  const pageName = slug === "terms-of-service" ? "terms of service" : "privacy policy";
  const productionPublicUrl = slug === "terms-of-service" ? TERMS_URL : PRIVACY_URL;
  const previewPublicUrl = `${previewWebOrigin}${slug === "terms-of-service" ? "/terms" : "/privacy"}`;
  const publicUrl = previewWebMode ? previewPublicUrl : productionPublicUrl;
  const copy = legalScreenCopy[locale];
  const localePresentation = mobileLocales.find((option) => option.code === locale) ?? mobileLocales[0];
  const html = useMemo(() => document ? buildLegalHtml(document, {
    dark: theme.dark,
    lang: localePresentation.intl,
    direction: localePresentation.direction,
    tableOfContentsFallback: copy.tableOfContents,
  }) : null, [copy.tableOfContents, document, localePresentation.direction, localePresentation.intl, theme.dark]);

  const loadInitial = useCallback(() => {
    refreshPreviousDocument.current = null;
    refreshRenderPending.current = false;
    setDocument(null);
    setRefreshing(false);
    setRefreshFailed(false);
    setActionMenuOpen(false);
    if (previewWebMode) {
      setLoadState("webview-loading");
      return;
    }
    setLoadState("api-loading");
    void fetchLegalDocument(slug, locale)
      .then((value) => { setDocument(value); setLoadState("webview-loading"); })
      .catch(() => setLoadState("error"));
  }, [locale, previewWebMode, slug]);

  const refresh = useCallback(() => {
    if (refreshing || loadState !== "ready") return;
    setActionMenuOpen(false);
    setRefreshing(true);
    setRefreshFailed(false);
    if (previewWebMode) {
      setLoadState("webview-loading");
      setWebViewRevision((revision) => revision + 1);
      return;
    }
    if (!document) {
      setRefreshing(false);
      return;
    }
    refreshPreviousDocument.current = document;
    refreshRenderPending.current = false;
    void fetchLegalDocument(slug, locale)
      .then((value) => {
        refreshRenderPending.current = true;
        setDocument(value);
        // A fresh key guarantees the controlled HTML is rendered again even when
        // the API returns byte-for-byte identical legal content.
        setWebViewRevision((revision) => revision + 1);
      })
      .catch(() => {
        refreshPreviousDocument.current = null;
        setRefreshFailed(true);
        setRefreshing(false);
      });
  }, [document, loadState, locale, previewWebMode, refreshing, slug]);

  useEffect(loadInitial, [loadInitial]);

  const share = useCallback(() => {
    setActionMenuOpen(false);
    void Share.share({ title, message: `${title}\n${publicUrl}`, url: publicUrl });
  }, [publicUrl, title]);

  const openInBrowser = useCallback(() => {
    setActionMenuOpen(false);
    void Linking.openURL(publicUrl);
  }, [publicUrl]);

  const handleWebViewLoad = useCallback(() => {
    if (previewWebMode) {
      setRefreshing(false);
      setRefreshFailed(false);
      setLoadState("ready");
      return;
    }
    if (refreshRenderPending.current) {
      refreshRenderPending.current = false;
      refreshPreviousDocument.current = null;
      setRefreshing(false);
      setRefreshFailed(false);
      return;
    }
    setLoadState("ready");
  }, [previewWebMode]);

  const handleWebViewError = useCallback(() => {
    if (previewWebMode) {
      setRefreshing(false);
      setLoadState("error");
      return;
    }
    if (refreshRenderPending.current && refreshPreviousDocument.current) {
      const previous = refreshPreviousDocument.current;
      refreshRenderPending.current = false;
      refreshPreviousDocument.current = null;
      setDocument(previous);
      setWebViewRevision((revision) => revision + 1);
      setRefreshFailed(true);
      setRefreshing(false);
      return;
    }
    setDocument(null);
    setLoadState("error");
  }, [previewWebMode]);

  return <SafeAreaView style={[flowStyles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
    <View testID="legal-native-header" style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("back")} onPress={() => router.back()} style={flowStyles.iconButton}>
        <FlowIcon name="back" color={theme.icon} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={[flowStyles.title, styles.title, { color: theme.text }]}>{title}</Text>
      <View style={flowStyles.iconButton} />
    </View>

    <View style={styles.documentArea}>
      {previewWebMode ? <WebView
        key={`${slug}-preview-web-${webViewRevision}`}
        testID="legal-document-webview"
        source={{ uri: publicUrl }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        incognito
        originWhitelist={[`${previewWebOrigin}/*`]}
        onShouldStartLoadWithRequest={({ url }) => url === previewWebOrigin || url.startsWith(`${previewWebOrigin}/`)}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        style={{ backgroundColor: theme.background }}
      /> : html ? <WebView
        key={`${slug}-${locale}-${webViewRevision}`}
        testID="legal-document-webview"
        source={{ html, baseUrl: "about:blank" }}
        javaScriptEnabled={false}
        domStorageEnabled={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        incognito
        originWhitelist={["about:blank"]}
        onShouldStartLoadWithRequest={({ url }) => url.startsWith("about:blank")}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        style={{ backgroundColor: theme.background }}
      /> : null}
      {loadState === "api-loading" || loadState === "webview-loading" ? <View style={[StyleSheet.absoluteFill, styles.stateOverlay, { backgroundColor: theme.background }]}>
        <PageContentState state="loading" pageName={pageName} />
      </View> : null}
      {loadState === "error" ? <PageContentState state="error" pageName={pageName} onRetry={loadInitial} /> : null}
    </View>

    {(previewWebMode || document) && loadState === "ready" ? <View testID="legal-action-dock" style={[styles.toolbarDock, { backgroundColor: theme.background }]}>
      {actionMenuOpen ? <View testID="legal-action-menu" style={[styles.actionMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.share} onPress={share} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
          <Text style={[styles.menuText, { color: theme.text }]}>{copy.share}</Text>
        </Pressable>
        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={copy.openBrowser} onPress={openInBrowser} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
          <Text style={[styles.menuText, { color: theme.text }]}>{copy.openBrowser}</Text>
        </Pressable>
      </View> : null}

      <View testID="legal-action-toolbar" style={[styles.toolbarPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.shareOpen}
          onPress={() => setActionMenuOpen((open) => !open)}
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
        >
          <LegalShareIcon color={theme.icon} size={22} />
        </Pressable>
        <View style={[styles.pillDivider, { backgroundColor: theme.border }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.refresh}
          onPress={refresh}
          disabled={refreshing}
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
        >
          {refreshing ? <ActivityIndicator size="small" color={theme.icon} /> : <FlowIcon name="refresh" color={theme.icon} size={22} />}
        </Pressable>
      </View>

      {refreshFailed ? <View style={[styles.refreshError, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
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
  toolbarDock: { minHeight: 66, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 6 },
  toolbarPill: { width: 112, height: 52, flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 26, overflow: "hidden" },
  iconAction: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  pillDivider: { width: StyleSheet.hairlineWidth, height: 24 },
  actionMenu: { position: "absolute", right: 14, bottom: 64, width: 188, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5, zIndex: 4 },
  menuItem: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16 },
  menuText: { fontSize: 14, lineHeight: 19, fontWeight: "600" },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  pressed: { opacity: 0.62 },
  refreshError: { position: "absolute", right: 14, bottom: 64, maxWidth: 260, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  refreshErrorText: { flexShrink: 1, fontSize: 12, lineHeight: 17 },
  retryText: { color: flowColors.blue, fontSize: 12, lineHeight: 17, fontWeight: "800" },
});
