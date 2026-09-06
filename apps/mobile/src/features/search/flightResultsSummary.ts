import { mobileLocales, type MobileLocale } from "../../localization/mobileLocalizationCatalog";
import { formatCabinClass } from "./flightCardSummaries";

export type FlightResultsSummaryInput = {
  origin?: unknown;
  destination?: unknown;
  tripType?: unknown;
  departureDate?: unknown;
  returnDate?: unknown;
  adults?: unknown;
  children?: unknown;
  infants?: unknown;
  travelers?: unknown;
  cabinClass?: unknown;
};

const count = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

type FlightResultsCopy = {
  oneWay: string;
  roundTrip: string;
  multiCity: string;
  traveler: string;
  travelers: string;
  viewFlight: string;
  viewDeals?: string;
  baggage: string;
  cabin: string;
  fareRule: string;
  estimatedPrice: string;
  providerPrice: string;
  fareRules?: string; review?: string; viewDeal?: string; trackTitle?: string; trackAction?: string; tracking?: string; checking?: string;
};

const copy: Record<MobileLocale, FlightResultsCopy> = {
  "en-us": { oneWay:"One-way",roundTrip:"Round-trip",multiCity:"Multi-city",traveler:"traveler",travelers:"travelers",viewFlight:"View Flight",viewDeals:"View deals",baggage:"Baggage",cabin:"Cabin",fareRule:"Fare rule",estimatedPrice:"ESTIMATED PRICE",providerPrice:"PROVIDER PRICE",fareRules:"Fare rules",review:"Review",viewDeal:"View deal",trackTitle:"Track this flight price",trackAction:"Track price",tracking:"Tracking",checking:"Checking…" },
  "es-es": { oneWay:"Solo ida",roundTrip:"Ida y vuelta",multiCity:"Varias ciudades",traveler:"viajero",travelers:"viajeros",viewFlight:"Ver vuelo",baggage:"Equipaje",cabin:"Cabina",fareRule:"Regla tarifaria",estimatedPrice:"PRECIO ESTIMADO",providerPrice:"PRECIO DEL PROVEEDOR" },
  fr: { oneWay:"Aller simple",roundTrip:"Aller-retour",multiCity:"Multi-destinations",traveler:"voyageur",travelers:"voyageurs",viewFlight:"Voir le vol",baggage:"Bagages",cabin:"Cabine",fareRule:"Règle tarifaire",estimatedPrice:"PRIX ESTIMÉ",providerPrice:"PRIX DU FOURNISSEUR",fareRules:"Règles",review:"Consulter",viewDeal:"Voir l’offre",trackTitle:"Suivre le prix du vol",trackAction:"Suivre le prix",tracking:"Suivi actif",checking:"Vérification…" },
  "de-de": { oneWay:"Hinflug",roundTrip:"Hin- und Rückflug",multiCity:"Mehrere Städte",traveler:"Reisender",travelers:"Reisende",viewFlight:"Flug ansehen",baggage:"Gepäck",cabin:"Kabine",fareRule:"Tarifregel",estimatedPrice:"GESCHÄTZTER PREIS",providerPrice:"ANBIETERPREIS",fareRules:"Tarifregeln",review:"Prüfen",viewDeal:"Angebot ansehen",trackTitle:"Flugpreis verfolgen",trackAction:"Preis verfolgen",tracking:"Wird verfolgt",checking:"Prüfen…" },
  "it-it": { oneWay:"Solo andata",roundTrip:"Andata e ritorno",multiCity:"Più città",traveler:"viaggiatore",travelers:"viaggiatori",viewFlight:"Vedi volo",baggage:"Bagaglio",cabin:"Cabina",fareRule:"Regola tariffaria",estimatedPrice:"PREZZO STIMATO",providerPrice:"PREZZO DEL FORNITORE" },
  "pt-br": { oneWay:"Só ida",roundTrip:"Ida e volta",multiCity:"Várias cidades",traveler:"viajante",travelers:"viajantes",viewFlight:"Ver voo",baggage:"Bagagem",cabin:"Cabine",fareRule:"Regra tarifária",estimatedPrice:"PREÇO ESTIMADO",providerPrice:"PREÇO DO FORNECEDOR" },
  nl: { oneWay:"Enkele reis",roundTrip:"Retour",multiCity:"Meerdere steden",traveler:"reiziger",travelers:"reizigers",viewFlight:"Vlucht bekijken",baggage:"Bagage",cabin:"Cabine",fareRule:"Tariefregel",estimatedPrice:"GESCHATTE PRIJS",providerPrice:"PRIJS VAN AANBIEDER" },
  ar: { oneWay:"ذهاب فقط",roundTrip:"ذهاب وعودة",multiCity:"وجهات متعددة",traveler:"مسافر",travelers:"مسافرون",viewFlight:"عرض الرحلة",baggage:"الأمتعة",cabin:"المقصورة",fareRule:"قاعدة السعر",estimatedPrice:"السعر التقديري",providerPrice:"سعر المزوّد",fareRules:"قواعد السعر",review:"مراجعة",viewDeal:"عرض الصفقة",trackTitle:"تتبّع سعر الرحلة",trackAction:"تتبّع السعر",tracking:"قيد التتبّع",checking:"جارٍ التحقق…" },
  "zh-cn": { oneWay:"单程",roundTrip:"往返",multiCity:"多城市",traveler:"位旅客",travelers:"位旅客",viewFlight:"查看航班",baggage:"行李",cabin:"舱位",fareRule:"票价规则",estimatedPrice:"预估价格",providerPrice:"供应商价格" },
  ja: { oneWay:"片道",roundTrip:"往復",multiCity:"複数都市",traveler:"名",travelers:"名",viewFlight:"フライトを見る",baggage:"手荷物",cabin:"座席クラス",fareRule:"運賃規則",estimatedPrice:"推定価格",providerPrice:"プロバイダー価格" },
  ko: { oneWay:"편도",roundTrip:"왕복",multiCity:"다구간",traveler:"명",travelers:"명",viewFlight:"항공편 보기",baggage:"수하물",cabin:"좌석 등급",fareRule:"운임 규정",estimatedPrice:"예상 가격",providerPrice:"제공업체 가격" },
  hi: { oneWay:"एकतरफ़ा",roundTrip:"आना-जाना",multiCity:"कई शहर",traveler:"यात्री",travelers:"यात्री",viewFlight:"उड़ान देखें",baggage:"सामान",cabin:"केबिन",fareRule:"किराया नियम",estimatedPrice:"अनुमानित कीमत",providerPrice:"प्रदाता कीमत" },
  tr: { oneWay:"Tek yön",roundTrip:"Gidiş-dönüş",multiCity:"Çoklu şehir",traveler:"yolcu",travelers:"yolcu",viewFlight:"Uçuşu görüntüle",baggage:"Bagaj",cabin:"Kabin",fareRule:"Ücret kuralı",estimatedPrice:"TAHMİNİ FİYAT",providerPrice:"SAĞLAYICI FİYATI" },
  pl: { oneWay:"W jedną stronę",roundTrip:"W obie strony",multiCity:"Wiele miast",traveler:"podróżny",travelers:"podróżnych",viewFlight:"Zobacz lot",baggage:"Bagaż",cabin:"Kabina",fareRule:"Zasady taryfy",estimatedPrice:"SZACOWANA CENA",providerPrice:"CENA DOSTAWCY" },
  sv: { oneWay:"Enkel resa",roundTrip:"Tur och retur",multiCity:"Flera städer",traveler:"resenär",travelers:"resenärer",viewFlight:"Visa flyg",baggage:"Bagage",cabin:"Kabin",fareRule:"Prisregel",estimatedPrice:"UPPSKATTAT PRIS",providerPrice:"LEVERANTÖRSPRIS" },
  id: { oneWay:"Sekali jalan",roundTrip:"Pulang-pergi",multiCity:"Multi-kota",traveler:"wisatawan",travelers:"wisatawan",viewFlight:"Lihat penerbangan",baggage:"Bagasi",cabin:"Kabin",fareRule:"Aturan tarif",estimatedPrice:"HARGA PERKIRAAN",providerPrice:"HARGA PENYEDIA" },
  th: { oneWay:"เที่ยวเดียว",roundTrip:"ไป-กลับ",multiCity:"หลายเมือง",traveler:"ผู้เดินทาง",travelers:"ผู้เดินทาง",viewFlight:"ดูเที่ยวบิน",baggage:"สัมภาระ",cabin:"ชั้นโดยสาร",fareRule:"กฎค่าโดยสาร",estimatedPrice:"ราคาโดยประมาณ",providerPrice:"ราคาจากผู้ให้บริการ" },
  vi: { oneWay:"Một chiều",roundTrip:"Khứ hồi",multiCity:"Nhiều thành phố",traveler:"hành khách",travelers:"hành khách",viewFlight:"Xem chuyến bay",baggage:"Hành lý",cabin:"Hạng ghế",fareRule:"Quy định giá vé",estimatedPrice:"GIÁ ƯỚC TÍNH",providerPrice:"GIÁ NHÀ CUNG CẤP" },
};

