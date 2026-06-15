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
  travelers: "Viaggiatori",
  search: "Cerca",
  searchFlights: "Cerca voli",
  searchHotels: "Cerca hotel",
  economy: "Economy",
  adultSingular: "adulto",
  adultPlural: "adulti",
  travelerSingular: "viaggiatore",
  travelerPlural: "viaggiatori",

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
  "homeDiscoveryRoute.us-ord-las.title":
    "Viaggio nell’intrattenimento di Las Vegas",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "Popolare per eventi, spettacoli e voli flessibili nel weekend.",
  "homeDiscoveryRoute.us-lax-sfo.title": "Corridoio rapido per San Francisco",
  "homeDiscoveryRoute.us-lax-sfo.routeNote":
    "Breve tratta molto usata per lavoro con frequenti orari giornalieri.",
  "homeDiscoveryRoute.us-atl-mco.title": "Fuga in famiglia a Orlando",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "Tratta per parchi a tema con opzioni di orario adatte alle famiglie.",
  "homeDiscoveryRoute.us-dfw-sea.title": "Viaggio tra caffè e natura a Seattle",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "Ideale per scene gastronomiche urbane e gite nel Pacific Northwest.",
  "homeDiscoveryRoute.us-mia-cun.title": "Breve fuga leisure a Cancun",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "Rapida tratta internazionale per resort sulla spiaggia e weekend lunghi.",
  "homeDiscoveryRoute.us-ord-pdx.title":
    "Weekend tra cibo e foreste a Portland",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "City break nel Pacific Northwest tra torrefazioni, parchi e cascate vicine.",
  "homeDiscoveryRoute.us-sea-hnl.title": "Pausa tropicale a Honolulu",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "Fuga diretta sulle isole per spiagge, surf e viste sui vulcani.",
  "homeDiscoveryRoute.us-bos-sju.title": "Weekend lungo caraibico a San Juan",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "Tratta verso un territorio USA al caldo con centro storico e spiagge.",
  "homeDiscoveryRoute.us-den-phx.title":
    "Viaggio nel sole desertico di Phoenix",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "Breve tratta occidentale per weekend di golf ed escursioni nel deserto di Sonora.",
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
    "Tratta ricca di cultura per jazz club, cucina creola e serate nel French Quarter.",
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
};
