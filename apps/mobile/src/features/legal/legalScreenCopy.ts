import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type LegalScreenCopy = {
  shareOpen: string;
  share: string;
  openBrowser: string;
  refresh: string;
  refreshFailed: string;
  tableOfContents: string;
};

/** Native legal controls, translated for every locale exposed by the mobile app. */
export const legalScreenCopy: Record<MobileLocale, LegalScreenCopy> = {
  "en-us": { shareOpen: "Share or open", share: "Share", openBrowser: "Open in browser", refresh: "Refresh", refreshFailed: "Couldn't refresh this legal document.", tableOfContents: "Table of contents" },
  "es-es": { shareOpen: "Compartir o abrir", share: "Compartir", openBrowser: "Abrir en el navegador", refresh: "Actualizar", refreshFailed: "No se pudo actualizar este documento legal.", tableOfContents: "Índice" },
  fr: { shareOpen: "Partager ou ouvrir", share: "Partager", openBrowser: "Ouvrir dans le navigateur", refresh: "Actualiser", refreshFailed: "Impossible d’actualiser ce document juridique.", tableOfContents: "Table des matières" },
  "de-de": { shareOpen: "Teilen oder öffnen", share: "Teilen", openBrowser: "Im Browser öffnen", refresh: "Aktualisieren", refreshFailed: "Dieses Rechtsdokument konnte nicht aktualisiert werden.", tableOfContents: "Inhaltsverzeichnis" },
  "it-it": { shareOpen: "Condividi o apri", share: "Condividi", openBrowser: "Apri nel browser", refresh: "Aggiorna", refreshFailed: "Impossibile aggiornare questo documento legale.", tableOfContents: "Indice" },
  "pt-br": { shareOpen: "Compartilhar ou abrir", share: "Compartilhar", openBrowser: "Abrir no navegador", refresh: "Atualizar", refreshFailed: "Não foi possível atualizar este documento jurídico.", tableOfContents: "Índice" },
  nl: { shareOpen: "Delen of openen", share: "Delen", openBrowser: "Openen in browser", refresh: "Vernieuwen", refreshFailed: "Dit juridische document kon niet worden vernieuwd.", tableOfContents: "Inhoudsopgave" },
  ar: { shareOpen: "مشاركة أو فتح", share: "مشاركة", openBrowser: "فتح في المتصفح", refresh: "تحديث", refreshFailed: "تعذر تحديث هذا المستند القانوني.", tableOfContents: "جدول المحتويات" },
  "zh-cn": { shareOpen: "分享或打开", share: "分享", openBrowser: "在浏览器中打开", refresh: "刷新", refreshFailed: "无法刷新此法律文件。", tableOfContents: "目录" },
  ja: { shareOpen: "共有または開く", share: "共有", openBrowser: "ブラウザで開く", refresh: "更新", refreshFailed: "この法的文書を更新できませんでした。", tableOfContents: "目次" },
  ko: { shareOpen: "공유 또는 열기", share: "공유", openBrowser: "브라우저에서 열기", refresh: "새로 고침", refreshFailed: "이 법률 문서를 새로 고칠 수 없습니다.", tableOfContents: "목차" },
  hi: { shareOpen: "साझा करें या खोलें", share: "साझा करें", openBrowser: "ब्राउज़र में खोलें", refresh: "रीफ़्रेश करें", refreshFailed: "यह कानूनी दस्तावेज़ रीफ़्रेश नहीं किया जा सका।", tableOfContents: "विषय सूची" },
  tr: { shareOpen: "Paylaş veya aç", share: "Paylaş", openBrowser: "Tarayıcıda aç", refresh: "Yenile", refreshFailed: "Bu yasal belge yenilenemedi.", tableOfContents: "İçindekiler" },
  pl: { shareOpen: "Udostępnij lub otwórz", share: "Udostępnij", openBrowser: "Otwórz w przeglądarce", refresh: "Odśwież", refreshFailed: "Nie udało się odświeżyć tego dokumentu prawnego.", tableOfContents: "Spis treści" },
  sv: { shareOpen: "Dela eller öppna", share: "Dela", openBrowser: "Öppna i webbläsare", refresh: "Uppdatera", refreshFailed: "Det gick inte att uppdatera det här juridiska dokumentet.", tableOfContents: "Innehållsförteckning" },
  id: { shareOpen: "Bagikan atau buka", share: "Bagikan", openBrowser: "Buka di browser", refresh: "Muat ulang", refreshFailed: "Dokumen hukum ini tidak dapat dimuat ulang.", tableOfContents: "Daftar isi" },
  th: { shareOpen: "แชร์หรือเปิด", share: "แชร์", openBrowser: "เปิดในเบราว์เซอร์", refresh: "รีเฟรช", refreshFailed: "ไม่สามารถรีเฟรชเอกสารทางกฎหมายนี้ได้", tableOfContents: "สารบัญ" },
  vi: { shareOpen: "Chia sẻ hoặc mở", share: "Chia sẻ", openBrowser: "Mở trong trình duyệt", refresh: "Làm mới", refreshFailed: "Không thể làm mới tài liệu pháp lý này.", tableOfContents: "Mục lục" },
};
