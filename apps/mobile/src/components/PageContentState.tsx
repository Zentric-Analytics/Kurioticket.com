import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMobileLocalization } from "../localization/MobileLocalizationProvider";
import type { MobileLocale, MobileTranslationKey } from "../localization/mobileLocalizationCatalog";
import { useAppTheme } from "../theme/AppTheme";
import { flowColors } from "../features/flow/flowStyles";

type PageContentStateProps =
  | { state: "loading"; pageName: string }
  | { state: "error"; pageName: string; onRetry: () => void };

type PageStateCopy = {
  loading: (pageName: string) => string;
  loadError: (pageName: string) => string;
  connectionError: string;
};

const PAGE_NAME_KEYS: Readonly<Record<string, MobileTranslationKey>> = {
  "personal details": "personalDetails",
  "security settings": "securitySettings",
  "email preferences": "emailPreferences",
  "travel preferences": "travelPreferences",
  notifications: "notifications",
  "price alerts": "priceAlerts",
  "recent searches": "recentSearches",
  "saved items": "savedItems",
};

const PAGE_STATE_COPY: Readonly<Record<MobileLocale, PageStateCopy>> = {
  "en-us": {
    loading: (pageName) => `Loading ${pageName}…`,
    loadError: (pageName) => `Couldn't load ${pageName}`,
    connectionError: "Check your connection and try again.",
  },
  "es-es": {
    loading: (pageName) => `Cargando ${pageName}…`,
    loadError: (pageName) => `No se pudo cargar ${pageName}`,
    connectionError: "Comprueba tu conexión e inténtalo de nuevo.",
  },
  fr: {
    loading: (pageName) => `Chargement de ${pageName}…`,
    loadError: (pageName) => `Impossible de charger ${pageName}`,
    connectionError: "Vérifiez votre connexion et réessayez.",
  },
  "de-de": {
    loading: (pageName) => `${pageName} wird geladen…`,
    loadError: (pageName) => `${pageName} konnte nicht geladen werden`,
    connectionError: "Prüfe deine Verbindung und versuche es erneut.",
  },
  "it-it": {
    loading: (pageName) => `Caricamento di ${pageName}…`,
    loadError: (pageName) => `Impossibile caricare ${pageName}`,
    connectionError: "Controlla la connessione e riprova.",
  },
  "pt-br": {
    loading: (pageName) => `Carregando ${pageName}…`,
    loadError: (pageName) => `Não foi possível carregar ${pageName}`,
    connectionError: "Verifique sua conexão e tente novamente.",
  },
  nl: {
    loading: (pageName) => `${pageName} laden…`,
    loadError: (pageName) => `Kan ${pageName} niet laden`,
    connectionError: "Controleer je verbinding en probeer het opnieuw.",
  },
  ar: {
    loading: (pageName) => `جارٍ تحميل ${pageName}…`,
    loadError: (pageName) => `تعذر تحميل ${pageName}`,
    connectionError: "تحقق من اتصالك وحاول مرة أخرى.",
  },
  "zh-cn": {
    loading: (pageName) => `正在加载${pageName}…`,
    loadError: (pageName) => `无法加载${pageName}`,
    connectionError: "请检查网络连接后重试。",
  },
  ja: {
    loading: (pageName) => `${pageName}を読み込み中…`,
    loadError: (pageName) => `${pageName}を読み込めませんでした`,
    connectionError: "接続を確認してもう一度お試しください。",
  },
  ko: {
    loading: (pageName) => `${pageName} 불러오는 중…`,
    loadError: (pageName) => `${pageName}을(를) 불러올 수 없습니다`,
    connectionError: "연결을 확인하고 다시 시도해 주세요.",
  },
  hi: {
    loading: (pageName) => `${pageName} लोड हो रहा है…`,
    loadError: (pageName) => `${pageName} लोड नहीं हो सका`,
    connectionError: "अपना इंटरनेट कनेक्शन जांचें और फिर से कोशिश करें।",
  },
  tr: {
    loading: (pageName) => `${pageName} yükleniyor…`,
    loadError: (pageName) => `${pageName} yüklenemedi`,
    connectionError: "Bağlantınızı kontrol edip tekrar deneyin.",
  },
  pl: {
    loading: (pageName) => `Ładowanie: ${pageName}…`,
    loadError: (pageName) => `Nie udało się wczytać: ${pageName}`,
    connectionError: "Sprawdź połączenie i spróbuj ponownie.",
  },
  sv: {
    loading: (pageName) => `Läser in ${pageName}…`,
    loadError: (pageName) => `Det gick inte att läsa in ${pageName}`,
    connectionError: "Kontrollera anslutningen och försök igen.",
  },
  id: {
    loading: (pageName) => `Memuat ${pageName}…`,
    loadError: (pageName) => `Tidak dapat memuat ${pageName}`,
    connectionError: "Periksa koneksi Anda lalu coba lagi.",
  },
  th: {
    loading: (pageName) => `กำลังโหลด${pageName}…`,
    loadError: (pageName) => `ไม่สามารถโหลด${pageName}ได้`,
    connectionError: "ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
  },
  vi: {
    loading: (pageName) => `Đang tải ${pageName}…`,
    loadError: (pageName) => `Không thể tải ${pageName}`,
    connectionError: "Hãy kiểm tra kết nối rồi thử lại.",
  },
};

/** A page-level initial-fetch state. The owning screen must render its header separately. */
export function PageContentState(props: PageContentStateProps) {
  const { theme } = useAppTheme();
  const { locale, t } = useMobileLocalization();
  const copy = PAGE_STATE_COPY[locale];
  const pageNameKey = PAGE_NAME_KEYS[props.pageName];
  const pageName = pageNameKey ? t(pageNameKey) : props.pageName;

  if (props.state === "loading") {
    const label = copy.loading(pageName);
    return <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator color={flowColors.blue} />
      <Text style={[styles.message, { color: theme.muted }]}>{label}</Text>
    </View>;
  }

  const title = copy.loadError(pageName);
  const retryLabel = t("retry");
  return <View style={styles.container} accessibilityLiveRegion="assertive">
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
    <Text accessibilityRole="alert" style={[styles.message, { color: theme.muted }]}>{copy.connectionError}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={props.onRetry} style={styles.retry}>
      <Text style={styles.retryText}>{retryLabel}</Text>
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