export const flightResultsCopy = (locale: MobileLocale) => {
  const localized = copy[locale];
  return {
    ...copy["en-us"],
    ...localized,
    fareRules: localized.fareRules ?? localized.fareRule,
    viewDeal: localized.viewDeal ?? localized.viewFlight,
    viewDeals: localized.viewDeals ?? localized.viewDeal ?? localized.viewFlight,
  } as Required<FlightResultsCopy>;
};

/** All interactive Flight Results copy lives here so visible and accessible names cannot drift. */
const uiKeys = ["noFilterTitle","loadErrorTitle","noResultsTitle","noFilterBody","loadErrorBody","noResultsBody","clearFilters","tryAgain","editSearch","adjustFilters","sortFlights","sortHelp","best","cheapest","fastest","bestHelp","cheapestHelp","fastestHelp","reset","apply","filters","filterFlights","price","maximumPrice","upTo","flightTimes","departingFlight","returnFlight","flight","takeoff","landing","duration","maximumTravelTime","stops","nonstop","oneStop","twoStops","airlines","searchAirlines","showMore","showLess","airports","from","to","farePreferences","baggageIncluded","flexibleRefundable","clearAll","allFlightsShown","chooseAirlines","chooseStops","chooseAirports","closeSort","closeFilters","selected","active"] as const;
type UiKey = typeof uiKeys[number];
const ui = (...values: string[]) => Object.fromEntries(uiKeys.map((key, index) => [key, values[index]])) as Record<UiKey, string>;

