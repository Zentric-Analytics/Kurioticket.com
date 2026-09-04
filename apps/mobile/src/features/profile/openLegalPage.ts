import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../config/legalUrls";
import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

export const LEGAL_URLS = {
  terms: TERMS_URL,
  privacy: PRIVACY_URL,
} as const;

export type LegalPage = keyof typeof LEGAL_URLS;

type LegalBrowserCopy = {
  accessibilityHint: string;
  errorTitle: string;
  errorMessage: string;
};

const LEGAL_BROWSER_COPY: Readonly<Record<MobileLocale, LegalBrowserCopy>> = {
  "en-us": {
    accessibilityHint: "Opens in an in-app browser",
    errorTitle: "Couldn't open this page",
    errorMessage: "Please try again.",
  },
  "es-es": {
    accessibilityHint: "Se abre en un navegador dentro de la aplicación",
    errorTitle: "No se pudo abrir esta página",
    errorMessage: "Inténtalo de nuevo.",
  },
  fr: {
    accessibilityHint: "S’ouvre dans un navigateur intégré à l’application",
    errorTitle: "Impossible d’ouvrir cette page",
    errorMessage: "Veuillez réessayer.",
  },
  "de-de": {
    accessibilityHint: "Wird in einem In-App-Browser geöffnet",
    errorTitle: "Diese Seite konnte nicht geöffnet werden",
    errorMessage: "Bitte versuche es erneut.",
  },
  "it-it": {
    accessibilityHint: "Si apre in un browser interno all’app",
    errorTitle: "Impossibile aprire questa pagina",
    errorMessage: "Riprova.",
  },
  "pt-br": {
    accessibilityHint: "Abre em um navegador dentro do aplicativo",
    errorTitle: "Não foi possível abrir esta página",
    errorMessage: "Tente novamente.",
  },
  nl: {
    accessibilityHint: "Opent in een browser binnen de app",
    errorTitle: "Kan deze pagina niet openen",
    errorMessage: "Probeer het opnieuw.",
  },
  ar: {
    accessibilityHint: "يفتح في متصفح داخل التطبيق",
    errorTitle: "تعذر فتح هذه الصفحة",
    errorMessage: "يرجى المحاولة مرة أخرى.",
  },
  "zh-cn": {
    accessibilityHint: "在应用内浏览器中打开",
    errorTitle: "无法打开此页面",
    errorMessage: "请重试。",
  },
  ja: {
    accessibilityHint: "アプリ内ブラウザで開きます",
    errorTitle: "このページを開けませんでした",
    errorMessage: "もう一度お試しください。",
  },
  ko: {
    accessibilityHint: "앱 내 브라우저에서 열립니다",
    errorTitle: "이 페이지를 열 수 없습니다",
    errorMessage: "다시 시도해 주세요.",
  },
  hi: {
    accessibilityHint: "ऐप के अंदर ब्राउज़र में खुलता है",
    errorTitle: "यह पेज नहीं खुल सका",
    errorMessage: "कृपया फिर से कोशिश करें।",
  },
  tr: {
    accessibilityHint: "Uygulama içi tarayıcıda açılır",
    errorTitle: "Bu sayfa açılamadı",
    errorMessage: "Lütfen tekrar deneyin.",
  },
  pl: {
    accessibilityHint: "Otwiera się w przeglądarce w aplikacji",
    errorTitle: "Nie udało się otworzyć tej strony",
    errorMessage: "Spróbuj ponownie.",
  },
  sv: {
    accessibilityHint: "Öppnas i en webbläsare i appen",
    errorTitle: "Det gick inte att öppna den här sidan",
    errorMessage: "Försök igen.",
  },
  id: {
    accessibilityHint: "Dibuka di browser dalam aplikasi",
    errorTitle: "Halaman ini tidak dapat dibuka",
    errorMessage: "Silakan coba lagi.",
  },
  th: {
    accessibilityHint: "เปิดในเบราว์เซอร์ภายในแอป",
    errorTitle: "ไม่สามารถเปิดหน้านี้ได้",
    errorMessage: "โปรดลองอีกครั้ง",
  },
  vi: {
    accessibilityHint: "Mở trong trình duyệt bên trong ứng dụng",
    errorTitle: "Không thể mở trang này",
    errorMessage: "Vui lòng thử lại.",
  },
};

let browserOpen = false;

export function legalBrowserAccessibilityHint(locale: MobileLocale): string {
  return LEGAL_BROWSER_COPY[locale].accessibilityHint;
}

export async function openLegalPage(page: LegalPage, locale: MobileLocale): Promise<void> {
  if (browserOpen) return;

  browserOpen = true;
  try {
    await WebBrowser.openBrowserAsync(LEGAL_URLS[page]);
  } catch {
    const copy = LEGAL_BROWSER_COPY[locale];
    Alert.alert(copy.errorTitle, copy.errorMessage);
  } finally {
    browserOpen = false;
  }
}
