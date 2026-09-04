import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type SellerNoticeValues = { companyName: string; registrationNumber: string };
type FooterCopy = {
  tagline: string;
  rights: string;
  privacy: string;
  terms: string;
  cookies: string;
  sellerNotice?: (values: SellerNoticeValues) => string;
};

// Compact native projection of the current canonical web footer translations.
export const hotelResultsFooterCopy: Record<MobileLocale, FooterCopy> = {
  "en-us": { tagline: "Search flights, hotels, and travel deals with confidence.", rights: "All rights reserved.", privacy: "Privacy", terms: "Terms", cookies: "Cookies" },
  "es-es": { tagline: "Busca vuelos, hoteles y ofertas de viaje con confianza.", rights: "Todos los derechos reservados.", privacy: "Privacidad", terms: "Términos", cookies: "Cookies" },
  fr: { tagline: "Recherchez des vols, hôtels et offres de voyage en toute confiance.", rights: "Tous droits réservés.", privacy: "Confidentialité", terms: "Conditions", cookies: "Cookies" },
  "de-de": { tagline: "Suchen Sie Flüge, Hotels und Reiseangebote mit Vertrauen.", rights: "Alle Rechte vorbehalten.", privacy: "Datenschutz", terms: "Bedingungen", cookies: "Cookies" },
  "it-it": { tagline: "Cerca voli, hotel e offerte di viaggio con fiducia.", rights: "Tutti i diritti riservati.", privacy: "Riservatezza", terms: "Termini", cookies: "Cookie" },
  "pt-br": { tagline: "Pesquise voos, hotéis e ofertas de viagem com confiança.", rights: "Todos os direitos reservados.", privacy: "Privacidade", terms: "Termos", cookies: "Cookies" },
  nl: { tagline: "Zoek met vertrouwen naar vluchten, hotels en huurauto’s.", rights: "Alle rechten voorbehouden.", privacy: "Privacy", terms: "Voorwaarden", cookies: "Cookies" },
  ar: { tagline: "ابحث عن الرحلات والفنادق وعروض السفر بثقة.", rights: "جميع الحقوق محفوظة.", privacy: "الخصوصية", terms: "الشروط", cookies: "ملفات تعريف الارتباط" },
  "zh-cn": { tagline: "更清晰地比较，更安心地规划。", rights: "保留所有权利。", privacy: "隐私", terms: "条款", cookies: "Cookie" },
  ja: { tagline: "航空券、ホテル、旅行のお得情報を安心して検索できます。", rights: "無断転載を禁じます。", privacy: "プライバシー", terms: "規約", cookies: "Cookie" },
  ko: { tagline: "항공권, 호텔, 여행 특가를 안심하고 검색하세요.", rights: "모든 권리 보유.", privacy: "개인정보", terms: "약관", cookies: "쿠키" },
  hi: { tagline: "उड़ानें, होटल और यात्रा डील्स आत्मविश्वास के साथ खोजें।", rights: "सर्वाधिकार सुरक्षित।", privacy: "गोपनीयता", terms: "शर्तें", cookies: "कुकीज़" },
  tr: { tagline: "Uçuşları, otelleri ve seyahat fırsatlarını güvenle arayın.", rights: "Tüm hakları saklıdır.", privacy: "Gizlilik", terms: "Şartlar", cookies: "Çerezler" },
  pl: { tagline: "Wyszukuj loty, hotele i oferty podróży z pewnością.", rights: "All rights reserved.", privacy: "Prywatność", terms: "Warunki", cookies: "Pliki cookie" },
  sv: { tagline: "Sök flyg, hotell och reseerbjudanden med trygghet.", rights: "Alla rättigheter förbehållna.", privacy: "Integritet", terms: "Villkor", cookies: "Cookies" },
  id: {
    tagline: "Cari penerbangan, hotel, dan promo perjalanan dengan percaya diri.",
    rights: "Semua hak dilindungi.",
    privacy: "Privasi",
    terms: "Ketentuan",
    cookies: "Cookie",
    sellerNotice: ({ companyName, registrationNumber }) =>
      `${companyName} — Nomor Pendaftaran Penjual Perjalanan California ${registrationNumber}. Pendaftaran sebagai penjual perjalanan tidak berarti persetujuan dari Negara Bagian California.`,
  },
  th: { tagline: "ค้นหาเที่ยวบิน โรงแรม และดีลการเดินทางได้อย่างมั่นใจ", rights: "All rights reserved.", privacy: "ความเป็นส่วนตัว", terms: "ข้อกำหนด", cookies: "คุกกี้" },
  vi: {
    tagline: "Tìm kiếm chuyến bay, khách sạn và ưu đãi du lịch một cách tự tin.",
    rights: "Bảo lưu mọi quyền.",
    privacy: "Quyền riêng tư",
    terms: "Điều khoản",
    cookies: "Cookie",
    sellerNotice: ({ companyName, registrationNumber }) =>
      `${companyName} — Số đăng ký Người bán dịch vụ du lịch California ${registrationNumber}. Việc đăng ký là người bán dịch vụ du lịch không đồng nghĩa với sự chấp thuận của Tiểu bang California.`,
  },
};
