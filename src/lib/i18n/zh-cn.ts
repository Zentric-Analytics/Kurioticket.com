import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  websiteLanguageTitle: "选择网站语言",
  websiteLanguageDescription: "选择 Kurioticket 使用的语言。",
  currentLanguage: "当前语言：{{language}}",
  languageSearchLabel: "搜索语言",
  languageSearchPlaceholder: "搜索语言或地区",
  languageOptionsLabel: "语言选项",
  selectLanguageOption: "选择{{language}}",
  globalLanguage: "全球语言",
  closeLanguageSelector: "关闭语言选择器",
};