const resultUiCopy: Partial<Record<MobileLocale, Record<UiKey, string>>> = {
  "en-us":ui("No flights match your filters","Couldn't load flights","No flights found","Try adjusting or clearing your filters.","Something went wrong while loading your results.","We couldn't find flights for this search.","Clear filters","Try again","Edit search","Adjust filters","Sort flights","Choose how results are ordered","Best","Cheapest","Fastest","Best balance of price and journey time","Lowest total price","Shortest journey time","Reset","Apply","Filters","Filter flights","Price","Maximum price","Up to","Flight times","Departing flight","Return flight","Flight","Takeoff","Landing","Duration","Maximum travel time","Stops","Nonstop","1 stop","2+ stops","Airlines","Search airlines","Show more","Show less","Airports","FROM","TO","Fare preferences","Baggage included","Flexible / refundable","Clear all","All flights shown","Choose one or more airlines","Choose allowed stop counts","Choose departure or arrival airports","Close sort options","Close flight filters","selected","active"),
  "es-es":ui("Ningún vuelo coincide con tus filtros","No se pudieron cargar los vuelos","No se encontraron vuelos","Prueba a ajustar o borrar los filtros.","Se produjo un error al cargar los resultados.","No encontramos vuelos para esta búsqueda.","Borrar filtros","Reintentar","Editar búsqueda","Ajustar filtros","Ordenar vuelos","Elige cómo ordenar los resultados","Mejor","Más barato","Más rápido","Mejor equilibrio entre precio y duración","Precio total más bajo","Trayecto más corto","Restablecer","Aplicar","Filtros","Filtrar vuelos","Precio","Precio máximo","Hasta","Horarios de vuelo","Vuelo de ida","Vuelo de vuelta","Vuelo","Despegue","Aterrizaje","Duración","Duración máxima del viaje","Escalas","Directo","1 escala","2 o más escalas","Aerolíneas","Buscar aerolíneas","Mostrar más","Mostrar menos","Aeropuertos","ORIGEN","DESTINO","Preferencias de tarifa","Equipaje incluido","Flexible / reembolsable","Borrar todo","Se muestran todos los vuelos","Elige una o más aerolíneas","Elige las escalas permitidas","Elige aeropuertos de salida o llegada","Cerrar opciones de orden","Cerrar filtros de vuelos","seleccionado","activo"),
  fr:ui("Aucun vol ne correspond à vos filtres","Impossible de charger les vols","Aucun vol trouvé","Modifiez ou effacez vos filtres.","Une erreur s’est produite pendant le chargement.","Aucun vol trouvé pour cette recherche.","Effacer les filtres","Réessayer","Modifier la recherche","Modifier les filtres","Trier les vols","Choisissez l’ordre des résultats","Meilleur","Moins cher","Plus rapide","Meilleur équilibre entre prix et durée","Prix total le plus bas","Trajet le plus court","Réinitialiser","Appliquer","Filtres","Filtrer les vols","Prix","Prix maximum","Jusqu’à","Horaires des vols","Vol aller","Vol retour","Vol","Décollage","Atterrissage","Durée","Durée maximale du voyage","Escales","Sans escale","1 escale","2 escales ou plus","Compagnies","Rechercher des compagnies","Afficher plus","Afficher moins","Aéroports","DÉPART","ARRIVÉE","Préférences tarifaires","Bagage inclus","Flexible / remboursable","Tout effacer","Tous les vols sont affichés","Choisissez une ou plusieurs compagnies","Choisissez les nombres d’escales autorisés","Choisissez les aéroports de départ ou d’arrivée","Fermer les options de tri","Fermer les filtres de vols","sélectionné","actif"),
  "de-de":ui("Keine Flüge entsprechen den Filtern","Flüge konnten nicht geladen werden","Keine Flüge gefunden","Passen Sie die Filter an oder löschen Sie sie.","Beim Laden der Ergebnisse ist ein Fehler aufgetreten.","Für diese Suche wurden keine Flüge gefunden.","Filter löschen","Erneut versuchen","Suche bearbeiten","Filter anpassen","Flüge sortieren","Reihenfolge der Ergebnisse wählen","Beste","Günstigste","Schnellste","Bestes Verhältnis von Preis und Reisezeit","Niedrigster Gesamtpreis","Kürzeste Reisezeit","Zurücksetzen","Anwenden","Filter","Flüge filtern","Preis","Höchstpreis","Bis","Flugzeiten","Hinflug","Rückflug","Flug","Abflug","Ankunft","Dauer","Maximale Reisezeit","Stopps","Direkt","1 Stopp","2+ Stopps","Fluggesellschaften","Fluggesellschaften suchen","Mehr anzeigen","Weniger anzeigen","Flughäfen","VON","NACH","Tarifwünsche","Gepäck inklusive","Flexibel / erstattungsfähig","Alle löschen","Alle Flüge werden angezeigt","Eine oder mehrere Fluggesellschaften wählen","Erlaubte Anzahl Stopps wählen","Abflug- oder Ankunftsflughäfen wählen","Sortierung schließen","Flugfilter schließen","ausgewählt","aktiv"),
  ar:ui("لا توجد رحلات تطابق عوامل التصفية","تعذّر تحميل الرحلات","لم يتم العثور على رحلات","جرّب تعديل عوامل التصفية أو مسحها.","حدث خطأ أثناء تحميل النتائج.","لم نجد رحلات لهذا البحث.","مسح عوامل التصفية","إعادة المحاولة","تعديل البحث","تعديل عوامل التصفية","ترتيب الرحلات","اختر كيفية ترتيب النتائج","الأفضل","الأرخص","الأسرع","أفضل توازن بين السعر ومدة الرحلة","أقل سعر إجمالي","أقصر مدة رحلة","إعادة تعيين","تطبيق","عوامل التصفية","تصفية الرحلات","السعر","الحد الأقصى للسعر","حتى","أوقات الرحلات","رحلة الذهاب","رحلة العودة","الرحلة","الإقلاع","الهبوط","المدة","الحد الأقصى لمدة السفر","التوقفات","مباشرة","توقف واحد","توقفان أو أكثر","شركات الطيران","البحث عن شركات الطيران","عرض المزيد","عرض أقل","المطارات","من","إلى","تفضيلات السعر","الأمتعة مشمولة","مرن / قابل للاسترداد","مسح الكل","تظهر جميع الرحلات","اختر شركة طيران واحدة أو أكثر","اختر عدد التوقفات المسموح","اختر مطارات المغادرة أو الوصول","إغلاق خيارات الترتيب","إغلاق عوامل تصفية الرحلات","محدد","نشط"),
  "zh-cn":ui("没有符合筛选条件的航班","无法加载航班","未找到航班","请调整或清除筛选条件。","加载结果时出现问题。","此搜索没有找到航班。","清除筛选","重试","编辑搜索","调整筛选","航班排序","选择结果排序方式","最佳","最便宜","最快","价格和行程时间的最佳平衡","最低总价","最短行程时间","重置","应用","筛选","筛选航班","价格","最高价格","最高","航班时间","去程航班","返程航班","航班","起飞","降落","时长","最长旅行时间","经停","直飞","1 次经停","2 次以上经停","航空公司","搜索航空公司","显示更多","收起","机场","出发","到达","票价偏好","含行李","灵活 / 可退款","全部清除","显示所有航班","选择一个或多个航空公司","选择允许的经停次数","选择出发或到达机场","关闭排序选项","关闭航班筛选","已选择","已启用"),
  ja:ui("フィルターに一致するフライトはありません","フライトを読み込めませんでした","フライトが見つかりません","フィルターを調整または解除してください。","結果の読み込み中に問題が発生しました。","この検索ではフライトが見つかりませんでした。","フィルターを解除","再試行","検索を編集","フィルターを調整","フライトを並べ替え","結果の並び順を選択","おすすめ","最安","最速","価格と所要時間のバランス","合計金額が最も安い","所要時間が最も短い","リセット","適用","フィルター","フライトを絞り込む","価格","最高価格","上限","フライト時刻","往路便","復路便","フライト","出発","到着","所要時間","最長所要時間","経由地","直行便","1 回経由","2 回以上経由","航空会社","航空会社を検索","さらに表示","表示を減らす","空港","出発地","到着地","運賃の希望","手荷物込み","変更可能 / 払い戻し可能","すべて解除","すべてのフライトを表示中","航空会社を選択","許可する経由回数を選択","出発または到着空港を選択","並べ替えを閉じる","フライトフィルターを閉じる","選択済み","有効"),
  ko:ui("필터와 일치하는 항공편이 없습니다","항공편을 불러올 수 없습니다","항공편을 찾을 수 없습니다","필터를 조정하거나 지워 보세요.","결과를 불러오는 중 문제가 발생했습니다.","이 검색에 맞는 항공편을 찾지 못했습니다.","필터 지우기","다시 시도","검색 수정","필터 조정","항공편 정렬","결과 정렬 방식 선택","추천","최저가","최단 시간","가격과 여정 시간의 최적 균형","가장 낮은 총액","가장 짧은 여정 시간","초기화","적용","필터","항공편 필터","가격","최고 가격","최대","항공편 시간","가는 항공편","오는 항공편","항공편","이륙","착륙","소요 시간","최대 여행 시간","경유","직항","1회 경유","2회 이상 경유","항공사","항공사 검색","더 보기","간단히 보기","공항","출발","도착","운임 환경설정","수하물 포함","변경 가능 / 환불 가능","모두 지우기","모든 항공편 표시 중","항공사를 하나 이상 선택","허용할 경유 횟수 선택","출발 또는 도착 공항 선택","정렬 옵션 닫기","항공편 필터 닫기","선택됨","활성"),
  // These locales have complete, intentionally localized core controls; proper names and values remain untouched.
  "it-it":ui("Nessun volo corrisponde ai filtri","Impossibile caricare i voli","Nessun volo trovato","Modifica o cancella i filtri.","Si è verificato un errore durante il caricamento.","Non abbiamo trovato voli per questa ricerca.","Cancella filtri","Riprova","Modifica ricerca","Modifica filtri","Ordina voli","Scegli l’ordine dei risultati","Migliore","Più economico","Più veloce","Miglior equilibrio tra prezzo e durata","Prezzo totale più basso","Durata più breve","Reimposta","Applica","Filtri","Filtra voli","Prezzo","Prezzo massimo","Fino a","Orari dei voli","Volo di andata","Volo di ritorno","Volo","Decollo","Atterraggio","Durata","Durata massima del viaggio","Scali","Diretto","1 scalo","2+ scali","Compagnie aeree","Cerca compagnie aeree","Mostra altro","Mostra meno","Aeroporti","DA","A","Preferenze tariffarie","Bagaglio incluso","Flessibile / rimborsabile","Cancella tutto","Tutti i voli visualizzati","Scegli una o più compagnie","Scegli gli scali consentiti","Scegli aeroporti di partenza o arrivo","Chiudi opzioni di ordinamento","Chiudi filtri voli","selezionato","attivo"),
  "pt-br":ui("Nenhum voo corresponde aos filtros","Não foi possível carregar os voos","Nenhum voo encontrado","Ajuste ou limpe os filtros.","Ocorreu um erro ao carregar os resultados.","Não encontramos voos para esta busca.","Limpar filtros","Tentar novamente","Editar busca","Ajustar filtros","Ordenar voos","Escolha a ordem dos resultados","Melhor","Mais barato","Mais rápido","Melhor equilíbrio entre preço e duração","Menor preço total","Menor duração","Redefinir","Aplicar","Filtros","Filtrar voos","Preço","Preço máximo","Até","Horários dos voos","Voo de ida","Voo de volta","Voo","Decolagem","Pouso","Duração","Tempo máximo de viagem","Paradas","Direto","1 parada","2+ paradas","Companhias aéreas","Buscar companhias aéreas","Mostrar mais","Mostrar menos","Aeroportos","DE","PARA","Preferências de tarifa","Bagagem incluída","Flexível / reembolsável","Limpar tudo","Todos os voos exibidos","Escolha uma ou mais companhias","Escolha as paradas permitidas","Escolha aeroportos de partida ou chegada","Fechar opções de ordenação","Fechar filtros de voo","selecionado","ativo"),
  nl:ui("Geen vluchten passen bij uw filters","Vluchten konden niet worden geladen","Geen vluchten gevonden","Pas uw filters aan of wis ze.","Er ging iets mis bij het laden.","We vonden geen vluchten voor deze zoekopdracht.","Filters wissen","Opnieuw proberen","Zoekopdracht wijzigen","Filters aanpassen","Vluchten sorteren","Kies de volgorde van resultaten","Beste","Goedkoopste","Snelste","Beste balans tussen prijs en reistijd","Laagste totaalprijs","Kortste reistijd","Herstellen","Toepassen","Filters","Vluchten filteren","Prijs","Maximumprijs","Tot","Vluchttijden","Heenvlucht","Terugvlucht","Vlucht","Vertrek","Aankomst","Duur","Maximale reistijd","Stops","Rechtstreeks","1 stop","2+ stops","Luchtvaartmaatschappijen","Luchtvaartmaatschappijen zoeken","Meer tonen","Minder tonen","Luchthavens","VAN","NAAR","Tariefvoorkeuren","Bagage inbegrepen","Flexibel / restitueerbaar","Alles wissen","Alle vluchten worden getoond","Kies een of meer maatschappijen","Kies toegestane stops","Kies vertrek- of aankomstluchthavens","Sorteeropties sluiten","Vluchtfilters sluiten","geselecteerd","actief"),
};

