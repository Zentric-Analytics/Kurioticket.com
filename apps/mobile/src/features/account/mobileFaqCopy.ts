import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type MobileFaqCopy = {
  heading: string;
  intro: string;
  generalQuestions: string;
};

const copy: Record<MobileLocale, MobileFaqCopy> = {
  "en-us": {
    heading: "Frequently asked questions",
    intro: "Learn how Kurioticket helps you compare flights, hotels, and travel options before booking with trusted providers.",
    generalQuestions: "General questions",
  },
  "es-es": {
    heading: "Preguntas frecuentes",
    intro: "Descubre cómo Kurioticket te ayuda a comparar vuelos, hoteles y opciones de viaje antes de reservar con proveedores de confianza.",
    generalQuestions: "Preguntas generales",
  },
  fr: {
    heading: "Questions fréquentes",
    intro: "Découvrez comment Kurioticket vous aide à comparer les vols, les hôtels et les options de voyage avant de réserver auprès de prestataires de confiance.",
    generalQuestions: "Questions générales",
  },
  "de-de": {
    heading: "Häufig gestellte Fragen",
    intro: "Erfahren Sie, wie Kurioticket Ihnen hilft, Flüge, Hotels und Reiseoptionen zu vergleichen, bevor Sie bei vertrauenswürdigen Anbietern buchen.",
    generalQuestions: "Allgemeine Fragen",
  },
  "it-it": {
    heading: "Domande frequenti",
    intro: "Scopri come Kurioticket ti aiuta a confrontare voli, hotel e opzioni di viaggio prima di prenotare con fornitori affidabili.",
    generalQuestions: "Domande generali",
  },
  "pt-br": {
    heading: "Perguntas frequentes",
    intro: "Saiba como a Kurioticket ajuda você a comparar voos, hotéis e opções de viagem antes de reservar com fornecedores confiáveis.",
    generalQuestions: "Perguntas gerais",
  },
  nl: {
    heading: "Veelgestelde vragen",
    intro: "Ontdek hoe Kurioticket je helpt vluchten, hotels en reisopties te vergelijken voordat je boekt bij betrouwbare aanbieders.",
    generalQuestions: "Algemene vragen",
  },
  ar: {
    heading: "الأسئلة الشائعة",
    intro: "تعرّف على كيفية مساعدة Kurioticket لك في مقارنة الرحلات الجوية والفنادق وخيارات السفر قبل الحجز مع مزوّدين موثوقين.",
    generalQuestions: "أسئلة عامة",
  },
  "zh-cn": {
    heading: "常见问题",
    intro: "了解 Kurioticket 如何帮助你比较航班、酒店和旅行选项，并在向可信赖的供应商预订前做出选择。",
    generalQuestions: "常见问题",
  },
  ja: {
    heading: "よくある質問",
    intro: "Kurioticket では、信頼できるプロバイダーで予約する前に、フライト、ホテル、旅行オプションを比較できます。",
    generalQuestions: "一般的な質問",
  },
  ko: {
    heading: "자주 묻는 질문",
    intro: "Kurioticket에서 신뢰할 수 있는 제공업체로 예약하기 전에 항공편, 호텔 및 여행 옵션을 비교하는 방법을 알아보세요.",
    generalQuestions: "일반 질문",
  },
  hi: {
    heading: "अक्सर पूछे जाने वाले प्रश्न",
    intro: "जानें कि Kurioticket भरोसेमंद प्रदाताओं के साथ बुकिंग से पहले उड़ानों, होटलों और यात्रा विकल्पों की तुलना करने में कैसे मदद करता है।",
    generalQuestions: "सामान्य प्रश्न",
  },
  tr: {
    heading: "Sık sorulan sorular",
    intro: "Kurioticket'ın güvenilir sağlayıcılarla rezervasyon yapmadan önce uçuşları, otelleri ve seyahat seçeneklerini karşılaştırmanıza nasıl yardımcı olduğunu öğrenin.",
    generalQuestions: "Genel sorular",
  },
  pl: {
    heading: "Najczęściej zadawane pytania",
    intro: "Dowiedz się, jak Kurioticket pomaga porównywać loty, hotele i opcje podróży przed rezerwacją u zaufanych dostawców.",
    generalQuestions: "Pytania ogólne",
  },
  sv: {
    heading: "Vanliga frågor",
    intro: "Se hur Kurioticket hjälper dig att jämföra flyg, hotell och resealternativ innan du bokar hos betrodda leverantörer.",
    generalQuestions: "Allmänna frågor",
  },
  id: {
    heading: "Pertanyaan yang sering diajukan",
    intro: "Pelajari bagaimana Kurioticket membantu Anda membandingkan penerbangan, hotel, dan pilihan perjalanan sebelum memesan dengan penyedia tepercaya.",
    generalQuestions: "Pertanyaan umum",
  },
  th: {
    heading: "คำถามที่พบบ่อย",
    intro: "ดูว่า Kurioticket ช่วยคุณเปรียบเทียบเที่ยวบิน โรงแรม และตัวเลือกการเดินทางก่อนจองกับผู้ให้บริการที่เชื่อถือได้อย่างไร",
    generalQuestions: "คำถามทั่วไป",
  },
  vi: {
    heading: "Câu hỏi thường gặp",
    intro: "Tìm hiểu cách Kurioticket giúp bạn so sánh chuyến bay, khách sạn và các lựa chọn du lịch trước khi đặt với nhà cung cấp đáng tin cậy.",
    generalQuestions: "Câu hỏi chung",
  },
};

export function getMobileFaqCopy(locale: MobileLocale): MobileFaqCopy {
  return copy[locale];
}
