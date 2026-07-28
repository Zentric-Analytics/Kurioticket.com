import { homepageTrustMessages } from "@/data/homepageTrustMessages";
import { getTranslations, publicLocaleOptions } from "@/lib/i18n";
import { translations as englishTranslations } from "@/lib/i18n/en";
import type { TranslationDictionary } from "@/lib/i18n/types";

export type HomepageTrustMessageDefinition = {
  id: string;
  titleKey: string;
  bodyKey: string;
};

export type HomepageTrustMessageInventoryRow = HomepageTrustMessageDefinition & {
  rowId: string;
  englishFallbackTitle: string;
  englishFallbackBody: string;
  titleCoverage: number;
  bodyCoverage: number;
  supportedLocaleCount: number;
  missingTitleLocales: string[];
  missingBodyLocales: string[];
  rawKeyTitleLocales: string[];
  rawKeyBodyLocales: string[];
  duplicateId: boolean;
  duplicateTitleKey: boolean;
  duplicateBodyKey: boolean;
  missingEnglishFallbackTitle: boolean;
  missingEnglishFallbackBody: boolean;
};

const normalized = (value: string) => value.trim().toLocaleLowerCase();

function repeatedValues(messages: readonly HomepageTrustMessageDefinition[], selector: (message: HomepageTrustMessageDefinition) => string) {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const value = normalized(selector(message));
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

export function selectHomepageTrustMessageRows(
  messages: readonly HomepageTrustMessageDefinition[] = homepageTrustMessages,
  localeCodes: readonly string[] = publicLocaleOptions.map((locale) => locale.code),
  dictionaryForLocale: (locale: string) => TranslationDictionary = getTranslations,
): HomepageTrustMessageInventoryRow[] {
  const duplicateIds = repeatedValues(messages, (message) => message.id);
  const duplicateTitleKeys = repeatedValues(messages, (message) => message.titleKey);
  const duplicateBodyKeys = repeatedValues(messages, (message) => message.bodyKey);

  return messages.map((message, index) => {
    const missingTitleLocales: string[] = [];
    const missingBodyLocales: string[] = [];
    const rawKeyTitleLocales: string[] = [];
    const rawKeyBodyLocales: string[] = [];

    for (const locale of localeCodes) {
      const dictionary = dictionaryForLocale(locale);
      const title = dictionary[message.titleKey];
      const body = dictionary[message.bodyKey];
      if (!title?.trim()) missingTitleLocales.push(locale);
      else if (title.trim() === message.titleKey) rawKeyTitleLocales.push(locale);
      if (!body?.trim()) missingBodyLocales.push(locale);
      else if (body.trim() === message.bodyKey) rawKeyBodyLocales.push(locale);
    }

    return {
      ...message,
      rowId: `${index}:${message.id || "trust-message"}`,
      englishFallbackTitle: englishTranslations[message.titleKey] ?? "",
      englishFallbackBody: englishTranslations[message.bodyKey] ?? "",
      titleCoverage: localeCodes.length - missingTitleLocales.length - rawKeyTitleLocales.length,
      bodyCoverage: localeCodes.length - missingBodyLocales.length - rawKeyBodyLocales.length,
      supportedLocaleCount: localeCodes.length,
      missingTitleLocales,
      missingBodyLocales,
      rawKeyTitleLocales,
      rawKeyBodyLocales,
      duplicateId: duplicateIds.has(normalized(message.id)),
      duplicateTitleKey: duplicateTitleKeys.has(normalized(message.titleKey)),
      duplicateBodyKey: duplicateBodyKeys.has(normalized(message.bodyKey)),
      missingEnglishFallbackTitle: !(englishTranslations[message.titleKey] ?? "").trim(),
      missingEnglishFallbackBody: !(englishTranslations[message.bodyKey] ?? "").trim(),
    };
  });
}

export function getHomepageTrustMessageSummary(rows = selectHomepageTrustMessageRows()) {
  return {
    messages: rows.length,
    uniqueIds: new Set(rows.map((row) => normalized(row.id)).filter(Boolean)).size,
    titleCoverage: rows.reduce((total, row) => total + row.titleCoverage, 0),
    bodyCoverage: rows.reduce((total, row) => total + row.bodyCoverage, 0),
    possibleTranslations: rows.reduce((total, row) => total + row.supportedLocaleCount, 0),
    publicUsage: "Homepage",
  };
}

export function hasHomepageTrustMessageIssues(row: HomepageTrustMessageInventoryRow) {
  return row.duplicateId || row.duplicateTitleKey || row.duplicateBodyKey
    || row.missingEnglishFallbackTitle || row.missingEnglishFallbackBody
    || row.missingTitleLocales.length > 0 || row.missingBodyLocales.length > 0
    || row.rawKeyTitleLocales.length > 0 || row.rawKeyBodyLocales.length > 0;
}
