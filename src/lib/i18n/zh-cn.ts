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
  searchFlights: "搜索航班",
  origin: "出发地",
  destination: "目的地",
  travelers: "旅客",
  flightLandingHeroTitle: "轻松找到下一趟实惠航班。",
  flightLandingHeroSubtitle: "搜索航线、比较日期，并探索下一段旅程的航班选择。",
  flightLandingHeroImageAlt: "明亮云层上方的飞机机翼",
  flightLandingFeatureSearchReadyTitle: "可直接搜索的航线",
  flightLandingFeatureSearchReadyBody:
    "在向航班供应商请求结果前，先输入真实行程信息。",
  flightLandingFeatureCompareTitle: "结合行程背景进行比较",
  flightLandingFeatureCompareBody:
    "根据日期、旅客人数、舱位、时长、中转次数和航线详情评估选项。",
  flightLandingFeatureProviderTitle: "供应商确认",
  flightLandingFeatureProviderBody:
    "预订前请始终向供应商确认最终余票、价格和规则。",
  flightLandingStartThisSearch: "开始此搜索",
  flightLandingRouteIdeasTitle: "灵活出行的航线灵感",
  flightLandingRouteIdeasBody:
    "浏览航线灵感，然后输入日期和旅客信息开始真实搜索，再比较可用航班。",
  flightLandingRouteConnector: "至",
  flightLandingRouteAriaLabel: "搜索从 {{origin}} 到 {{destination}} 的航班",
  discoverDestinationsFromRegion: "发现你所在地区出发的目的地",
  discoverDestinationsFromRegionBody: "探索精选航线，自信规划下一段旅程。",
  roundTrip: "往返",
  oneWay: "单程",
  travelDates: "旅行日期",
  economy: "经济舱",
  adultSingular: "位成人",
  adultPlural: "位成人",
  childSingular: "名儿童",
  childPlural: "名儿童",
  infantSingular: "名婴儿",
  infantPlural: "名婴儿",
  travelerSingular: "位旅客",
  travelerPlural: "位旅客",
  cabinClass: "舱位等级",
  cityOrAirport: "城市或机场",
  beachVacations: "海滩度假",
  beachVacationsBody: "探索前往阳光海岸、海岛度假地和温暖海滩目的地的航线。",
  flightBookingFaqs: "航班预订常见问题",
  flightBookingFaqIntro: "在继续前往供应商前，先了解常见的航班搜索问题。",
  flightFaqBestTimeQuestion: "什么时候预订航班最合适？",
  flightFaqBestTimeAnswer:
    "航班价格会因航线、季节、需求和余票而变化。通常建议比较多个日期，尽可能查看附近机场，并在选择票价前确认完整行程。",
  flightFaqBeforeBookingQuestion: "预订前应该检查哪些内容？",
  flightFaqBeforeBookingAnswer:
    "在通过供应商完成预订前，请查看出发和抵达时间、总旅行时长、中转、行李规则、选座选项、取消条款和改签政策。",
  flightFaqFlexibleFareQuestion: "什么是灵活票价？",
  flightFaqFlexibleFareAnswer:
    "灵活票价可能比基础票价允许更少限制的改签或取消，但具体规则取决于航空公司或预订供应商。购买前请务必查看票价条件。",
  flightFaqNonstopQuestion: "直飞航班一定更好吗？",
  flightFaqNonstopAnswer:
    "不一定。直飞航班可以节省时间，而一次中转航线可能提供不同的出发时间、抵达时段或票价选择。决定前请比较总旅行时长、中转时长和便利性。",
  flightFaqBaggageQuestion: "行李规则如何运作？",
  flightFaqBaggageAnswer:
    "行李额度会因航空公司、航线、舱位、票价类型和供应商而异。预订前请确认是否包含随身行李、托运行李和个人物品。",
  flightFaqChangeCancelQuestion: "我可以改签或取消机票吗？",
  flightFaqChangeCancelAnswer:
    "改签和取消选项取决于票价规则和供应商政策。有些机票可能不可退款或会收取费用，因此预订前请仔细查看条款。",
  flightFaqInternationalQuestion: "国际航班需要注意什么？",
  flightFaqInternationalAnswer:
    "国际旅行前，请查看护照有效期、签证要求、转机规则、行李政策以及目的地入境要求。",
  "homeDiscoveryRoute.us-jfk-mia.title": "Miami 海滩周末",
  "homeDiscoveryRoute.us-jfk-mia.routeNote": "高频直飞航线，适合温暖天气出行。",
  "homeDiscoveryRoute.us-ord-las.title": "Las Vegas 娱乐之旅",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "热门活动、演出和灵活周末航班的理想选择。",
  "homeDiscoveryRoute.us-lax-sfo.title": "San Francisco 快捷走廊",
  "homeDiscoveryRoute.us-lax-sfo.routeNote": "短途商务热门航线，每日班次频繁。",
  "homeDiscoveryRoute.us-atl-mco.title": "Orlando 家庭度假",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "主题乐园航线，提供适合家庭的时段选择。",
  "homeDiscoveryRoute.us-dfw-sea.title": "Seattle 咖啡与自然之旅",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "适合探索城市美食和太平洋西北一日游。",
  "homeDiscoveryRoute.us-mia-cun.title": "Cancun 短途休闲跳岛",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "前往海滩度假村和长周末的快捷国际航线。",
  "homeDiscoveryRoute.us-ord-pdx.title": "Portland 美食与森林周末",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "太平洋西北城市短途旅行，适合咖啡烘焙店、公园和附近瀑布。",
  "homeDiscoveryRoute.us-sea-hnl.title": "Honolulu 热带假期",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "直达海岛度假航线，适合海滩、冲浪和火山景观。",
  "homeDiscoveryRoute.us-bos-sju.title": "San Juan 加勒比长周末",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "温暖天气的美国属地航线，适合历史老城和海滩周末。",
  "homeDiscoveryRoute.us-den-phx.title": "Phoenix 沙漠阳光之旅",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "西部短途航线，适合高尔夫周末和索诺兰沙漠徒步。",
  "homeDiscoveryRoute.us-iad-bna.title": "Nashville 音乐之城假期",
  "homeDiscoveryRoute.us-iad-bna.routeNote":
    "高需求国内航线，适合现场音乐、美食和节庆活动。",
  "homeDiscoveryRoute.us-lax-yvr.title": "Vancouver 山海城市之旅",
  "homeDiscoveryRoute.us-lax-yvr.routeNote":
    "便捷跨境航线，适合港湾景色、海鲜和附近高山步道。",
  "homeDiscoveryRoute.us-sea-anc.title": "Anchorage 荒野门户",
  "homeDiscoveryRoute.us-sea-anc.routeNote":
    "季节热门航线，适合冰川景观、野生动物游览和徒步。",
  "homeDiscoveryRoute.us-jfk-aus.title": "Austin 现场音乐城市跳转",
  "homeDiscoveryRoute.us-jfk-aus.routeNote":
    "热门国内航线，适合音乐节、创业活动和餐车美食。",
  "homeDiscoveryRoute.us-dtw-msy.title": "New Orleans 爵士周末",
  "homeDiscoveryRoute.us-dtw-msy.routeNote":
    "文化氛围浓厚的航线，适合爵士俱乐部、克里奥尔美食和法国区夜晚。",
  "homeDiscoveryRoute.us-phl-san.title": "San Diego 海岸假期",
  "homeDiscoveryRoute.us-phl-san.routeNote":
    "横跨美国的海滩、港湾游船和温和天气度假选择。",
};
