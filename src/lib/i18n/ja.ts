import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  selectLanguage: "言語を選択",
  suggestedLanguages: "おすすめの言語",
  allLanguages: "すべての言語",
  searchLanguage: "言語またはコードを検索",
  noLanguagesFound: "言語が見つかりません",
  websiteLanguageTitle: "ウェブサイトの言語を選択",
  websiteLanguageDescription:
    "English (United States) is the default website language. Kurioticket only changes language after you choose an available option.",
  currentLanguage: "現在の言語: {{language}}",
  languagePreparingNotice:
    "More languages are being prepared. Unavailable options do not translate the site yet.",
  languageSearchLabel: "言語を検索",
  languageSearchPlaceholder: "English、Español、Français、Deutsch を検索...",
  languageOptionsLabel: "言語オプション",
  selectLanguageOption: "{{language}}を選択",
  languagePreparingAria: "{{language}} translations are being prepared",
};
