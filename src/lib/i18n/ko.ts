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

  flights: "항공권",
  hotels: "호텔",
  cars: "렌터카",
  deals: "특가",
  login: "로그인",
  signUp: "가입하기",
  search: "검색",
  searchFlights: "항공권 검색",
  searchHotels: "호텔 검색",
  homeHeroTitle: "한 번의 간편한 검색으로 여행 옵션을 비교하세요",
  homeHeroSubtitle:
    "신뢰할 수 있는 여행 제공업체를 검색하고, 가격을 명확하게 비교한 뒤, 여행에 맞는 옵션을 선택하세요.",
  homePopularDestinations: "인기 목적지",
  "homePopularDestinationCity.dubai": "두바이",
  "homePopularDestinationCity.london": "런던",
  "homePopularDestinationCity.johannesburg": "요하네스버그",
  "homePopularDestinationCity.accra": "아크라",
  "homePopularDestinationCountry.unitedArabEmirates": "아랍에미리트",
  "homePopularDestinationCountry.unitedKingdom": "영국",
  "homePopularDestinationCountry.southAfrica": "남아프리카공화국",
  "homePopularDestinationCountry.ghana": "가나",
  homeExploreFares: "운임 보기",
  roundTrip: "왕복",
  oneWay: "편도",
  origin: "출발지",
  destination: "목적지",
  departureDate: "여행 날짜",
  travelDates: "여행 날짜",
  travelers: "여행자",
  toPlaceholder: "목적지는?",
  chooseTravelDates: "여행 날짜",
  adultSingular: "성인",
  adultPlural: "성인",
  economy: "이코노미",
};
