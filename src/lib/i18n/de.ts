import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  loginPageTitle: "Anmelden",
  loginPageSubtitle:
    "Speichern Sie Suchen, verwalten Sie Benachrichtigungen und greifen Sie auf Ihr Reise-Dashboard zu.",
  loginEmailLabel: "E-Mail",
  loginPasswordLabel: "Passwort",
  loginForgotPassword: "Passwort vergessen?",
  loginSubmit: "Anmelden",
  loginCheckingDetails: "Anmeldung läuft …",
  loginGoogle: "Mit Google fortfahren",
  loginSignupPrompt: "Neu bei Kurioticket?",
  loginCreateAccount: "Konto erstellen",
  loginInvalidCredentials:
    "Ungültige E-Mail-Adresse oder ungültiges Passwort.",
  loginRateLimited:
    "Zu viele Anmeldeversuche. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
  loginCodeSent: "Wir haben einen Bestätigungscode an Ihre E-Mail gesendet.",
  loginCodeFailed:
    "Dieser Code hat nicht funktioniert. Prüfen Sie den Code und versuchen Sie es erneut.",
  loginProcessing:
    "Ihre Angaben werden geprüft und ein Bestätigungscode wird gesendet …",
  loginResendSuccess:
    "Wir haben einen neuen Code gesendet, sofern dieses Konto angemeldet werden kann.",
  loginEnterCode: "Geben Sie den 6-stelligen Anmeldecode ein.",
  loginVerifiedRedirecting: "Bestätigt. Weiterleitung läuft …",
  loginStartOverError:
    "Beginnen Sie erneut, damit wir Ihre Angaben prüfen können, bevor ein neuer Code gesendet wird.",
  loginSendingNewCode: "Ein neuer Bestätigungscode wird gesendet …",
  loginUnableSendNewCode:
    "Ein neuer Code kann derzeit nicht gesendet werden. Bitte versuchen Sie es erneut.",
  loginUnableSendLoginCode:
    "Der Anmeldecode kann derzeit nicht gesendet werden. Bitte versuchen Sie es erneut.",
  loginCodeInstructions:
    "Geben Sie den 6-stelligen Code ein, der an {{email}} gesendet wurde. Codes laufen nach 10 Minuten ab.",
  loginVerificationCodeLabel: "Bestätigungscode",
  loginVerifying: "Bestätigung läuft …",
  loginVerifyLogin: "Anmeldung bestätigen",
  loginSendingCode: "Code wird gesendet …",
  loginResendIn: "Erneut senden in {{seconds}} s",
  loginResendCode: "Code erneut senden",
  loginUseDifferentDetails: "Andere Angaben verwenden",
  loginPasswordResetSuccess:
    "Ihr Passwort wurde zurückgesetzt. Melden Sie sich mit Ihrem neuen Passwort an.",
  loginInactiveMessage:
    "Sie wurden nach 30 Minuten Inaktivität abgemeldet. Melden Sie sich erneut an, um fortzufahren.",
  loginErrorAccountUnavailable:
    "Dieses Konto ist nicht verfügbar. Bitte kontaktieren Sie den Support.",
  loginErrorOAuthCallback:
    "Die Google-Anmeldung wurde während des Rückrufs unterbrochen. Bitte versuchen Sie es erneut.",
  loginErrorOAuthAccountNotLinked:
    "Diese E-Mail-Adresse ist bereits mit einer anderen Anmeldemethode verknüpft. Verwenden Sie Ihre ursprüngliche Methode oder setzen Sie Ihr Passwort zurück.",
  loginErrorAccessDenied:
    "Der Zugriff wurde von Google verweigert. Bitte erlauben Sie den Zugriff und versuchen Sie es erneut.",
  loginErrorConfiguration:
    "Die Google-Anmeldung ist vorübergehend nicht verfügbar. Bitte versuchen Sie es in Kürze erneut oder verwenden Sie die E-Mail-Anmeldung.",
  loginErrorCallback:
    "Der Rückruf der Google-Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut oder verwenden Sie die E-Mail-Anmeldung.",
  loginErrorGoogleGeneric:
    "Die Google-Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut oder verwenden Sie die E-Mail-Anmeldung.",
  homeHeroTitle: "Günstige Flüge schnell finden",
  homeHeroSubtitle:
    "Durchsuche Hunderte Airlines und Reiseportale, um die besten Angebote für deine nächste Reise zu finden.",
  homeAssuranceBestPrice: "Bestpreise garantiert",
  homeAssuranceCompare: "Anbieter einfach vergleichen",
  homeAssuranceSecure: "Sichere Zahlungen",
  homeAssuranceSupport: "24/7 Kundensupport",
  homeHeroBadge: "Vertrauenswürdige Reisesuchplattform",
  homeFeaturesMillionsTitle: "Millionen Optionen",
  homeFeaturesMillionsBody:
    "Vergleiche Flüge und Hotels von einem großen Netzwerk vertrauenswürdiger Anbieter an einem Ort.",
  homeFeaturesFlexibleTitle: "Flexible Suche",
  homeFeaturesFlexibleBody:
    "Filtere nach Stopps, Budget, Reiseklasse und Zeiten passend zu deinem Reisestil.",
  homeFeaturesSecureTitle: "Sicheres Erlebnis",
  homeFeaturesSecureBody:
    "Deine Reiseplanung bleibt mit verlässlichen Partnern und sicherer Buchungsweiterleitung geschützt.",
  homeFeaturesDealsTitle: "Echtzeit-Angebote",
  homeFeaturesDealsBody:
    "Erfasse Preisstürze und exklusive Aktionen, bevor sie verschwinden.",
  homePopularDestinations: "Beliebte Reiseziele",
  homeViewAllDestinations: "Alle Reiseziele anzeigen",
  homePromoFlightsTitle: "Flugangebote führender Airlines",
  homePromoFlightsBody:
    "Entdecke zeitlich begrenzte Tarife und vergleiche Optionen sofort.",
  homePromoFlightsCta: "Flugangebote entdecken",
  homePromoHotelsTitle: "Hotels weltweit günstiger",
  homePromoHotelsBody:
    "Finde Unterkünfte von Boutique-Hotels bis zu globalen Ketten mit Preistransparenz.",
  homePromoHotelsCta: "Hotelangebote entdecken",
  homeNewsletterTitle: "Bleib bei jedem Reiseangebot vorne",
  homeNewsletterBody: "Erhalte wöchentliche kuratierte Flug- und Hotelupdates.",
  homeNewsletterPlaceholder: "E-Mail eingeben",
  homeSubscribe: "Abonnieren",
  homeNewsletterThanks:
    "Danke! Wir halten dich mit Reiseangeboten auf dem Laufenden.",
  homeHeroImageAlt: "Luxuriöses tropisches Resort am ruhigen Wasser",
  homeNextDestinations: "Nächste Reiseziele",
  homeEmailAddress: "E-Mail-Adresse",
  homeSaveDestination: "Speichern {{city}}",
  fromPrice: "Ab",
  homeDestinationDubaiCity: "Dubai",
  homeDestinationDubaiCountry: "Vereinigte Arabische Emirate",
  homeDestinationDubaiAlt: "Dubai, Vereinigte Arabische Emirate",
  homeDestinationLondonCity: "London",
  homeDestinationLondonCountry: "Vereinigtes Königreich",
  homeDestinationLondonAlt: "London, Vereinigtes Königreich",
  homeDestinationParisCity: "Paris",
  homeDestinationParisCountry: "Frankreich",
  homeDestinationParisAlt: "Paris, Frankreich",
  homeDestinationBaliCity: "Bali",
  homeDestinationBaliCountry: "Indonesien",
  homeDestinationBaliAlt: "Bali, Indonesien",
  homeDestinationNewYorkCity: "New York",
  homeDestinationNewYorkCountry: "Vereinigte Staaten",
  homeDestinationNewYorkAlt: "New York, Vereinigte Staaten",

  flights: "Flüge",
  hotels: "Hotels",
  cars: "Mietwagen",
  search: "Suchen",
  deals: "Angebote",
  support: "Support",
  destinations: "Reiseziele",
  login: "Anmelden",
  signup: "Registrieren",
  language: "Sprache",
  languageSelectorTitle: "Sprache auswählen",
  languageSelectorSubtitle: "Wähle eine verfügbare Sprache für Kurioticket.",
  languageSearchPlaceholder: "English, Español, Français, Deutsch suchen...",
  languageCurrent: "Aktuelle Sprache",
  languageAvailable: "Verfügbar",
  languageUnavailable: "Bald verfügbar",
  languageUnavailableMessage:
    "{{language}} ist noch nicht verfügbar. Die Übersetzungsunterstützung wird erweitert.",
  languageDefaultNote:
    "Deutsch ist jetzt für die Kurioticket-Oberfläche verfügbar.",
  preparing: "Bald verfügbar",
  available: "Verfügbar",
  close: "Schließen",
  apply: "Anwenden",
  clear: "Löschen",
  done: "Fertig",
  loading: "Wird geladen",
  error: "Fehler",
  tryAgain: "Erneut versuchen",
  noResultsFound: "Keine Ergebnisse gefunden",
  filters: "Filter",
  sort: "Sortieren",
  price: "Preis",
  duration: "Dauer",
  airlines: "Fluggesellschaften",
  stops: "Zwischenstopps",
  from: "Von",
  to: "Nach",
  origin: "Abflugort",
  destination: "Ziel",
  departure: "Abflug",
  return: "Rückflug",
  travelDates: "Reisedaten",
  passengers: "Passagiere",
  travelers: "Reisende",
  rooms: "Zimmer",
  cabin: "Kabine",
  economy: "Economy",
  roundTrip: "Hin- und Rückflug",
  oneWay: "Einfache Strecke",
  fromPlaceholder: "Von?",
  toPlaceholder: "Wohin?",
  clearTravelDates: "Reisedaten löschen",
  clearOrigin: "Abflugort löschen",
  multiCity: "Mehrere Städte",
  useOneWayOrRoundTripSearch: "Einfache Strecke oder Hin- und Rückflug verwenden",
  business: "Business",
  first: "First",
  adultSingular: "Erwachsener",
  adultPlural: "Erwachsene",
  childSingular: "Kind",
  childPlural: "Kinder",
  infantSingular: "Kleinkind",
  infantPlural: "Kleinkinder",
  premiumEconomy: "Premium Economy",
  travelerSingular: "Reisender",
  travelerPlural: "Reisende",
  cabinClass: "Kabinenklasse",
  nearYou: "In Ihrer Nähe",
  airportsAndCities: "Flughäfen und Städte",
  searchAirportsAndCities: "Flughäfen und Städte suchen",
  searchAirportsOrCities: "Flughäfen oder Städte suchen",
  cityAirportOrCode: "Stadt, Flughafen oder Code",
  startTypingCityAirportOrCode:
    "Geben Sie eine Stadt, einen Flughafen oder einen IATA-Code ein, um Vorschläge zu sehen.",
  startTypingCityOrAirport:
    "Geben Sie den Namen einer Stadt oder eines Flughafens ein, um Vorschläge zu sehen.",
  searchingAirportsAndCities: "Flughäfen und Städte werden gesucht…",
  noMatchingAirportsOrCities: "Keine passenden Flughäfen oder Städte gefunden.",
  weekdayMon: "Mo.",
  weekdayTue: "Di.",
  weekdayWed: "Mi.",
  weekdayThu: "Do.",
  weekdayFri: "Fr.",
  weekdaySat: "Sa.",
  weekdaySun: "So.",
  "homePopularDestinationCountry.unitedStates": "Vereinigte Staaten",
  searchFlights: "Flüge suchen",
  viewFlight: "Flug ansehen",
  continueToProvider: "Weiter zum Anbieter",
  selectedFlights: "Ausgewählte Flüge",
  compareMoreProviders: "Weitere Anbieter vergleichen",
  estimatedPrice: "Geschätzter Preis",
  estimateShown: "Angezeigte Schätzung",
  providerPrice: "Anbieterpreis",
  popularDestinations: "Beliebte Reiseziele",
  faq: "Häufige Fragen",
  subscribe: "Abonnieren",
  newsletter: "Newsletter",
  recentSearches: "Letzte Suchen",
  savedTrips: "Gespeicherte Reisen",
  customerSupport: "Kundensupport",
  helpCenter: "Hilfe-Center",
  contactSupport: "Support kontaktieren",
  legalCenter: "Rechtscenter",
  termsOfService: "Nutzungsbedingungen",
  privacyPolicy: "Datenschutzrichtlinie",
  cookiePolicy: "Cookie-Richtlinie",
  print: "Drucken",
  tableOfContents: "Inhaltsverzeichnis",
  lastUpdated: "Zuletzt aktualisiert",
  createYourAccount: "Konto erstellen",
  createAccount: "Konto erstellen",
  continueWithGoogle: "Mit Google fortfahren",
  email: "E-Mail",
  password: "Passwort",
  fullName: "Vollständiger Name",
  forgotPassword: "Passwort vergessen?",
  cityOrAirport: "Stadt oder Flughafen",
  flightLandingHeroTitle:
    "Finden Sie Ihren nächsten günstigen Flug ganz einfach.",
  flightLandingHeroSubtitle:
    "Suchen Sie Routen, vergleichen Sie Reisedaten und entdecken Sie Flugoptionen für Ihre nächste Reise.",
  flightLandingHeroImageAlt: "Flugzeugflügel über hellen Wolken",
  flightLandingFeatureSearchReadyTitle: "Suchbereite Routen",
  flightLandingFeatureSearchReadyBody:
    "Geben Sie echte Reisedaten ein, bevor Ergebnisse von Fluganbietern angefordert werden.",
  flightLandingFeatureCompareTitle: "Im Kontext vergleichen",
  flightLandingFeatureCompareBody:
    "Nutzen Sie Reisedaten, Reisendenanzahl, Kabine, Dauer, Zwischenstopps und Routendetails, um Optionen zu bewerten.",
  flightLandingFeatureProviderTitle: "Anbieterprüfung",
  flightLandingFeatureProviderBody:
    "Bestätigen Sie die endgültige Verfügbarkeit, den Preis und die Regeln vor der Buchung immer beim Anbieter.",
  discoverDestinationsFromRegion: "Entdecken Sie Reiseziele ab Ihrer Region",
  discoverDestinationsFromRegionBody:
    "Entdecken Sie ausgewählte Routen und starten Sie Ihre nächste Reise mit Vertrauen.",
  flightLandingStartThisSearch: "Diese Suche starten",
  flightLandingRouteIdeasTitle: "Routenideen für flexible Reisen",
  flightLandingRouteIdeasBody:
    "Durchstöbern Sie Routenideen und starten Sie dann eine echte Suche mit Reisedaten und Reisenden, bevor Sie verfügbare Flüge vergleichen.",
  flightLandingRouteConnector: "nach",
  flightLandingRouteAriaLabel:
    "Flüge von {{origin}} nach {{destination}} suchen",
  beachVacations: "Strandurlaub",
  beachVacationsBody:
    "Entdecken Sie Flugrouten zu sonnigen Küsten, Inselzielen und warmen Stranddestinationen.",
  flightBookingFaqs: "Häufige Fragen zur Flugbuchung",
  flightBookingFaqIntro:
    "Prüfen Sie häufige Details zur Flugsuche, bevor Sie mit einem Anbieter fortfahren.",
  flightFaqBestTimeQuestion: "Wann ist die beste Zeit, einen Flug zu buchen?",
  flightFaqBestTimeAnswer:
    "Flugpreise können sich je nach Strecke, Saison, Nachfrage und Verfügbarkeit ändern. Es ist in der Regel hilfreich, mehrere Reisedaten zu vergleichen, wenn möglich nahegelegene Flughäfen zu prüfen und die gesamte Reiseroute anzusehen, bevor Sie einen Tarif auswählen.",
  flightFaqBeforeBookingQuestion: "Was sollte ich vor der Buchung prüfen?",
  flightFaqBeforeBookingAnswer:
    "Prüfen Sie Abflug- und Ankunftszeiten, die gesamte Reisezeit, Zwischenstopps, Gepäckregeln, Sitzplatzauswahl, Stornierungsbedingungen und die Richtlinie für Ticketänderungen, bevor Sie Ihre Buchung beim Anbieter abschließen.",
  flightFaqFlexibleFareQuestion: "Was ist ein flexibler Tarif?",
  flightFaqFlexibleFareAnswer:
    "Ein flexibler Tarif kann Änderungen oder Stornierungen mit weniger Einschränkungen als ein Basistarif ermöglichen. Die genauen Regeln hängen jedoch von der Fluggesellschaft oder dem Buchungsanbieter ab. Prüfen Sie vor dem Kauf immer die Tarifbedingungen.",
  flightFaqNonstopQuestion: "Sind Nonstop-Flüge immer besser?",
  flightFaqNonstopAnswer:
    "Nicht immer. Nonstop-Flüge können Zeit sparen, während Verbindungen mit einem Zwischenstopp andere Abflugzeiten, Ankunftsfenster oder Tarifoptionen bieten können. Vergleichen Sie die gesamte Reisezeit, die Dauer des Zwischenstopps und den Komfort, bevor Sie sich entscheiden.",
  flightFaqBaggageQuestion: "Wie funktionieren Gepäckregeln?",
  flightFaqBaggageAnswer:
    "Die Gepäckregelungen können je nach Fluggesellschaft, Strecke, Kabine, Tarifart und Anbieter variieren. Prüfen Sie vor der Buchung, ob Handgepäck, aufgegebenes Gepäck und persönliche Gegenstände enthalten sind.",
  flightFaqChangeCancelQuestion: "Kann ich mein Ticket ändern oder stornieren?",
  flightFaqChangeCancelAnswer:
    "Änderungs- und Stornierungsmöglichkeiten hängen von den Tarifregeln und den Richtlinien des Anbieters ab. Einige Tickets können nicht erstattungsfähig sein oder Gebühren enthalten. Prüfen Sie daher die Bedingungen vor der Buchung sorgfältig.",
  flightFaqInternationalQuestion:
    "Was sollte ich über internationale Flüge wissen?",
  flightFaqInternationalAnswer:
    "Bei internationalen Reisen sollten Sie vor der Buchung die Gültigkeit Ihres Reisepasses, Visabestimmungen, Transitregeln, Gepäckrichtlinien und Einreiseanforderungen für Ihr Reiseziel prüfen.",
  "flightLandingCity.Cancun": "Cancún",
  "flightLandingCity.Cape Town": "Kapstadt",
  "homeDiscoveryRoute.us-jfk-mia.title": "Strandwochenende in Miami",
  "homeDiscoveryRoute.us-jfk-mia.routeNote":
    "Häufige Nonstop-Route für Auszeiten bei warmem Wetter.",
  "homeDiscoveryRoute.us-ord-las.title": "Unterhaltungstrip nach Las Vegas",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "Beliebt für Events, Shows und flexible Wochenendflüge.",
  "homeDiscoveryRoute.us-lax-sfo.title":
    "Schnelle Verbindung nach San Francisco",
  "homeDiscoveryRoute.us-lax-sfo.routeNote":
    "Beliebte Kurzstrecke für Geschäftsreisen mit häufigen täglichen Verbindungen.",
  "homeDiscoveryRoute.us-atl-mco.title": "Familienausflug nach Orlando",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "Route zu Freizeitparks mit familienfreundlichen Zeitoptionen.",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "Ideal für urbane Food-Szenen und Tagesausflüge im pazifischen Nordwesten.",
  "homeDiscoveryRoute.us-mia-cun.title": "Kurzer Freizeittrip nach Cancún",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "Schnelle internationale Route zu Strandresorts und langen Wochenenden.",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "Städtereise im pazifischen Nordwesten mit Kaffeeröstereien, Parks und nahegelegenen Wasserfällen.",
  "homeDiscoveryRoute.us-sea-hnl.title": "Tropische Auszeit in Honolulu",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "Direkte Insel-Auszeit mit Stränden, Surfen und Vulkanblicken.",
  "homeDiscoveryRoute.us-bos-sju.title": "Langes Karibikwochenende in San Juan",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "Warmwetter-Route in ein US-Territorium mit historischer Altstadt und Stränden.",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "Kurze Route in den Westen für Golfwochenenden und Wanderungen in der Sonora-Wüste.",
  "homeDiscoveryRoute.us-dfw-sea.title": "Kaffee- und Naturtrip nach Seattle",
  "homeDiscoveryRoute.us-ord-pdx.title":
    "Food- und Waldwochenende in Portland",
  "homeDiscoveryRoute.us-den-phx.title": "Wüstensonnentrip nach Phoenix",
  "homeDiscoveryRoute.us-iad-bna.routeNote":
    "Stark nachgefragte Inlandsroute für Livemusik, Essen und Festivals.",
  "homeDiscoveryRoute.us-iad-bna.title": "Musikstadt-Auszeit in Nashville",
  "homeDiscoveryRoute.us-lax-yvr.routeNote":
    "Einfache grenzüberschreitende Route mit Hafenblick, Meeresfrüchten und nahegelegenen alpinen Wegen.",
  "homeDiscoveryRoute.us-lax-yvr.title":
    "Berg- und Stadtauszeit in Vancouver",
  "homeDiscoveryRoute.us-phl-san.title": "Küstenauszeit in San Diego",
  "homeDiscoveryRoute.us-phl-san.routeNote":
    "Reise quer durchs Land mit Stränden, Hafenrundfahrten und mildem Wetter.",
  "homeDiscoveryRoute.fallback-fra-cpt.title": "Küstenabenteuer in Kapstadt",
  "homeDiscoveryRoute.fallback-fra-cpt.routeNote":
    "Malerische Südafrika-Route mit Stränden, Bergen und Weinbergen.",
  "homeDiscoveryRoute.ng-los-cpt.title": "Küstenabenteuer in Kapstadt",
  "homeDiscoveryRoute.ng-los-cpt.routeNote":
    "Malerische Südafrika-Route mit Stränden, Bergen und Weinbergen.",
  "homeDiscoveryRoute.fallback-yyz-cun.title": "Winterauszeit in Cancún",
  "homeDiscoveryRoute.fallback-yyz-cun.routeNote":
    "Zuverlässige Freizeitroute mit Nonstop-Optionen in der Hochsaison.",
  "homeDiscoveryRoute.ca-yyz-cun.title": "Winterauszeit in Cancún",
  "homeDiscoveryRoute.ca-yyz-cun.routeNote":
    "Zuverlässige Freizeitroute mit Nonstop-Optionen in der Hochsaison.",

  chooseHotelDestination: "Hotelziel auswählen",
  hotelSearchIntroLabel: "Hoteloptionen vergleichen",
  hotelSearchDestinationLabel: "Reiseziel",
  hotelSearchDestinationPlaceholder: "Stadt, Region oder Sehenswürdigkeit",
  hotelSearchTravelDatesLabel: "Reisedaten",
  hotelSearchDatePlaceholder: "Anreise — Abreise",
  hotelSearchGuestsLabel: "Gäste",
  editHotelSearch: "Hotelsuche bearbeiten",
  closeSearchForm: "Suchformular schließen",
  hotelDestinationSuggestions: "Hotelzielvorschläge",
  findingDestinations: "Reiseziele werden gesucht…",
  noMatchingDestinationsYet: "Noch keine passenden Reiseziele.",
  searchCityAreaLandmark: "Nach Stadt, Gegend oder Sehenswürdigkeit suchen.",
  previousMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  previousMonthShort: "Zurück",
  nextMonthShort: "Weiter",
  selectDateAriaPrefix: "Datum auswählen",
  clearAll: "Alles löschen",
  cityOrHotel: "Stadt oder Hotel",
  checkIn: "Check-in",
  checkOut: "Check-out",
  guests: "Gäste",
  chooseGuestsAndRooms: "Gäste und Zimmer auswählen",
  guestsAndRooms: "Gäste und Zimmer",
  adults: "Erwachsene",
  children: "Kinder",
  petFriendly: "Haustierfreundlich",
  onlyShowPetFriendlyStays:
    "Nur Aufenthalte anzeigen, die Haustiere erlauben",
  togglePetFriendlyStays: "Haustierfreundliche Aufenthalte umschalten",
  chooseTravelDates: "Reisedaten auswählen",
  clearDestination: "Reiseziel löschen",
  guestSingular: "Gast",
  guestPlural: "Gäste",
  roomSingular: "Zimmer",
  roomPlural: "Zimmer",
  searchingHotels: "Hotels werden gesucht...",
  exploreHotelStaysByDestination:
    "Hotelaufenthalte nach Reiseziel entdecken",
  featuredHotelDestinations: "Ausgewählte Hotelreiseziele",
  findStaysEveryKindTrip: "Aufenthalte für jede Art von Reise finden",
  hotelInspirationBody:
    "Entdecken Sie Reiseziele passend zu der Art von Aufenthalt, die Sie suchen.",
  hotelInspirationCategories: "Hotelinspirationskategorien",
  exploreStaysWorldwide: "Aufenthalte weltweit entdecken",
  homeTrustCompareTitle: "Anbieterangebote vergleichen",
  hotelTrustCompareBody:
    "Sehen Sie Hoteloptionen von Reiseanbietern an einem Ort, bevor Sie fortfahren.",
  hotelTrustReviewTitle: "Aufenthaltsdetails prüfen",
  hotelTrustReviewBody:
    "Prüfen Sie Daten, Gäste, Zimmer, Preisinformationen und Aufenthaltsdetails, bevor Sie wählen.",
  hotelTrustProviderTitle: "Weiter zum Anbieter",
  hotelTrustProviderBody:
    "Wenn Sie eine Option auswählen, fahren Sie beim Anbieter fort, um Endpreis, Verfügbarkeit, Gebühren und Stornierungsregeln zu bestätigen.",
  "hotelDestination.Tokyo.title": "Japan",
  "hotelDestination.Tokyo.subtitle": "Aufenthalte in Tokio",
  "hotelDestination.Tokyo.linkLabel": "Hotels in Tokio, Japan suchen",
  "hotelDestination.Tokyo.detail": "Japan",
  "hotelDestination.London.title": "Vereinigtes Königreich",
  "hotelDestination.London.subtitle": "Aufenthalte in London",
  "hotelDestination.London.linkLabel":
    "Hotels in London, Vereinigtes Königreich suchen",
  "hotelDestination.London.detail": "Vereinigtes Königreich",
  "hotelDestination.Paris.title": "Frankreich",
  "hotelDestination.Paris.subtitle": "Aufenthalte in Paris",
  "hotelDestination.Paris.linkLabel": "Hotels in Paris, Frankreich suchen",
  "hotelDestination.Paris.detail": "Frankreich",
  "hotelDestination.New York.title": "Vereinigte Staaten",
  "hotelDestination.New York.subtitle": "Aufenthalte in New York",
  "hotelDestination.New York.linkLabel":
    "Hotels in New York, Vereinigte Staaten suchen",
  "hotelDestination.New York.detail": "Vereinigte Staaten",
  "hotelDestination.Rome.title": "Italien",
  "hotelDestination.Rome.subtitle": "Aufenthalte in Rom",
  "hotelDestination.Rome.linkLabel": "Hotels in Rom, Italien suchen",
  "hotelDestination.Rome.detail": "Italien",
  "hotelDestination.Dubai.title": "Vereinigte Arabische Emirate",
  "hotelDestination.Dubai.subtitle": "Aufenthalte in Dubai",
  "hotelDestination.Dubai.linkLabel":
    "Hotels in Dubai, Vereinigte Arabische Emirate suchen",
  "hotelDestination.Dubai.detail": "Vereinigte Arabische Emirate",
  "hotelDestination.Singapore.title": "Singapur",
  "hotelDestination.Singapore.subtitle": "Aufenthalte in Singapur",
  "hotelDestination.Singapore.linkLabel": "Hotels in Singapur suchen",
  "hotelDestination.Singapore.detail": "Singapur",
  "hotelDestination.Barcelona.title": "Spanien",
  "hotelDestination.Barcelona.subtitle": "Aufenthalte in Barcelona",
  "hotelDestination.Barcelona.linkLabel": "Hotels in Barcelona, Spanien suchen",
  "hotelDestination.Barcelona.detail": "Spanien",
  "hotelDestination.Toronto.title": "Kanada",
  "hotelDestination.Toronto.subtitle": "Aufenthalte in Toronto",
  "hotelDestination.Toronto.linkLabel": "Hotels in Toronto, Kanada suchen",
  "hotelDestination.Toronto.detail": "Kanada",
  "hotelDestination.Amsterdam.title": "Niederlande",
  "hotelDestination.Amsterdam.subtitle": "Aufenthalte in Amsterdam",
  "hotelDestination.Amsterdam.linkLabel":
    "Hotels in Amsterdam, Niederlande suchen",
  "hotelDestination.Amsterdam.detail": "Niederlande",
  "hotelDestination.Bangkok.title": "Thailand",
  "hotelDestination.Bangkok.subtitle": "Aufenthalte in Bangkok",
  "hotelDestination.Bangkok.linkLabel": "Hotels in Bangkok, Thailand suchen",
  "hotelDestination.Bangkok.detail": "Thailand",
  "hotelDestination.Cancun.title": "Mexiko",
  "hotelDestination.Cancun.subtitle": "Aufenthalte in Cancún",
  "hotelDestination.Cancun.linkLabel": "Hotels in Cancún, Mexiko suchen",
  "hotelDestination.Cancun.detail": "Mexiko",
  "hotelDestination.Istanbul.title": "Türkei",
  "hotelDestination.Istanbul.subtitle": "Aufenthalte in Istanbul",
  "hotelDestination.Istanbul.linkLabel": "Hotels in Istanbul, Türkei suchen",
  "hotelDestination.Istanbul.detail": "Türkei",
  "hotelInspirationBadge.Coastal stays": "Küstenaufenthalte",
  "hotelInspirationBadge.City coast": "Städtereise am Meer",
  "hotelInspirationBadge.Waterfront stays": "Aufenthalte am Wasser",
  "hotelInspirationBadge.Harbor city": "Hafenstadt",
  "hotelInspirationBadge.Warm escape": "Warmer Kurzurlaub",
  "hotelInspirationBadge.Bay city": "Stadt an der Bucht",
  "hotelInspirationBadge.Capital stays": "Aufenthalte in der Hauptstadt",
  "hotelInspirationBadge.Classic city": "Klassische Stadt",
  "hotelInspirationBadge.City ideas": "Stadtideen",
  "hotelInspirationBadge.Culture stays": "Kulturaufenthalte",
  "hotelInspirationBadge.Historic city": "Historische Stadt",
  "hotelInspirationBadge.Canal stays": "Aufenthalte an Kanälen",
  "hotelInspirationBadge.Family city": "Familienstadt",
  "hotelInspirationBadge.Easy exploring": "Einfaches Erkunden",
  "hotelInspirationBadge.Beach time": "Strandzeit",
  "hotelInspirationBadge.City exploring": "Stadt erkunden",
  "hotelInspirationBadge.City adventure": "Stadtabenteuer",
  "hotelInspirationBadge.Slow city days": "Entspannte Stadttage",
  "hotelInspirationCategory.Beach": "Strand",
  "hotelInspirationCategory.City breaks": "Städtereisen",
  "hotelInspirationCategory.Family trips": "Familienreisen",
  "hotelInspirationCategory.Relaxed stays": "Erholsame Aufenthalte",
  "hotelInspirationCategory.Weekend ideas": "Wochenendideen",

  searchRentalCarsEveryPartTrip: "Mietwagen für jede Etappe Ihrer Reise suchen",
  exploreCarsByTripStyle: "Mietwagen nach Reisestil entdecken",
  carsTripStyleBody:
    "Wählen Sie einen Fahrzeugtyp aus, und wir öffnen Ergebnisse mit den passenden Suchdetails.",
  "carsTripStyle.economy.title": "Economy-Fahrzeuge",
  "carsTripStyle.economy.subtitle":
    "Günstige Suchen für Stadt- und Alleinreisen",
  "carsTripStyle.economy.cta": "Economy-Fahrzeugsuche starten",
  "carsTripStyle.economy.ariaLabel":
    "Economy-Fahrzeugsuche mit Abholung im Stadtzentrum starten",
  "carsTripStyle.economy.imageAlt":
    "Kompakte Stadtfahrzeuge zwischen Gebäuden im Stadtzentrum",
  "carsTripStyle.suv.title": "SUVs",
  "carsTripStyle.suv.subtitle":
    "Platz für Familienreisen, Gepäck und längere Fahrten",
  "carsTripStyle.suv.cta": "SUV-Mietwagensuche öffnen",
  "carsTripStyle.suv.ariaLabel":
    "SUV-Mietwagensuche mit Abholung am Flughafen öffnen",
  "carsTripStyle.suv.imageAlt":
    "SUV auf einer offenen Straße in der Nähe von Bergen",
  "carsTripStyle.luxury.title": "Luxusfahrzeuge",
  "carsTripStyle.luxury.subtitle":
    "Premium-Suchkontext für Geschäftsreisen oder besondere Reisen",
  "carsTripStyle.luxury.cta": "Luxusfahrzeugsuche planen",
  "carsTripStyle.luxury.ariaLabel":
    "Luxusfahrzeugsuche mit Abholung in Hotelnähe planen",
  "carsTripStyle.luxury.imageAlt":
    "Premium-Fahrzeug vor einem eleganten modernen Gebäude",
  "carsTripStyle.van.title": "Vans",
  "carsTripStyle.van.subtitle":
    "Suchkontext für Gruppenreisen und Familiengepäck",
  "carsTripStyle.van.cta": "Vans für Gruppenreisen suchen",
  "carsTripStyle.van.ariaLabel":
    "Vans für Gruppenreisen mit Abholung am Flughafen suchen",
  "carsTripStyle.van.imageAlt":
    "Personen-Van auf einer hellen Panoramastraße",
  "carsTrust.0.title": "Für vollständige Reisen gemacht",
  "carsTrust.0.description":
    "Planen Sie Flüge, Aufenthalte und Bodentransport in einem Kurioticket-Ablauf.",
  "carsTrust.1.title": "Abholdetails zuerst",
  "carsTrust.1.description":
    "Geben Sie Abholort, Daten, Zeiten und Fahreralter ein, damit Ihre Mietwagensuche mit den richtigen Reisedetails startet.",
  "carsTrust.2.title": "Klare Mietwagenprüfung",
  "carsTrust.2.description":
    "Prüfen Sie Endpreis, Verfügbarkeit, Gebühren und Mietbedingungen beim Anbieter, bevor Sie buchen.",
  carsPickupPointsTitle: "Mit beliebten Mietwagen-Abholorten starten",
  carsPickupPointsBody:
    "Wählen Sie eine Abholart aus, und wir öffnen die Mietwagen-Ergebnisseite mit den passenden Suchdetails.",
  "carsPickup.Airport.title": "Abholung am Flughafen",
  "carsPickup.Airport.subtitle":
    "Starten Sie an wichtigen Ankunftsbereichen am Flughafen",
  "carsPickup.Airport.ariaLabel":
    "Mietwagen-Ergebnisse für Abholung am Flughafen öffnen",
  "carsPickup.Airport.imageAlt":
    "Flugzeug an einem Flughafengate bei Sonnenuntergang",
  "carsPickup.City center.title": "Abholung im Stadtzentrum",
  "carsPickup.City center.subtitle":
    "Abholung in der Nähe von Hotels im Zentrum und Geschäftsvierteln",
  "carsPickup.City center.ariaLabel":
    "Mietwagen-Ergebnisse für Abholung im Stadtzentrum öffnen",
  "carsPickup.City center.imageAlt":
    "Autos auf einer Stadtstraße zwischen hohen Gebäuden",
  "carsPickup.Train station.title": "Abholung am Bahnhof",
  "carsPickup.Train station.subtitle":
    "Setzen Sie Ihre Reise nach der Ankunft mit dem Zug fort",
  "carsPickup.Train station.ariaLabel":
    "Mietwagen-Ergebnisse für Abholung am Bahnhof öffnen",
  "carsPickup.Train station.imageAlt":
    "Bahnsteig mit Gleisen, die in einen Stadtbahnhof führen",
  "carsPickup.Hotel area.title": "Abholung in Hotelnähe",
  "carsPickup.Hotel area.subtitle":
    "Planen Sie eine Fahrzeugabholung in der Nähe Ihrer Unterkunft",
  "carsPickup.Hotel area.ariaLabel":
    "Mietwagen-Ergebnisse für Abholung in Hotelnähe öffnen",
  "carsPickup.Hotel area.imageAlt":
    "Hotelfassade mit Palmen und einer Einfahrt",
  "carsSearch.pickupLocationLabel": "ABHOLORT",
  "carsSearch.pickupLocationPlaceholder": "Flughafen, Stadt oder Adresse",
  "carsSearch.returnLocationPlaceholder":
    "Rückgabeort, Flughafen oder Adresse",
  "carsSearch.returnToSameLocation": "Rückgabe am selben Ort",
  "carsSearch.differentReturnLocation": "Anderer Rückgabeort",
  "carsSearch.rentalDatesLabel": "MIETDATEN",
  "carsSearch.rentalDatePlaceholder": "Abholdatum — Rückgabedatum",
  "carsSearch.pickupReturnTimeLabel": "ABHOL- / RÜCKGABEZEIT",
  "carsSearch.pickupReturnTimeSummary":
    "{pickupTime} Abholung — {returnTime} Rückgabe",
  "carsSearch.driverAgeLabel": "ALTER DES FAHRERS",
  "carsSearch.driverAgeAnyAge": "Jedes Alter",
  "carsSearch.clearPickupLocation": "Abholort löschen",
  "carsSearch.clearReturnLocation": "Rückgabeort löschen",
  "carsSearch.chooseRentalDatesAria":
    "Abhol- und Rückgabedaten für den Mietwagen auswählen",
  "carsSearch.rentalDatePickerAria": "Mietdaten-Auswahl",
  "carsSearch.chooseRentalDates": "Mietdaten auswählen",
  "carsSearch.previousMonth": "Vorheriger Monat",
  "carsSearch.previousMonthShort": "Zurück",
  "carsSearch.nextMonth": "Nächster Monat",
  "carsSearch.nextMonthShort": "Weiter",
  "carsSearch.selectDateAriaPrefix": "Auswählen",
  "carsSearch.startsNewPickupDate": "startet ein neues Abholdatum",
  "carsSearch.choosePickupReturnTimesAria":
    "Abhol- und Rückgabezeiten auswählen",
  "carsSearch.pickupReturnTimeSelectorAria":
    "Auswahl für Abhol- und Rückgabezeit",
  "carsSearch.pickupTimeLabel": "Abholzeit",
  "carsSearch.returnTimeLabel": "Rückgabezeit",
  carsSearchPreparing: "Mietwagensuche wird vorbereitet...",
  "carsResults.resultsLabel": "Mietwagen-Ergebnisse",
  "carsResults.resultsFor": "Mietwagen-Ergebnisse für {location}",
  "carsResults.carResultsAria": "Mietwagen-Ergebnisse",
  "carsResults.carFiltersAria": "Mietwagenfilter",
  "carsResults.filterBy": "Filtern nach",
  "carsResults.activeFilterCount": "{count} aktiv",
  "carsResults.selectedFilterCount": "{count} ausgewählt",
  "carsResults.reset": "Zurücksetzen",
  "carsResults.resetFilters": "Filter zurücksetzen",
  "carsResults.openFilters": "Filter öffnen",
  "carsResults.openFiltersWithCount": "Filter öffnen, {count} aktiv",
  "carsResults.closeFilters": "Filter schließen",
  "carsResults.edit": "Bearbeiten",
  "carsResults.editSearch": "Suche bearbeiten",
  "carsResults.editCarSearch": "Mietwagensuche bearbeiten",
  "carsResults.closeEditSearch": "Suchbearbeitung schließen",
  "carsResults.carRentalSearch": "Mietwagensuche",
  "carsResults.searchCars": "Mietwagen suchen",
  "carsResults.pickupLocation": "Abholort",
  "carsResults.returnLocation": "Rückgabeort",
  "carsResults.pickupLocationNeeded": "Abholort erforderlich",
  "carsResults.pickupToReturn": "{pickup} → {return}",
  "carsResults.sameAsPickup": "Wie Abholort",
  "carsResults.selectRentalDates": "Mietdaten auswählen",
  "carsResults.selectDate": "Datum auswählen",
  "carsResults.selectDates": "Daten auswählen",
  "carsResults.rentalDates": "Mietdaten",
  "carsResults.rentalDatePlaceholder": "Abholdatum — Rückgabedatum",
  "carsResults.rentalDateRangeCalendar": "Kalender für Mietzeitraum",
  "carsResults.selectPickupThenReturn": "Erst Abholung, dann Rückgabe auswählen",
  "carsResults.pickupReturnTime": "Abhol- / Rückgabezeit",
  "carsResults.pickupReturnTimeSelector": "Auswahl für Abhol- und Rückgabezeit",
  "carsResults.pickupTime": "Abholzeit",
  "carsResults.returnTime": "Rückgabezeit",
  "carsResults.driverAge": "Fahreralter",
  "carsResults.anyDriverAgeRange": "Beliebiges Fahreralter 18–70",
  "carsResults.yearsOld": "Jahre alt",
  "carsResults.emptyInventory": "Für diese Suche ist noch kein Live-Mietwagenbestand verfügbar. Aktualisieren Sie die Suchdetails oben oder versuchen Sie es später erneut.",
  "carsResults.enterPickupDetails": "Geben Sie oben Abholdetails ein, um eine Mietwagensuche vorzubereiten.",
  "carsResults.vehicleType": "Fahrzeugtyp",
  "carsResults.smallCars": "Kleinwagen",
  "carsResults.mediumCars": "Mittelklassewagen",
  "carsResults.suvs": "SUVs",
  "carsResults.transmission": "Getriebe",
  "carsResults.automatic": "Automatik",
  "carsResults.manual": "Schaltgetriebe",
  "carsResults.seats": "Sitze",
  "carsResults.seats4Plus": "4+ Sitze",
  "carsResults.seats5Plus": "5+ Sitze",
  "carsResults.seats7Plus": "7+ Sitze",
  "carsResults.bags": "Gepäck",
  "carsResults.bags2Plus": "2+ Gepäckstücke",
  "carsResults.bags3Plus": "3+ Gepäckstücke",
  "carsResults.bags4Plus": "4+ Gepäckstücke",
  "carsResults.fuelPolicy": "Tankregelung",
  "carsResults.fullToFull": "Voll zu voll",
  "carsResults.sameToSame": "Gleicher Füllstand",
  "carsResults.mileagePolicy": "Kilometerregelung",
  "carsResults.unlimitedMileage": "Unbegrenzte Kilometer",
  "carsResults.limitedMileage": "Begrenzte Kilometer",
  "carsResults.cancellation": "Stornierung",
  "carsResults.freeCancellation": "Kostenlose Stornierung",
  "carsResults.payAtPickup": "Bei Abholung bezahlen",
  "carsResults.pickupLocationType": "Art des Abholorts",
  "carsResults.airportCounter": "Flughafenschalter",
  "carsResults.shuttlePickup": "Shuttle-Abholung",
  "carsResults.cityLocation": "Stadtstandort",
  "carsResults.location.airport": "Flughafen",
  "carsResults.location.cityCenter": "Stadtzentrum",
  "carsResults.location.hotelArea": "Hotelnähe",
  "carsResults.location.trainStation": "Bahnhof",
  "carsFaq.heading": "Häufige Fragen zu Mietwagen",
  "carsFaq.0.question":
    "Welche Informationen benötige ich, um nach einem Mietwagen zu suchen?",
  "carsFaq.0.answer":
    "Geben Sie Abholort, Abhol- und Rückgabedaten, Abhol- und Rückgabezeiten, das Fahreralter und an, ob Sie das Auto an einem anderen Ort zurückgeben möchten.",
  "carsFaq.1.question": "Kann ich das Auto an einem anderen Ort zurückgeben?",
  "carsFaq.1.answer":
    "Ja. Wählen Sie im Suchformular Anderer Rückgabeort aus und geben Sie die Stadt, den Flughafen oder die Adresse ein, an der Sie das Auto zurückgeben möchten.",
  "carsFaq.2.question":
    "Warum spielt das Fahreralter bei Mietwagen eine Rolle?",
  "carsFaq.2.answer":
    "Mietwagenanbieter können je nach Alter des Fahrers und Standort unterschiedliche Regeln, Gebühren, Fahrzeugberechtigungen oder Kautionsanforderungen anwenden.",
  "carsFaq.3.question":
    "Was sollte ich vor der Buchung eines Mietwagens prüfen?",
  "carsFaq.3.answer":
    "Prüfen Sie Abhol- und Rückgabeort, Daten, Zeiten, Kilometerregelung, Tankregelung, Versicherungsoptionen, Stornierungsbedingungen, Kautionsanforderungen und erforderliche Dokumente, bevor Sie buchen.",
  "carsFaq.4.question":
    "Wo wird der endgültige Mietwagenpreis bestätigt?",
  "carsFaq.4.answer":
    "Endpreis, Fahrzeugverfügbarkeit, Steuern, Gebühren, Kautionsanforderungen und Mietbedingungen werden vor der Buchung vom Anbieter bestätigt.",
  "carsFaq.5.question":
    "Welche Dokumente benötige ich möglicherweise bei der Abholung?",
  "carsFaq.5.answer":
    "Mietwagenanbieter können einen gültigen Führerschein, eine Zahlungskarte, einen Identitätsnachweis und alle vom Abholland oder Abholort geforderten Dokumente verlangen.",
  homeDiscoveryTitle: "Entdecken Sie hier Ihr nächstes Abenteuer",
  homeDiscoverySubtitle:
    "Vergleichen Sie clevere Routenvorschläge, flexible Tarife und Reiseziele, die für Ihre Region ausgewählt wurden.",
  homeDiscoverySwipeMore: "Wischen Sie für mehr",
  homeDiscoveryRouteIdeaBadge: "Routenidee",
  homeDiscoveryTripOneWay: "Einfache Strecke",
  homeDiscoveryCabinEconomy: "Economy",
  homeDiscoveryTravelerCountOne: "1 Reisender",
  "homeDiscoveryRoute.us-jfk-atl.title": "New York nach Atlanta",
  "homeDiscoveryRoute.us-jfk-atl.routeNote":
    "US-Hauptroute für providergestützte Homepage-Preise.",
  "homeDiscoveryRoute.us-lax-ord.title": "Los Angeles nach Chicago",
  "homeDiscoveryRoute.us-lax-ord.routeNote":
    "US-Route von Küste zu Küste als Städtepaar.",
  "homeDiscoveryRoute.us-lax-dfw.title": "Los Angeles nach Dallas",
  "homeDiscoveryRoute.us-lax-dfw.routeNote":
    "Stark frequentierte US-Route mit Anbietersuche.",
  "homeDiscoveryRoute.us-jfk-den.title": "New York nach Denver",
  "homeDiscoveryRoute.us-jfk-den.routeNote":
    "Backup-Route zum Tor in die Berge.",
  "homeDiscoveryRoute.us-ewr-sav.title":
    "Historische Plätze in Savannah entdecken",
  "homeDiscoveryRoute.us-ewr-sav.routeNote":
    "Südliche Wochenendroute für Kopfsteinpflaster, gutes Essen und Aufenthalte am Flussufer.",
  "homeDiscoveryRoute.us-bos-mia.title": "Wintersonne in Miami",
  "homeDiscoveryRoute.us-bos-mia.routeNote":
    "Route vom Nordosten in die Sonne für Strände, Restaurants und Kunstviertel.",
  "homeDiscoveryRoute.us-lga-chs.title":
    "Charleston-Wochenende mit Küstenküche",
  "homeDiscoveryRoute.us-lga-chs.routeNote":
    "Lowcountry-Route für historische Straßen, Meeresfrüchte und optionale Strandtage.",
  "homeDiscoveryRoute.us-den-slc.title": "Salt Lake als Bergbasis",
  "homeDiscoveryRoute.us-den-slc.routeNote":
    "Kurzer West-Hüpfer für Skiwochenenden, Nationalparks und Restaurants in der Innenstadt.",
  "homeDiscoveryRoute.us-iah-mex.title":
    "Kulturwochenende in Mexiko-Stadt",
  "homeDiscoveryRoute.us-iah-mex.routeNote":
    "Häufige grenzüberschreitende Route für Museen, Märkte und kulinarische Viertel.",
  "homeDiscoveryRoute.us-lax-sjd.title":
    "Kurzer Strandtrip nach Los Cabos",
  "homeDiscoveryRoute.us-lax-sjd.routeNote":
    "Einfache Baja-Route für Resort-Wochenenden, Wüstenlandschaften und Meerblick.",
  "homeDiscoveryRoute.us-ord-rsw.title":
    "Auszeit an Fort Myers’ Golfküste",
  "homeDiscoveryRoute.us-ord-rsw.routeNote":
    "Warmwetterroute für Barriereinseln, Strände und entspannte Aufenthalte.",
  "homeDiscoveryRoute.us-sea-san.title":
    "Sonnige Verbindung nach San Diego",
  "homeDiscoveryRoute.us-sea-san.routeNote":
    "Westküstenroute für Strände, Parks, Hafentage und Wochenenden mit mildem Wetter.",
  "homeDiscoveryRoute.us-jfk-lax.title":
    "Los Angeles von Küste zu Küste",
  "homeDiscoveryRoute.us-jfk-lax.routeNote":
    "Wichtige transkontinentale Verbindung für Strandtage, Studios und Westküstenwochenenden.",
  "homeDiscoveryRoute.us-ewr-mco.title":
    "Orlando-Trip zu Freizeitparks",
  "homeDiscoveryRoute.us-ewr-mco.routeNote":
    "Beliebte Familienroute für Parks, Resorts und kurze Warmwetter-Auszeiten.",
  "homeDiscoveryRoute.us-lga-fll.title":
    "Strandtrip nach Fort Lauderdale",
  "homeDiscoveryRoute.us-lga-fll.routeNote":
    "Nordost-Florida-Verbindung für Strände, Kreuzfahrten und lange Wochenenden.",
  "homeDiscoveryRoute.us-bos-lax.title":
    "Direkte Auszeit in Los Angeles",
  "homeDiscoveryRoute.us-bos-lax.routeNote":
    "Beliebte Küste-zu-Küste-Route für Unterhaltung, Strände und Städtereisen.",
  "homeDiscoveryRoute.us-ord-mia.title":
    "Von Chicagos Seeufer an Miamis Strand",
  "homeDiscoveryRoute.us-ord-mia.routeNote":
    "Beliebte Midwest-Sonnenroute für Strände, Nachtleben und Kreuzfahrtstarts.",
  "homeDiscoveryRoute.us-atl-las.title":
    "Las-Vegas-Verbindung fürs lange Wochenende",
  "homeDiscoveryRoute.us-atl-las.routeNote":
    "Hub-zu-Freizeit-Route für Shows, Restaurants, Messen und Wüstenausflüge.",
  "homeDiscoveryRoute.us-dfw-mco.title":
    "Orlando-Flugroute für Familien",
  "homeDiscoveryRoute.us-dfw-mco.routeNote":
    "Große Hub-zu-Freizeitpark-Route für Resorts und Schulferienreisen.",
  "homeDiscoveryRoute.us-den-las.title":
    "Vegas-Hüpfer aus dem Mountain West",
  "homeDiscoveryRoute.us-den-las.routeNote":
    "Kurze Freizeitverbindung für Unterhaltungswochenenden und Wüstentrips.",
  "homeDiscoveryRoute.us-sfo-las.title":
    "Las-Vegas-Auszeit aus der Bay Area",
  "homeDiscoveryRoute.us-sfo-las.routeNote":
    "Häufige Westküstenroute für Shows, Essen, Events und Wüstensonne.",
  "homeDiscoveryRoute.us-lax-hnl.title":
    "Pazifische Strandverbindung nach Honolulu",
  "homeDiscoveryRoute.us-lax-hnl.routeNote":
    "Starke Freizeitreise-Route für Waikiki-Aufenthalte, Inselwanderungen und warme Meerestage.",
  "homeDiscoveryRoute.us-sfo-sea.title":
    "Seattle-Hop in den Pazifischen Nordwesten",
  "homeDiscoveryRoute.us-sfo-sea.routeNote":
    "Kurze Westküstenverbindung für Kaffee, Waterfronts, Musik und Meetings.",
  "homeDiscoveryRoute.us-iad-mco.title":
    "Orlando-Auszeit aus der Hauptstadtregion",
  "homeDiscoveryRoute.us-iad-mco.routeNote":
    "Zuverlässige Freizeitroute für Freizeitparks, Resorts und sonnige Schulferien.",
  "homeDiscoveryRoute.us-msp-rsw.title":
    "Fort-Myers-Route in die Wintersonne",
  "homeDiscoveryRoute.us-msp-rsw.routeNote":
    "Route vom oberen Midwest an den Golf für Strände, Inseln und warme Aufenthalte.",
  "homeDiscoveryRoute.us-clt-mia.title":
    "Miami-Verbindung über den Südost-Hub",
  "homeDiscoveryRoute.us-clt-mia.routeNote":
    "Gängige Südost-Verbindung für Strände, Business und Karibik-Anschlüsse.",
  "homeDiscoveryRoute.us-dtw-fll.title":
    "Fort-Lauderdale-Auszeit von den Großen Seen",
  "homeDiscoveryRoute.us-dtw-fll.routeNote":
    "Beliebte Florida-Route für Strandwochenenden, Kreuzfahrten und Wintersonne.",
  "homeDiscoveryRoute.us-phl-mco.title":
    "Orlando-Familienroute ab Philadelphia",
  "homeDiscoveryRoute.us-phl-mco.routeNote":
    "Nordost-Freizeitroute für Freizeitparks, Resorts und Sonnenpausen.",
  "homeDiscoveryRoute.us-bwi-mco.title":
    "Orlando-Auszeit ab Baltimore",
  "homeDiscoveryRoute.us-bwi-mco.routeNote":
    "Häufige Familienroute für Parkbesuche, Wochenendtrips und Resort-Aufenthalte.",
  "homeDiscoveryRoute.us-dfw-las.title":
    "Vegas-Route ab Nordtexas",
  "homeDiscoveryRoute.us-dfw-las.routeNote":
    "Stark frequentierte Freizeit- und Messeverbindung für kurze Wüstenwochenenden.",
  "homeDiscoveryRoute.us-jfk-cun.title":
    "Kurzer Karibiktrip nach Cancún",
  "homeDiscoveryRoute.us-jfk-cun.routeNote":
    "Beliebte Nonstop-Freizeitroute für Strände, Resorts und Warmwasser-Auszeiten.",
  "homeDiscoveryRoute.us-atl-cun.title":
    "Cancún-Freizeitroute ab Atlanta",
  "homeDiscoveryRoute.us-atl-cun.routeNote":
    "Hub-zu-Resort-Verbindung für Strandurlaube und leichte Karibikküsten-Trips.",
  "homeDiscoveryRoute.us-dfw-sjd.title":
    "Los-Cabos-Auszeit ab Nordtexas",
  "homeDiscoveryRoute.us-dfw-sjd.routeNote":
    "Gängige Resort-Route für Baja-Strände, Wüstenlandschaften und lange Wochenenden.",
  "homeDiscoveryRoute.us-ord-cun.title":
    "Cancún-Strandroute aus dem Midwest",
  "homeDiscoveryRoute.us-ord-cun.routeNote":
    "Zuverlässige Freizeitroute für Wintersonne, Resorts und Familienreisen.",
  "homeDiscoveryRoute.us-jfk-sju.title":
    "Karibischer Städtetrip nach San Juan",
  "homeDiscoveryRoute.us-jfk-sju.routeNote":
    "Häufige Freizeitroute für Altstadtgassen, Strände und Inselwochenenden.",
  "homeDiscoveryRoute.us-lax-mex.title":
    "Westküstenverbindung nach Mexiko-Stadt",
  "homeDiscoveryRoute.us-lax-mex.routeNote":
    "Wichtige grenzüberschreitende Route für Essen, Museen, Viertel und Events.",
  homeTrustTitle: "Warum Reisende auf Kurioticket vergleichen",
  homeTrustSubtitle:
    "Kurioticket hilft Ihnen, Anbieterangebote klar zu vergleichen und die Buchung anschließend auf der Website des Anbieters abzuschließen.",
  homeTrustCompareBody:
    "Sehen Sie Flug- und Hoteloptionen mehrerer Reiseanbieter an einem Ort.",
  homeTrustPricingTitle: "Transparenter Preiskontext",
  homeTrustPricingBody:
    "Prüfen Sie Preis, Route oder Aufenthaltsdetails sowie wichtige Bedingungen, bevor Sie fortfahren.",
  homeTrustHandoffTitle: "Sichere Weiterleitung zum Anbieter",
  homeTrustHandoffBody:
    "Wenn Sie ein Angebot auswählen, fahren Sie beim Anbieter fort, um die Buchung sicher abzuschließen.",
  homePreviousDestinations: "Vorherige Reiseziele",
  homeNewsletterInvalidEmail: "Geben Sie eine gültige E-Mail-Adresse ein.",
  homeNewsletterUnableSubscribe:
    "Das Abonnement ist derzeit nicht möglich.",
  homeNewsletterTryAgain:
    "Wir konnten Sie gerade nicht anmelden. Bitte versuchen Sie es bald erneut.",
  homeSubscribing: "Abonnieren…",
  homeNewsletterConsent:
    "Mit dem Abonnement stimmen Sie zu, Updates von Kurioticket zu erhalten. Sie können sich jederzeit abmelden.",
  homeRemoveFromSavedRoutes: "Aus gespeicherten Routen entfernen",
  homeSaveRoute: "Route speichern",
  homeCheckingProviderRoutePricing:
    "Anbieterbasierte Routenpreise werden geprüft",
  homePricesUpdateWithProviderResults:
    "Preise werden mit Anbieterergebnissen aktualisiert",
  homeExploreFares: "Tarife entdecken",
  homeCompareOptions: "Optionen vergleichen",
  destinationImageFallback: "Reiseziel",
  faqHeading: "Häufige Fragen",
  faqIntro:
    "Erfahren Sie, wie Kurioticket Ihnen hilft, Flüge, Hotels und Reiseoptionen vor der Buchung bei vertrauenswürdigen Anbietern zu vergleichen.",
  faqViewAll: "Alle FAQs ansehen",
  faqQuestionFindOptions:
    "Wie findet Kurioticket Flug- und Hoteloptionen?",
  faqAnswerFindOptions:
    "Kurioticket durchsucht Live-Angebote von Reiseanbietern und führt Optionen an einem Ort zusammen, damit Sie Preise, Routen, Aufenthalte und Details vergleichen können, bevor Sie sich entscheiden.",
  faqQuestionSellDirectly:
    "Verkauft Kurioticket Tickets oder Hotelzimmer direkt?",
  faqAnswerSellDirectly:
    "Kurioticket hilft Ihnen, Reiseoptionen zu vergleichen. Wenn Sie ein Angebot auswählen, werden Sie zum ausgewählten Anbieter weitergeleitet, um Details zu prüfen und die Buchung auf dessen Website abzuschließen.",
  faqQuestionPriceChanges:
    "Warum können sich Preise ändern, nachdem ich auf ein Angebot geklickt habe?",
  faqAnswerPriceChanges:
    "Preise und Verfügbarkeit können sich in Echtzeit ändern, weil Airlines, Hotels und Reiseanbieter ihre Kontingente häufig aktualisieren. Prüfen Sie vor der Buchung immer den Endpreis auf der Checkout-Seite des Anbieters.",
  faqQuestionCompareProviders:
    "Kann ich mehrere Anbieter für dieselbe Reise vergleichen?",
  faqAnswerCompareProviders:
    "Ja. Kurioticket ist darauf ausgelegt, Optionen nebeneinander vergleichbar zu machen, damit Sie Preis, Zeiten, Routendetails, Hoteldetails und Gesamtwert bewerten können.",
  faqQuestionSecureBooking: "Wie schließe ich meine Buchung sicher ab?",
  faqAnswerSecureBooking:
    "Buchung und Zahlung werden im Checkout des Anbieters abgeschlossen. Prüfen Sie vor der Bestätigung immer die Bedingungen, Stornierungsrichtlinien und den Endpreis des Anbieters.",
  faqQuestionPreferences:
    "Kann ich Währungs- und Spracheinstellungen festlegen?",
  faqAnswerPreferences:
    "Ja. Kurioticket ermöglicht Ihnen die Auswahl von Anzeige-Land und Währung, und Sie können jede verfügbare Website-Sprache über die Sprachauswahl wählen.",
  faqQuestionLiveCached: "Sind Suchergebnisse live oder zwischengespeichert?",
  faqAnswerLiveCached:
    "Kurioticket nutzt Suchergebnisse von Anbietern, die sich bei geänderter Verfügbarkeit und Preisen aktualisieren können. So werden aktuelle Optionen angezeigt; die endgültige Verfügbarkeit wird jedoch vom Anbieter bestätigt.",
  faqQuestionManageChanges:
    "Wo verwalte ich Änderungen oder Stornierungen?",
  faqAnswerManageChanges:
    "Reiseänderungen, Stornierungen, Erstattungen und Buchungssupport werden normalerweise von dem Anbieter abgewickelt, bei dem die Buchung abgeschlossen wurde. Nutzen Sie die Bestätigungsdaten dieses Anbieters für Serviceanfragen.",
  footerContactUs: "Kontakt",
  footerCustomerSupport: "Kundensupport",
  footerServiceGuarantee: "Servicegarantie",
  footerMoreServiceInfo: "Weitere Serviceinformationen",
  footerDiscover: "Entdecken",
  footerSavedRecent: "Gespeichert & zuletzt angesehen",
  footerTermsSettings: "Bedingungen & Einstellungen",
  footerPrivacyPolicy: "Datenschutzrichtlinie",
  footerTermsOfService: "Nutzungsbedingungen",
  footerCookiePolicy: "Cookie-Richtlinie",
  footerAboutKurioticket: "Über Kurioticket",
  footerAboutUs: "Über uns",
  footerHowItWorks: "So funktioniert Kurioticket",
  footerConfidenceTagline:
    "Suchen Sie Flüge, Hotels und Reiseangebote mit Vertrauen.",
  footerAllRightsReserved: "Alle Rechte vorbehalten.",
  footerPrivacy: "Datenschutz",
  footerTerms: "Bedingungen",
  footerCookies: "Cookies",
  flightQuoteUnavailable: "Flugangebot nicht verfügbar",
};
