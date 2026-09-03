export const SEARCH_LOADING_ROTATION_MS = 1_800;

export type SearchLoadingProduct = "flight" | "hotel" | "car";

export type SearchLoadingPresentation = {
  title: string;
  messages: readonly string[];
};

const english: Record<SearchLoadingProduct, SearchLoadingPresentation> = {
  flight: {
    title: "Searching the best flights for you",
    messages: [
      "Checking airlines and fares...",
      "Comparing routes and providers...",
      "Finding the best available options...",
      "Preparing your results...",
    ],
  },
  hotel: {
    title: "Finding the best stays for you",
    messages: [
      "Checking availability and rates...",
      "Comparing hotels and room options...",
      "Preparing your stays...",
    ],
  },
  car: {
    title: "Looking for the best car rental options",
    messages: [
      "Checking vehicles, prices, and pickup options...",
      "Comparing rental providers...",
      "Preparing your car options...",
    ],
  },
};

const localized: Partial<Record<string, Record<SearchLoadingProduct, SearchLoadingPresentation>>> = {
  es: {
    flight: { title: "Buscando los mejores vuelos para ti", messages: ["Consultando aerolíneas y tarifas...", "Comparando rutas y proveedores...", "Buscando las mejores opciones disponibles...", "Preparando tus resultados..."] },
    hotel: { title: "Buscando los mejores alojamientos para ti", messages: ["Consultando disponibilidad y tarifas...", "Comparando hoteles y opciones de habitación...", "Preparando tus alojamientos..."] },
    car: { title: "Buscando las mejores opciones de alquiler de coches", messages: ["Consultando vehículos, precios y recogida...", "Comparando proveedores de alquiler...", "Preparando tus opciones de coche..."] },
  },
  ar: {
    flight: { title: "نبحث لك عن أفضل الرحلات", messages: ["جارٍ التحقق من شركات الطيران والأسعار...", "جارٍ مقارنة المسارات ومقدمي الخدمة...", "جارٍ العثور على أفضل الخيارات المتاحة...", "جارٍ إعداد النتائج..."] },
    hotel: { title: "نبحث لك عن أفضل أماكن الإقامة", messages: ["جارٍ التحقق من التوفر والأسعار...", "جارٍ مقارنة الفنادق وخيارات الغرف...", "جارٍ إعداد خيارات الإقامة..."] },
    car: { title: "نبحث عن أفضل خيارات تأجير السيارات", messages: ["جارٍ التحقق من السيارات والأسعار وخيارات الاستلام...", "جارٍ مقارنة شركات التأجير...", "جارٍ إعداد خيارات السيارات..."] },
  },
};

export function searchLoadingPresentation(product: SearchLoadingProduct, locale = "en"): SearchLoadingPresentation {
  const language = locale.trim().toLowerCase().split(/[-_]/)[0];
  return localized[language]?.[product] ?? english[product];
}
