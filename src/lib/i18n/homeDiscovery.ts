import { translations as enTranslations } from "@/lib/i18n/en";
import type { TranslationDictionary } from "@/lib/i18n/types";

type HomeDiscoveryTranslatableField = "title" | "routeNote";

type HomeDiscoveryTranslatableItem = {
  id: string;
  title: string;
  routeNote: string;
};

export function translateHomeDiscoveryField(
  dictionary: TranslationDictionary | Record<string, string>,
  item: HomeDiscoveryTranslatableItem,
  field: HomeDiscoveryTranslatableField,
) {
  const key = `homeDiscoveryRoute.${item.id}.${field}`;

  return dictionary[key] ?? enTranslations[key] ?? item[field];
}

export function translateHomeDiscoveryCopy<
  TItem extends HomeDiscoveryTranslatableItem,
>(dictionary: TranslationDictionary | Record<string, string>, item: TItem) {
  return {
    title: translateHomeDiscoveryField(dictionary, item, "title"),
    routeNote: translateHomeDiscoveryField(dictionary, item, "routeNote"),
  };
}
