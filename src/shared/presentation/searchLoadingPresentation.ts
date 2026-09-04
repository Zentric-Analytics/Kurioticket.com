export type SearchLoadingProduct = "flight" | "hotel" | "car";

export type SearchLoadingPresentation = {
  title: string;
  supportingText: string;
};

const english: Record<SearchLoadingProduct, SearchLoadingPresentation> = {
  flight: {
    title: "Searching the best flights for you",
    supportingText: "Checking airlines and fares…",
  },
  hotel: {
    title: "Searching the best stays for you",
    supportingText: "Checking properties and rates…",
  },
  car: {
    title: "Searching the best rental cars for you",
    supportingText: "Checking vehicles and providers…",
  },
};

const localized: Partial<Record<string, Record<SearchLoadingProduct, SearchLoadingPresentation>>> = {
  es: {
    flight: { title: "Buscando los mejores vuelos para ti", supportingText: "Consultando aerolíneas y tarifas…" },
    hotel: { title: "Buscando los mejores alojamientos para ti", supportingText: "Consultando propiedades y tarifas…" },
    car: { title: "Buscando los mejores coches de alquiler para ti", supportingText: "Consultando vehículos y proveedores…" },
  },
  ar: {
    flight: { title: "نبحث لك عن أفضل الرحلات", supportingText: "جارٍ التحقق من شركات الطيران والأسعار…" },
    hotel: { title: "نبحث لك عن أفضل أماكن الإقامة", supportingText: "جارٍ التحقق من أماكن الإقامة والأسعار…" },
    car: { title: "نبحث لك عن أفضل سيارات الإيجار", supportingText: "جارٍ التحقق من السيارات ومقدمي الخدمة…" },
  },
};

export function searchLoadingPresentation(product: SearchLoadingProduct, locale = "en"): SearchLoadingPresentation {
  const language = locale.trim().toLowerCase().split(/[-_]/)[0];
  return localized[language]?.[product] ?? english[product];
}
