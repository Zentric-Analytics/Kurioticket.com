import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,

  flights: "Voli",
  hotels: "Hotel",
  cars: "Auto",
  deals: "Offerte",
  destinations: "Destinazioni",
  saved: "Salvati",
  explore: "Esplora",
  login: "Accedi",
  signIn: "Accedi",
  signUp: "Registrati",

  openLanguagePreferences:
    "Apri le preferenze lingua, lingua attuale {{language}}",
  websiteLanguageTitle: "Scegli la lingua del sito web",
  websiteLanguageDescription:
    "L’inglese (Stati Uniti) è la lingua predefinita del sito. Kurioticket cambia la lingua solo dopo aver selezionato un’opzione disponibile.",
  currentLanguage: "Lingua attuale: {{language}}",
  languagePreparingNotice:
    "Altre lingue sono in preparazione. Le opzioni non disponibili non traducono ancora il sito.",
  languageSearchLabel: "Cerca lingua",
  languageSearchPlaceholder:
    "Cerca English, Español, Français, Deutsch, Italiano...",
  languageOptionsLabel: "Opzioni lingua",
  selectLanguageOption: "Seleziona {{language}}",
  languagePreparingAria: "{{language}} non è ancora disponibile",
  languageUnavailable: "Non disponibile",
  languageUnavailableMessage:
    "{{language}} non è ancora disponibile. Il supporto alla traduzione è in espansione.",
  globalLanguage: "LINGUA GLOBALE",
  closeLanguageSelector: "Chiudi selettore lingua",
  preparing: "Non disponibile",

  homeHeroTitle: "Trova voli economici rapidamente",
  homeHeroSubtitle:
    "Cerca tra centinaia di compagnie aeree e siti di viaggio per trovare le migliori offerte per il tuo prossimo viaggio.",
  homeHeroImageAlt: "Resort tropicale di lusso accanto ad acque tranquille",
  homePopularDestinations: "Destinazioni popolari",
  homePreviousDestinations: "Destinazioni precedenti",
  homeNextDestinations: "Destinazioni successive",
  homeSaveDestination: "Salva {{city}}",
  homeDiscoveryTitle: "Scopri qui la tua prossima avventura",
  homeDiscoverySubtitle:
    "Confronta idee di viaggio intelligenti, tariffe flessibili e destinazioni selezionate per la tua area.",
  homeDiscoverySwipeMore: "Scorri per vedere altre idee di viaggio",
  homeTrustTitle: "Perché i viaggiatori confrontano su Kurioticket",
  homeTrustSubtitle:
    "Kurioticket ti aiuta a confrontare chiaramente le offerte dei fornitori e poi a completare la prenotazione sul sito del fornitore.",
  homeTrustCompareTitle: "Confronta le offerte dei fornitori",
  homeTrustCompareBody:
    "Visualizza opzioni di voli e hotel da più fornitori di viaggio in un unico posto.",
  homeTrustPricingTitle: "Informazioni chiare sui prezzi",
  homeTrustPricingBody:
    "Controlla prezzi, tratte o dettagli del soggiorno e le condizioni principali prima di continuare.",
  homeTrustHandoffTitle: "Reindirizzamento sicuro al fornitore",
  homeTrustHandoffBody:
    "Quando scegli un’offerta, prosegui sul sito del fornitore per completare la prenotazione in modo sicuro.",
  homePromoFlightsTitle: "Offerte voli delle compagnie aeree",
  homePromoFlightsBody:
    "Scopri tariffe a tempo limitato e confronta i prezzi per tratta.",
  homePromoFlightsCta: "Esplora offerte voli",
  homePromoHotelsTitle: "Risparmi sugli hotel in tutto il mondo",
  homePromoHotelsBody:
    "Esplora soggiorni in boutique hotel tramite fornitori di prenotazione premium.",
  homePromoHotelsCta: "Esplora offerte hotel",

  faqHeading: "Domande frequenti",
  faqIntro:
    "Scopri come Kurioticket ti aiuta a confrontare voli, hotel e opzioni di viaggio prima di prenotare con fornitori affidabili.",
  faqQuestionFindOptions: "Come trova Kurioticket opzioni di voli e hotel?",
  faqQuestionSellDirectly:
    "Kurioticket vende direttamente biglietti o camere d’hotel?",
  faqQuestionPriceChanges:
    "Perché i prezzi possono cambiare dopo che clicco su un’offerta?",
  faqQuestionCompareProviders:
    "Posso confrontare più fornitori per lo stesso viaggio?",
  faqQuestionSecureBooking:
    "Come posso completare la prenotazione in modo sicuro?",
  faqQuestionPreferences: "Posso impostare valuta e preferenze di lingua?",
  faqQuestionLiveCached:
    "I risultati di ricerca sono in tempo reale o memorizzati nella cache?",
  faqQuestionManageChanges: "Dove posso gestire modifiche o cancellazioni?",
  faqAnswerFindOptions:
    "Kurioticket cerca offerte in tempo reale dai fornitori di viaggio e riunisce le opzioni in un unico posto, così puoi confrontare prezzi, tratte, soggiorni e dettagli prima di scegliere.",
  faqAnswerSellDirectly:
    "Kurioticket ti aiuta a confrontare le opzioni di viaggio. Quando scegli un’offerta, vieni reindirizzato al fornitore selezionato per controllare i dettagli e completare la prenotazione sul suo sito.",
  faqAnswerPriceChanges:
    "I prezzi e la disponibilità possono cambiare in tempo reale perché compagnie aeree, hotel e fornitori di viaggio aggiornano spesso l’inventario. Controlla sempre il prezzo finale nella pagina di pagamento del fornitore prima di prenotare.",
  faqAnswerCompareProviders:
    "Sì. Kurioticket è progettato per aiutarti a confrontare le opzioni affiancate, così puoi valutare prezzo, orari, dettagli della tratta, dettagli dell’hotel e valore complessivo.",
  faqAnswerSecureBooking:
    "La prenotazione e il pagamento vengono completati nel flusso di pagamento del fornitore. Prima di confermare, controlla sempre i termini del fornitore, la politica di cancellazione e il prezzo finale.",
  faqAnswerPreferences:
    "Sì. Kurioticket ti consente di impostare le preferenze di paese e valuta visualizzate, e puoi scegliere qualsiasi lingua disponibile del sito dal selettore della lingua.",
  faqAnswerLiveCached:
    "Kurioticket utilizza risultati di ricerca dei fornitori che possono aggiornarsi quando disponibilità e prezzi cambiano. Questo aiuta a mostrare opzioni aggiornate, ma la disponibilità finale viene confermata dal fornitore.",
  faqAnswerManageChanges:
    "Modifiche al viaggio, cancellazioni, rimborsi e assistenza sulla prenotazione sono di solito gestiti dal fornitore presso cui è stata completata la prenotazione. Usa i dettagli di conferma di quel fornitore per le richieste di assistenza.",

  homeNewsletterTitle: "Anticipa ogni offerta...",
  homeNewsletterBody: "Ricevi offerte selezionate...",
  homeNewsletterPlaceholder: "Inserisci la tua email",
  homeSubscribe: "Iscriviti",
  homeNewsletterConsent:
    "Iscrivendoti, accetti di ricevere aggiornamenti da Kurioticket. Puoi annullare l’iscrizione in qualsiasi momento.",
  homeNewsletterThanks:
    "Grazie! Hai effettuato l’iscrizione agli aggiornamenti di Kurioticket.",
  homeEmailAddress: "Indirizzo email",

  homeNewsletterInvalidEmail: "Inserisci un indirizzo email valido.",
  homeNewsletterUnableSubscribe:
    "Non è stato possibile completare l’iscrizione.",
  homeNewsletterTryAgain: "Riprova tra poco.",
  faqViewAll: "Vedi tutte le domande frequenti",
  homeSubscribing: "Iscrizione in corso...",
  homeRemoveFromSavedRoutes: "Rimuovi dalle tratte salvate",
  homeSaveRoute: "Salva tratta",
  destinationImageFallback: "Immagine della destinazione",
  homeCheckingProviderRoutePricing:
    "Verifica dei prezzi della tratta con il fornitore",
  displayEstimateFinalProviderMayDiffer:
    "Stima visualizzata; il prezzo finale del fornitore può variare.",
  finalPriceConfirmedByProvider: "Prezzo finale confermato dal fornitore.",
  homePricesUpdateWithProviderResults:
    "I prezzi si aggiornano con i risultati del fornitore",

  footerContactUs: "Contattaci",
  footerCustomerSupport: "Supporto clienti",
  footerServiceGuarantee: "Garanzia del servizio",
  footerMoreServiceInfo: "Maggiori informazioni sul servizio",
  footerDiscover: "Scopri",
  footerSavedRecent: "Salvati e recenti",
  footerTermsSettings: "Termini e impostazioni",
  footerPrivacyPolicy: "Informativa sulla privacy",
  footerTermsOfService: "Termini di servizio",
  footerCookiePolicy: "Informativa sui cookie",
  legalCenter: "Centro legale",
  footerAboutKurioticket: "Informazioni su Kurioticket",
  footerAboutUs: "Chi siamo",
  footerHowItWorks: "Come funziona Kurioticket",
  footerConfidenceTagline:
    "Cerca voli, hotel e offerte di viaggio con fiducia.",
  footerAllRightsReserved: "Tutti i diritti riservati.",
  footerPrivacy: "Privacy",
  footerTerms: "Termini",
  footerCookies: "Cookie",

  roundTrip: "Andata e ritorno",
  tripRound: "Andata e ritorno",
  oneWay: "Solo andata",
  tripOneWay: "Solo andata",
  from: "Da",
  to: "A",
  departure: "Partenza",
  travelDates: "Date di viaggio",
  chooseTravelDates: "Scegli le date di viaggio",
  clearTravelDates: "Cancella date di viaggio",
  clear: "Cancella",
  done: "Fatto",
  previousMonth: "Mese precedente",
  nextMonth: "Mese successivo",
  previousMonthShort: "Precedente",
  nextMonthShort: "Successivo",
  travelers: "Viaggiatori",
  guests: "Ospiti",
  rooms: "Camere",
  cityOrHotel: "Città o hotel",
  chooseHotelDestination: "Scegli la destinazione hotel",
  hotelSearchIntroLabel: "Confronta opzioni hotel",
  hotelSearchDestinationLabel: "Destinazione",
  hotelSearchDestinationPlaceholder: "Città, zona o punto di riferimento",
  hotelSearchTravelDatesLabel: "DATE DI VIAGGIO",
  hotelSearchDatePlaceholder: "Arrivo — Partenza",
  hotelSearchGuestsLabel: "OSPITI",
  chooseGuestsAndRooms: "Scegli ospiti e camere",
  guestsAndRooms: "Ospiti e camere",
  adults: "Adulti",
  children: "Bambini",
  petFriendly: "Animali ammessi",
  onlyShowPetFriendlyStays: "Mostra solo soggiorni che accettano animali",
  togglePetFriendlyStays: "Attiva/disattiva soggiorni che accettano animali",
  hotelStayDetails: "DETTAGLI DEL SOGGIORNO",
  hotelAdultHelper: "Ospiti 18+",
  hotelChildrenHelper: "Età 0–17",
  hotelRoomsHelper: "Fino a 6 camere",
  guestSingular: "ospite",
  guestPlural: "ospiti",
  roomSingular: "camera",
  roomPlural: "camere",
  search: "Cerca",
  searchFlights: "Cerca voli",
  searchHotels: "Cerca hotel",
  passengers: "Passeggeri",
  economy: "Economy",
  business: "Business",
  first: "Prima",
  adultSingular: "adulto",
  adultPlural: "Adulti",
  childSingular: "bambino",
  childPlural: "Bambini",
  infantSingular: "neonato",
  infantPlural: "Neonati",
  childAgeRange: "Età 2–17",
  under2: "Sotto i 2 anni",
  travelerSingular: "viaggiatore",
  travelerPlural: "viaggiatori",
  cabinClass: "Classe di cabina",

  homeDiscoveryRouteIdeaBadge: "Idea di viaggio",
  homeDiscoveryTripOneWay: "Solo andata",
  homeDiscoveryCabinEconomy: "Economy",
  homeDiscoveryTravelerCountOne: "1 viaggiatore",
  homeCompareOptions: "Confronta opzioni",
  homeExploreFares: "Esplora tariffe",
  origin: "Origine",
  destination: "Destinazione",
  departureDate: "DATE DI VIAGGIO",
  fromPrice: "Da",

  "homeDiscoveryRoute.us-jfk-mia.title": "Weekend sulle spiagge di Miami",
  "homeDiscoveryRoute.us-jfk-mia.routeNote":
    "Tratta nonstop ad alta frequenza per fughe al caldo.",
  "homeDiscoveryRoute.us-bos-mia.title": "Pausa al sole invernale di Miami",
  "homeDiscoveryRoute.us-bos-mia.routeNote":
    "Rotta verso il sole con spiagge, ristoranti e quartieri artistici.",
  "homeDiscoveryRoute.us-ord-las.title":
    "Viaggio nell’intrattenimento di Las Vegas",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "Popolare per eventi, spettacoli e voli flessibili nel weekend.",
  "homeDiscoveryRoute.us-lax-sfo.title": "Corridoio rapido per San Francisco",
  "homeDiscoveryRoute.us-lax-sfo.routeNote":
    "Breve tratta molto usata per lavoro, con frequenti orari giornalieri.",
  "homeDiscoveryRoute.us-atl-mco.title": "Fuga in famiglia a Orlando",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "Tratta per parchi a tema con opzioni di orario adatte alle famiglie.",
  "homeDiscoveryRoute.us-dfw-sea.title": "Viaggio tra caffè e natura a Seattle",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "Ideale per scene gastronomiche urbane e gite nel Pacifico nord-occidentale.",
  "homeDiscoveryRoute.us-mia-cun.title": "Breve fuga leisure a Cancun",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "Rapida tratta internazionale per resort sulla spiaggia e weekend lunghi.",
  "homeDiscoveryRoute.us-ord-pdx.title":
    "Weekend tra cibo e foreste a Portland",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "City break nel Pacifico nord-occidentale tra torrefazioni, parchi e cascate vicine.",
  "homeDiscoveryRoute.us-sea-hnl.title": "Pausa tropicale a Honolulu",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "Fuga diretta su un’isola con spiagge, surf e viste sui vulcani.",
  "homeDiscoveryRoute.us-bos-sju.title": "Weekend lungo caraibico a San Juan",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "Tratta verso un territorio USA caldo, con centro storico e spiagge.",
  "homeDiscoveryRoute.us-den-phx.title":
    "Viaggio nel sole desertico di Phoenix",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "Breve tratta verso ovest per weekend di golf ed escursioni nel deserto di Sonora.",
  "homeDiscoveryRoute.us-iad-bna.title":
    "Fuga nella città della musica Nashville",
  "homeDiscoveryRoute.us-iad-bna.routeNote":
    "Tratta domestica molto richiesta per musica dal vivo, cucina e festival.",
  "homeDiscoveryRoute.us-lax-yvr.title":
    "Fuga tra montagne e città a Vancouver",
  "homeDiscoveryRoute.us-lax-yvr.routeNote":
    "Facile tratta transfrontaliera per viste sul porto, seafood e sentieri alpini vicini.",
  "homeDiscoveryRoute.us-sea-anc.title":
    "Porta d’accesso alla natura di Anchorage",
  "homeDiscoveryRoute.us-sea-anc.routeNote":
    "Preferita stagionale per ghiacciai, tour della fauna ed escursioni.",
  "homeDiscoveryRoute.us-jfk-aus.title":
    "Salto nella città della musica live Austin",
  "homeDiscoveryRoute.us-jfk-aus.routeNote":
    "Popolare tratta domestica per festival, startup e food truck.",
  "homeDiscoveryRoute.us-dtw-msy.title": "Weekend jazz a New Orleans",
  "homeDiscoveryRoute.us-dtw-msy.routeNote":
    "Tratta ricca di cultura per jazz club, cucina creola e serate nel Quartiere Francese.",
  "homeDiscoveryRoute.us-phl-san.title": "Pausa costiera a San Diego",
  "homeDiscoveryRoute.us-phl-san.routeNote":
    "Fuga coast-to-coast con spiagge, crociere nel porto e clima mite.",

  homeDestinationDubaiCity: "Dubai",
  homeDestinationDubaiCountry: "Emirati Arabi Uniti",
  homeDestinationDubaiAlt: "Dubai, Emirati Arabi Uniti",
  homeDestinationLondonCity: "Londra",
  homeDestinationLondonCountry: "Regno Unito",
  homeDestinationLondonAlt: "Londra, Regno Unito",
  homeDestinationParisCity: "Parigi",
  homeDestinationParisCountry: "Francia",
  homeDestinationParisAlt: "Parigi, Francia",
  homeDestinationBaliCity: "Bali",
  homeDestinationBaliCountry: "Indonesia (Bali)",
  homeDestinationBaliAlt: "Bali, Indonesia",
  homeDestinationNewYorkCity: "New York",
  homeDestinationNewYorkCountry: "Stati Uniti",
  homeDestinationNewYorkAlt: "New York, Stati Uniti",

  flightLandingHeroTitle:
    "Trova il tuo prossimo volo conveniente con facilità.",
  flightLandingHeroSubtitle:
    "Cerca rotte, confronta date ed esplora opzioni di volo per il tuo prossimo viaggio.",
  flightLandingHeroImageAlt: "Ala di aereo sopra nuvole luminose",
  flightLandingFeatureSearchReadyTitle: "Rotte pronte per la ricerca",
  flightLandingFeatureSearchReadyBody:
    "Inserisci dettagli di viaggio reali prima che i risultati vengano richiesti ai fornitori di voli.",
  flightLandingFeatureCompareTitle: "Confronta con il contesto",
  flightLandingFeatureCompareBody:
    "Usa date, numero di viaggiatori, cabina, durata, scali e dettagli della rotta per valutare le opzioni.",
  flightLandingFeatureProviderTitle: "Verifica del fornitore",
  flightLandingFeatureProviderBody:
    "Conferma sempre disponibilità finale, prezzo e regole con il fornitore prima di prenotare.",
  discoverDestinationsFromRegion: "Scopri destinazioni dalla tua regione",
  discoverDestinationsFromRegionBody:
    "Esplora rotte selezionate e inizia il tuo prossimo viaggio con fiducia.",
  flightLandingStartThisSearch: "Avvia questa ricerca",
  flightLandingRouteIdeasTitle: "Idee di rotta per viaggi flessibili",
  flightLandingRouteIdeasBody:
    "Sfoglia le idee di rotta, poi avvia una ricerca reale con date e viaggiatori prima di confrontare i voli disponibili.",
  flightLandingRouteConnector: "verso",
  flightLandingRouteAriaLabel: "Cerca voli da {{origin}} a {{destination}}",
  "flightLandingCity.Cancun": "Cancun",
  "flightLandingCity.Cape Town": "Cape Town",
  "flightLandingCity.Lisbon": "Lisbona",
  "flightLandingCity.New York": "New York",
  "flightLandingCity.Sydney": "Sydney",
  "flightLandingCity.Toronto": "Toronto",
  "flightLandingCity.Zanzibar": "Zanzibar",
  beachVacations: "Vacanze al mare",
  beachVacationsBody:
    "Esplora rotte di volo verso coste soleggiate, fughe su isole e destinazioni balneari dal clima caldo.",
  flightBookingFaqs: "Domande frequenti sulla prenotazione dei voli",
  flightBookingFaqIntro:
    "Rivedi i dettagli comuni della ricerca voli prima di continuare con un fornitore.",
  flightFaqBestTimeQuestion:
    "Qual è il momento migliore per prenotare un volo?",
  flightFaqBestTimeAnswer:
    "I prezzi dei voli possono cambiare in base a rotta, stagione, domanda e disponibilità. Di solito è utile confrontare più date, controllare aeroporti vicini quando possibile e rivedere l’intero itinerario prima di scegliere una tariffa.",
  flightFaqBeforeBookingQuestion: "Cosa devo controllare prima di prenotare?",
  flightFaqBeforeBookingAnswer:
    "Controlla gli orari di partenza e arrivo, la durata totale del viaggio, gli scali, le regole sui bagagli, le opzioni di selezione del posto, i termini di cancellazione e la politica di modifica del biglietto prima di completare la prenotazione con il fornitore.",
  flightFaqFlexibleFareQuestion: "Che cos’è una tariffa flessibile?",
  flightFaqFlexibleFareAnswer:
    "Una tariffa flessibile può consentire modifiche o cancellazioni con meno restrizioni rispetto a una tariffa base, ma le regole esatte dipendono dalla compagnia aerea o dal fornitore di prenotazione. Controlla sempre le condizioni tariffarie prima dell’acquisto.",
  flightFaqNonstopQuestion: "I voli nonstop sono sempre migliori?",
  flightFaqNonstopAnswer:
    "Non sempre. I voli nonstop possono far risparmiare tempo, mentre le rotte con uno scalo possono offrire orari di partenza diversi, finestre di arrivo diverse o opzioni tariffarie differenti. Confronta durata totale del viaggio, durata dello scalo e comodità prima di decidere.",
  flightFaqBaggageQuestion: "Come funzionano le regole sui bagagli?",
  flightFaqBaggageAnswer:
    "La franchigia bagaglio può variare in base a compagnia aerea, rotta, cabina, tipo di tariffa e fornitore. Controlla prima della prenotazione se bagaglio a mano, bagagli registrati e oggetti personali sono inclusi.",
  flightFaqChangeCancelQuestion:
    "Posso modificare o cancellare il mio biglietto?",
  flightFaqChangeCancelAnswer:
    "Le opzioni di modifica e cancellazione dipendono dalle regole tariffarie e dalle politiche del fornitore. Alcuni biglietti possono essere non rimborsabili o prevedere commissioni, quindi rivedi attentamente i termini prima di prenotare.",
  flightFaqInternationalQuestion: "Cosa devo sapere sui voli internazionali?",
  flightFaqInternationalAnswer:
    "Per i viaggi internazionali, controlla validità del passaporto, requisiti di visto, regole di transito, politiche sui bagagli e requisiti di arrivo della destinazione prima di prenotare.",
  "homeDiscoveryRoute.fallback-yyz-cun.title": "Fuga al mare a Cancun",
  "homeDiscoveryRoute.fallback-yyz-cun.routeNote":
    "Spiagge turchesi e soggiorni in resort per facili pause al caldo.",
  "homeDiscoveryRoute.fallback-syd-dps.title": "Pausa sull’isola di Bali",
  "homeDiscoveryRoute.fallback-syd-dps.routeNote":
    "Ville tropicali, risaie terrazzate e coste pronte per il surf.",
  "homeDiscoveryRoute.fallback-fra-cpt.title": "Avventura a Cape Town",
  "homeDiscoveryRoute.fallback-fra-cpt.routeNote":
    "Escursioni sulla Table Mountain, strade costiere e gite tra i vigneti.",
  "homeDiscoveryRoute.fallback-jnb-znz.title": "Relax sull’isola di Zanzibar",
  "homeDiscoveryRoute.fallback-jnb-znz.routeNote":
    "Spiagge dell’Oceano Indiano, vicoli di Stone Town e barriere per immersioni.",
};
