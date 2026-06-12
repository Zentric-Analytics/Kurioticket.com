import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,

  mobileTravelHeading: "Voyage",
  mobileExploreHeading: "Explorer",
  mobileInfoLegalHeading: "Infos et mentions légales",
  flights: "Vols",
  hotels: "Hôtels",
  cars: "Voitures",
  deals: "Offres",
  saved: "Enregistrés",
  destinations: "Destinations",
  explore: "Explorer",
  dashboard: "Tableau de bord",
  login: "Se connecter",
  signUp: "S’inscrire",
  signupPageTitle: "Créez votre compte",
  signupFullNameLabel: "Nom complet",
  signupEmailLabel: "Adresse e-mail",
  signupPasswordLabel: "Mot de passe",
  signupAgreementBeforeTerms: "En créant un compte, vous acceptez les ",
  signupTermsLink: "Conditions",
  signupAgreementBetweenLinks: ", la ",
  signupPrivacyPolicyLink: "Politique de confidentialité",
  signupAgreementAfterPrivacy:
    " et les informations relatives aux redirections partenaires.",
  signupSubmit: "S’inscrire",
  signupCreatingAccount: "Création du compte...",
  signupGoogle: "Continuer avec Google",
  signupAlreadyHaveAccount: "Vous avez déjà un compte ?",
  signupLoginLink: "Se connecter",
  signupErrorInvalidEmail: "Saisissez une adresse e-mail valide.",
  signupErrorPasswordRequirements:
    "Le mot de passe doit respecter les exigences minimales.",
  signupErrorUnableCreate: "Une erreur est survenue. Veuillez réessayer.",
  signupErrorRateLimited:
    "Trop de tentatives d’inscription. Veuillez patienter, puis réessayer.",
  signupErrorDuplicateEmail:
    "Un compte existe déjà avec cette adresse e-mail.",
  signupErrorUnableSendVerification:
    "Impossible d’envoyer le code de vérification pour le moment. Veuillez réessayer.",
  signupVerificationRequiredRedirecting:
    "Consultez votre boîte e-mail pour vérifier votre compte.",
  signupAutomaticLoginFailed:
    "Votre compte a été créé, mais la connexion automatique a échoué. Veuillez vous connecter avec votre nouveau mot de passe.",
  signupAccountCreatedRedirecting: "Compte créé avec succès. Redirection...",
  loginPageTitle: "Se connecter",
  loginPageSubtitle:
    "Enregistrez vos recherches, gérez vos alertes et accédez à votre tableau de bord de voyage.",
  loginEmailLabel: "Adresse e-mail",
  loginPasswordLabel: "Mot de passe",
  loginForgotPassword: "Mot de passe oublié ?",
  loginSubmit: "Se connecter",
  loginCheckingDetails: "Vérification des informations…",
  loginGoogle: "Continuer avec Google",
  loginSignupPrompt: "Vous découvrez Kurioticket ?",
  loginCreateAccount: "Créer un compte",
  loginInvalidCredentials:
    "Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.",
  loginRateLimited:
    "Trop de tentatives. Veuillez patienter un instant, puis réessayer.",
  loginCodeSent: "Nous avons envoyé un code de vérification à votre adresse e-mail.",
  loginCodeFailed: "Ce code n’a pas fonctionné. Vérifiez le code et réessayez.",
  loginProcessing:
    "Vérification de vos informations et envoi d’un code de vérification…",
  loginResendSuccess:
    "Nous avons envoyé un nouveau code si ce compte peut se connecter.",
  loginEnterCode: "Saisissez le code de connexion à 6 chiffres.",
  loginVerifiedRedirecting: "Vérifié. Redirection…",
  loginStartOverError:
    "Recommencez afin que nous puissions vérifier vos informations avant d’envoyer un nouveau code.",
  loginSendingNewCode: "Envoi d’un nouveau code de vérification…",
  loginUnableSendNewCode:
    "Impossible d’envoyer un nouveau code pour le moment. Veuillez réessayer.",
  loginUnableSendLoginCode:
    "Impossible d’envoyer le code de connexion pour le moment. Veuillez réessayer.",
  loginCodeInstructions:
    "Saisissez le code à 6 chiffres envoyé à {{email}}. Les codes expirent après 10 minutes.",
  loginVerificationCodeLabel: "Code de vérification",
  loginVerifying: "Vérification…",
  loginVerifyLogin: "Vérifier la connexion",
  loginSendingCode: "Envoi du code…",
  loginResendIn: "Renvoyer dans {{seconds}} s",
  loginResendCode: "Renvoyer le code",
  loginUseDifferentDetails: "Utiliser d’autres informations",
  loginPasswordResetSuccess:
    "Votre mot de passe a été réinitialisé. Connectez-vous avec votre nouveau mot de passe.",
  loginInactiveMessage:
    "Votre session a été fermée après 30 minutes d’inactivité. Reconnectez-vous pour continuer.",
  loginErrorAccountUnavailable:
    "Ce compte n’est pas disponible. Contactez l’assistance.",
  loginErrorOAuthCallback:
    "La connexion avec Google a été interrompue pendant le rappel. Veuillez réessayer.",
  loginErrorOAuthAccountNotLinked:
    "Cette adresse e-mail est déjà associée à une autre méthode de connexion. Continuez avec votre méthode d’origine ou réinitialisez votre mot de passe.",
  loginErrorAccessDenied:
    "L’accès a été refusé par Google. Veuillez autoriser l’accès et réessayer.",
  loginErrorConfiguration:
    "La connexion avec Google est temporairement indisponible. Veuillez réessayer bientôt ou utiliser la connexion par e-mail.",
  loginErrorCallback:
    "Le rappel de connexion Google a échoué. Veuillez réessayer ou utiliser la connexion par e-mail.",
  loginErrorGoogleGeneric:
    "La connexion avec Google n’a pas pu aboutir. Veuillez réessayer ou utiliser la connexion par e-mail.",
  legalCenter: "Centre légal",
  logout: "Se déconnecter",
  openLanguagePreferences:
    "Ouvrir les préférences de langue, langue actuelle {{language}}",
  websiteLanguageTitle: "Sélectionnez la langue du site",
  websiteLanguageDescription:
    "L’anglais (États-Unis) est la langue par défaut du site. Kurioticket ne change la langue qu’après que vous avez choisi une option disponible.",
  currentLanguage: "Langue actuelle : {{language}}",
  languagePreparingNotice:
    "D’autres langues sont en préparation. Les options indisponibles ne traduisent pas encore le site.",
  languageSearchLabel: "Rechercher une langue",
  languageSearchPlaceholder: "Rechercher English, Español, Français, Deutsch...",
  languageOptionsLabel: "Options de langue",
  selectLanguageOption: "Sélectionner {{language}}",
  languagePreparingAria:
    "Les traductions en {{language}} sont en préparation",
  languageUnavailableMessage:
    "{{language}} n’est pas encore disponible. La prise en charge des traductions est en cours d’extension.",
  globalLanguage: "Langue globale",
  closeLanguageSelector: "Fermer le sélecteur de langue",
  preparing: "Bientôt disponible",
  searchLanguage: "Rechercher une langue ou un code",
  noLanguagesFound: "Aucune langue trouvée",
  homeHeroTitle: "Trouvez rapidement des vols pas chers",
  homeHeroSubtitle:
    "Recherchez des centaines de compagnies aériennes et sites de voyage pour trouver les meilleures offres pour votre prochain voyage.",
  homeAssuranceBestPrice: "Meilleurs prix garantis",
  homeAssuranceCompare: "Comparaison facile des prestataires",
  homeAssuranceSecure: "Paiements sécurisés",
  homeAssuranceSupport: "Assistance client 24h/24 7j/7",
  homeHeroBadge: "Plateforme de recherche de voyage fiable",
  homeFeaturesMillionsTitle: "Des millions de choix",
  homeFeaturesMillionsBody:
    "Comparez vols et hôtels d’un large réseau de partenaires fiables au même endroit.",
  homeFeaturesFlexibleTitle: "Recherche flexible",
  homeFeaturesFlexibleBody:
    "Filtrez par escales, budget, classe et horaires selon votre style de voyage.",
  homeFeaturesSecureTitle: "Expérience sécurisée",
  homeFeaturesSecureBody:
    "Votre planification reste protégée grâce à des partenaires fiables et une redirection de réservation sécurisée.",
  homeFeaturesDealsTitle: "Offres en temps réel",
  homeFeaturesDealsBody:
    "Profitez des baisses de tarifs et promotions exclusives avant leur disparition.",
  homeDiscoveryTitle: "Découvrez votre prochaine aventure ici",
  homeDiscoverySubtitle:
    "Comparez des idées d’itinéraires intelligentes, des tarifs flexibles et des destinations sélectionnées pour votre région.",
  homeDiscoverySwipeMore: "Faites glisser pour voir plus",
  homeDiscoveryRouteIdeaBadge: "Idée d’itinéraire",
  homeDiscoveryTripOneWay: "Aller simple",
  homeDiscoveryCabinEconomy: "Économie",
  homeDiscoveryTravelerCountOne: "1 voyageur",
  "homeDiscoveryRoute.us-jfk-mia.title": "Week-end plage à Miami",
  "homeDiscoveryRoute.us-jfk-mia.routeNote":
    "Soleil de Floride, plages art déco et restaurants au bord de l’eau.",
  "homeDiscoveryRoute.us-ord-las.title": "Escapade divertissement à Las Vegas",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "Week-ends animés avec spectacles, restaurants et séjours dans le désert.",
  "homeDiscoveryRoute.us-lax-sfo.title": "Escapade rapide à San Francisco",
  "homeDiscoveryRoute.us-lax-sfo.routeNote":
    "Corridor californien pratique pour affaires, gastronomie et vues sur la baie.",
  "homeDiscoveryRoute.us-atl-mco.title": "Escapade en famille à Orlando",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "Itinéraire loisirs pratique pour parcs à thème, complexes hôteliers et soleil.",
  "homeDiscoveryRoute.us-dfw-sea.title": "Voyage café et nature à Seattle",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "Marchés, cafés et escapades de plein air dans le Nord-Ouest Pacifique.",
  "homeDiscoveryRoute.us-mia-cun.title": "Courte escapade détente à Cancún",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "Plages turquoise, séjours en complexe et courtes pauses au soleil.",
  "homeDiscoveryRoute.us-ord-pdx.title":
    "Week-end gastronomie et forêt à Portland",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "Brasseries artisanales, food trucks et accès facile aux sentiers verdoyants.",
  "homeDiscoveryRoute.us-sea-hnl.title": "Pause tropicale à Honolulu",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "Plages du Pacifique, randonnées volcaniques et moments de détente sur l’île.",
  "homeDiscoveryRoute.us-bos-sju.title": "Échappée colorée à San Juan",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "Vieilles rues, plages et week-ends insulaires sans quitter les États-Unis.",
  "homeDiscoveryRoute.us-den-phx.title": "Voyage soleil du désert à Phoenix",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "Soleil du désert, complexes détente et randonnées avec vues sur les montagnes.",
  "homeDiscoveryRoute.us-iad-bna.title": "Escapade musicale à Nashville",
  "homeDiscoveryRoute.us-iad-bna.routeNote":
    "Salles de concert, cuisine du Sud et week-ends animés en ville.",
  "homeDiscoveryRoute.us-lax-yvr.title":
    "Évasion ville et montagne à Vancouver",
  "homeDiscoveryRoute.us-lax-yvr.routeNote":
    "Port, montagnes et quartiers gourmands dans un court trajet sur la côte Ouest.",
  "homeDiscoveryRoute.us-sea-anc.title":
    "Porte d’entrée vers la nature sauvage d’Anchorage",
  "homeDiscoveryRoute.us-sea-anc.routeNote":
    "Glaciers, faune et aventures en Alaska au départ de Seattle.",
  "homeDiscoveryRoute.us-jfk-aus.title": "Escapade musique live à Austin",
  "homeDiscoveryRoute.us-jfk-aus.routeNote":
    "Concerts, barbecue et quartiers créatifs pour un week-end énergique.",
  "homeDiscoveryRoute.us-dtw-msy.title": "Week-end jazz à La Nouvelle-Orléans",
  "homeDiscoveryRoute.us-dtw-msy.routeNote":
    "Itinéraire riche en culture avec clubs de jazz, cuisine créole et soirées dans le French Quarter.",
  "homeDiscoveryRoute.us-phl-san.title": "Pause côtière à San Diego",
  "homeDiscoveryRoute.us-phl-san.routeNote":
    "Escapade transcontinentale avec plages, croisières dans la baie et climat doux.",
  "homeDiscoveryRoute.fallback-nyc-lis.title": "City break à Lisbonne",
  "homeDiscoveryRoute.fallback-nyc-lis.routeNote":
    "Rues baignées de soleil, façades pastel et points de vue sur l’Atlantique.",
  "homeDiscoveryRoute.fallback-lhr-ist.title": "Mélange culturel à Istanbul",
  "homeDiscoveryRoute.fallback-lhr-ist.routeNote":
    "Silhouettes de mosquées, bazars et soirées au bord du Bosphore.",
  "homeDiscoveryRoute.fallback-dxb-sin.title": "Escapade skyline à Singapour",
  "homeDiscoveryRoute.fallback-dxb-sin.routeNote":
    "Jardins futuristes, cuisine de hawker centers et transports urbains efficaces.",
  "homeDiscoveryRoute.fallback-cdg-ath.title": "Virée historique à Athènes",
  "homeDiscoveryRoute.fallback-cdg-ath.routeNote":
    "Sites antiques, vues depuis les rooftops et saveurs méditerranéennes.",
  "homeDiscoveryRoute.fallback-yyz-cun.title": "Évasion plage à Cancún",
  "homeDiscoveryRoute.fallback-yyz-cun.routeNote":
    "Plages turquoise et séjours en complexe pour des pauses faciles au soleil.",
  "homeDiscoveryRoute.fallback-lax-tyo.title": "Pulsation urbaine de Tokyo",
  "homeDiscoveryRoute.fallback-lax-tyo.routeNote":
    "Quartiers néon, repas tardifs et liaisons ferroviaires de premier plan.",
  "homeDiscoveryRoute.fallback-syd-dps.title": "Pause insulaire à Bali",
  "homeDiscoveryRoute.fallback-syd-dps.routeNote":
    "Villas tropicales, rizières en terrasses et côtes prêtes pour le surf.",
  "homeDiscoveryRoute.fallback-fra-cpt.title": "Aventure au Cap",
  "homeDiscoveryRoute.fallback-fra-cpt.routeNote":
    "Randonnées à Table Mountain, routes côtières et excursions dans les vignobles.",
  "homeDiscoveryRoute.fallback-cai-dxb.title": "Pause correspondance à Dubai",
  "homeDiscoveryRoute.fallback-cai-dxb.routeNote":
    "Itinéraire moyen-oriental pour stopovers, shopping et correspondances faciles.",
  "homeDiscoveryRoute.fallback-mad-mrk.title": "Souks et riads à Marrakech",
  "homeDiscoveryRoute.fallback-mad-mrk.routeNote":
    "Échappée médina au soleil avec repas sur les toits et marchés.",
  "homeDiscoveryRoute.fallback-gru-lim.title":
    "Voyage gastronomie côtière à Lima",
  "homeDiscoveryRoute.fallback-gru-lim.routeNote":
    "Vues sur le Pacifique, cuisine de renommée mondiale et quartiers historiques.",
  "homeDiscoveryRoute.fallback-del-bkk.title": "Énergie urbaine de Bangkok",
  "homeDiscoveryRoute.fallback-del-bkk.routeNote":
    "Rues gourmandes, temples et marchés nocturnes animés.",
  "homeDiscoveryRoute.fallback-bom-kul.title":
    "Voyage tours urbaines à Kuala Lumpur",
  "homeDiscoveryRoute.fallback-bom-kul.routeNote":
    "Quartiers gourmands, points de vue sur la skyline et options nature à la journée.",
  "homeDiscoveryRoute.fallback-mex-sjo.title": "Départ nature depuis San Jose",
  "homeDiscoveryRoute.fallback-mex-sjo.routeNote":
    "Accès facile aux forêts de nuages, volcans et plantations de café.",
  "homeDiscoveryRoute.fallback-icn-hkg.title":
    "City break portuaire à Hong Kong",
  "homeDiscoveryRoute.fallback-icn-hkg.routeNote":
    "Ferries sous la skyline, rues de marchés et scènes gourmandes tardives.",
  "homeDiscoveryRoute.fallback-jnb-znz.title": "Détente insulaire à Zanzibar",
  "homeDiscoveryRoute.fallback-jnb-znz.routeNote":
    "Plages de l’océan Indien, ruelles de Stone Town et récifs de plongée.",

  "homeDiscoveryRoute.us-ewr-sav.title":
    "Échappée historique sur les squares de Savannah",
  "homeDiscoveryRoute.us-ewr-sav.routeNote":
    "Itinéraire week-end dans le Sud pour rues pavées, gastronomie et séjours au bord de la rivière.",
  "homeDiscoveryRoute.us-bos-mia.title": "Pause soleil d’hiver à Miami",
  "homeDiscoveryRoute.us-bos-mia.routeNote":
    "Itinéraire du Nord-Est vers le soleil pour plages, restaurants et quartiers artistiques.",
  "homeDiscoveryRoute.us-lga-chs.title":
    "Week-end gastronomie côtière à Charleston",
  "homeDiscoveryRoute.us-lga-chs.routeNote":
    "Itinéraire Lowcountry pour rues historiques, fruits de mer et escapades plage en plus.",
  "homeDiscoveryRoute.us-den-slc.title": "Base montagne à Salt Lake",
  "homeDiscoveryRoute.us-den-slc.routeNote":
    "Court trajet montagneux pour ski, sentiers et accès aux canyons de l’Utah.",
  "homeDiscoveryRoute.us-iah-mex.title": "Week-end culture à Mexico",
  "homeDiscoveryRoute.us-iah-mex.routeNote":
    "Corridor transfrontalier pour musées, gastronomie, architecture et nuits animées.",
  "homeDiscoveryRoute.us-lax-sjd.title": "Courte escapade plage à Los Cabos",
  "homeDiscoveryRoute.us-lax-sjd.routeNote":
    "Itinéraire rapide vers les complexes de Baja, les plages et les paysages désertiques.",
  "homeDiscoveryRoute.us-ord-rsw.title": "Pause côte du Golfe à Fort Myers",
  "homeDiscoveryRoute.us-ord-rsw.routeNote":
    "Itinéraire soleil d’hiver pour plages tranquilles, îles-barrières et séjours détente.",
  "homeDiscoveryRoute.us-sea-san.title": "Corridor ensoleillé vers San Diego",
  "homeDiscoveryRoute.us-sea-san.routeNote":
    "Lien côte Ouest pour plages, balades au port et une météo douce.",
  "homeDiscoveryRoute.us-jfk-lax.title": "Liaison côte à côte vers Los Angeles",
  "homeDiscoveryRoute.us-jfk-lax.routeNote":
    "Itinéraire transcontinental majeur pour affaires, divertissement et escapades plage.",
  "homeDiscoveryRoute.us-ewr-mco.title": "Escapade parcs à thème à Orlando",
  "homeDiscoveryRoute.us-ewr-mco.routeNote":
    "Itinéraire familial du Nord-Est pour parcs, complexes hôteliers et soleil de Floride.",
  "homeDiscoveryRoute.us-lga-fll.title": "Virée plage à Fort Lauderdale",
  "homeDiscoveryRoute.us-lga-fll.routeNote":
    "Itinéraire Floride rapide pour plages, croisières et pauses au soleil.",
  "homeDiscoveryRoute.us-bos-lax.title": "Escapade sans escale à Los Angeles",
  "homeDiscoveryRoute.us-bos-lax.routeNote":
    "Liaison de côte à côte pour séjours cinéma, plages et week-ends prolongés.",
  "homeDiscoveryRoute.us-ord-mia.title": "Voyage lac à plage vers Miami",
  "homeDiscoveryRoute.us-ord-mia.routeNote":
    "Itinéraire de Chicago au sud de la Floride pour chaleur, gastronomie et vie nocturne.",
  "homeDiscoveryRoute.us-atl-las.title": "Corridor long week-end à Las Vegas",
  "homeDiscoveryRoute.us-atl-las.routeNote":
    "Itinéraire loisirs très fréquenté pour spectacles, complexes hôteliers et événements.",
  "homeDiscoveryRoute.us-dfw-mco.title":
    "Trajet familial en avion vers Orlando",
  "homeDiscoveryRoute.us-dfw-mco.routeNote":
    "Corridor du Texas vers la Floride pour parcs à thème et vacances en famille.",
  "homeDiscoveryRoute.us-den-las.title": "Escapade mountain-west vers Vegas",
  "homeDiscoveryRoute.us-den-las.routeNote":
    "Court itinéraire désertique pour divertissement, conventions et week-ends rapides.",
  "homeDiscoveryRoute.us-sfo-las.title": "Pause Las Vegas depuis la baie",
  "homeDiscoveryRoute.us-sfo-las.routeNote":
    "Lien rapide depuis la baie pour spectacles, restaurants et séjours au soleil du désert.",
  "homeDiscoveryRoute.us-lax-hnl.title":
    "Liaison plage Pacifique vers Honolulu",
  "homeDiscoveryRoute.us-lax-hnl.routeNote":
    "Itinéraire classique vers Hawaii pour plages, surf et pauses insulaires.",
  "homeDiscoveryRoute.us-sfo-sea.title":
    "Escapade Seattle dans le Nord-Ouest Pacifique",
  "homeDiscoveryRoute.us-sfo-sea.routeNote":
    "Court corridor côte Ouest pour café, technologie et échappées nature.",
  "homeDiscoveryRoute.us-iad-mco.title": "Évasion Orlando depuis la capitale",
  "homeDiscoveryRoute.us-iad-mco.routeNote":
    "Itinéraire familial et de congrès vers parcs, complexes hôteliers et soleil.",
  "homeDiscoveryRoute.us-msp-rsw.title":
    "Itinéraire soleil d’hiver vers Fort Myers",
  "homeDiscoveryRoute.us-msp-rsw.routeNote":
    "Échappée Midwest vers le Golfe pour plages, îles et chaleur saisonnière.",
  "homeDiscoveryRoute.us-clt-mia.title": "Liaison hub sud-est vers Miami",
  "homeDiscoveryRoute.us-clt-mia.routeNote":
    "Corridor courant du Sud-Est pour plages, affaires et correspondances caribéennes.",
  "homeDiscoveryRoute.us-dtw-fll.title":
    "Évasion Grands Lacs vers Fort Lauderdale",
  "homeDiscoveryRoute.us-dtw-fll.routeNote":
    "Itinéraire populaire vers la Floride pour week-ends plage, croisières et soleil d’hiver.",
  "homeDiscoveryRoute.us-phl-mco.title":
    "Itinéraire familial Philadelphie-Orlando",
  "homeDiscoveryRoute.us-phl-mco.routeNote":
    "Itinéraire loisirs du Nord-Est pour parcs à thème, complexes hôteliers et pauses soleil.",
  "homeDiscoveryRoute.us-bwi-mco.title": "Escapade Baltimore-Orlando",
  "homeDiscoveryRoute.us-bwi-mco.routeNote":
    "Itinéraire familial fréquent pour parcs, courts séjours et complexes hôteliers.",
  "homeDiscoveryRoute.us-dfw-las.title": "Itinéraire nord du Texas vers Vegas",
  "homeDiscoveryRoute.us-dfw-las.routeNote":
    "Itinéraire loisirs et conventions très fréquenté pour week-ends rapides dans le désert.",
  "homeDiscoveryRoute.us-jfk-cun.title": "Court voyage Caraïbes à Cancún",
  "homeDiscoveryRoute.us-jfk-cun.routeNote":
    "Itinéraire loisirs sans escale populaire pour plages, complexes hôteliers et pauses en eaux chaudes.",
  "homeDiscoveryRoute.us-atl-cun.title": "Itinéraire détente Atlanta-Cancún",
  "homeDiscoveryRoute.us-atl-cun.routeNote":
    "Corridor hub-vers-station balnéaire pour vacances plage et pauses faciles sur la côte caraïbe.",
  "homeDiscoveryRoute.us-dfw-sjd.title": "Évasion nord du Texas vers Los Cabos",
  "homeDiscoveryRoute.us-dfw-sjd.routeNote":
    "Itinéraire resort courant pour plages de Baja, paysages désertiques et longs week-ends.",
  "homeDiscoveryRoute.us-ord-cun.title": "Itinéraire plage Midwest-Cancún",
  "homeDiscoveryRoute.us-ord-cun.routeNote":
    "Itinéraire loisirs fiable pour soleil d’hiver, complexes hôteliers et voyages en famille.",
  "homeDiscoveryRoute.us-jfk-sju.title": "City break caribéen à San Juan",
  "homeDiscoveryRoute.us-jfk-sju.routeNote":
    "Itinéraire loisirs fréquent pour vieille ville, plages et week-ends insulaires.",
  "homeDiscoveryRoute.us-lax-mex.title": "Liaison côte Ouest vers Mexico",
  "homeDiscoveryRoute.us-lax-mex.routeNote":
    "Grand itinéraire transfrontalier pour gastronomie, musées, quartiers et événements.",
  homeTrustTitle: "Pourquoi les voyageurs comparent sur Kurioticket",
  homeTrustSubtitle:
    "Kurioticket vous aide à comparer clairement les offres des fournisseurs, puis à finaliser la réservation sur le site du fournisseur.",
  homeTrustCompareTitle: "Comparer les offres des fournisseurs",
  homeTrustCompareBody:
    "Consultez les options de vols et d’hôtels de plusieurs fournisseurs de voyage au même endroit.",
  homeTrustPricingTitle: "Contexte tarifaire transparent",
  homeTrustPricingBody:
    "Consultez les prix, les détails de l’itinéraire ou du séjour, ainsi que les conditions importantes avant de continuer.",
  homeTrustHandoffTitle: "Redirection sécurisée vers le fournisseur",
  homeTrustHandoffBody:
    "Lorsque vous choisissez une offre, vous continuez vers le fournisseur pour finaliser la réservation en toute sécurité.",
  homePopularDestinations: "Destinations populaires",
  "homePopularDestinationCity.cancun": "Cancún",
  "homePopularDestinationCity.lisbon": "Lisbonne",
  "homePopularDestinationCity.london": "Londres",
  "homePopularDestinationCity.montreal": "Montréal",
  "homePopularDestinationCity.newYork": "New York",
  "homePopularDestinationCity.sanJose": "San José",
  "homePopularDestinationCity.zurich": "Zurich",
  "homePopularDestinationCountry.argentina": "Argentine",
  "homePopularDestinationCountry.austria": "Autriche",
  "homePopularDestinationCountry.brazil": "Brésil",
  "homePopularDestinationCountry.canada": "Canada",
  "homePopularDestinationCountry.chile": "Chili",
  "homePopularDestinationCountry.colombia": "Colombie",
  "homePopularDestinationCountry.costaRica": "Costa Rica",
  "homePopularDestinationCountry.egypt": "Égypte",
  "homePopularDestinationCountry.ethiopia": "Éthiopie",
  "homePopularDestinationCountry.france": "France",
  "homePopularDestinationCountry.ghana": "Ghana",
  "homePopularDestinationCountry.hongKong": "Hong Kong",
  "homePopularDestinationCountry.indonesia": "Indonésie",
  "homePopularDestinationCountry.italy": "Italie",
  "homePopularDestinationCountry.kenya": "Kenya",
  "homePopularDestinationCountry.malaysia": "Malaisie",
  "homePopularDestinationCountry.mauritius": "Maurice",
  "homePopularDestinationCountry.mexico": "Mexique",
  "homePopularDestinationCountry.netherlands": "Pays-Bas",
  "homePopularDestinationCountry.peru": "Pérou",
  "homePopularDestinationCountry.philippines": "Philippines",
  "homePopularDestinationCountry.portugal": "Portugal",
  "homePopularDestinationCountry.qatar": "Qatar",
  "homePopularDestinationCountry.saudiArabia": "Arabie saoudite",
  "homePopularDestinationCountry.singapore": "Singapour",
  "homePopularDestinationCountry.southAfrica": "Afrique du Sud",
  "homePopularDestinationCountry.southKorea": "Corée du Sud",
  "homePopularDestinationCountry.spain": "Espagne",
  "homePopularDestinationCountry.switzerland": "Suisse",
  "homePopularDestinationCountry.taiwan": "Taïwan",
  "homePopularDestinationCountry.tanzania": "Tanzanie",
  "homePopularDestinationCountry.thailand": "Thaïlande",
  "homePopularDestinationCountry.turkiye": "Turquie",
  "homePopularDestinationCountry.unitedArabEmirates": "Émirats arabes unis",
  "homePopularDestinationCountry.unitedKingdom": "Royaume-Uni",
  "homePopularDestinationCountry.unitedStates": "États-Unis",
  "homePopularDestinationCountry.vietnam": "Vietnam",
  homeViewAllDestinations: "Voir toutes les destinations",
  homePromoFlightsTitle: "Offres de vols des meilleures compagnies aériennes",
  homePromoFlightsBody:
    "Découvrez des tarifs à durée limitée et comparez les options instantanément.",
  homePromoFlightsCta: "Découvrir les offres de vols",
  homePromoHotelsTitle: "Économies sur les hôtels dans le monde entier",
  homePromoHotelsBody:
    "Parcourez des séjours en hôtels boutique et dans de grandes chaînes avec des prix transparents.",
  homePromoHotelsCta: "Découvrir les offres d’hôtels",
  homeNewsletterTitle: "Continuez à préparer votre voyage",
  homeNewsletterBody:
    "Recevez des rappels de recherche et des inspirations d’offres.",
  homeNewsletterPlaceholder: "Saisissez votre e-mail",
  homeSubscribe: "S’abonner",
  homeNewsletterThanks:
    "Merci ! Nous vous tiendrons informé des offres de voyage.",
  homeHeroImageAlt: "Complexe tropical de luxe au bord d’eaux calmes",
  homeNextDestinations: "Destinations suivantes",
  homePreviousDestinations: "Destinations précédentes",
  homeEmailAddress: "Adresse e-mail",
  homeSaveDestination: "Enregistrer {{city}}",
  homeNewsletterInvalidEmail: "Saisissez une adresse e-mail valide.",
  homeNewsletterUnableSubscribe: "Impossible de vous abonner pour le moment.",
  homeNewsletterTryAgain:
    "Nous n’avons pas pu vous abonner pour le moment. Veuillez réessayer bientôt.",
  homeSubscribing: "Abonnement…",
  homeNewsletterConsent:
    "En vous abonnant, vous acceptez de recevoir les actualités de Kurioticket. Vous pouvez vous désabonner à tout moment.",
  homeRemoveFromSavedRoutes: "Retirer des itinéraires enregistrés",
  homeSaveRoute: "Enregistrer l’itinéraire",
  homeCheckingProviderRoutePricing:
    "Vérification du tarif d’itinéraire fourni par les fournisseurs",
  homePricesUpdateWithProviderResults:
    "Les prix se mettent à jour avec les résultats des fournisseurs",
  homeExploreFares: "Explorer les tarifs",
  homeCompareOptions: "Comparer les options",
  displayEstimateFinalProviderMayDiffer:
    "Estimation affichée ; le prix final du fournisseur peut différer.",
  finalPriceConfirmedByProvider: "Prix final confirmé par le fournisseur.",
  destinationImageFallback: "Destination",
  fromPrice: "Dès",
  faqHeading: "Questions fréquentes",
  faqIntro:
    "Découvrez comment Kurioticket vous aide à comparer les vols, les hôtels et les options de voyage avant de réserver auprès de fournisseurs de confiance.",
  faqViewAll: "Voir toutes les FAQ",
  faqHelpCenter: "Centre d’aide",
  faqGeneralQuestions: "Questions générales",
  faqNeedMoreHelpPrefix: "Besoin d’aide supplémentaire ? Consultez la",
  faqSupportPage: "page d’assistance",
  faqNeedMoreHelpSuffix: "pour les options de service et de contact.",
  faqQuestionFindOptions:
    "Comment Kurioticket trouve-t-il des options de vols et d’hôtels ?",
  faqAnswerFindOptions:
    "Kurioticket recherche des offres en direct auprès de fournisseurs de voyage et les rassemble au même endroit afin que vous puissiez comparer les prix, les itinéraires, les séjours et les détails avant de choisir.",
  faqQuestionSellDirectly:
    "Kurioticket vend-il directement des billets ou des chambres d’hôtel ?",
  faqAnswerSellDirectly:
    "Kurioticket vous aide à comparer les options de voyage. Lorsque vous choisissez une offre, vous êtes envoyé vers le fournisseur sélectionné pour consulter les détails et finaliser la réservation sur son site.",
  faqQuestionPriceChanges:
    "Pourquoi les prix peuvent-ils changer après avoir cliqué sur une offre ?",
  faqAnswerPriceChanges:
    "Les prix et disponibilités peuvent changer en temps réel, car les compagnies aériennes, hôtels et fournisseurs de voyage mettent souvent à jour leurs stocks. Vérifiez toujours le prix final sur la page de paiement du fournisseur avant de réserver.",
  faqQuestionCompareProviders:
    "Puis-je comparer plusieurs fournisseurs pour le même voyage ?",
  faqAnswerCompareProviders:
    "Oui. Kurioticket est conçu pour vous aider à comparer les options côte à côte afin d’évaluer le prix, les horaires, les détails de l’itinéraire, les informations d’hôtel et la valeur globale.",
  faqQuestionSecureBooking:
    "Comment finaliser ma réservation en toute sécurité ?",
  faqAnswerSecureBooking:
    "La réservation et le paiement s’effectuent dans le parcours de paiement du fournisseur. Vérifiez toujours les conditions, la politique d’annulation et le prix final du fournisseur avant de confirmer.",
  faqQuestionPreferences:
    "Puis-je définir mes préférences de devise et de langue ?",
  faqAnswerPreferences:
    "Oui. Kurioticket vous permet de définir vos préférences de pays/devise d’affichage, et vous pouvez choisir toute langue de site disponible dans le sélecteur de langue.",
  faqQuestionLiveCached:
    "Les résultats de recherche sont-ils en direct ou mis en cache ?",
  faqAnswerLiveCached:
    "Kurioticket utilise les résultats de recherche des fournisseurs, qui peuvent s’actualiser lorsque les disponibilités et les prix changent. Cela aide à afficher des options à jour, mais la disponibilité finale est confirmée par le fournisseur.",
  faqQuestionManageChanges: "Où gérer les modifications ou les annulations ?",
  faqAnswerManageChanges:
    "Les modifications, annulations, remboursements et demandes d’assistance sont généralement gérés par le fournisseur auprès duquel la réservation a été effectuée. Utilisez les informations de confirmation de ce fournisseur pour vos demandes de service.",
  flightLandingHeroTitle:
    "Trouvez votre prochain vol abordable en toute simplicité.",
  flightLandingHeroSubtitle:
    "Recherchez des itinéraires, comparez les dates et explorez les options de vol pour votre prochain voyage.",
  flightLandingHeroImageAlt: "Aile d’avion au-dessus de nuages lumineux",
  flightLandingFeatureSearchReadyTitle: "Itinéraires prêts à rechercher",
  flightLandingFeatureSearchReadyBody:
    "Saisissez les détails réels du voyage avant que les résultats soient demandés aux fournisseurs de vols.",
  flightLandingFeatureCompareTitle: "Comparer avec le contexte",
  flightLandingFeatureCompareBody:
    "Utilisez les dates, le nombre de voyageurs, la cabine, la durée, les escales et les détails de l’itinéraire pour évaluer les options.",
  flightLandingFeatureProviderTitle: "Vérification auprès du fournisseur",
  flightLandingFeatureProviderBody:
    "Confirmez toujours la disponibilité finale, le prix et les règles auprès du fournisseur avant de réserver.",
  flightLandingStartThisSearch: "Lancer cette recherche",
  flightLandingRouteIdeasTitle:
    "Idées d’itinéraires pour des voyages flexibles",
  flightLandingRouteIdeasBody:
    "Parcourez des idées d’itinéraires, puis lancez une vraie recherche avec les dates et les voyageurs avant de comparer les vols disponibles.",
  flightLandingRouteConnector: "vers",
  flightLandingRouteAriaLabel:
    "Rechercher des vols de {{origin}} à {{destination}}",
  discoverDestinationsFromRegion:
    "Découvrez des destinations depuis votre région",
  discoverDestinationsFromRegionBody:
    "Explorez des itinéraires sélectionnés et commencez votre prochain voyage en toute confiance.",
  tripType: "Type de voyage",
  from: "De",
  to: "Vers",
  departure: "Départ",
  travelDates: "Dates de voyage",
  chooseTravelDates: "Choisir les dates de voyage",
  clearTravelDates: "Effacer les dates de voyage",
  clearDestination: "Effacer la destination",
  clearOrigin: "Effacer l’origine",
  roundTrip: "Aller-retour",
  oneWay: "Aller simple",
  multiCity: "Multi-destinations",
  economy: "Économie",
  business: "Affaires",
  first: "Première",
  adultSingular: "adulte",
  adultPlural: "adultes",
  childSingular: "enfant",
  childPlural: "enfants",
  infantSingular: "bébé",
  infantPlural: "bébés",
  premiumEconomy: "Économie premium",
  travelerSingular: "voyageur",
  travelerPlural: "voyageurs",
  cabinClass: "Classe de cabine",
  nearYou: "Près de vous",
  airportsAndCities: "Aéroports et villes",
  searchAirportsAndCities: "Rechercher des aéroports et des villes",
  searchAirportsOrCities: "Rechercher des aéroports ou des villes",
  cityAirportOrCode: "Ville, aéroport ou code",
  cityOrAirport: "Ville ou aéroport",
  startTypingCityOrAirport:
    "Commencez à saisir le nom d’une ville ou d’un aéroport pour voir des suggestions.",
  noMatchingAirportsOrCities: "Aucun aéroport ni ville ne correspond",
  startTypingCityAirportOrCode:
    "Commencez à saisir une ville, un aéroport ou un code",
  searchingAirportsAndCities: "Recherche d’aéroports et de villes…",
  origin: "Origine",
  destination: "Destination",
  fromPlaceholder: "D’où ?",
  toPlaceholder: "Où ?",
  travelers: "Voyageurs",
  search: "Rechercher",
  searchFlights: "Rechercher des vols",
  searchingFlights: "Recherche de vols…",
  beachVacations: "Vacances à la plage",
  beachVacationsBody:
    "Explorez des itinéraires vers des côtes ensoleillées, des îles et des destinations balnéaires au climat doux.",
  flightBookingFaqs: "FAQ sur la réservation de vols",
  flightBookingFaqIntro:
    "Consultez les informations courantes sur la recherche de vols avant de continuer avec un fournisseur.",
  flightFaqBestTimeQuestion:
    "Quel est le meilleur moment pour réserver un vol ?",
  flightFaqBestTimeAnswer:
    "Les prix des vols peuvent varier selon l’itinéraire, la saison, la demande et les disponibilités. Il est généralement utile de comparer plusieurs dates, de vérifier les aéroports proches lorsque c’est possible et d’examiner l’itinéraire complet avant de choisir un tarif.",
  flightFaqBeforeBookingQuestion:
    "Que dois-je vérifier avant de réserver ?",
  flightFaqBeforeBookingAnswer:
    "Vérifiez les heures de départ et d’arrivée, la durée totale du voyage, les escales, les règles de bagages, les options de choix de siège, les conditions d’annulation et la politique de modification du billet avant de finaliser votre réservation auprès du fournisseur.",
  flightFaqFlexibleFareQuestion: "Qu’est-ce qu’un tarif flexible ?",
  flightFaqFlexibleFareAnswer:
    "Un tarif flexible peut permettre des modifications ou des annulations avec moins de restrictions qu’un tarif de base, mais les règles exactes dépendent de la compagnie aérienne ou du fournisseur de réservation. Vérifiez toujours les conditions tarifaires avant l’achat.",
  flightFaqNonstopQuestion:
    "Les vols sans escale sont-ils toujours préférables ?",
  flightFaqNonstopAnswer:
    "Pas toujours. Les vols sans escale peuvent faire gagner du temps, tandis que les itinéraires avec une escale peuvent offrir d’autres heures de départ, fenêtres d’arrivée ou options tarifaires. Comparez la durée totale du voyage, la durée de l’escale et la commodité avant de décider.",
  flightFaqBaggageQuestion:
    "Comment fonctionnent les règles de bagages ?",
  flightFaqBaggageAnswer:
    "La franchise bagages peut varier selon la compagnie aérienne, l’itinéraire, la cabine, le type de tarif et le fournisseur. Vérifiez si les bagages cabine, les bagages enregistrés et les effets personnels sont inclus avant de réserver.",
  flightFaqChangeCancelQuestion:
    "Puis-je modifier ou annuler mon billet ?",
  flightFaqChangeCancelAnswer:
    "Les possibilités de modification et d’annulation dépendent des règles tarifaires et des politiques du fournisseur. Certains billets peuvent être non remboursables ou inclure des frais, alors examinez attentivement les conditions avant de réserver.",
  flightFaqInternationalQuestion:
    "Que dois-je savoir sur les vols internationaux ?",
  flightFaqInternationalAnswer:
    "Pour un voyage international, vérifiez la validité du passeport, les exigences de visa, les règles de transit, les politiques de bagages et les conditions d’arrivée pour votre destination avant de réserver.",
  swapOriginDestination: "Inverser l’origine et la destination",
  chooseOrigin: "Choisir l’origine",
  chooseDestination: "Choisir la destination",
  previousMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  previousMonthShort: "Préc.",
  nextMonthShort: "Suiv.",
  done: "Terminé",
  clear: "Effacer",
  clearAll: "Tout effacer",
  adults: "Adultes",
  children: "Enfants",
  infants: "Bébés",
  closest: "Le plus proche",
  tripRound: "Aller-retour",
  tripOneWay: "Aller simple",
  tripMulti: "Multi-destinations",
  departureDate: "Date de départ",
  cityOrHotel: "Ville ou hôtel",
  chooseHotelDestination: "Choisir une destination d’hôtel",
  hotelSearchIntroLabel: "Comparer les options d’hôtel",
  hotelSearchDestinationLabel: "Destination",
  hotelSearchDestinationPlaceholder: "Ville, quartier ou monument",
  hotelSearchDatePlaceholder: "Arrivée — Départ",
  hotelSearchTravelDatesLabel: "Dates de voyage",
  guests: "Voyageurs",
  guestSingular: "voyageur",
  guestPlural: "voyageurs",
  roomSingular: "chambre",
  roomPlural: "chambres",
  searchHotels: "Rechercher des hôtels",
  searchingHotels: "Recherche d’hôtels…",
  hotelSearchGuestsLabel: "Voyageurs",
  editHotelSearch: "Modifier la recherche d’hôtel",
  closeSearchForm: "Fermer le formulaire de recherche",
  hotelDestinationSuggestions: "Suggestions de destinations hôtelières",
  findingDestinations: "Recherche de destinations…",
  noMatchingDestinationsYet: "Aucune destination correspondante pour le moment.",
  searchCityAreaLandmark: "Recherchez une ville, un quartier ou un monument.",
  hotelErrorEnterDestination: "Veuillez saisir une destination.",
  hotelErrorSelectCheckIn: "Veuillez sélectionner une date d’arrivée.",
  hotelErrorSelectCheckOut: "Veuillez sélectionner une date de départ.",
  hotelErrorCheckoutAfterCheckin: "La date de départ doit être après la date d’arrivée.",
  hotelErrorGuestsRange: "Veuillez sélectionner entre 1 et 12 voyageurs.",
  hotelErrorRoomsRange: "Veuillez sélectionner entre 1 et 6 chambres.",
  "hotelDestinationKind.city": "Ville",
  "hotelDestinationKind.district": "Quartier",
  "hotelDestinationKind.landmark": "Monument",
  "hotelDestinationKind.airport-area": "Zone aéroportuaire",
  "hotelResults.openFilters": "Ouvrir les filtres",
  filters: "Filtres",
  rooms: "Chambres",
  chooseGuestsAndRooms: "Choisir les voyageurs et les chambres",
  guestsAndRooms: "Voyageurs et chambres",
  petFriendly: "Animaux acceptés",
  onlyShowPetFriendlyStays:
    "Afficher uniquement les séjours qui acceptent les animaux",
  togglePetFriendlyStays: "Basculer les séjours acceptant les animaux",
  exploreHotelStaysByDestination:
    "Explorer les séjours hôteliers par destination",
  featuredHotelDestinations: "Destinations hôtelières en vedette",
  findStaysEveryKindTrip: "Trouvez des séjours pour chaque type de voyage",
  hotelInspirationBody:
    "Parcourez des idées de destinations selon le type de séjour que vous imaginez.",
  hotelInspirationCategories: "Catégories d’inspiration hôtelière",
  exploreStaysWorldwide: "Explorer les séjours dans le monde entier",
  hotelTrustCompareBody:
    "Comparez les détails des séjours, les équipements et les options des fournisseurs avant de continuer.",
  hotelTrustReviewTitle: "Vérifiez les détails du séjour",
  hotelTrustReviewBody:
    "Consultez les dates, les voyageurs, les chambres et les informations importantes avant d’ouvrir le fournisseur.",
  hotelTrustProviderTitle: "Continuez chez le fournisseur",
  hotelTrustProviderBody:
    "Finalisez votre réservation d’hôtel directement auprès du fournisseur sélectionné.",
  "hotelDestination.London.title": "Royaume-Uni",
  "hotelDestination.London.subtitle": "Séjours à Londres",
  "hotelDestination.London.linkLabel":
    "Rechercher des hôtels à Londres, Royaume-Uni",
  "hotelDestination.London.detail": "Royaume-Uni",
  "hotelDestination.Paris.title": "France",
  "hotelDestination.Paris.subtitle": "Séjours à Paris",
  "hotelDestination.Paris.linkLabel": "Rechercher des hôtels à Paris, France",
  "hotelDestination.Paris.detail": "France",
  "hotelDestination.Rome.title": "Italie",
  "hotelDestination.Rome.subtitle": "Séjours à Rome",
  "hotelDestination.Rome.linkLabel": "Rechercher des hôtels à Rome, Italie",
  "hotelDestination.Rome.detail": "Italie",
  "hotelDestination.Dubai.title": "Émirats arabes unis",
  "hotelDestination.Dubai.subtitle": "Séjours à Dubaï",
  "hotelDestination.Dubai.linkLabel":
    "Rechercher des hôtels à Dubaï, Émirats arabes unis",
  "hotelDestination.Dubai.detail": "Émirats arabes unis",
  "hotelDestination.Singapore.title": "Singapour",
  "hotelDestination.Singapore.subtitle": "Séjours à Singapour",
  "hotelDestination.Singapore.linkLabel":
    "Rechercher des hôtels à Singapour, Singapour",
  "hotelDestination.Singapore.detail": "Singapour",
  "hotelDestination.Barcelona.title": "Espagne",
  "hotelDestination.Barcelona.subtitle": "Séjours à Barcelone",
  "hotelDestination.Barcelona.linkLabel":
    "Rechercher des hôtels à Barcelone, Espagne",
  "hotelDestination.Barcelona.detail": "Espagne",
  "hotelDestination.Toronto.title": "Canada",
  "hotelDestination.Toronto.subtitle": "Séjours à Toronto",
  "hotelDestination.Toronto.linkLabel":
    "Rechercher des hôtels à Toronto, Canada",
  "hotelDestination.Toronto.detail": "Canada",
  "hotelDestination.Amsterdam.title": "Pays-Bas",
  "hotelDestination.Amsterdam.subtitle": "Séjours à Amsterdam",
  "hotelDestination.Amsterdam.linkLabel":
    "Rechercher des hôtels à Amsterdam, Pays-Bas",
  "hotelDestination.Amsterdam.detail": "Pays-Bas",
  "hotelDestination.Bangkok.title": "Thaïlande",
  "hotelDestination.Bangkok.subtitle": "Séjours à Bangkok",
  "hotelDestination.Bangkok.linkLabel":
    "Rechercher des hôtels à Bangkok, Thaïlande",
  "hotelDestination.Bangkok.detail": "Thaïlande",
  "hotelDestination.Cancun.title": "Mexique",
  "hotelDestination.Cancun.subtitle": "Séjours à Cancún",
  "hotelDestination.Cancun.linkLabel":
    "Rechercher des hôtels à Cancún, Mexique",
  "hotelDestination.Cancun.detail": "Mexique",
  "hotelDestination.Istanbul.title": "Turquie",
  "hotelDestination.Istanbul.subtitle": "Séjours à Istanbul",
  "hotelDestination.Istanbul.linkLabel":
    "Rechercher des hôtels à Istanbul, Turquie",
  "hotelDestination.Istanbul.detail": "Turquie",
  "hotelDestination.Tokyo.title": "Japon",
  "hotelDestination.Tokyo.subtitle": "Séjours à Tokyo",
  "hotelDestination.Tokyo.linkLabel": "Rechercher des hôtels à Tokyo, Japon",
  "hotelDestination.Tokyo.detail": "Japon",
  "hotelDestination.New York.title": "États-Unis",
  "hotelDestination.New York.subtitle": "Séjours à New York",
  "hotelDestination.New York.linkLabel":
    "Rechercher des hôtels à New York, États-Unis",
  "hotelDestination.New York.detail": "États-Unis",
  "hotelInspirationBadge.Coastal stays": "Séjours côtiers",
  "hotelInspirationBadge.City coast": "Côte urbaine",
  "hotelInspirationBadge.Waterfront stays": "Séjours au bord de l’eau",
  "hotelInspirationBadge.Harbor city": "Ville portuaire",
  "hotelInspirationBadge.Warm escape": "Escapade au soleil",
  "hotelInspirationBadge.Bay city": "Ville de baie",
  "hotelInspirationBadge.Capital stays": "Séjours dans la capitale",
  "hotelInspirationBadge.Classic city": "Ville classique",
  "hotelInspirationBadge.City ideas": "Idées urbaines",
  "hotelInspirationBadge.Culture stays": "Séjours culturels",
  "hotelInspirationBadge.Historic city": "Ville historique",
  "hotelInspirationBadge.Canal stays": "Séjours au bord des canaux",
  "hotelInspirationBadge.Family city": "Ville en famille",
  "hotelInspirationBadge.Easy exploring": "Exploration facile",
  "hotelInspirationBadge.Beach time": "Moments plage",
  "hotelInspirationBadge.City exploring": "Exploration urbaine",
  "hotelInspirationBadge.City adventure": "Aventure urbaine",
  "hotelInspirationBadge.Slow city days": "Journées urbaines tranquilles",
  "hotelInspirationCategory.Beach": "Plage",
  "hotelInspirationCategory.City breaks": "Escapades urbaines",
  "hotelInspirationCategory.Family trips": "Voyages en famille",
  "hotelInspirationCategory.Relaxed stays": "Séjours détente",
  "hotelInspirationCategory.Weekend ideas": "Idées de week-end",
  homeDestinationDubaiCity: "Dubaï",
  homeDestinationDubaiCountry: "Émirats arabes unis",
  homeDestinationDubaiAlt: "Dubaï, Émirats arabes unis",
  homeDestinationLondonCity: "Londres",
  homeDestinationLondonCountry: "Royaume-Uni",
  homeDestinationLondonAlt: "Londres, Royaume-Uni",
  homeDestinationParisCity: "Paris",
  homeDestinationParisCountry: "France (Paris)",
  homeDestinationParisAlt: "Paris, France",
  homeDestinationBaliCity: "Bali",
  homeDestinationBaliCountry: "Indonésie",
  homeDestinationBaliAlt: "Bali, Indonésie",
  homeDestinationNewYorkCity: "New York",
  homeDestinationNewYorkCountry: "États-Unis",
  homeDestinationNewYorkAlt: "New York, États-Unis",

  searchRentalCarsEveryPartTrip:
    "Recherchez des voitures de location pour chaque étape de votre voyage",
  exploreCarsByTripStyle:
    "Explorez les voitures de location par style de voyage",
  carsTripStyleBody:
    "Choisissez un type de voiture et nous ouvrirons les résultats avec le contexte de recherche prêt.",
  "carsTripStyle.economy.title": "Voitures économiques",
  "carsTripStyle.economy.subtitle":
    "Recherches abordables pour la ville et les voyages en solo",
  "carsTripStyle.economy.cta": "Lancer une recherche de voiture économique",
  "carsTripStyle.economy.ariaLabel":
    "Lancer une recherche de voiture économique depuis une prise en charge en centre-ville",
  "carsTripStyle.economy.imageAlt":
    "Voitures compactes circulant entre des immeubles du centre-ville",
  "carsTripStyle.suv.title": "SUV",
  "carsTripStyle.suv.subtitle":
    "De l’espace pour les voyages en famille, les bagages et les longs trajets",
  "carsTripStyle.suv.cta": "Ouvrir une recherche de location de SUV",
  "carsTripStyle.suv.ariaLabel":
    "Ouvrir une recherche de location de SUV depuis une prise en charge à l’aéroport",
  "carsTripStyle.suv.imageAlt":
    "SUV roulant sur une route dégagée près des montagnes",
  "carsTripStyle.luxury.title": "Voitures de luxe",
  "carsTripStyle.luxury.subtitle":
    "Contexte de recherche premium pour les voyages d’affaires ou les occasions spéciales",
  "carsTripStyle.luxury.cta": "Planifier une recherche de voiture de luxe",
  "carsTripStyle.luxury.ariaLabel":
    "Planifier une recherche de voiture de luxe depuis une prise en charge près de l’hôtel",
  "carsTripStyle.luxury.imageAlt":
    "Voiture premium garée près d’un bâtiment moderne élégant",
  "carsTripStyle.van.title": "Vans",
  "carsTripStyle.van.subtitle":
    "Contexte de recherche pour les voyages en groupe et les bagages familiaux",
  "carsTripStyle.van.cta": "Rechercher des vans pour les voyages en groupe",
  "carsTripStyle.van.ariaLabel":
    "Rechercher des vans pour les voyages en groupe depuis une prise en charge à l’aéroport",
  "carsTripStyle.van.imageAlt":
    "Van de passagers circulant sur une route lumineuse et panoramique",
  "carsTrust.0.title": "Conçu pour les voyages complets",
  "carsTrust.0.description":
    "Planifiez vols, séjours et transports terrestres dans un seul parcours Kurioticket.",
  "carsTrust.1.title": "Les détails de prise en charge d’abord",
  "carsTrust.1.description":
    "Saisissez le lieu de prise en charge, les dates, les horaires et l’âge du conducteur afin que votre recherche de location commence avec les bons détails de voyage.",
  "carsTrust.2.title": "Vérification claire de la location",
  "carsTrust.2.description":
    "Vérifiez le prix final, la disponibilité, les frais et les règles de location auprès du fournisseur avant de réserver.",
  carsPickupPointsTitle:
    "Commencez par des points de prise en charge populaires",
  carsPickupPointsBody:
    "Choisissez un type de prise en charge et nous ouvrirons la page de résultats des voitures avec les détails de recherche prêts.",
  "carsPickup.Airport.title": "Prises en charge à l’aéroport",
  "carsPickup.Airport.subtitle":
    "Commencez depuis les principaux points d’arrivée des aéroports",
  "carsPickup.Airport.ariaLabel":
    "Ouvrir les résultats de voitures pour une prise en charge à l’aéroport",
  "carsPickup.Airport.imageAlt":
    "Avion stationné à une porte d’aéroport au coucher du soleil",
  "carsPickup.City center.title": "Prises en charge en centre-ville",
  "carsPickup.City center.subtitle":
    "Prenez le véhicule près des hôtels du centre-ville et des quartiers d’affaires",
  "carsPickup.City center.ariaLabel":
    "Ouvrir les résultats de voitures pour une prise en charge en centre-ville",
  "carsPickup.City center.imageAlt":
    "Voitures circulant dans une rue urbaine entre de hauts immeubles",
  "carsPickup.Train station.title": "Prises en charge en gare",
  "carsPickup.Train station.subtitle":
    "Poursuivez votre voyage après votre arrivée en train",
  "carsPickup.Train station.ariaLabel":
    "Ouvrir les résultats de voitures pour une prise en charge en gare",
  "carsPickup.Train station.imageAlt":
    "Quai de train avec des voies menant à une gare urbaine",
  "carsPickup.Hotel area.title": "Prises en charge près de l’hôtel",
  "carsPickup.Hotel area.subtitle":
    "Planifiez une prise en charge près de votre lieu de séjour",
  "carsPickup.Hotel area.ariaLabel":
    "Ouvrir les résultats de voitures pour une prise en charge près de l’hôtel",
  "carsPickup.Hotel area.imageAlt":
    "Extérieur d’hôtel avec palmiers et allée d’accès",
  "carsSearch.pickupLocationLabel": "Lieu de prise en charge",
  "carsSearch.pickupLocationPlaceholder": "Aéroport, ville ou adresse",
  "carsSearch.returnLocationPlaceholder":
    "Ville, aéroport ou adresse de retour",
  "carsSearch.returnToSameLocation": "Retour au même endroit",
  "carsSearch.differentReturnLocation": "Lieu de retour différent",
  "carsSearch.rentalDatesLabel": "Dates de location",
  "carsSearch.rentalDatePlaceholder":
    "Date de prise en charge — Date de retour",
  "carsSearch.pickupReturnTimeLabel": "Heure de prise en charge / retour",
  "carsSearch.pickupReturnTimeSummary":
    "Prise en charge {pickupTime} — retour {returnTime}",
  "carsSearch.driverAgeLabel": "Âge du conducteur",
  "carsSearch.driverAgeAnyAge": "Tout âge",
  "carsSearch.clearPickupLocation": "Effacer le lieu de prise en charge",
  "carsSearch.clearReturnLocation": "Effacer le lieu de retour",
  "carsSearch.chooseRentalDatesAria":
    "Choisir les dates de prise en charge et de retour de la location",
  "carsSearch.rentalDatePickerAria": "Sélecteur de dates de location",
  "carsSearch.chooseRentalDates": "Choisissez les dates de location",
  "carsSearch.previousMonth": "Mois précédent",
  "carsSearch.previousMonthShort": "Préc.",
  "carsSearch.nextMonth": "Mois suivant",
  "carsSearch.nextMonthShort": "Suiv.",
  "carsSearch.selectDateAriaPrefix": "Sélectionner",
  "carsSearch.startsNewPickupDate":
    "commence une nouvelle date de prise en charge",
  "carsSearch.choosePickupReturnTimesAria":
    "Choisir les heures de prise en charge et de retour",
  "carsSearch.pickupReturnTimeSelectorAria":
    "Sélecteur d’heure de prise en charge et de retour",
  "carsSearch.pickupTimeLabel": "Heure de prise en charge",
  "carsSearch.returnTimeLabel": "Heure de retour",
  carsSearchPreparing: "Préparation de la recherche de voitures…",
  searchingCars: "Recherche de voitures…",
  "carsFaq.heading": "Questions fréquentes sur les voitures",
  "carsFaq.0.question":
    "Quelles informations me faut-il pour rechercher une voiture de location ?",
  "carsFaq.0.answer":
    "Saisissez le lieu de prise en charge, les dates de prise en charge et de retour, les heures de prise en charge et de retour, l’âge du conducteur et indiquez si vous prévoyez de rendre la voiture à un endroit différent.",
  "carsFaq.1.question": "Puis-je rendre la voiture à un autre endroit ?",
  "carsFaq.1.answer":
    "Oui. Sélectionnez Lieu de retour différent dans le formulaire de recherche et saisissez la ville, l’aéroport ou l’adresse où vous prévoyez de rendre la voiture.",
  "carsFaq.2.question":
    "Pourquoi l’âge du conducteur est-il important pour les voitures de location ?",
  "carsFaq.2.answer":
    "Les fournisseurs de location peuvent appliquer des règles, frais, exigences de dépôt ou disponibilités de véhicules différents selon l’âge du conducteur et le lieu.",
  "carsFaq.3.question":
    "Que dois-je vérifier avant de réserver une voiture de location ?",
  "carsFaq.3.answer":
    "Vérifiez les lieux de prise en charge et de retour, les dates, les horaires, la politique de kilométrage, la politique de carburant, les options d’assurance, les conditions d’annulation, les exigences de dépôt et les documents requis avant de réserver.",
  "carsFaq.4.question": "Où le prix final de la location est-il confirmé ?",
  "carsFaq.4.answer":
    "Le fournisseur confirme le prix final, la disponibilité du véhicule, les taxes, les frais, les exigences de dépôt et les règles de location avant la réservation.",
  "carsFaq.5.question":
    "Quels documents pourrais-je devoir présenter lors de la prise en charge ?",
  "carsFaq.5.answer":
    "Les fournisseurs de location peuvent demander un permis de conduire valide, une carte de paiement, une pièce d’identité et tout document requis par le pays ou le lieu de prise en charge.",

  "deals.heroTitle": "Trouvez des offres de voyage pour votre prochain séjour",
  "deals.heroSubtitle":
    "Recherchez des vols, des séjours et des voitures au même endroit.",
  "deals.packageLegend": "Choisir le type de forfait",
  "deals.package.hotelFlight": "Hôtel + Vol",
  "deals.package.hotelFlightCar": "Hôtel + Vol + Voiture",
  "deals.package.flightCar": "Vol + Voiture",
  "deals.package.hotelCar": "Hôtel + Voiture",
  "deals.originLabel": "DÉPART",
  "deals.destinationLabel": "DESTINATION",
  "deals.datesLabel": "DATES DE VOYAGE",
  "deals.travelersRoomsLabel": "VOYAGEURS / CHAMBRES",
  "deals.originPlaceholder": "Ville ou aéroport",
  "deals.destinationPlaceholder": "Ville, aéroport ou zone",
  "deals.dateFlightPlaceholder": "Départ — Retour",
  "deals.dateHotelPlaceholder": "Arrivée — Départ",
  "deals.dateDialog": "Choisir les dates de voyage",
  "deals.departDate": "Départ",
  "deals.returnDate": "Retour",
  "deals.travelerSingular": "voyageur",
  "deals.travelerPlural": "voyageurs",
  "deals.roomSingular": "chambre",
  "deals.roomPlural": "chambres",
  "deals.driverAge": "Âge du conducteur",
  "deals.cabinClass": "Classe de cabine",
  "deals.cabin.economy": "Économique",
  "deals.cabin.business": "Affaires",
  "deals.cabin.first": "Première",
  "deals.clearOrigin": "Effacer le départ",
  "deals.clearDestination": "Effacer la destination",
  "deals.previous": "Préc.",
  "deals.next": "Suiv.",
  "deals.weekday.sun": "Dim",
  "deals.weekday.mon": "Lun",
  "deals.weekday.tue": "Mar",
  "deals.weekday.wed": "Mer",
  "deals.weekday.thu": "Jeu",
  "deals.weekday.fri": "Ven",
  "deals.weekday.sat": "Sam",
  "deals.selectDateAriaPrefix": "Sélectionner",
  "deals.error.origin": "Saisissez une ville ou un aéroport de départ.",
  "deals.error.destination": "Saisissez une destination.",
  "deals.error.startDate": "Choisissez une date de début.",
  "deals.error.endDate": "Choisissez une date de fin.",
  "deals.error.dateOrder":
    "La date de fin doit être postérieure à la date de début.",
  "deals.error.adults": "Au moins un adulte est requis.",
  "deals.error.children":
    "Le nombre d’enfants ne peut pas être inférieur à zéro.",
  "deals.error.rooms": "Au moins une chambre est requise.",
  "deals.error.guests": "Au moins un voyageur est requis.",
  "deals.destinationIdeasTitle": "Idées de destinations pour commencer",
  "deals.destinationIdeasSubtitle":
    "Choisissez une idée de destination, puis comparez les résultats des fournisseurs en continuant.",
  "deals.destinationCardAriaPrefix": "Rechercher des idées de voyage pour",
  "deals.destination.tokyo.city": "Tokyo",
  "deals.destination.tokyo.country": "Japon",
  "deals.destination.london.city": "Londres",
  "deals.destination.london.country": "Royaume-Uni",
  "deals.destination.paris.city": "Paris",
  "deals.destination.paris.country": "France",
  "deals.destination.dubai.city": "Dubaï",
  "deals.destination.dubai.country": "Émirats arabes unis",
  "deals.destination.cancun.city": "Cancún",
  "deals.destination.cancun.country": "Mexique",
  "deals.destination.rome.city": "Rome",
  "deals.destination.rome.country": "Italie",

  footerContactUs: "Nous contacter",
  footerCustomerSupport: "Assistance client",
  footerServiceGuarantee: "Garantie de service",
  footerMoreServiceInfo: "Plus d’infos sur le service",
  footerDiscover: "Découvrir",
  footerSavedRecent: "Enregistrés et récents",
  footerTermsSettings: "Conditions et paramètres",
  footerPrivacyPolicy: "Politique de confidentialité",
  footerTermsOfService: "Conditions d’utilisation",
  footerCookiePolicy: "Politique relative aux cookies",
  footerAboutKurioticket: "À propos de Kurioticket",
  footerAboutUs: "À propos",
  footerHowItWorks: "Fonctionnement de Kurioticket",
  footerConfidenceTagline:
    "Recherchez des vols, hôtels et offres de voyage en toute confiance.",
  footerAllRightsReserved: "Tous droits réservés.",
  footerPrivacy: "Confidentialité",
  footerTerms: "Conditions",
  footerCookies: "Cookies",
};
