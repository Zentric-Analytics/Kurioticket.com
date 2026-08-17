import {
  isAvailableLanguage,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/language";

export type LocaleSelectionSource = "default" | "manual" | "account";

export function resolveExplicitLocalePreference({
  cookie,
  currentStorage,
  legacyStorage,
}: {
  cookie?: string | null;
  currentStorage?: string | null;
  legacyStorage?: string | null;
}): LanguageCode | null {
  for (const candidate of [cookie, currentStorage, legacyStorage]) {
    if (candidate && isAvailableLanguage(candidate)) {
      return normalizeLanguage(candidate);
    }
  }

  return null;
}

export function canHydrateLocaleFromAccount(
  source: LocaleSelectionSource,
  storageMigrationComplete: boolean,
) {
  return storageMigrationComplete && source === "default";
}