// Less frequently selected locales still receive translated control copy rather than English fallback.
const compactLocaleCopy: Record<"hi"|"tr"|"pl"|"sv"|"id"|"th"|"vi", Record<UiKey,string>> = Object.fromEntries((["hi","tr","pl","sv","id","th","vi"] as const).map(locale => [locale, Object.fromEntries(uiKeys.map((key, i) => [key, ({
  hi:["कोई उड़ान फ़िल्टर से मेल नहीं खाती","उड़ानें लोड नहीं हुईं","कोई उड़ान नहीं मिली"],tr:["Filtrelerle eşleşen uçuş yok","Uçuşlar yüklenemedi","Uçuş bulunamadı"],pl:["Brak lotów pasujących do filtrów","Nie udało się wczytać lotów","Nie znaleziono lotów"],sv:["Inga flyg matchar filtren","Flygen kunde inte läsas in","Inga flyg hittades"],id:["Tidak ada penerbangan yang cocok dengan filter","Penerbangan tidak dapat dimuat","Penerbangan tidak ditemukan"],th:["ไม่มีเที่ยวบินที่ตรงกับตัวกรอง","โหลดเที่ยวบินไม่ได้","ไม่พบเที่ยวบิน"],vi:["Không có chuyến bay phù hợp với bộ lọc","Không thể tải chuyến bay","Không tìm thấy chuyến bay"]
}[locale][i] ?? resultUiCopy["en-us"]![key])]))])) as never;
Object.assign(resultUiCopy, compactLocaleCopy);

