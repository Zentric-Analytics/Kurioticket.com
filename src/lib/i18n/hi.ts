import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  websiteLanguageTitle: "साइट की भाषा चुनें",
  websiteLanguageDescription:
    "English (United States) डिफ़ॉल्ट वेबसाइट भाषा है। Kurioticket उपलब्ध विकल्प चुनने के बाद ही भाषा बदलता है.",
  currentLanguage: "वर्तमान भाषा: {{language}}",
  languagePreparingNotice:
    "अधिक भाषाएँ तैयार की जा रही हैं। अनुपलब्ध विकल्प अभी साइट का अनुवाद नहीं करते हैं.",
  languageSearchLabel: "भाषाएँ खोजें",
  languageSearchPlaceholder: "English, Español, Français, Deutsch खोजें...",
  languageOptionsLabel: "भाषा विकल्प",
  selectLanguageOption: "{{language}} चुनें",
  languagePreparingAria: "{{language}} अनुवाद तैयार किया जा रहा है",
  languageUnavailableMessage:
    "{{language}} अभी उपलब्ध नहीं है। हम अनुवाद समर्थन बढ़ा रहे हैं.",
  closeLanguageSelector: "भाषा चयनकर्ता बंद करें",
  preparing: "तैयार हो रहा है",
  globalLanguage: "वैश्विक भाषा",
  selectLanguage: "भाषा चुनें",
  searchLanguage: "भाषा या कोड खोजें",
  noLanguagesFound: "कोई भाषा नहीं मिली",
  done: "हो गया",
  cancel: "रद्द करें",
  clear: "साफ़ करें",
};
