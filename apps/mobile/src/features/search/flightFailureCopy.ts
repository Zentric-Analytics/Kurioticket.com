import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";
import type { FlightFailureKind } from "./flightResultsStateModel";
// Timeout, connection and unreadable-response copy; supplier text is never used.
const copy: Record<MobileLocale, readonly [string, string, string]> = {
  "en-us": ["Flight search took too long. Please try again.", "Check your connection and try again.", "We couldn't read these flight results. Please try again."],
  "es-es": ["La búsqueda de vuelos tardó demasiado. Inténtalo de nuevo.", "Comprueba tu conexión e inténtalo de nuevo.", "No pudimos leer estos resultados de vuelos. Inténtalo de nuevo."],
  fr: ["La recherche de vols a pris trop de temps. Réessayez.", "Vérifiez votre connexion et réessayez.", "Impossible de lire ces résultats de vols. Réessayez."],
  "de-de": ["Die Flugsuche hat zu lange gedauert. Bitte erneut versuchen.", "Prüfe deine Verbindung und versuche es erneut.", "Diese Flugergebnisse konnten nicht gelesen werden. Bitte erneut versuchen."],
  "it-it": ["La ricerca dei voli ha richiesto troppo tempo. Riprova.", "Controlla la connessione e riprova.", "Non è stato possibile leggere questi risultati dei voli. Riprova."],
  "pt-br": ["A busca de voos demorou demais. Tente novamente.", "Verifique sua conexão e tente novamente.", "Não foi possível ler estes resultados de voos. Tente novamente."],
  nl: ["Het zoeken naar vluchten duurde te lang. Probeer het opnieuw.", "Controleer je verbinding en probeer het opnieuw.", "Deze vluchtresultaten konden niet worden gelezen. Probeer het opnieuw."],
  ar: ["استغرق البحث عن الرحلات وقتًا طويلاً. حاول مرة أخرى.", "تحقق من اتصالك وحاول مرة أخرى.", "تعذرت قراءة نتائج الرحلات هذه. حاول مرة أخرى."],
  "zh-cn": ["航班搜索耗时过长，请重试。", "请检查网络连接后重试。", "无法读取这些航班结果，请重试。"],
  ja: ["航空券の検索に時間がかかりすぎました。もう一度お試しください。", "接続を確認して、もう一度お試しください。", "航空券の検索結果を読み取れませんでした。もう一度お試しください。"],
  ko: ["항공편 검색 시간이 초과되었습니다. 다시 시도해 주세요.", "연결을 확인하고 다시 시도해 주세요.", "항공편 검색 결과를 읽을 수 없습니다. 다시 시도해 주세요."],
  hi: ["उड़ानों की खोज में बहुत समय लगा। फिर से प्रयास करें।", "अपना कनेक्शन जाँचें और फिर से प्रयास करें।", "उड़ानों के ये परिणाम पढ़े नहीं जा सके। फिर से प्रयास करें।"],
  tr: ["Uçuş araması çok uzun sürdü. Lütfen tekrar deneyin.", "Bağlantınızı kontrol edip tekrar deneyin.", "Bu uçuş sonuçları okunamadı. Lütfen tekrar deneyin."],
  pl: ["Wyszukiwanie lotów trwało zbyt długo. Spróbuj ponownie.", "Sprawdź połączenie i spróbuj ponownie.", "Nie można odczytać tych wyników lotów. Spróbuj ponownie."],
  sv: ["Flygsökningen tog för lång tid. Försök igen.", "Kontrollera anslutningen och försök igen.", "Flygresultaten kunde inte läsas. Försök igen."],
  id: ["Pencarian penerbangan terlalu lama. Silakan coba lagi.", "Periksa koneksi Anda dan coba lagi.", "Hasil penerbangan ini tidak dapat dibaca. Silakan coba lagi."],
  th: ["การค้นหาเที่ยวบินใช้เวลานานเกินไป โปรดลองอีกครั้ง", "ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง", "ไม่สามารถอ่านผลการค้นหาเที่ยวบินเหล่านี้ได้ โปรดลองอีกครั้ง"],
  vi: ["Tìm chuyến bay mất quá nhiều thời gian. Vui lòng thử lại.", "Kiểm tra kết nối rồi thử lại.", "Không thể đọc các kết quả chuyến bay này. Vui lòng thử lại."],
};
export function flightFailureBody(kind: FlightFailureKind | undefined, locale: MobileLocale, fallback: string) {
  const localized = copy[locale] ?? copy["en-us"];
  return kind === "timeout" ? localized[0] : kind === "network" ? localized[1] : kind === "response" ? localized[2] : fallback;
}