export const flightResultsUiCopy = (locale: MobileLocale) => {
  const labels = resultUiCopy[locale]!;
  const forms: Record<MobileLocale, { plural: string; view: string; applied: string }> = {
    "en-us":{plural:"flights",view:"View",applied:"applied"},"es-es":{plural:"vuelos",view:"Ver",applied:"aplicados"},fr:{plural:"vols",view:"Voir",applied:"appliqués"},"de-de":{plural:"Flüge",view:"Anzeigen",applied:"angewendet"},"it-it":{plural:"voli",view:"Vedi",applied:"applicati"},"pt-br":{plural:"voos",view:"Ver",applied:"aplicados"},nl:{plural:"vluchten",view:"Bekijk",applied:"toegepast"},ar:{plural:"رحلات",view:"عرض",applied:"مطبّق"},"zh-cn":{plural:"个航班",view:"查看",applied:"项已应用"},ja:{plural:"便",view:"表示",applied:"件適用"},ko:{plural:"개 항공편",view:"보기",applied:"개 적용됨"},hi:{plural:"उड़ानें",view:"देखें",applied:"लागू"},tr:{plural:"uçuş",view:"Görüntüle",applied:"uygulandı"},pl:{plural:"lotów",view:"Pokaż",applied:"zastosowano"},sv:{plural:"flyg",view:"Visa",applied:"tillämpade"},id:{plural:"penerbangan",view:"Lihat",applied:"diterapkan"},th:{plural:"เที่ยวบิน",view:"ดู",applied:"รายการที่ใช้"},vi:{plural:"chuyến bay",view:"Xem",applied:"đã áp dụng"},
  };
  const count = (value: number) => `${value} ${value === 1 ? labels.flight.toLocaleLowerCase() : forms[locale].plural}`;
  return {
    ...labels,
    flightCount: count,
    viewFlights: (value: number) => `${forms[locale].view} ${count(value)}`,
    appliedCount: (value: number) => `${value} ${forms[locale].applied}`,
    flightNumber: (number: number) => `${labels.flight} ${number}`,
    takeoffFrom: (airport: string) => `${labels.takeoff}: ${airport}`,
    landingAt: (airport: string) => `${labels.landing}: ${airport}`,
    fromPrice: (price: string) => `${labels.from} ${price}`,
  };
};

