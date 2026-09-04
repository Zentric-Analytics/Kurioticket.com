export type SearchLoadingProduct = "flight" | "hotel" | "car";

export type SearchLoadingPresentation = {
  title: string;
  messages: readonly string[];
};

const english: Record<SearchLoadingProduct, SearchLoadingPresentation> = {
  flight: {
    title: "Searching the best flights for you",
    messages: ["Checking airlines and fares…", "Comparing routes and prices…", "Preparing your flight options…"],
  },
  hotel: {
    title: "Searching the best stays for you",
    messages: ["Checking properties and rates…", "Comparing rooms and amenities…", "Preparing your stay options…"],
  },
  car: {
    title: "Searching the best rental cars for you",
    messages: ["Checking vehicles and providers…", "Comparing rental rates and terms…", "Preparing your car options…"],
  },
};

const localized: Partial<Record<string, Record<SearchLoadingProduct, SearchLoadingPresentation>>> = {
  es: {
    flight: { title: "Buscando los mejores vuelos para ti", messages: ["Consultando aerolíneas y tarifas…", "Comparando rutas y precios…", "Preparando tus opciones de vuelo…"] },
    hotel: { title: "Buscando los mejores alojamientos para ti", messages: ["Consultando propiedades y tarifas…", "Comparando habitaciones y servicios…", "Preparando tus opciones de alojamiento…"] },
    car: { title: "Buscando los mejores coches de alquiler para ti", messages: ["Consultando vehículos y proveedores…", "Comparando tarifas y condiciones…", "Preparando tus opciones de coche…"] },
  },
  ar: {
    flight: { title: "نبحث لك عن أفضل الرحلات", messages: ["جارٍ التحقق من شركات الطيران والأسعار…", "جارٍ مقارنة المسارات والأسعار…", "جارٍ إعداد خيارات الرحلات…"] },
    hotel: { title: "نبحث لك عن أفضل أماكن الإقامة", messages: ["جارٍ التحقق من أماكن الإقامة والأسعار…", "جارٍ مقارنة الغرف والمرافق…", "جارٍ إعداد خيارات الإقامة…"] },
    car: { title: "نبحث لك عن أفضل سيارات الإيجار", messages: ["جارٍ التحقق من السيارات ومقدمي الخدمة…", "جارٍ مقارنة الأسعار والشروط…", "جارٍ إعداد خيارات السيارات…"] },
  },
};

export function searchLoadingPresentation(product: SearchLoadingProduct, locale = "en"): SearchLoadingPresentation {
  const language = locale.trim().toLowerCase().split(/[-_]/)[0];
  return localized[language]?.[product] ?? english[product];
}
