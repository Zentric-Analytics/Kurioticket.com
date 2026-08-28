import type { MobileLocale } from "../../localization/mobileLocalizationCatalog";

type MobileFaqCopy = {
  heading: string;
  intro: string;
  generalQuestions: string;
  needMoreHelp: string;
  supportPrompt: string;
  supportSuffix: string;
};

const copy: Record<MobileLocale, MobileFaqCopy> = {
  "en-us": {
    heading: "Frequently asked questions",
    intro: "Learn how Kurioticket helps you compare flights, hotels, and travel options before booking with trusted providers.",
    generalQuestions: "General questions",
    needMoreHelp: "Need more help?",
    supportPrompt: "Can’t find what you’re looking for?",
    supportSuffix: " and we’ll help you.",
  },
  "es-es": {
    heading: "Preguntas frecuentes",
    intro: "Descubre cómo Kurioticket te ayuda a comparar vuelos, hoteles y opciones de viaje antes de reservar con proveedores de confianza.",
    generalQuestions: "Preguntas generales",
    needMoreHelp: "¿Necesitas más ayuda?",
    supportPrompt: "¿No encuentras lo que buscas?",
    supportSuffix: " y te ayudaremos.",
  },
  fr: {
    heading: "Questions fréquentes",
    intro: "Découvrez comment Kurioticket vous aide à comparer les vols, les hôtels et les options de voyage avant de réserver auprès de prestataires de confiance.",
    generalQuestions: "Questions générales",
    needMoreHelp: "Besoin d’aide ?",
    supportPrompt: "Vous ne trouvez pas ce que vous cherchez ?",
    supportSuffix: " et nous vous aiderons.",
  },
  "de-de": {
    heading: "Häufig gestellte Fragen",
    intro: "Erfahren Sie, wie Kurioticket Ihnen hilft, Flüge, Hotels und Reiseoptionen zu vergleichen, bevor Sie bei vertrauenswürdigen Anbietern buchen.",
    generalQuestions: "Allgemeine Fragen",
    needMoreHelp: "Brauchen Sie weitere Hilfe?",
    supportPrompt: "Sie finden nicht, wonach Sie suchen?",
    supportSuffix: " und wir helfen Ihnen weiter.",
  },
  "it-it": {
    heading: "Domande frequenti",
    intro: "Scopri come Kurioticket ti aiuta a confrontare voli, hotel e opzioni di viaggio prima di prenotare con fornitori affidabili.",
    generalQuestions: "Domande generali",
    needMoreHelp: "Hai bisogno di ulteriore aiuto?",
    supportPrompt: "Non trovi quello che cerchi?",
    supportSuffix: " e ti aiuteremo.",
  },
  "pt-br": {
    heading: "Perguntas frequentes",
    intro: "Saiba como a Kurioticket ajuda você a comparar voos, hotéis e opções de viagem antes de reservar com fornecedores confiáveis.",
    generalQuestions: "Perguntas gerais",
    needMoreHelp: "Precisa de mais ajuda?",
    supportPrompt: "Não encontrou o que procura?",
    supportSuffix: " e ajudaremos você.",
  },
  nl: {
    heading: "Veelgestelde vragen",
    intro: "Ontdek hoe Kurioticket je helpt vluchten, hotels en reisopties te vergelijken voordat je boekt bij betrouwbare aanbieders.",
    generalQuestions: "Algemene vragen",
    needMoreHelp: "Meer hulp nodig?",
    supportPrompt: "Kun je niet vinden wat je zoekt?",
    supportSuffix: " en we helpen je verder.",
  },
  ar: {
    heading: "الأسئلة الشائعة",
    intro: "تعرّف على كيفية مساعدة Kurioticket لك في مقارنة الرحلات الجوية والفنادق وخيارات السفر قبل الحجز مع مزوّدين موثوقين.",
    generalQuestions: "أسئلة عامة",
    needMoreHelp: "هل تحتاج إلى مزيد من المساعدة؟",
    supportPrompt: "ألا تجد ما تبحث عنه؟",
    supportSuffix: " وسنساعدك.",
  },
  "zh-cn": {
    heading: "常见问题",
    intro: "了解 Kurioticket 如何帮助你比较航班、酒店和旅行选项，并在向可信赖的供应商预订前做出选择。",
    generalQuestions: "常见问题",
    needMoreHelp: "需要更多帮助？",
    supportPrompt: "找不到你需要的内容？",
    supportSuffix: "，我们会帮助你。",
  },
  ja: {
    heading: "よくある質問",
    intro: "Kurioticket では、信頼できるプロバイダーで予約する前に、フライト、ホテル、旅行オプションを比較できます。",
    generalQuestions: "一般的な質問",
    needMoreHelp: "さらにサポートが必要ですか？",
    supportPrompt: "お探しの情報が見つかりませんか？",
    supportSuffix: "までご連絡ください。サポートします。",
  },
  ko: {
    heading: "자주 묻는 질문",
    intro: "Kurioticket에서 신뢰할 수 있는 제공업체로 예약하기 전에 항공편, 호텔 및 여행 옵션을 비교하는 방법을 알아보세요.",
    generalQuestions: "일반 질문",
    needMoreHelp: "도움이 더 필요하신가요?",
    supportPrompt: "찾는 내용을 찾지 못하셨나요?",
    supportSuffix: "에 문의하시면 도와드리겠습니다.",
  },
  hi: {
    heading: "अक्सर पूछे जाने वाले प्रश्न",
    intro: "जानें कि Kurioticket भरोसेमंद प्रदाताओं के साथ बुकिंग से पहले उड़ानों, होटलों और यात्रा विकल्पों की तुलना करने में कैसे मदद करता है।",
    generalQuestions: "सामान्य प्रश्न",
    needMoreHelp: "और मदद चाहिए?",
    supportPrompt: "जो आप ढूँढ रहे हैं वह नहीं मिल रहा?",
    supportSuffix: " से संपर्क करें, हम आपकी मदद करेंगे।",
  },
  tr: {
    heading: "Sık sorulan sorular",
    intro: "Kurioticket'ın güvenilir sağlayıcılarla rezervasyon yapmadan önce uçuşları, otelleri ve seyahat seçeneklerini karşılaştırmanıza nasıl yardımcı olduğunu öğrenin.",
    generalQuestions: "Genel sorular",
    needMoreHelp: "Daha fazla yardıma mı ihtiyacınız var?",
    supportPrompt: "Aradığınızı bulamıyor musunuz?",
    supportSuffix: " ile iletişime geçin, size yardımcı olalım.",
  },
  pl: {
    heading: "Najczęściej zadawane pytania",
    intro: "Dowiedz się, jak Kurioticket pomaga porównywać loty, hotele i opcje podróży przed rezerwacją u zaufanych dostawców.",
    generalQuestions: "Pytania ogólne",
    needMoreHelp: "Potrzebujesz dodatkowej pomocy?",
    supportPrompt: "Nie możesz znaleźć tego, czego szukasz?",
    supportSuffix: " — pomożemy Ci.",
  },
  sv: {
    heading: "Vanliga frågor",
    intro: "Se hur Kurioticket hjälper dig att jämföra flyg, hotell och resealternativ innan du bokar hos betrodda leverantörer.",
    generalQuestions: "Allmänna frågor",
    needMoreHelp: "Behöver du mer hjälp?",
    supportPrompt: "Hittar du inte det du söker?",
    supportSuffix: " så hjälper vi dig.",
  },
  id: {
    heading: "Pertanyaan yang sering diajukan",
    intro: "Pelajari bagaimana Kurioticket membantu Anda membandingkan penerbangan, hotel, dan pilihan perjalanan sebelum memesan dengan penyedia tepercaya.",
    generalQuestions: "Pertanyaan umum",
    needMoreHelp: "Butuh bantuan lebih lanjut?",
    supportPrompt: "Tidak menemukan yang Anda cari?",
    supportSuffix: " dan kami akan membantu Anda.",
  },
  th: {
    heading: "คำถามที่พบบ่อย",
    intro: "ดูว่า Kurioticket ช่วยคุณเปรียบเทียบเที่ยวบิน โรงแรม และตัวเลือกการเดินทางก่อนจองกับผู้ให้บริการที่เชื่อถือได้อย่างไร",
    generalQuestions: "คำถามทั่วไป",
    needMoreHelp: "ต้องการความช่วยเหลือเพิ่มเติมไหม",
    supportPrompt: "ไม่พบสิ่งที่คุณกำลังมองหาใช่ไหม",
    supportSuffix: " แล้วเราจะช่วยคุณ",
  },
  vi: {
    heading: "Câu hỏi thường gặp",
    intro: "Tìm hiểu cách Kurioticket giúp bạn so sánh chuyến bay, khách sạn và các lựa chọn du lịch trước khi đặt với nhà cung cấp đáng tin cậy.",
    generalQuestions: "Câu hỏi chung",
    needMoreHelp: "Cần thêm trợ giúp?",
    supportPrompt: "Không tìm thấy điều bạn đang tìm kiếm?",
    supportSuffix: " và chúng tôi sẽ hỗ trợ bạn.",
  },
};

export function getMobileFaqCopy(locale: MobileLocale): MobileFaqCopy {
  return copy[locale];
}