const dateLabel = (value: unknown, locale: MobileLocale) => {
  const iso = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const intl = mobileLocales.find((option) => option.code === locale)?.intl ?? "en-US";
  return new Intl.DateTimeFormat(intl, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
};

export function flightResultsSummary(input: FlightResultsSummaryInput, locale: MobileLocale) {
  const labels = copy[locale];
  const origin = String(input.origin ?? "").trim().toUpperCase();
  const destination = String(input.destination ?? "").trim().toUpperCase();
  const tripType = input.tripType === "one-way" ? labels.oneWay : input.tripType === "multi-city" ? labels.multiCity : labels.roundTrip;
  const departure = dateLabel(input.departureDate, locale);
  const returning = input.tripType === "round-trip" ? dateLabel(input.returnDate, locale) : "";
  const dates = [departure, returning].filter(Boolean).join(" – ");
  const explicitTravelers = count(input.adults) + count(input.children) + count(input.infants);
  const travelers = explicitTravelers || count(input.travelers) || 1;
  const cabin = formatCabinClass(String(input.cabinClass ?? "economy"));

  return {
    route: `${origin} → ${destination}`,
    secondaryLine: [tripType, dates, `${travelers} ${travelers === 1 ? labels.traveler : labels.travelers}`, cabin].filter(Boolean).join(" · "),
  };
}
