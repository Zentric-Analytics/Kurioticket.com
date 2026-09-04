import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type LegalScreenCopy = {
  shareOpen: string;
  refresh: string;
  refreshFailed: string;
};

/** Native legal controls, translated for every locale exposed by the mobile app. */
export const legalScreenCopy: Record<MobileLocale, LegalScreenCopy> = {
  "en-us": { shareOpen: "Share or open", refresh: "Refresh", refreshFailed: "Couldn't refresh this legal document." },
  "es-es": { shareOpen: "Compartir o abrir", refresh: "Actualizar", refreshFailed: "No se pudo actualizar este documento legal." },
  fr: { shareOpen: "Partager ou ouvrir", refresh: "Actualiser", refreshFailed: "Impossible d’actualiser ce document juridique." },
  "de-de": { shareOpen: "Teilen oder öffnen", refresh: "Aktualisieren", refreshFailed: "Dieses Rechtsdokument konnte nicht aktualisiert werden." },
  "it-it": { shareOpen: "Condividi o apri", refresh: "Aggiorna", refreshFailed: "Impossibile aggiornare questo documento legale." },
  "pt-br": { shareOpen: "Compartilhar ou abrir", refresh: "Atualizar", refreshFailed: "Não foi possível atualizar este documento jurídico." },
  nl: { shareOpen: "Delen of openen", refresh: "Vernieuwen", refreshFailed: "Dit juridische document kon niet worden vernieuwd." },
  ar: { shareOpen: "مشاركة أو فتح", refresh: "تحديث", refreshFailed: "تعذر تحديث هذا المستند القانوني." },
  "zh-cn": { shareOpen: "分享或打开", refresh: "刷新", refreshFailed: "无法刷新此法律文件。" },
  ja: { shareOpen: "共有または開く", refresh: "更新", refreshFailed: "この法的文書を更新できませんでした。" },
  ko: { shareOpen: "공유 또는 열기", refresh: "새로 고침", refreshFailed: "이 법률 문서를 새로 고칠 수 없습니다." },
  hi: { shareOpen: "साझा करें या खोलें", refresh: "रीफ़्रेश करें", refreshFailed: "यह कानूनी दस्तावेज़ रीफ़्रेश नहीं किया जा सका।" },
  tr: { shareOpen: "Paylaş veya aç", refresh: "Yenile", refreshFailed: "Bu yasal belge yenilenemedi." },
  pl: { shareOpen: "Udostępnij lub otwórz", refresh: "Odśwież", refreshFailed: "Nie udało się odświeżyć tego dokumentu prawnego." },
  sv: { shareOpen: "Dela eller öppna", refresh: "Uppdatera", refreshFailed: "Det gick inte att uppdatera det här juridiska dokumentet." },
  id: { shareOpen: "Bagikan atau buka", refresh: "Muat ulang", refreshFailed: "Dokumen hukum ini tidak dapat dimuat ulang." },
  th: { shareOpen: "แชร์หรือเปิด", refresh: "รีเฟรช", refreshFailed: "ไม่สามารถรีเฟรชเอกสารทางกฎหมายนี้ได้" },
  vi: { shareOpen: "Chia sẻ hoặc mở", refresh: "Làm mới", refreshFailed: "Không thể làm mới tài liệu pháp lý này." },
};
