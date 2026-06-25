import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  websiteLanguageTitle: "웹사이트 언어 선택",
  websiteLanguageDescription:
    "영어(미국)는 기본 웹사이트 언어입니다. Kurioticket은 사용 가능한 옵션을 선택한 후에만 언어를 변경합니다.",
  currentLanguage: "현재 언어: {{language}}",
  languagePreparingNotice:
    "더 많은 언어를 준비 중입니다. 사용할 수 없는 옵션은 아직 사이트를 번역하지 않습니다.",
  languageSearchLabel: "언어 검색",
  globalLanguage: "글로벌 언어",
};
