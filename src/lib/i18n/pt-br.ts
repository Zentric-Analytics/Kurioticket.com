import { translations as en } from "./en";
import type { TranslationDictionary } from "./types";

export const translations: TranslationDictionary = {
  ...en,
  websiteLanguageTitle: "Escolha o idioma do site",
  websiteLanguageDescription:
    "English (United States) é o idioma padrão do site. Kurioticket só muda o idioma depois que você escolhe uma opção disponível.",
  currentLanguage: "Idioma atual: {{language}}",
  languagePreparingNotice:
    "Mais idiomas estão sendo preparados. Opções indisponíveis ainda não traduzem o site.",
  languageSearchLabel: "Pesquisar idioma",
  languageSearchPlaceholder:
    "Pesquisar English, Español, Français, Deutsch, Português...",
  languageOptionsLabel: "Opções de idioma",
  selectLanguageOption: "Selecionar {{language}}",
  languagePreparingAria: "As traduções de {{language}} estão sendo preparadas",
  languageUnavailableMessage:
    "{{language}} ainda não está disponível. O suporte de tradução está sendo expandido.",
  globalLanguage: "Idioma global",
  closeLanguageSelector: "Fechar seletor de idioma",
  preparing: "Não disponível",
  flights: "Voos",
  hotels: "Hotéis",
  cars: "Carros",
  deals: "Ofertas",
  saved: "Salvos",
  countryAndCurrency: "País e moeda",
  openCountryCurrencySelector:
    "Abrir seletor de país e moeda, seleção atual {{code}}, {{currency}}",
  chooseCountryAndCurrency: "Escolha país e moeda",
  countryCurrencyDescription:
    "Selecione o país e a moeda usados para exibir preços. As sugestões de aeroportos usam sua localização detectada.",
  closeCountryCurrencySelector: "Fechar seletor de país e moeda",
  searchCountryOrCurrency: "Pesquisar país ou moeda",
  countryCurrencyAllCountriesAndCurrencies: "TODOS OS PAÍSES E MOEDAS",
  countryCurrencyPopularCountryAndCurrency: "PAÍS E MOEDA POPULARES",
  countryCurrencyOptionCountSingular: "{{count}} opção",
  countryCurrencyOptionCountPlural: "{{count}} opções",
  selectCountryCurrencyOption: "Selecionar {{country}}, {{code}}, {{currency}}",
  noCountriesOrCurrenciesFound: "Nenhum país ou moeda encontrado",
  showMoreResults: "Mostrar mais resultados",
  "countryCurrency.country.US": "Estados Unidos",
  "countryCurrency.country.GB": "Reino Unido",
  "countryCurrency.country.CA": "Canadá",
  "countryCurrency.country.AU": "Austrália",
  "countryCurrency.country.DE": "Alemanha",
  "countryCurrency.country.FR": "França",
  "countryCurrency.country.NL": "Países Baixos",
  "countryCurrency.country.ES": "Espanha",
  "countryCurrency.country.IT": "Itália",
  "countryCurrency.country.NG": "Nigéria",
  "countryCurrency.country.GH": "Gana",
  "countryCurrency.country.ZA": "África do Sul",
  "countryCurrency.country.AE": "Emirados Árabes Unidos",
  "countryCurrency.country.SA": "Arábia Saudita",
  "countryCurrency.country.QA": "Catar",
  "countryCurrency.country.TR": "Turquia",
  "countryCurrency.country.JP": "Japão",
  "countryCurrency.country.KR": "Coreia do Sul",
  "countryCurrency.country.CN": "China",
  "countryCurrency.country.IN": "Índia",
  "countryCurrency.country.BR": "Brasil",
  "countryCurrency.country.PT": "Portugal",
  "countryCurrency.country.MX": "México",
  "countryCurrency.country.SG": "Singapura",
  login: "Entrar",
  signUp: "Criar conta",
  signupPageTitle: "Crie sua conta",
  signupFullNameLabel: "Nome completo",
  signupEmailLabel: "E-mail",
  signupPasswordLabel: "Senha",
  signupAgreementBeforeTerms: "Ao criar uma conta, você concorda com os ",
  signupTermsLink: "Termos",
  signupAgreementBetweenLinks: ", a ",
  signupPrivacyPolicyLink: "Política de Privacidade",
  signupAgreementAfterPrivacy:
    " e as divulgações sobre redirecionamento para parceiros.",
  signupSubmit: "Criar conta",
  signupCreatingAccount: "Criando conta...",
  signupGoogle: "Continuar com o Google",
  signupAlreadyHaveAccount: "Já tem uma conta?",
  signupLoginLink: "Entrar",
  signupErrorFullNameRequired: "Informe seu nome completo.",
  signupErrorInvalidEmail: "Insira um endereço de e-mail válido.",
  signupErrorPasswordRequirements: "A senha deve ter pelo menos 8 caracteres.",
  signupErrorUnableCreate: "Não foi possível criar sua conta. Tente novamente.",
  signupErrorRateLimited:
    "Muitas tentativas de cadastro. Aguarde e tente novamente.",
  signupErrorDuplicateEmail: "Já existe uma conta com este e-mail.",
  signupErrorUnableSendVerification:
    "Não foi possível enviar o código de verificação agora. Tente novamente.",
  signupVerificationRequiredRedirecting:
    "Verificação necessária. Redirecionando...",
  signupAutomaticLoginFailed:
    "Sua conta foi criada, mas o login automático falhou. Entre com sua nova senha.",
  signupAccountCreatedRedirecting: "Conta criada. Redirecionando...",
  loginPageTitle: "Entrar",
  loginPageSubtitle:
    "Salve pesquisas, gerencie alertas e acesse seu painel de viagens.",
  loginEmailLabel: "E-mail",
  loginPasswordLabel: "Senha",
  loginForgotPassword: "Esqueceu a senha?",
  loginSubmit: "Entrar",
  loginCheckingDetails: "Verificando dados…",
  loginGoogle: "Continuar com o Google",
  loginSignupPrompt: "Novo no Kurioticket?",
  loginCreateAccount: "Criar uma conta",
  loginInvalidCredentials:
    "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.",
  loginRateLimited: "Muitas tentativas. Aguarde um momento e tente novamente.",
  loginCodeSent: "Enviamos um código de verificação para seu e-mail.",
  loginCodeFailed:
    "Esse código não funcionou. Verifique o código e tente novamente.",
  loginProcessing:
    "Verificando seus dados e enviando um código de verificação…",
  loginResendSuccess: "Enviamos um novo código se esta conta puder entrar.",
  loginEnterCode: "Digite o código de login de 6 dígitos.",
  loginVerifiedRedirecting: "Verificado. Redirecionando…",
  loginStartOverError:
    "Recomece para verificarmos seus dados antes de enviar um novo código.",
  loginSendingNewCode: "Enviando um novo código de verificação…",
  loginUnableSendNewCode:
    "Não foi possível enviar um novo código agora. Tente novamente.",
  loginUnableSendLoginCode:
    "Não foi possível enviar o código de login agora. Tente novamente.",
  loginCodeInstructions:
    "Digite o código de 6 dígitos enviado para {{email}}. Os códigos expiram após 10 minutos.",
  loginVerificationCodeLabel: "Código de verificação",
  loginVerifying: "Verificando…",
  loginVerifyLogin: "Verificar login",
  loginSendingCode: "Enviando código…",
  loginResendIn: "Reenviar em {{seconds}}s",
  loginResendCode: "Reenviar código",
  loginUseDifferentDetails: "Usar dados diferentes",
  loginPasswordResetSuccess:
    "Sua senha foi redefinida. Entre com sua nova senha.",
  loginInactiveMessage:
    "Você saiu após 30 minutos de inatividade. Entre novamente para continuar.",
  loginErrorAccountUnavailable:
    "Esta conta não está disponível. Entre em contato com o suporte.",
  loginErrorOAuthCallback:
    "O login com Google foi interrompido durante o retorno. Tente novamente.",
  loginErrorOAuthAccountNotLinked:
    "Este e-mail já está associado a outro método de login. Continue com o método original ou redefina sua senha.",
  loginErrorAccessDenied:
    "O acesso foi negado pelo Google. Permita o acesso e tente novamente.",
  loginErrorConfiguration:
    "O login com Google está temporariamente indisponível. Tente novamente em breve ou use o login por e-mail.",
  loginErrorCallback:
    "Falha no retorno do login com Google. Tente novamente ou use o login por e-mail.",
  loginErrorGoogleGeneric:
    "Não foi possível concluir o login com Google. Tente novamente ou use o login por e-mail.",
  forgotPasswordTitle: "Redefina sua senha",
  forgotPasswordSubtitle:
    "Insira seu e-mail e enviaremos instruções para redefinir sua senha.",
  forgotPasswordEmailLabel: "E-mail",
  forgotPasswordEmailPlaceholder: "voce@exemplo.com",
  forgotPasswordInvalidEmail: "Insira um endereço de e-mail válido.",
  forgotPasswordUnableRequest:
    "Não foi possível solicitar uma redefinição de senha agora.",
  forgotPasswordSuccess:
    "Se existir uma conta, enviamos instruções para redefinir a senha.",
  forgotPasswordSending: "Enviando...",
  forgotPasswordSubmit: "Enviar link de redefinição",
  forgotPasswordRemember: "Lembrou sua senha?",
  forgotPasswordLoginLink: "Entrar",
  resetPasswordTitle: "Redefinir sua senha",
  resetPasswordCreateTitle: "Criar uma nova senha",
  resetPasswordSubtitle: "Digite sua nova senha abaixo.",
  resetPasswordInvalidLink:
    "Este link de redefinição é inválido ou expirou. Solicite um novo e-mail de redefinição de senha.",
  resetPasswordRequestNew: "Solicitar um novo e-mail de redefinição",
  resetPasswordNewPasswordLabel: "Nova senha",
  resetPasswordConfirmPasswordLabel: "Confirmar nova senha",
  resetPasswordValidationError:
    "Insira uma senha válida e verifique se os dois campos de senha coincidem.",
  resetPasswordUnable: "Não foi possível redefinir a senha agora.",
  resetPasswordSuccessMessage:
    "Senha redefinida com sucesso. Redirecionando para entrar...",
  resetPasswordResetting: "Redefinindo...",
  resetPasswordSubmit: "Redefinir senha",
  resetPasswordRemember: "Lembrou sua senha?",
  resetPasswordLoginLink: "Entrar",
  verifyEmailTitle: "Verifique seu e-mail",
  verifyEmailInstructions:
    "Digite o código de 6 dígitos que enviamos para seu e-mail. Os códigos expiram após 10 minutos.",
  verifyEmailCodeLabel: "Código de verificação",
  verifyEmailInvalidCode: "O código de verificação é inválido ou expirou.",
  verifyEmailSuccess:
    "E-mail verificado. Agora você pode entrar e acessar seu painel.",
  verifyEmailVerifying: "Verificando...",
  verifyEmailSubmit: "Verificar e-mail",
  verifyEmailSending: "Enviando...",
  verifyEmailSendNewCode: "Enviar um novo código",
  verifyEmailResendSuccess:
    "Se este e-mail precisar de verificação, um novo código foi enviado.",
  verifyEmailAlreadyVerified: "Já verificado?",
  verifyEmailLoginLink: "Entrar",
  verifyLoginTitle: "Verifique seu login",
  verifyLoginInstructions:
    "Digite o código de 6 dígitos que enviamos para seu e-mail. Os códigos expiram após 10 minutos.",
  verifyLoginCodeLabel: "Código de login",
  verifyLoginSubmit: "Verificar login",
  verifyLoginNeedNewCode:
    "Precisa de um novo código? Digite sua senha para podermos reenviar um com segurança.",
  verifyLoginPasswordLabel: "Senha para reenvio",
  verifyLoginNeedStartOver: "Precisa recomeçar?",
  verifyLoginAgainLink: "Entrar novamente",
  destinations: "Destinos",
  explore: "Explorar",
  search: "Pesquisar",
  searchFlights: "Pesquisar voos",
  flightLandingHeroTitle: "Encontre seu próximo voo acessível com facilidade.",
  flightLandingHeroSubtitle:
    "Pesquise rotas, compare datas e explore opções de voos para sua próxima viagem.",
  flightLandingHeroImageAlt: "Asa de avião acima de nuvens claras",
  flightLandingFeatureSearchReadyTitle: "Rotas prontas para pesquisa",
  flightLandingFeatureSearchReadyBody:
    "Insira detalhes reais da viagem antes que os resultados sejam solicitados aos provedores de voos.",
  flightLandingFeatureCompareTitle: "Comparar no contexto",
  flightLandingFeatureCompareBody:
    "Use datas, número de viajantes, cabine, duração, escalas e detalhes da rota para avaliar as opções.",
  flightLandingFeatureProviderTitle: "Revisão do provedor",
  flightLandingFeatureProviderBody:
    "Sempre confirme a disponibilidade final, o preço e as regras com o provedor antes de reservar.",
  flightLandingStartThisSearch: "Iniciar esta pesquisa",
  flightLandingRouteIdeasTitle: "Ideias de rotas para viagens flexíveis",
  flightLandingRouteIdeasBody:
    "Explore ideias de rotas e depois inicie uma pesquisa real com datas e viajantes antes de comparar voos disponíveis.",
  flightLandingRouteConnector: "para",
  flightLandingRouteAriaLabel: "Pesquisar voos de {{origin}} para {{destination}}",
  "flightLandingCity.Abuja": "Abuja",
  "flightLandingCity.Accra": "Acra",
  "flightLandingCity.Addis Ababa": "Adis Abeba",
  "flightLandingCity.Cairo": "Cairo",
  "flightLandingCity.Cancun": "Cancún",
  "flightLandingCity.Cape Town": "Cidade do Cabo",
  "flightLandingCity.Doha": "Doha",
  "flightLandingCity.Dubai": "Dubai",
  "flightLandingCity.Edmonton": "Edmonton",
  "flightLandingCity.Honolulu": "Honolulu",
  "flightLandingCity.Istanbul": "Istambul",
  "flightLandingCity.Johannesburg": "Joanesburgo",
  "flightLandingCity.Kigali": "Kigali",
  "flightLandingCity.Lagos": "Lagos",
  "flightLandingCity.London": "Londres",
  "flightLandingCity.Nairobi": "Nairóbi",
  "flightLandingCity.Paris": "Paris",
  "flightLandingCity.Puerto Vallarta": "Puerto Vallarta",
  "flightLandingCity.Rome": "Roma",
  "flightLandingCity.San Diego": "San Diego",
  "flightLandingCity.Sydney": "Sydney",
  "flightLandingCity.Toronto": "Toronto",
  "flightLandingCity.Vancouver": "Vancouver",
  "flightLandingImageAlt.Puerto Vallarta coastline and old town":
    "Litoral e centro histórico de Puerto Vallarta",
  "flightLandingImageAlt.Honolulu Waikiki beach with Diamond Head and bright blue water":
    "Praia de Waikiki em Honolulu com Diamond Head e águas azul-vivas",
  "flightLandingImageAlt.San Diego bay skyline and marina":
    "Horizonte da baía de San Diego e marina",
  discoverDestinationsFromRegion: "Descubra destinos a partir da sua região",
  discoverDestinationsFromRegionBody:
    "Explore rotas selecionadas e comece sua próxima viagem com confiança.",
  cityOrAirport: "Cidade ou aeroporto",
  beachVacations: "Férias na praia",
  beachVacationsBody:
    "Explore rotas de voos para litorais ensolarados, ilhas e destinos de praia com clima quente.",
  flightBookingFaqs: "Perguntas frequentes sobre reserva de voos",
  flightBookingFaqIntro:
    "Revise detalhes comuns da pesquisa de voos antes de continuar com um provedor.",
  flightFaqBestTimeQuestion: "Qual é o melhor momento para reservar um voo?",
  flightFaqBestTimeAnswer:
    "Os preços dos voos podem mudar conforme a rota, a temporada, a demanda e a disponibilidade. Em geral, vale comparar várias datas, verificar aeroportos próximos quando possível e revisar o itinerário completo antes de escolher uma tarifa.",
  flightFaqBeforeBookingQuestion: "O que devo verificar antes de reservar?",
  flightFaqBeforeBookingAnswer:
    "Revise horários de partida e chegada, tempo total de viagem, escalas, regras de bagagem, opções de seleção de assentos, termos de cancelamento e política de alteração da passagem antes de concluir sua reserva com o provedor.",
  flightFaqFlexibleFareQuestion: "O que é uma tarifa flexível?",
  flightFaqFlexibleFareAnswer:
    "Uma tarifa flexível pode permitir alterações ou cancelamentos com menos restrições do que uma tarifa básica, mas as regras exatas dependem da companhia aérea ou do provedor da reserva. Sempre revise as condições da tarifa antes da compra.",
  flightFaqNonstopQuestion: "Voos diretos são sempre melhores?",
  flightFaqNonstopAnswer:
    "Nem sempre. Voos diretos podem economizar tempo, enquanto rotas com uma escala podem oferecer outros horários de partida, janelas de chegada ou opções de tarifa. Compare o tempo total de viagem, a duração da escala e a conveniência antes de decidir.",
  flightFaqBaggageQuestion: "Como funcionam as regras de bagagem?",
  flightFaqBaggageAnswer:
    "A franquia de bagagem pode variar por companhia aérea, rota, cabine, tipo de tarifa e provedor. Verifique se bagagem de mão, bagagem despachada e item pessoal estão incluídos antes de reservar.",
  flightFaqChangeCancelQuestion: "Posso alterar ou cancelar minha passagem?",
  flightFaqChangeCancelAnswer:
    "As opções de alteração e cancelamento dependem das regras da tarifa e das políticas do provedor. Algumas passagens podem ser não reembolsáveis ou incluir taxas, por isso revise os termos com atenção antes de reservar.",
  flightFaqInternationalQuestion: "O que devo saber sobre voos internacionais?",
  flightFaqInternationalAnswer:
    "Para viagens internacionais, revise validade do passaporte, exigências de visto, regras de trânsito, políticas de bagagem e requisitos de chegada do destino antes de reservar.",
  filters: "Filtros",
  filtersWithCount: "Filtros · {{count}}",
  sort: "Ordenar",
  openFilters: "Abrir filtros",
  openFiltersWithCount: "Abrir filtros, {{count}}",
  apply: "Aplicar",
  loading: "Carregando",
  edit: "Editar",
  tryAgain: "Tentar novamente",
  noResultsFound: "Nenhum resultado encontrado",
  price: "Preço",
  mixedProviderCurrencies: "Moedas de provedores misturadas",
  loadingPrices: "Carregando preços",
  filterBy: "Filtrar por",
  activeFilterCount: "{{count}} ativo(s)",
  takeoff: "Partida",
  landing: "Chegada",
  takeoffTimeFromOrigin: "Horário de partida na origem",
  landingTimeAtDestination: "Horário de chegada no destino",
  duration: "Duração",
  totalTripTime: "Tempo total da viagem",
  searchingAirlines: "Pesquisando companhias aéreas...",
  comparingPrices: "Comparando preços...",
  checkingValueFocusedRoutes: "Verificando rotas com melhor custo-benefício...",
  findingLowerPricedOptions: "Buscando opções com preços mais baixos...",
  analyzingLayoverQuality: "Analisando a qualidade das escalas...",
  comparingBaggageInclusiveFares: "Comparando tarifas com bagagem incluída...",
  optionFound: "{{count}} opção encontrada",
  optionsFound: "{{count}} opções encontradas",
  resultFound: "{{count}} resultado encontrado",
  resultsFound: "{{count}} resultados encontrados",
  oneStop: "1 escala",
  twoPlusStops: "2+ escalas",
  stopCount: "{{count}} escalas",
  stops: "Escalas",
  airlines: "Companhias aéreas",
  airports: "Aeroportos",
  times: "Horários",
  flightQuality: "Qualidade do voo",
  amenities: "Comodidades",
  baggageIncluded: "Bagagem incluída",
  flexibleRefundable: "Flexível/reembolsável",
  stopsAppearAfterResultsLoad: "As escalas aparecem depois que os resultados carregam.",
  airlinesAppearAfterResultsLoad: "As companhias aéreas aparecem depois que os resultados carregam.",
  airportsAppearAfterResultsLoad: "Os aeroportos aparecem depois que os resultados carregam.",
  wifi: "Wi-Fi",
  powerOutlets: "Tomadas",
  entertainment: "Entretenimento",
  betterComfort: "Mais conforto",
  cheapest: "Mais barato",
  best: "Melhor",
  quickest: "Mais rápido",
  departs: "Parte às",
  updatingResults: "Atualizando resultados...",
  noFlightsMatchFilters:
    "Nenhum voo corresponde a estes filtros. Amplie seus filtros para ver mais opções ao vivo.",
  unableToSearchFlights: "Não foi possível pesquisar voos.",
  limitedProviderChecks:
    "Algumas verificações de provedores podem estar limitadas para esta pesquisa. Revise a disponibilidade final e os detalhes da tarifa com o provedor antes de reservar.",
  closeFilters: "Fechar filtros",
  travelersAndCabin: "Viajantes e cabine",
  travelersAndCabinClass: "Viajantes e classe de cabine",
  infantsOnLap: "Bebês no colo",
  premiumEconomy: "Econômica premium",
  baggage: "Bagagem",
  cabin: "Cabine",
  seatSelection: "Seleção de assento",
  fareRules: "Regras da tarifa",
  providerRulesApply: "Regras do provedor se aplicam",
  reviewBeforeBooking: "Revise antes de reservar",
  outbound: "Ida",
  return: "Volta",
  nonstop: "Direto",
  flightOption: "Opção de voo",
  estimatedPrice: "Preço estimado",
  providerPrice: "Preço do provedor",
  displayEstimateConvertedFromProviderPrice:
    "{{formatted}}. Estimativa exibida convertida de {{providerPrice}}. O preço final do provedor pode ser diferente.",
  convertedDisplayEstimateProviderPrice:
    "Estimativa exibida convertida. Preço do provedor: {{providerPrice}}. O preço final do provedor pode ser diferente.",
  viewFlight: "Ver voo",
  flightCardProviderHandoff:
    "Preço final, disponibilidade, reserva e regras da tarifa são confirmados pelo provedor.",
  flightCardProviderHandoffConverted:
    "Preço final, disponibilidade, reserva e regras da tarifa são confirmados pelo provedor. A moeda final do provedor pode ser diferente da moeda de exibição selecionada.",
  flightDetailsLoading: "Carregando detalhes do voo...",
  flightQuoteUnavailable: "Cotação do voo indisponível",
  flightSearchAgainCurrentPrices:
    "Esta cotação de voo não está mais disponível. Pesquise novamente para ver os preços atuais.",
  flightDetailsProviderDisclaimer:
    "O preço final, a disponibilidade, a reserva e as regras da tarifa são confirmados pelo provedor.",
  selectedFlights: "Voos selecionados",
  selectedFlightItinerary: "Itinerário do voo selecionado",
  flightRouteConnector: "para",
  flightNumberLabel: "Voo",
  layoverIn: "Conexão em",
  shortConnection: "conexão curta",
  connection: "conexão",
  longConnection: "conexão longa",
  overnightConnection: "conexão durante a noite",
  selectedFlightCabinBusiness: "Executiva",
  carryOnSingularIncluded: "bagagem de mão incluída",
  carryOnPluralIncluded: "bagagens de mão incluídas",
  checkedBagSingularIncluded: "bagagem despachada incluída",
  checkedBagPluralIncluded: "bagagens despachadas incluídas",
  providedBy: "Fornecido por",
  estimateShownProviderPrice: "Estimativa exibida. Preço do provedor:",
  continueToProvider: "Continuar para o provedor",
  compareMoreProviders: "Comparar mais provedores",
  providerComparisonIntro:
    "O Kurioticket pode comparar opções de diferentes provedores.",
  noAdditionalLiveProviderOptions:
    "Nenhuma opção adicional ao vivo de provedores está disponível para este voo no momento.",
  confirmedByProvider: "Confirmado pelo provedor",
  itinerary: "Itinerário",
  leg: "Trecho",
  stopSingular: "escala",
  stopPlural: "escalas",
  providerNormalizedItineraryPrefix:
    "Os detalhes de ida e volta são exibidos a partir dos dados de itinerário normalizados pelo provedor.",
  checkProvider: "Verificar com o provedor",
  carryOnIncluded: "bagagem de mão incluída",
  flightLeg: "Trecho do voo",
  layover: "Escala",
  moreCount: "mais {{count}}",
  searchHotels: "Pesquisar hotéis",
  chooseHotelDestination: "Escolha o destino do hotel",
  hotelSearchTravelDatesLabel: "DATAS DA VIAGEM",
  hotelSearchDatePlaceholder: "Entrada — Saída",
  hotelSearchGuestsLabel: "HÓSPEDES",
  guestSingular: "hóspede",
  guestPlural: "hóspedes",
  roomSingular: "quarto",
  roomPlural: "quartos",
  searchCars: "Pesquisar carros",
  clear: "Limpar",
  done: "Concluído",
  origin: "Origem",
  destination: "Destino",
  from: "De",
  to: "Para",
  departureDate: "Datas da viagem",
  travelDates: "Datas da viagem",
  chooseTravelDates: "Escolha as datas da viagem",
  clearTravelDates: "Limpar datas da viagem",
  previousMonth: "Mês anterior",
  nextMonth: "Próximo mês",
  previousMonthShort: "Anterior",
  nextMonthShort: "Próximo",
  previousShort: "Anterior",
  nextShort: "Próximo",
  weekdayMon: "seg.",
  weekdayTue: "ter.",
  weekdayWed: "qua.",
  weekdayThu: "qui.",
  weekdayFri: "sex.",
  weekdaySat: "sáb.",
  weekdaySun: "dom.",
  selectDepartureDate: "Selecionar data de partida",
  selectReturnDate: "Selecionar data de volta",
  selectDeparture: "Selecionar partida",
  selectReturn: "Selecionar volta",
  closeDatePicker: "Fechar seletor de datas",
  fromPlaceholder: "De onde?",
  toPlaceholder: "Para onde?",
  travelers: "Viajantes",
  guests: "Hóspedes",
  rooms: "Quartos",
  chooseGuestsAndRooms: "Escolha hóspedes e quartos",
  guestsAndRooms: "Hóspedes e quartos",
  adults: "Adultos",
  children: "Crianças",
  petFriendly: "Aceita animais de estimação",
  onlyShowPetFriendlyStays:
    "Mostrar apenas estadias que aceitam animais de estimação",
  togglePetFriendlyStays:
    "Alternar estadias que aceitam animais de estimação",
  hotelStayDetails: "DETALHES DA ESTADIA",
  hotelAdultHelper: "Hóspedes 18+",
  hotelChildrenHelper: "De 0 a 17 anos",
  hotelRoomsHelper: "Até 6 quartos",
  passengers: "Passageiros",
  tripType: "Tipo de viagem",
  roundTrip: "Ida e volta",
  oneWay: "Só ida",
  economy: "Econômica",
  business: "Executiva",
  first: "Primeira",
  adultSingular: "Adulto",
  adultPlural: "Adultos",
  childSingular: "Criança",
  childPlural: "Crianças",
  infantSingular: "Bebê",
  infantPlural: "Bebês",
  childAgeRange: "De 2 a 17 anos",
  under2: "Menores de 2 anos",
  travelerSingular: "viajante",
  travelerPlural: "viajantes",
  cabinClass: "Classe de cabine",
  homeHeroTitle: "Encontre voos baratos para qualquer lugar",
  homeHeroSubtitle:
    "Pesquise e compare voos de vários fornecedores de viagem antes de reservar com parceiros confiáveis.",
  homeAssuranceBestPrice: "Melhores preços garantidos",
  homeAssuranceCompare: "Comparação fácil de fornecedores",
  homeAssuranceSecure: "Pagamentos seguros",
  homeAssuranceSupport: "Suporte ao cliente 24/7",
  homeHeroBadge: "Plataforma confiável de busca de viagens",
  homeFeaturesMillionsTitle: "Milhões de opções",
  homeFeaturesMillionsBody:
    "Compare voos e hotéis de uma ampla rede de fornecedores confiáveis em um só lugar.",
  homeFeaturesFlexibleTitle: "Busca flexível",
  homeFeaturesFlexibleBody:
    "Filtre por escalas, orçamento, classe e horários de acordo com sua forma de viajar.",
  homeFeaturesSecureTitle: "Experiência segura",
  homeFeaturesSecureBody:
    "Seu planejamento fica protegido com parceiros confiáveis e redirecionamento seguro de reserva.",
  homeFeaturesDealsTitle: "Ofertas em tempo real",
  homeFeaturesDealsBody:
    "Aproveite quedas de tarifa e promoções exclusivas antes que desapareçam.",
  homePopularDestinations: "Destinos populares",
  "homePopularDestinationCity.accra": "Acra",
  "homePopularDestinationCity.addisAbaba": "Adis Abeba",
  "homePopularDestinationCity.amsterdam": "Amsterdã",
  "homePopularDestinationCity.atlanta": "Atlanta",
  "homePopularDestinationCity.bali": "Bali",
  "homePopularDestinationCity.bangkok": "Bangkok",
  "homePopularDestinationCity.barcelona": "Barcelona",
  "homePopularDestinationCity.bogota": "Bogotá",
  "homePopularDestinationCity.boston": "Boston",
  "homePopularDestinationCity.buenosAires": "Buenos Aires",
  "homePopularDestinationCity.cairo": "Cairo",
  "homePopularDestinationCity.calgary": "Calgary",
  "homePopularDestinationCity.cancun": "Cancún",
  "homePopularDestinationCity.capeTown": "Cidade do Cabo",
  "homePopularDestinationCity.chicago": "Chicago",
  "homePopularDestinationCity.dallas": "Dallas",
  "homePopularDestinationCity.darEsSalaam": "Dar es Salaam",
  "homePopularDestinationCity.denver": "Denver",
  "homePopularDestinationCity.doha": "Doha",
  "homePopularDestinationCity.dubai": "Dubai",
  "homePopularDestinationCity.halifax": "Halifax",
  "homePopularDestinationCity.hanoi": "Hanói",
  "homePopularDestinationCity.hongKong": "Hong Kong",
  "homePopularDestinationCity.istanbul": "Istambul",
  "homePopularDestinationCity.jeddah": "Jidá",
  "homePopularDestinationCity.johannesburg": "Joanesburgo",
  "homePopularDestinationCity.kualaLumpur": "Kuala Lumpur",
  "homePopularDestinationCity.lasVegas": "Las Vegas",
  "homePopularDestinationCity.lima": "Lima",
  "homePopularDestinationCity.lisbon": "Lisboa",
  "homePopularDestinationCity.london": "Londres",
  "homePopularDestinationCity.losAngeles": "Los Angeles",
  "homePopularDestinationCity.madrid": "Madri",
  "homePopularDestinationCity.manila": "Manila",
  "homePopularDestinationCity.mauritius": "Maurício",
  "homePopularDestinationCity.miami": "Miami",
  "homePopularDestinationCity.montreal": "Montreal",
  "homePopularDestinationCity.nairobi": "Nairóbi",
  "homePopularDestinationCity.newYork": "Nova York",
  "homePopularDestinationCity.orlando": "Orlando",
  "homePopularDestinationCity.paris": "Paris",
  "homePopularDestinationCity.phoenix": "Phoenix",
  "homePopularDestinationCity.rioDeJaneiro": "Rio de Janeiro",
  "homePopularDestinationCity.riyadh": "Riad",
  "homePopularDestinationCity.rome": "Roma",
  "homePopularDestinationCity.sanFrancisco": "São Francisco",
  "homePopularDestinationCity.sanJose": "San José",
  "homePopularDestinationCity.santiago": "Santiago",
  "homePopularDestinationCity.seattle": "Seattle",
  "homePopularDestinationCity.seoul": "Seul",
  "homePopularDestinationCity.singapore": "Singapura",
  "homePopularDestinationCity.taipei": "Taipei",
  "homePopularDestinationCity.toronto": "Toronto",
  "homePopularDestinationCity.vancouver": "Vancouver",
  "homePopularDestinationCity.vienna": "Viena",
  "homePopularDestinationCity.washington": "Washington",
  "homePopularDestinationCity.zanzibar": "Zanzibar",
  "homePopularDestinationCity.zurich": "Zurique",
  "homePopularDestinationCountry.argentina": "Argentina",
  "homePopularDestinationCountry.austria": "Áustria",
  "homePopularDestinationCountry.brazil": "Brasil",
  "homePopularDestinationCountry.canada": "Canadá",
  "homePopularDestinationCountry.chile": "Chile",
  "homePopularDestinationCountry.colombia": "Colômbia",
  "homePopularDestinationCountry.costaRica": "Costa Rica",
  "homePopularDestinationCountry.egypt": "Egito",
  "homePopularDestinationCountry.ethiopia": "Etiópia",
  "homePopularDestinationCountry.france": "França",
  "homePopularDestinationCountry.ghana": "Gana",
  "homePopularDestinationCountry.hongKong": "Hong Kong",
  "homePopularDestinationCountry.indonesia": "Indonésia",
  "homePopularDestinationCountry.italy": "Itália",
  "homePopularDestinationCountry.kenya": "Quênia",
  "homePopularDestinationCountry.malaysia": "Malásia",
  "homePopularDestinationCountry.mauritius": "Maurício",
  "homePopularDestinationCountry.mexico": "México",
  "homePopularDestinationCountry.netherlands": "Países Baixos",
  "homePopularDestinationCountry.peru": "Peru",
  "homePopularDestinationCountry.philippines": "Filipinas",
  "homePopularDestinationCountry.portugal": "Portugal",
  "homePopularDestinationCountry.qatar": "Catar",
  "homePopularDestinationCountry.saudiArabia": "Arábia Saudita",
  "homePopularDestinationCountry.singapore": "Singapura",
  "homePopularDestinationCountry.southAfrica": "África do Sul",
  "homePopularDestinationCountry.southKorea": "Coreia do Sul",
  "homePopularDestinationCountry.spain": "Espanha",
  "homePopularDestinationCountry.switzerland": "Suíça",
  "homePopularDestinationCountry.taiwan": "Taiwan",
  "homePopularDestinationCountry.tanzania": "Tanzânia",
  "homePopularDestinationCountry.thailand": "Tailândia",
  "homePopularDestinationCountry.turkiye": "Turquia",
  "homePopularDestinationCountry.unitedArabEmirates": "Emirados Árabes Unidos",
  "homePopularDestinationCountry.unitedKingdom": "Reino Unido",
  "homePopularDestinationCountry.unitedStates": "Estados Unidos",
  "homePopularDestinationCountry.vietnam": "Vietnã",
  homePreviousDestinations: "Destinos anteriores",
  homeNextDestinations: "Próximos destinos",
  homeViewAllDestinations: "Ver todos os destinos",
  homeDiscoveryTitle: "Descubra sua próxima aventura aqui",
  homeDiscoverySubtitle:
    "Compare passagens de curta distância, tarifas flexíveis e escapadas urbanas com disponibilidade real dos fornecedores.",
  homeDiscoverySwipeMore: "Deslize para ver mais",
  homeDiscoveryRouteIdeaBadge: "Ideia de rota",
  homeDiscoveryTripOneWay: "Só ida",
  homeDiscoveryCabinEconomy: "Econômica",
  homeDiscoveryTravelerCountOne: "1 viajante",
  homeCompareOptions: "Comparar opções",
  homeExploreFares: "Explorar tarifas",
  homeTrustTitle: "Por que os viajantes comparam no Kurioticket",
  homeTrustSubtitle:
    "O Kurioticket ajuda você a comparar ofertas de provedores de forma justa e concluir a reserva no site do provedor.",
  homeTrustCompareTitle: "Comparar ofertas de provedores",
  homeTrustCompareBody:
    "Veja opções de voos e hotéis de vários provedores de viagem em um só lugar.",
  homeTrustPricingTitle: "Contexto de preços transparente",
  homeTrustPricingBody:
    "Revise preços, detalhes da rota ou da estadia e termos importantes antes de continuar.",
  homeTrustHandoffTitle: "Redirecionamento seguro para o provedor",
  homeTrustHandoffBody:
    "Ao escolher uma oferta, você continua para o provedor para concluir a reserva com segurança.",
  hotelSearchIntroLabel: "Compare opções de hotel",
  hotelSearchDestinationLabel: "DESTINO",
  hotelSearchDestinationPlaceholder: "Cidade, área ou ponto turístico",
  exploreHotelStaysByDestination: "Explore estadias em hotéis por destino",
  featuredHotelDestinations: "Destinos de hotel em destaque",
  findStaysEveryKindTrip: "Encontre estadias para cada tipo de viagem",
  hotelInspirationBody:
    "Explore ideias de destinos pelo tipo de estadia que você tem em mente.",
  hotelInspirationCategories: "Categorias de inspiração de hotéis",
  exploreStaysWorldwide: "Explore estadias ao redor do mundo",
  "hotelDestination.Tokyo.title": "Japão",
  "hotelDestination.Tokyo.subtitle": "Estadias em Tóquio",
  "hotelDestination.Tokyo.linkLabel": "Pesquisar hotéis em Tóquio, Japão",
  "hotelDestination.Tokyo.detail": "Japão",
  "hotelDestination.London.title": "Reino Unido",
  "hotelDestination.London.subtitle": "Estadias em Londres",
  "hotelDestination.London.linkLabel": "Pesquisar hotéis em Londres, Reino Unido",
  "hotelDestination.London.detail": "Reino Unido",
  "hotelDestination.Paris.title": "França",
  "hotelDestination.Paris.subtitle": "Estadias em Paris",
  "hotelDestination.Paris.linkLabel": "Pesquisar hotéis em Paris, França",
  "hotelDestination.Paris.detail": "França",
  "hotelDestination.New York.title": "Estados Unidos",
  "hotelDestination.New York.subtitle": "Estadias em Nova York",
  "hotelDestination.New York.linkLabel": "Pesquisar hotéis em Nova York, Estados Unidos",
  "hotelDestination.New York.detail": "Estados Unidos",
  "hotelDestination.Rome.title": "Itália",
  "hotelDestination.Rome.subtitle": "Estadias em Roma",
  "hotelDestination.Rome.linkLabel": "Pesquisar hotéis em Roma, Itália",
  "hotelDestination.Rome.detail": "Itália",
  "hotelDestination.Dubai.title": "Emirados Árabes Unidos",
  "hotelDestination.Dubai.subtitle": "Estadias em Dubai",
  "hotelDestination.Dubai.linkLabel": "Pesquisar hotéis em Dubai, Emirados Árabes Unidos",
  "hotelDestination.Dubai.detail": "Emirados Árabes Unidos",
  "hotelDestination.Singapore.title": "Singapura",
  "hotelDestination.Singapore.subtitle": "Estadias em Singapura",
  "hotelDestination.Singapore.linkLabel": "Pesquisar hotéis em Singapura",
  "hotelDestination.Singapore.detail": "Singapura",
  "hotelDestination.Barcelona.title": "Espanha",
  "hotelDestination.Barcelona.subtitle": "Estadias em Barcelona",
  "hotelDestination.Barcelona.linkLabel": "Pesquisar hotéis em Barcelona, Espanha",
  "hotelDestination.Barcelona.detail": "Espanha",
  "hotelDestination.Toronto.title": "Canadá",
  "hotelDestination.Toronto.subtitle": "Estadias em Toronto",
  "hotelDestination.Toronto.linkLabel": "Pesquisar hotéis em Toronto, Canadá",
  "hotelDestination.Toronto.detail": "Canadá",
  "hotelDestination.Amsterdam.title": "Países Baixos",
  "hotelDestination.Amsterdam.subtitle": "Estadias em Amsterdã",
  "hotelDestination.Amsterdam.linkLabel": "Pesquisar hotéis em Amsterdã, Países Baixos",
  "hotelDestination.Amsterdam.detail": "Países Baixos",
  "hotelDestination.Bangkok.title": "Tailândia",
  "hotelDestination.Bangkok.subtitle": "Estadias em Bangkok",
  "hotelDestination.Bangkok.linkLabel": "Pesquisar hotéis em Bangkok, Tailândia",
  "hotelDestination.Bangkok.detail": "Tailândia",
  "hotelDestination.Cancun.title": "México",
  "hotelDestination.Cancun.subtitle": "Estadias em Cancún",
  "hotelDestination.Cancun.linkLabel": "Pesquisar hotéis em Cancún, México",
  "hotelDestination.Cancun.detail": "México",
  "hotelDestination.Istanbul.title": "Turquia",
  "hotelDestination.Istanbul.subtitle": "Estadias em Istambul",
  "hotelDestination.Istanbul.linkLabel": "Pesquisar hotéis em Istambul, Turquia",
  "hotelDestination.Istanbul.detail": "Turquia",
  "hotelInspirationCategory.Beach": "Praia",
  "hotelInspirationCategory.City breaks": "Escapadas urbanas",
  "hotelInspirationCategory.Family trips": "Viagens em família",
  "hotelInspirationCategory.Relaxed stays": "Estadias relaxantes",
  "hotelInspirationCategory.Weekend ideas": "Ideias para o fim de semana",
  "hotelInspirationBadge.Coastal stays": "Estadias no litoral",
  "hotelInspirationBadge.City coast": "Litoral urbano",
  "hotelInspirationBadge.Waterfront stays": "Estadias à beira d’água",
  "hotelInspirationBadge.Harbor city": "Cidade portuária",
  "hotelInspirationBadge.Warm escape": "Refúgio quente",
  "hotelInspirationBadge.Bay city": "Cidade na baía",
  "deals.heroTitle": "Encontre ofertas de viagem para sua próxima viagem",
  "deals.heroSubtitle": "Pesquise voos, estadias e carros juntos em um só lugar.",
  "deals.packageLegend": "Escolha o tipo de pacote",
  "deals.package.hotelFlight": "Hotel + Voo",
  "deals.package.hotelFlightCar": "Hotel + Voo + Carro",
  "deals.package.flightCar": "Voo + Carro",
  "deals.package.hotelCar": "Hotel + Carro",
  "deals.originLabel": "DE ONDE?",
  "deals.destinationLabel": "PARA ONDE?",
  "deals.datesLabel": "DATAS DA VIAGEM",
  "deals.travelersRoomsLabel": "VIAJANTES / QUARTOS",
  "deals.travelersCarsLabel": "VIAJANTES / CARROS",
  "deals.travelersCabinLabel": "VIAJANTES / CABINE",
  "deals.travelersDetailsLabel": "VIAJANTES / DETALHES",
  "deals.travelersRoomsCarLabel": "VIAJANTES / QUARTOS / CARRO",
  "deals.originPlaceholder": "Cidade ou aeroporto",
  "deals.destinationPlaceholder": "Cidade, aeroporto ou região",
  "deals.dateFlightPlaceholder": "Ida — Volta",
  "deals.dateHotelPlaceholder": "Check-in — Check-out",
  "deals.dateDialog": "Escolha as datas da viagem",
  "deals.departDate": "Ida",
  "deals.returnDate": "Volta",
  "deals.travelerSingular": "viajante",
  "deals.travelerPlural": "viajantes",
  "deals.roomSingular": "quarto",
  "deals.roomPlural": "quartos",
  "deals.driverAge": "Idade do motorista",
  "deals.cabinClass": "Classe da cabine",
  "deals.cabin.economy": "Econômica",
  "deals.cabin.business": "Executiva",
  "deals.cabin.first": "Primeira classe",
  "deals.clearOrigin": "Limpar origem",
  "deals.clearDestination": "Limpar destino",
  "deals.previous": "Anterior",
  "deals.next": "Próximo",
  "deals.weekday.sun": "Dom",
  "deals.weekday.mon": "Seg",
  "deals.weekday.tue": "Ter",
  "deals.weekday.wed": "Qua",
  "deals.weekday.thu": "Qui",
  "deals.weekday.fri": "Sex",
  "deals.weekday.sat": "Sáb",
  "deals.selectDateAriaPrefix": "Selecionar",
  "deals.error.origin": "Informe uma cidade ou aeroporto de partida.",
  "deals.error.destination": "Informe um destino.",
  "deals.error.startDate": "Escolha uma data de início.",
  "deals.error.endDate": "Escolha uma data de término.",
  "deals.error.dateOrder": "A data de término deve ser posterior à data de início.",
  "deals.error.adults": "É necessário pelo menos um adulto.",
  "deals.error.children": "Crianças não podem ficar abaixo de zero.",
  "deals.error.rooms": "É necessário pelo menos um quarto.",
  "deals.error.guests": "É necessário pelo menos um hóspede.",
  "deals.destinationIdeasTitle": "Lugares para começar sua busca por ofertas",
  "deals.destinationIdeasSubtitle":
    "Escolha uma ideia de destino e compare os resultados dos provedores ao continuar.",
  "deals.destinationCardAriaPrefix": "Pesquisar ideias de viagem para",
  "deals.destination.tokyo.city": "Tóquio",
  "deals.destination.tokyo.country": "Japão",
  "deals.destination.london.city": "Londres",
  "deals.destination.london.country": "Reino Unido",
  "deals.destination.paris.city": "Paris",
  "deals.destination.paris.country": "França",
  "deals.destination.dubai.city": "Dubai",
  "deals.destination.dubai.country": "Emirados Árabes Unidos",
  "deals.destination.cancun.city": "Cancún",
  "deals.destination.cancun.country": "México",
  "deals.destination.rome.city": "Roma",
  "deals.destination.rome.country": "Itália",
  hotelTrustCompareBody:
    "Veja opções de hotéis de provedores de viagem em um só lugar antes de continuar.",
  hotelTrustReviewTitle: "Revisar detalhes da estadia",
  hotelTrustReviewBody:
    "Verifique datas, hóspedes, quartos, contexto de preços e informações da estadia antes de escolher.",
  hotelTrustProviderTitle: "Continuar com o provedor",
  hotelTrustProviderBody:
    "Ao escolher uma opção, continue com o provedor para confirmar o preço final, a disponibilidade, as taxas e as regras de cancelamento.",
  homePromoFlightsTitle: "Ofertas de voos de companhias aéreas",
  homePromoFlightsBody:
    "Pesquise tarifas por tempo limitado e compare itinerários de fornecedores.",
  homePromoFlightsCta: "Explorar ofertas de voos",
  homePromoHotelsTitle: "Economias em hotéis no mundo todo",
  homePromoHotelsBody:
    "Explore ofertas de hotéis no mundo todo antes de concluir sua estadia com um fornecedor.",
  homePromoHotelsCta: "Explorar ofertas de hotéis",
  homeNewsletterTitle: "Receba as próximas ofertas de viagem",
  homeNewsletterBody:
    "Receba atualizações selecionadas de voos e hotéis toda semana.",
  homeNewsletterPlaceholder: "Insira seu e-mail",
  homeSubscribe: "Inscrever-se",
  homeSubscribing: "Inscrevendo…",
  homeNewsletterThanks:
    "Obrigado! Manteremos você informado sobre ofertas de viagem.",
  homeNewsletterInvalidEmail: "Insira um endereço de e-mail válido.",
  homeNewsletterUnableSubscribe: "Não foi possível inscrever agora.",
  homeNewsletterTryAgain:
    "Não conseguimos inscrever você agora. Tente novamente em breve.",
  homeNewsletterConsent:
    "Ao se inscrever, você concorda em receber atualizações do Kurioticket. Você pode cancelar a inscrição a qualquer momento.",
  homeHeroImageAlt: "Viajante com bagagem em uma cidade moderna",
  homeEmailAddress: "Endereço de e-mail",
  homeSaveDestination: "Salvar {{city}}",
  homeRemoveFromSavedRoutes: "Remover das rotas salvas",
  homeSaveRoute: "Salvar rota",
  homeCheckingProviderRoutePricing:
    "Verificando preços de rota com fornecedores",
  homePricesUpdateWithProviderResults:
    "Os preços são atualizados com resultados dos fornecedores",
  fromPrice: "A partir de",
  faqHeading: "Perguntas frequentes",
  faqIntro:
    "Saiba como o Kurioticket ajuda você a comparar voos, hotéis e opções de viagem antes de reservar com fornecedores confiáveis.",
  faqViewAll: "Ver todas as perguntas frequentes",
  faqHelpCenter: "Central de ajuda",
  faqGeneralQuestions: "Perguntas gerais",
  faqQuestionFindOptions:
    "Como o Kurioticket encontra opções de voos e hotéis?",
  faqAnswerFindOptions:
    "O Kurioticket pesquisa ofertas ao vivo de fornecedores de viagem e reúne opções em um só lugar para você comparar preços, rotas, estadias e detalhes antes de escolher.",
  faqQuestionSellDirectly:
    "O Kurioticket vende passagens ou quartos de hotel diretamente?",
  faqAnswerSellDirectly:
    "O Kurioticket ajuda você a comparar opções de viagem. Ao escolher uma oferta, você é enviado ao fornecedor selecionado para revisar os detalhes e concluir a reserva no site dele.",
  faqQuestionPriceChanges:
    "Por que os preços podem mudar depois que clico em uma oferta?",
  faqAnswerPriceChanges:
    "Preços e disponibilidade podem mudar em tempo real porque companhias aéreas, hotéis e fornecedores de viagem atualizam o inventário com frequência. Sempre revise o preço final na página de checkout do fornecedor antes de reservar.",
  faqQuestionCompareProviders:
    "Posso comparar vários fornecedores para a mesma viagem?",
  faqAnswerCompareProviders:
    "Sim. O Kurioticket foi criado para ajudar você a comparar opções lado a lado e avaliar preço, horário, detalhes da rota, detalhes do hotel e valor geral.",
  faqQuestionSecureBooking: "Como concluo minha reserva com segurança?",
  faqAnswerSecureBooking:
    "A reserva e o pagamento são concluídos no fluxo de checkout do fornecedor. Sempre revise os termos, a política de cancelamento e o preço final do fornecedor antes de confirmar.",
  faqQuestionPreferences: "Posso definir preferências de moeda e idioma?",
  faqAnswerPreferences:
    "Sim. O Kurioticket permite definir preferências de país/moeda de exibição, e você pode escolher qualquer idioma disponível no seletor de idioma.",
  faqQuestionLiveCached:
    "Os resultados de pesquisa são ao vivo ou armazenados em cache?",
  faqAnswerLiveCached:
    "O Kurioticket usa resultados de pesquisa de fornecedores que podem ser atualizados conforme disponibilidade e preços mudam. Isso ajuda a mostrar opções atuais, mas a disponibilidade final é confirmada pelo fornecedor.",
  faqQuestionManageChanges: "Onde gerencio alterações ou cancelamentos?",
  faqAnswerManageChanges:
    "Alterações de viagem, cancelamentos, reembolsos e suporte de reserva geralmente são tratados pelo fornecedor onde a reserva foi concluída. Use os detalhes de confirmação desse fornecedor para solicitações de atendimento.",
  footerContactUs: "Contato",
  footerCustomerSupport: "Suporte ao cliente",
  footerServiceGuarantee: "Garantia de serviço",
  footerMoreServiceInfo: "Mais informações sobre o serviço",
  footerDiscover: "Descobrir",
  footerSavedRecent: "Salvos e recentes",
  footerTermsSettings: "Termos e configurações",
  footerPrivacyPolicy: "Política de privacidade",
  footerTermsOfService: "Termos de serviço",
  footerCookiePolicy: "Política de cookies",
  legalCenter: "Centro jurídico",
  footerAboutKurioticket: "Sobre o Kurioticket",
  footerAboutUs: "Sobre nós",
  footerHowItWorks: "Como o Kurioticket funciona",
  footerConfidenceTagline:
    "Pesquise voos, hotéis e ofertas de viagem com confiança.",
  footerAllRightsReserved: "Todos os direitos reservados.",
  footerPrivacy: "Privacidade",
  footerTerms: "Termos",
  footerCookies: "Cookies",
  homeDestinationDubaiCity: "Dubai",
  homeDestinationDubaiCountry: "Emirados Árabes Unidos",
  homeDestinationDubaiAlt: "Dubai, Emirados Árabes Unidos",
  homeDestinationLondonCity: "Londres",
  homeDestinationLondonCountry: "Reino Unido",
  homeDestinationLondonAlt: "Londres, Reino Unido",
  homeDestinationParisCity: "Paris",
  homeDestinationParisCountry: "França",
  homeDestinationParisAlt: "Paris, França",
  homeDestinationBaliCity: "Bali",
  homeDestinationBaliCountry: "Indonésia",
  homeDestinationBaliAlt: "Bali, Indonésia",
  homeDestinationNewYorkCity: "Nova York",
  homeDestinationNewYorkCountry: "Estados Unidos",
  homeDestinationNewYorkAlt: "Nova York, Estados Unidos",
  "homeDiscoveryRoute.fallback-nyc-lis.title": "Nova York para Lisboa",
  "homeDiscoveryRoute.fallback-nyc-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-lhr-ist.title": "Londres para Istambul",
  "homeDiscoveryRoute.fallback-lhr-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-dxb-sin.title": "Dubai para Singapura",
  "homeDiscoveryRoute.fallback-dxb-sin.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-cdg-ath.title": "Paris para Atenas",
  "homeDiscoveryRoute.fallback-cdg-ath.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-yyz-cun.title": "Toronto para Cancún",
  "homeDiscoveryRoute.fallback-yyz-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-lax-tyo.title": "LAX para TYO",
  "homeDiscoveryRoute.fallback-lax-tyo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-syd-dps.title": "SYD para DPS",
  "homeDiscoveryRoute.fallback-syd-dps.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-fra-cpt.title": "FRA para CPT",
  "homeDiscoveryRoute.fallback-fra-cpt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-cai-dxb.title": "CAI para DXB",
  "homeDiscoveryRoute.fallback-cai-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-mad-mrk.title": "MAD para MRK",
  "homeDiscoveryRoute.fallback-mad-mrk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-gru-lim.title": "GRU para LIM",
  "homeDiscoveryRoute.fallback-gru-lim.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-del-bkk.title": "DEL para BKK",
  "homeDiscoveryRoute.fallback-del-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-bom-kul.title": "BOM para KUL",
  "homeDiscoveryRoute.fallback-bom-kul.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-mex-sjo.title": "MEX para SJO",
  "homeDiscoveryRoute.fallback-mex-sjo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-icn-hkg.title": "ICN para HKG",
  "homeDiscoveryRoute.fallback-icn-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-jnb-znz.title": "JNB para ZNZ",
  "homeDiscoveryRoute.fallback-jnb-znz.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-fra-dxb.title": "FRA para DXB",
  "homeDiscoveryRoute.fallback-fra-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-dxb-lhr.title": "DXB para LHR",
  "homeDiscoveryRoute.fallback-dxb-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-sin-bkk.title": "SIN para BKK",
  "homeDiscoveryRoute.fallback-sin-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-gru-mad.title": "GRU para MAD",
  "homeDiscoveryRoute.fallback-gru-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-nbo-dxb.title": "NBO para DXB",
  "homeDiscoveryRoute.fallback-nbo-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-yyz-lhr.title": "YYZ para LHR",
  "homeDiscoveryRoute.fallback-yyz-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-hnd-sin.title": "HND para SIN",
  "homeDiscoveryRoute.fallback-hnd-sin.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-lhr-cdg.title": "LHR para CDG",
  "homeDiscoveryRoute.fallback-lhr-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-mex-mad.title": "MEX para MAD",
  "homeDiscoveryRoute.fallback-mex-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-dxb-bkk.title": "DXB para BKK",
  "homeDiscoveryRoute.fallback-dxb-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-jnb-lhr.title": "JNB para LHR",
  "homeDiscoveryRoute.fallback-jnb-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-nrt-bkk.title": "NRT para BKK",
  "homeDiscoveryRoute.fallback-nrt-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-lhr-ams.title": "LHR para AMS",
  "homeDiscoveryRoute.fallback-lhr-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-lim-mad.title": "LIM para MAD",
  "homeDiscoveryRoute.fallback-lim-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-los-lhr.title": "LOS para LHR",
  "homeDiscoveryRoute.fallback-los-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.fallback-auh-lhr.title": "AUH para LHR",
  "homeDiscoveryRoute.fallback-auh-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-lhr.title": "LOS para LHR",
  "homeDiscoveryRoute.ng-los-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-dxb.title": "Parada de compras em Dubai",
  "homeDiscoveryRoute.ng-los-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-acc.title": "ABV para ACC",
  "homeDiscoveryRoute.ng-abv-acc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-nbo.title": "LOS para NBO",
  "homeDiscoveryRoute.ng-los-nbo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-jnb.title": "ABV para JNB",
  "homeDiscoveryRoute.ng-abv-jnb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-ist.title": "LOS para IST",
  "homeDiscoveryRoute.ng-los-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-cdg.title": "ABV para CDG",
  "homeDiscoveryRoute.ng-abv-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-doh.title": "LOS para DOH",
  "homeDiscoveryRoute.ng-los-doh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-kig.title": "LOS para KIG",
  "homeDiscoveryRoute.ng-los-kig.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-cai.title": "ABV para CAI",
  "homeDiscoveryRoute.ng-abv-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-add.title": "LOS para ADD",
  "homeDiscoveryRoute.ng-los-add.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-fco.title": "ABV para FCO",
  "homeDiscoveryRoute.ng-abv-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-nrt.title": "LOS para NRT",
  "homeDiscoveryRoute.ng-los-nrt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-mad.title": "ABV para MAD",
  "homeDiscoveryRoute.ng-abv-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-cpt.title": "LOS para CPT",
  "homeDiscoveryRoute.ng-los-cpt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-rob.title": "ABV para ROB",
  "homeDiscoveryRoute.ng-abv-rob.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-yvr.title": "YYZ para YVR",
  "homeDiscoveryRoute.ca-yyz-yvr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yul-cdg.title": "YUL para CDG",
  "homeDiscoveryRoute.ca-yul-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-lax.title": "YVR para LAX",
  "homeDiscoveryRoute.ca-yvr-lax.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-cun.title": "YYZ para CUN",
  "homeDiscoveryRoute.ca-yyz-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyc-yhz.title": "YYC para YHZ",
  "homeDiscoveryRoute.ca-yyc-yhz.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yul-lhr.title": "YUL para LHR",
  "homeDiscoveryRoute.ca-yul-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-sfo.title": "YVR para SFO",
  "homeDiscoveryRoute.ca-yvr-sfo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-mco.title": "YYZ para MCO",
  "homeDiscoveryRoute.ca-yyz-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yeg-pvr.title": "YEG para PVR",
  "homeDiscoveryRoute.ca-yeg-pvr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-hnl.title": "YYZ para HNL",
  "homeDiscoveryRoute.ca-yyz-hnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-nrt.title": "YVR para NRT",
  "homeDiscoveryRoute.ca-yvr-nrt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yhz-yyt.title": "YHZ para YYT",
  "homeDiscoveryRoute.ca-yhz-yyt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-san.title": "YYZ para SAN",
  "homeDiscoveryRoute.ca-yyz-san.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yul-ber.title": "YUL para BER",
  "homeDiscoveryRoute.ca-yul-ber.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyc-yyj.title": "YYC para YYJ",
  "homeDiscoveryRoute.ca-yyc-yyj.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-syd.title": "YVR para SYD",
  "homeDiscoveryRoute.ca-yvr-syd.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-bcn.title": "LHR para BCN",
  "homeDiscoveryRoute.gb-lhr-bcn.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-fco.title": "MAN para FCO",
  "homeDiscoveryRoute.gb-man-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-edi-ams.title": "EDI para AMS",
  "homeDiscoveryRoute.gb-edi-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-cdg.title": "LHR para CDG",
  "homeDiscoveryRoute.gb-lhr-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-dxb.title": "LHR para DXB",
  "homeDiscoveryRoute.gb-lhr-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-jfk.title": "MAN para JFK",
  "homeDiscoveryRoute.gb-man-jfk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-edi-dub.title": "EDI para DUB",
  "homeDiscoveryRoute.gb-edi-dub.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lgw-ath.title": "LGW para ATH",
  "homeDiscoveryRoute.gb-lgw-ath.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-ber.title": "MAN para BER",
  "homeDiscoveryRoute.gb-man-ber.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-edi-kef.title": "EDI para KEF",
  "homeDiscoveryRoute.gb-edi-kef.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-vie.title": "LHR para VIE",
  "homeDiscoveryRoute.gb-lhr-vie.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-fao.title": "MAN para FAO",
  "homeDiscoveryRoute.gb-man-fao.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-edi-zrh.title": "EDI para ZRH",
  "homeDiscoveryRoute.gb-edi-zrh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lgw-mrk.title": "LGW para MRK",
  "homeDiscoveryRoute.gb-lgw-mrk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-bhx-prg.title": "BHX para PRG",
  "homeDiscoveryRoute.gb-bhx-prg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-otp.title": "MAN para OTP",
  "homeDiscoveryRoute.gb-man-otp.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-dxb.title": "NBO para DXB",
  "homeDiscoveryRoute.ke-nbo-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-znz.title": "NBO para ZNZ",
  "homeDiscoveryRoute.ke-nbo-znz.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-jnb.title": "NBO para JNB",
  "homeDiscoveryRoute.ke-nbo-jnb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-lhr.title": "NBO para LHR",
  "homeDiscoveryRoute.ke-nbo-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-add.title": "NBO para ADD",
  "homeDiscoveryRoute.ke-nbo-add.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-ist.title": "NBO para IST",
  "homeDiscoveryRoute.ke-nbo-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-cpt.title": "JNB para CPT",
  "homeDiscoveryRoute.za-jnb-cpt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-dxb.title": "JNB para DXB",
  "homeDiscoveryRoute.za-jnb-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-mru.title": "JNB para MRU",
  "homeDiscoveryRoute.za-jnb-mru.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-lhr.title": "JNB para LHR",
  "homeDiscoveryRoute.za-jnb-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-ams.title": "CPT para AMS",
  "homeDiscoveryRoute.za-cpt-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-nbo.title": "JNB para NBO",
  "homeDiscoveryRoute.za-jnb-nbo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-lhr.title": "FRA para LHR",
  "homeDiscoveryRoute.de-fra-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-cdg.title": "FRA para CDG",
  "homeDiscoveryRoute.de-fra-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-ams.title": "FRA para AMS",
  "homeDiscoveryRoute.de-fra-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-fco.title": "MUC para FCO",
  "homeDiscoveryRoute.de-muc-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-ist.title": "FRA para IST",
  "homeDiscoveryRoute.de-fra-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-dxb.title": "FRA para DXB",
  "homeDiscoveryRoute.de-fra-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-lhr.title": "DXB para LHR",
  "homeDiscoveryRoute.ae-dxb-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-ist.title": "DXB para IST",
  "homeDiscoveryRoute.ae-dxb-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-cai.title": "DXB para CAI",
  "homeDiscoveryRoute.ae-dxb-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-sin.title": "DXB para SIN",
  "homeDiscoveryRoute.ae-dxb-sin.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-bkk.title": "DXB para BKK",
  "homeDiscoveryRoute.ae-dxb-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-cdg.title": "DXB para CDG",
  "homeDiscoveryRoute.ae-dxb-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-icn.title": "NRT para ICN",
  "homeDiscoveryRoute.jp-nrt-icn.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-sin.title": "NRT para SIN",
  "homeDiscoveryRoute.jp-nrt-sin.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-bkk.title": "NRT para BKK",
  "homeDiscoveryRoute.jp-nrt-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-hkg.title": "NRT para HKG",
  "homeDiscoveryRoute.jp-nrt-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-dxb.title": "NRT para DXB",
  "homeDiscoveryRoute.jp-nrt-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-dps.title": "NRT para DPS",
  "homeDiscoveryRoute.jp-nrt-dps.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-eze.title": "GRU para EZE",
  "homeDiscoveryRoute.br-gru-eze.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-lim.title": "GRU para LIM",
  "homeDiscoveryRoute.br-gru-lim.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-scl.title": "GRU para SCL",
  "homeDiscoveryRoute.br-gru-scl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-lis.title": "GRU para LIS",
  "homeDiscoveryRoute.br-gru-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-mia.title": "GRU para MIA",
  "homeDiscoveryRoute.br-gru-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-gig.title": "GRU para GIG",
  "homeDiscoveryRoute.br-gru-gig.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-cdg-alt.title": "CDG para ALT",
  "homeDiscoveryRoute.ng-los-cdg-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-acc.title": "LOS para ACC",
  "homeDiscoveryRoute.ng-los-acc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-dxb.title": "ABV para DXB",
  "homeDiscoveryRoute.ng-abv-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-lhr.title": "ABV para LHR",
  "homeDiscoveryRoute.ng-abv-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-acc-lhr.title": "ACC para LHR",
  "homeDiscoveryRoute.ng-acc-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-acc-dxb.title": "ACC para DXB",
  "homeDiscoveryRoute.ng-acc-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-cpt.title": "NBO para CPT",
  "homeDiscoveryRoute.ke-nbo-cpt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-dar.title": "NBO para DAR",
  "homeDiscoveryRoute.ke-nbo-dar.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-cdg.title": "NBO para CDG",
  "homeDiscoveryRoute.ke-nbo-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-bkk.title": "NBO para BKK",
  "homeDiscoveryRoute.ke-nbo-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-doh.title": "NBO para DOH",
  "homeDiscoveryRoute.ke-nbo-doh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-jnb.title": "CPT para JNB",
  "homeDiscoveryRoute.za-cpt-jnb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-lhr.title": "CPT para LHR",
  "homeDiscoveryRoute.za-cpt-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-dxb.title": "CPT para DXB",
  "homeDiscoveryRoute.za-cpt-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-ist.title": "JNB para IST",
  "homeDiscoveryRoute.za-jnb-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-fco.title": "FRA para FCO",
  "homeDiscoveryRoute.de-fra-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-bcn.title": "FRA para BCN",
  "homeDiscoveryRoute.de-fra-bcn.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-lhr-cdg.title": "LHR para CDG",
  "homeDiscoveryRoute.de-lhr-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-lhr-ams.title": "LHR para AMS",
  "homeDiscoveryRoute.de-lhr-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-lhr-dxb.title": "LHR para DXB",
  "homeDiscoveryRoute.de-lhr-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-jed.title": "DXB para JED",
  "homeDiscoveryRoute.ae-dxb-jed.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-auh-lhr.title": "AUH para LHR",
  "homeDiscoveryRoute.ae-auh-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-doh-lhr.title": "DOH para LHR",
  "homeDiscoveryRoute.ae-doh-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-ams.title": "DXB para AMS",
  "homeDiscoveryRoute.ae-dxb-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-icn.title": "HND para ICN",
  "homeDiscoveryRoute.jp-hnd-icn.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-sin-bkk.title": "SIN para BKK",
  "homeDiscoveryRoute.jp-sin-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-sin-dps.title": "SIN para DPS",
  "homeDiscoveryRoute.jp-sin-dps.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-sin-dxb.title": "SIN para DXB",
  "homeDiscoveryRoute.jp-sin-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-bkk-hkg.title": "BKK para HKG",
  "homeDiscoveryRoute.jp-bkk-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-mad.title": "GRU para MAD",
  "homeDiscoveryRoute.br-gru-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-bog.title": "GRU para BOG",
  "homeDiscoveryRoute.br-gru-bog.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gig-gru.title": "GIG para GRU",
  "homeDiscoveryRoute.br-gig-gru.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-cun.title": "MEX para CUN",
  "homeDiscoveryRoute.br-mex-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-mad.title": "MEX para MAD",
  "homeDiscoveryRoute.br-mex-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-bog-mia.title": "BOG para MIA",
  "homeDiscoveryRoute.br-bog-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-yul.title": "YYZ para YUL",
  "homeDiscoveryRoute.ca-yyz-yul.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-lhr.title": "YYZ para LHR",
  "homeDiscoveryRoute.ca-yyz-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-cdg.title": "YYZ para CDG",
  "homeDiscoveryRoute.ca-yyz-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-yyz.title": "YVR para YYZ",
  "homeDiscoveryRoute.ca-yvr-yyz.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-ams.title": "NBO para AMS",
  "homeDiscoveryRoute.ke-nbo-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-cai.title": "NBO para CAI",
  "homeDiscoveryRoute.ke-nbo-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-los.title": "NBO para LOS",
  "homeDiscoveryRoute.ke-nbo-los.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-mru.title": "NBO para MRU",
  "homeDiscoveryRoute.ke-nbo-mru.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-jed.title": "NBO para JED",
  "homeDiscoveryRoute.ke-nbo-jed.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-cdg.title": "JNB para CDG",
  "homeDiscoveryRoute.za-jnb-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-cdg.title": "CPT para CDG",
  "homeDiscoveryRoute.za-cpt-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-dur-jnb.title": "DUR para JNB",
  "homeDiscoveryRoute.za-dur-jnb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-add.title": "JNB para ADD",
  "homeDiscoveryRoute.za-jnb-add.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-acc.title": "JNB para ACC",
  "homeDiscoveryRoute.za-jnb-acc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-mru.title": "CPT para MRU",
  "homeDiscoveryRoute.za-cpt-mru.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-mad.title": "FRA para MAD",
  "homeDiscoveryRoute.de-fra-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-lis.title": "FRA para LIS",
  "homeDiscoveryRoute.de-fra-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-lhr.title": "MUC para LHR",
  "homeDiscoveryRoute.de-muc-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-cdg.title": "MUC para CDG",
  "homeDiscoveryRoute.de-muc-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-ber-ams.title": "BER para AMS",
  "homeDiscoveryRoute.de-ber-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-mnl.title": "DXB para MNL",
  "homeDiscoveryRoute.ae-dxb-mnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-del.title": "DXB para DEL",
  "homeDiscoveryRoute.ae-dxb-del.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-bom.title": "DXB para BOM",
  "homeDiscoveryRoute.ae-dxb-bom.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-auh-bom.title": "AUH para BOM",
  "homeDiscoveryRoute.ae-auh-bom.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-mru.title": "DXB para MRU",
  "homeDiscoveryRoute.ae-dxb-mru.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-doh-bkk.title": "DOH para BKK",
  "homeDiscoveryRoute.ae-doh-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-bkk.title": "HND para BKK",
  "homeDiscoveryRoute.jp-hnd-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-sin.title": "HND para SIN",
  "homeDiscoveryRoute.jp-hnd-sin.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-mnl.title": "NRT para MNL",
  "homeDiscoveryRoute.jp-nrt-mnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-hkg.title": "HND para HKG",
  "homeDiscoveryRoute.jp-hnd-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-kix-icn.title": "KIX para ICN",
  "homeDiscoveryRoute.jp-kix-icn.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-cun.title": "GRU para CUN",
  "homeDiscoveryRoute.br-gru-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-mex.title": "GRU para MEX",
  "homeDiscoveryRoute.br-gru-mex.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gig-mia.title": "GIG para MIA",
  "homeDiscoveryRoute.br-gig-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gig-lis.title": "GIG para LIS",
  "homeDiscoveryRoute.br-gig-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-bog-mad.title": "BOG para MAD",
  "homeDiscoveryRoute.br-bog-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-kgl.title": "NBO para KGL",
  "homeDiscoveryRoute.ke-nbo-kgl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-acc.title": "NBO para ACC",
  "homeDiscoveryRoute.ke-nbo-acc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-mba.title": "NBO para MBA",
  "homeDiscoveryRoute.ke-nbo-mba.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-mad.title": "NBO para MAD",
  "homeDiscoveryRoute.ke-nbo-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-mad.title": "JNB para MAD",
  "homeDiscoveryRoute.za-jnb-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-lis.title": "JNB para LIS",
  "homeDiscoveryRoute.za-jnb-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-acc.title": "CPT para ACC",
  "homeDiscoveryRoute.za-cpt-acc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-dar.title": "JNB para DAR",
  "homeDiscoveryRoute.za-jnb-dar.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-vie.title": "FRA para VIE",
  "homeDiscoveryRoute.de-fra-vie.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-zrh.title": "FRA para ZRH",
  "homeDiscoveryRoute.de-fra-zrh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-mad.title": "MUC para MAD",
  "homeDiscoveryRoute.de-muc-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-ber-lhr.title": "BER para LHR",
  "homeDiscoveryRoute.de-ber-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-kul.title": "DXB para KUL",
  "homeDiscoveryRoute.ae-dxb-kul.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-auh-cai.title": "AUH para CAI",
  "homeDiscoveryRoute.ae-auh-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-doh-ist.title": "DOH para IST",
  "homeDiscoveryRoute.ae-doh-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-mad.title": "DXB para MAD",
  "homeDiscoveryRoute.ae-dxb-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-kul.title": "NRT para KUL",
  "homeDiscoveryRoute.jp-nrt-kul.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-tpe.title": "HND para TPE",
  "homeDiscoveryRoute.jp-hnd-tpe.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-kix-bkk.title": "KIX para BKK",
  "homeDiscoveryRoute.jp-kix-bkk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-mad.title": "NRT para MAD",
  "homeDiscoveryRoute.jp-nrt-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-sjo.title": "GRU para SJO",
  "homeDiscoveryRoute.br-gru-sjo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-sjo-alt.title": "SJO para ALT",
  "homeDiscoveryRoute.br-mex-sjo-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-bog-cun.title": "BOG para CUN",
  "homeDiscoveryRoute.br-bog-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gig-mad.title": "GIG para MAD",
  "homeDiscoveryRoute.br-gig-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-atl.title": "JFK para ATL",
  "homeDiscoveryRoute.us-jfk-atl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-ord.title": "LAX para ORD",
  "homeDiscoveryRoute.us-lax-ord.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-dfw.title": "LAX para DFW",
  "homeDiscoveryRoute.us-lax-dfw.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-den.title": "JFK para DEN",
  "homeDiscoveryRoute.us-jfk-den.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-cai.title": "LOS para CAI",
  "homeDiscoveryRoute.ng-los-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-ams.title": "LOS para AMS",
  "homeDiscoveryRoute.ng-los-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-ist.title": "ABV para IST",
  "homeDiscoveryRoute.ng-abv-ist.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-acc-ams.title": "ACC para AMS",
  "homeDiscoveryRoute.ng-acc-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-acc-jnb.title": "ACC para JNB",
  "homeDiscoveryRoute.ng-acc-jnb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-los-mad.title": "LOS para MAD",
  "homeDiscoveryRoute.ng-los-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-acc-cdg.title": "ACC para CDG",
  "homeDiscoveryRoute.ng-acc-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ng-abv-add.title": "ABV para ADD",
  "homeDiscoveryRoute.ng-abv-add.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-ebb.title": "NBO para EBB",
  "homeDiscoveryRoute.ke-nbo-ebb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-jed-alt.title": "JED para ALT",
  "homeDiscoveryRoute.ke-nbo-jed-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-kul.title": "NBO para KUL",
  "homeDiscoveryRoute.ke-nbo-kul.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-fra.title": "NBO para FRA",
  "homeDiscoveryRoute.ke-nbo-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-mru-alt.title": "MRU para ALT",
  "homeDiscoveryRoute.za-jnb-mru-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-fra.title": "JNB para FRA",
  "homeDiscoveryRoute.za-jnb-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-ams.title": "JNB para AMS",
  "homeDiscoveryRoute.za-jnb-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-dur-cpt.title": "DUR para CPT",
  "homeDiscoveryRoute.za-dur-cpt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-cai.title": "JNB para CAI",
  "homeDiscoveryRoute.za-jnb-cai.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-mad.title": "LHR para MAD",
  "homeDiscoveryRoute.gb-lhr-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-fco.title": "LHR para FCO",
  "homeDiscoveryRoute.gb-lhr-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-lis.title": "LHR para LIS",
  "homeDiscoveryRoute.gb-lhr-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-jfk.title": "LHR para JFK",
  "homeDiscoveryRoute.gb-lhr-jfk.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-doh.title": "LHR para DOH",
  "homeDiscoveryRoute.gb-lhr-doh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-man-ams.title": "MAN para AMS",
  "homeDiscoveryRoute.gb-man-ams.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lgw-dxb.title": "LGW para DXB",
  "homeDiscoveryRoute.gb-lgw-dxb.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-edi-cdg.title": "EDI para CDG",
  "homeDiscoveryRoute.gb-edi-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-fra.title": "LHR para FRA",
  "homeDiscoveryRoute.gb-lhr-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-zrh.title": "LHR para ZRH",
  "homeDiscoveryRoute.gb-lhr-zrh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-ath.title": "FRA para ATH",
  "homeDiscoveryRoute.de-fra-ath.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-prg.title": "FRA para PRG",
  "homeDiscoveryRoute.de-fra-prg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-vie.title": "MUC para VIE",
  "homeDiscoveryRoute.de-muc-vie.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-fra.title": "DXB para FRA",
  "homeDiscoveryRoute.ae-dxb-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-han.title": "NRT para HAN",
  "homeDiscoveryRoute.jp-nrt-han.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-syd.title": "NRT para SYD",
  "homeDiscoveryRoute.jp-nrt-syd.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-lim-mia.title": "LIM para MIA",
  "homeDiscoveryRoute.br-lim-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-lhr.title": "YVR para LHR",
  "homeDiscoveryRoute.ca-yvr-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-yyc.title": "YYZ para YYC",
  "homeDiscoveryRoute.ca-yyz-yyc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yvr-cun.title": "YVR para CUN",
  "homeDiscoveryRoute.ca-yvr-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-yhz.title": "YYZ para YHZ",
  "homeDiscoveryRoute.ca-yyz-yhz.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yul-yvr.title": "YUL para YVR",
  "homeDiscoveryRoute.ca-yul-yvr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyc-yvr.title": "YYC para YVR",
  "homeDiscoveryRoute.ca-yyc-yvr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-sez.title": "NBO para SEZ",
  "homeDiscoveryRoute.ke-nbo-sez.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-lis.title": "NBO para LIS",
  "homeDiscoveryRoute.ke-nbo-lis.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-vie.title": "NBO para VIE",
  "homeDiscoveryRoute.ke-nbo-vie.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ke-nbo-zrh.title": "NBO para ZRH",
  "homeDiscoveryRoute.ke-nbo-zrh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-luanda.title": "JNB para LUANDA",
  "homeDiscoveryRoute.za-jnb-luanda.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-windhoek.title": "JNB para WINDHOEK",
  "homeDiscoveryRoute.za-jnb-windhoek.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-lusaka.title": "JNB para LUSAKA",
  "homeDiscoveryRoute.za-jnb-lusaka.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-jnb-hre.title": "JNB para HRE",
  "homeDiscoveryRoute.za-jnb-hre.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-fra.title": "CPT para FRA",
  "homeDiscoveryRoute.za-cpt-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.za-cpt-ams-alt.title": "AMS para ALT",
  "homeDiscoveryRoute.za-cpt-ams-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-ath.title": "LHR para ATH",
  "homeDiscoveryRoute.gb-lhr-ath.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-prg.title": "LHR para PRG",
  "homeDiscoveryRoute.gb-lhr-prg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-nce.title": "LHR para NCE",
  "homeDiscoveryRoute.gb-lhr-nce.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.gb-lhr-cph.title": "LHR para CPH",
  "homeDiscoveryRoute.gb-lhr-cph.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-cph.title": "FRA para CPH",
  "homeDiscoveryRoute.de-fra-cph.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-nce.title": "FRA para NCE",
  "homeDiscoveryRoute.de-fra-nce.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-ath.title": "MUC para ATH",
  "homeDiscoveryRoute.de-muc-ath.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-ber-fco.title": "BER para FCO",
  "homeDiscoveryRoute.de-ber-fco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-waw.title": "FRA para WAW",
  "homeDiscoveryRoute.de-fra-waw.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-muc-zrh.title": "MUC para ZRH",
  "homeDiscoveryRoute.de-muc-zrh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-ber-mad.title": "BER para MAD",
  "homeDiscoveryRoute.de-ber-mad.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.de-fra-doh.title": "FRA para DOH",
  "homeDiscoveryRoute.de-fra-doh.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-hkg.title": "DXB para HKG",
  "homeDiscoveryRoute.ae-dxb-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-nrt.title": "DXB para NRT",
  "homeDiscoveryRoute.ae-dxb-nrt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-muc.title": "DXB para MUC",
  "homeDiscoveryRoute.ae-dxb-muc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-dxb-sez.title": "DXB para SEZ",
  "homeDiscoveryRoute.ae-dxb-sez.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ae-auh-mnl.title": "AUH para MNL",
  "homeDiscoveryRoute.ae-auh-mnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-tpe-alt.title": "TPE para ALT",
  "homeDiscoveryRoute.jp-hnd-tpe-alt.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-del.title": "NRT para DEL",
  "homeDiscoveryRoute.jp-nrt-del.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-kix-hkg.title": "KIX para HKG",
  "homeDiscoveryRoute.jp-kix-hkg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-nrt-fra.title": "NRT para FRA",
  "homeDiscoveryRoute.jp-nrt-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.jp-hnd-lhr.title": "HND para LHR",
  "homeDiscoveryRoute.jp-hnd-lhr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-lax.title": "MEX para LAX",
  "homeDiscoveryRoute.br-mex-lax.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-cdg.title": "GRU para CDG",
  "homeDiscoveryRoute.br-gru-cdg.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-gru-fra.title": "GRU para FRA",
  "homeDiscoveryRoute.br-gru-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-bog.title": "MEX para BOG",
  "homeDiscoveryRoute.br-mex-bog.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-lim-bog.title": "LIM para BOG",
  "homeDiscoveryRoute.br-lim-bog.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.br-mex-lim.title": "MEX para LIM",
  "homeDiscoveryRoute.br-mex-lim.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-fra.title": "YYZ para FRA",
  "homeDiscoveryRoute.ca-yyz-fra.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yyz-lax.title": "YYZ para LAX",
  "homeDiscoveryRoute.ca-yyz-lax.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.ca-yul-mia.title": "YUL para MIA",
  "homeDiscoveryRoute.ca-yul-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ewr-sav.title": "EWR para SAV",
  "homeDiscoveryRoute.us-ewr-sav.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-bos-mia.title": "BOS para MIA",
  "homeDiscoveryRoute.us-bos-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lga-chs.title": "LGA para CHS",
  "homeDiscoveryRoute.us-lga-chs.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-den-slc.title": "DEN para SLC",
  "homeDiscoveryRoute.us-den-slc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-iah-mex.title": "IAH para MEX",
  "homeDiscoveryRoute.us-iah-mex.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-sjd.title": "LAX para SJD",
  "homeDiscoveryRoute.us-lax-sjd.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ord-rsw.title": "ORD para RSW",
  "homeDiscoveryRoute.us-ord-rsw.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-sea-san.title": "SEA para SAN",
  "homeDiscoveryRoute.us-sea-san.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-lax.title": "JFK para LAX",
  "homeDiscoveryRoute.us-jfk-lax.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ewr-mco.title": "EWR para MCO",
  "homeDiscoveryRoute.us-ewr-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lga-fll.title": "LGA para FLL",
  "homeDiscoveryRoute.us-lga-fll.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-bos-lax.title": "BOS para LAX",
  "homeDiscoveryRoute.us-bos-lax.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ord-mia.title": "ORD para MIA",
  "homeDiscoveryRoute.us-ord-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-atl-las.title": "ATL para LAS",
  "homeDiscoveryRoute.us-atl-las.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dfw-mco.title": "DFW para MCO",
  "homeDiscoveryRoute.us-dfw-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-den-las.title": "DEN para LAS",
  "homeDiscoveryRoute.us-den-las.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-sfo-las.title": "SFO para LAS",
  "homeDiscoveryRoute.us-sfo-las.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-hnl.title": "LAX para HNL",
  "homeDiscoveryRoute.us-lax-hnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-sfo-sea.title": "SFO para SEA",
  "homeDiscoveryRoute.us-sfo-sea.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-iad-mco.title": "IAD para MCO",
  "homeDiscoveryRoute.us-iad-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-msp-rsw.title": "MSP para RSW",
  "homeDiscoveryRoute.us-msp-rsw.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-clt-mia.title": "CLT para MIA",
  "homeDiscoveryRoute.us-clt-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dtw-fll.title": "DTW para FLL",
  "homeDiscoveryRoute.us-dtw-fll.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-phl-mco.title": "PHL para MCO",
  "homeDiscoveryRoute.us-phl-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-bwi-mco.title": "BWI para MCO",
  "homeDiscoveryRoute.us-bwi-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dfw-las.title": "DFW para LAS",
  "homeDiscoveryRoute.us-dfw-las.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-cun.title": "JFK para CUN",
  "homeDiscoveryRoute.us-jfk-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-atl-cun.title": "ATL para CUN",
  "homeDiscoveryRoute.us-atl-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dfw-sjd.title": "DFW para SJD",
  "homeDiscoveryRoute.us-dfw-sjd.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ord-cun.title": "ORD para CUN",
  "homeDiscoveryRoute.us-ord-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-sju.title": "JFK para SJU",
  "homeDiscoveryRoute.us-jfk-sju.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-mex.title": "LAX para MEX",
  "homeDiscoveryRoute.us-lax-mex.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-mia.title": "JFK para MIA",
  "homeDiscoveryRoute.us-jfk-mia.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ord-las.title": "ORD para LAS",
  "homeDiscoveryRoute.us-ord-las.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-sfo.title": "LAX para SFO",
  "homeDiscoveryRoute.us-lax-sfo.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-atl-mco.title": "ATL para MCO",
  "homeDiscoveryRoute.us-atl-mco.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dfw-sea.title": "DFW para SEA",
  "homeDiscoveryRoute.us-dfw-sea.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-mia-cun.title": "MIA para CUN",
  "homeDiscoveryRoute.us-mia-cun.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-ord-pdx.title": "ORD para PDX",
  "homeDiscoveryRoute.us-ord-pdx.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-sea-hnl.title": "SEA para HNL",
  "homeDiscoveryRoute.us-sea-hnl.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-bos-sju.title": "BOS para SJU",
  "homeDiscoveryRoute.us-bos-sju.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-den-phx.title": "DEN para PHX",
  "homeDiscoveryRoute.us-den-phx.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-iad-bna.title": "IAD para BNA",
  "homeDiscoveryRoute.us-iad-bna.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-lax-yvr.title": "LAX para YVR",
  "homeDiscoveryRoute.us-lax-yvr.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-sea-anc.title": "SEA para ANC",
  "homeDiscoveryRoute.us-sea-anc.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-jfk-aus.title": "JFK para AUS",
  "homeDiscoveryRoute.us-jfk-aus.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-dtw-msy.title": "DTW para MSY",
  "homeDiscoveryRoute.us-dtw-msy.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",
  "homeDiscoveryRoute.us-phl-san.title": "PHL para SAN",
  "homeDiscoveryRoute.us-phl-san.routeNote":
    "Rota com disponibilidade real de fornecedores para comparar opções antes de reservar.",

  "hotelResults.openFilters": "Abrir filtros",
  "hotelResults.selectDateAriaPrefix": "Selecionar",
  "hotelResults.searchingHotelPartners": "Buscando parceiros de hotéis...",
  "hotelResults.comparingTotalStayPrices": "Comparando preços totais da estadia...",
  "hotelResults.checkingArrivalConvenience": "Verificando a conveniência da chegada...",
  "hotelResults.findingLowStressStays": "Buscando estadias mais tranquilas...",
  "hotelResults.liveSearchUnavailable": "A busca de hotéis ao vivo está temporariamente indisponível. Tente novamente em breve.",
  "hotelResults.searchUnavailableDetailed": "A busca de hotéis ao vivo está temporariamente indisponível para esta solicitação. Só mostramos opções de estadia quando preço, disponibilidade, taxas e regras podem ser revisados com o provedor. Tente novamente mais tarde ou inicie uma nova busca.",
  "hotelResults.unableToSearchHotels": "Não foi possível buscar hotéis.",
  "hotelResults.limitedProviderChecks": "Algumas verificações de provedores podem estar limitadas para esta busca de hotéis. Confira a disponibilidade final, os impostos, as taxas e as regras de cancelamento com o provedor antes de reservar.",
  "hotelResults.noStaysMatchFiltersTitle": "Nenhuma estadia corresponde a estes filtros",
  "hotelResults.noStaysMatchFiltersBody": "Tente aumentar a faixa de preço, reduzir a classificação por estrelas ou limpar os filtros de hotéis selecionados para ver mais opções disponíveis.",
  "hotelResults.noStaysMatchFiltersInline": "Nenhuma estadia corresponde a estes filtros. Amplie seus filtros para ver mais opções disponíveis.",
  "hotelResults.resetFilters": "Redefinir filtros",
  "hotelResults.foundPlacesToStay": "Encontramos {{count}} opções de estadia para você",
  "hotelResults.summaryAria": "Resumo dos resultados de hotéis",
  "hotelResults.cheapest": "Mais barato",
  "hotelResults.lowestTotalPrice": "Menor preço total",
  "hotelResults.bestValue": "Melhor custo-benefício",
  "hotelResults.bestBalance": "Melhor equilíbrio",
  "hotelResults.topRated": "Melhor avaliados",
  "hotelResults.highestRating": "Maior avaliação",
  "hotelResults.valueScore": "Pontuação {{score}}/100",
  "hotelResults.recommended": "Recomendado",
  "hotelResults.starSingular": "{{count}} estrela",
  "hotelResults.starPlural": "{{count}} estrelas",
  "hotelResults.activeHotelFilters": "Filtros de hotéis ativos",
  "hotelResults.removeFilter": "Remover filtro {{label}}",
  "hotelResults.budgetPrice": "Orçamento / Preço",
  "hotelResults.totalUpTo": "Total até",
  "hotelResults.popularFilters": "Filtros populares",
  "hotelResults.starRating": "Classificação por estrelas",
  "hotelResults.locationArea": "Localização / Área",
  "hotelResults.propertyType": "Tipo de propriedade",
  "hotelResults.roomType": "Tipo de quarto",
  "hotelResults.bedType": "Tipo de cama",
  "hotelResults.meals": "Refeições",
  "hotelResults.cancellationPolicy": "Política de cancelamento",
  "hotelResults.facilities": "Comodidades",
  "hotelResults.showLess": "Mostrar menos",
  "hotelResults.showMore": "Mostrar mais ({{count}})",
  "hotelResults.upToPrice": "Até {{price}}",
  "hotelResults.starsAndUp": "{{rating}}+ estrelas",
  "hotelResults.nonRefundable": "Não reembolsável",
  "hotelResults.hotelImageAlt": "Opção de estadia {{name}}{{location}}",
  "hotelResults.nearLocation": "perto de {{location}}",
  "hotelResults.imageUnavailable": "Imagem indisponível",
  "hotelResults.starHotelAria": "Hotel {{rating}} estrelas",
  "hotelResults.estimatedStayTotal": "total estimado da estadia",
  "hotelResults.pricePerNight": "{{price}} por noite",
  "hotelResults.viewHotel": "Ver hotel",
  "hotelResults.filter.freeWifi": "Wi-Fi grátis",
  "hotelResults.filter.breakfastIncludedAvailable": "Café da manhã incluído/disponível",
  "hotelResults.filter.freeCancellation": "Cancelamento grátis",
  "hotelResults.filter.parking": "Estacionamento",
  "hotelResults.filter.pool": "Piscina",
  "hotelResults.filter.airportShuttle": "Transfer para o aeroporto",
  "hotelResults.filter.roomOnly": "Somente quarto",
  "hotelResults.filter.halfBoard": "Meia-pensão",
  "hotelResults.filter.fullBoard": "Pensão completa",
  "hotelResults.filter.allInclusive": "Tudo incluído",
  "hotelResults.filter.flexibleCancellation": "Cancelamento flexível",
  "hotelResults.filter.cancellationPolicyAvailable": "Política de cancelamento disponível",
  "hotelResults.filter.spa": "Spa",
  "hotelResults.filter.fitnessCenter": "Academia",
  "hotelResults.filter.workspace": "Espaço de trabalho",
  "hotelResults.filter.quietRooms": "Quartos silenciosos",
  "hotelResults.filter.frontDesk24": "Recepção 24 horas",
  "hotelResults.filter.lateCheckIn": "Check-in tardio",
  "hotelResults.filter.hotel": "Hotel",
  "hotelResults.filter.apartment": "Apartamento",
  "hotelResults.filter.resort": "Resort",
  "hotelResults.filter.suites": "Suítes",
  "hotelResults.filter.inn": "Pousada",
  "hotelResults.filter.hostel": "Hostel",
  "hotelResults.filter.villa": "Villa",
  "hotelResults.filter.cityCentre": "Centro da cidade",
  "hotelResults.filter.airportArea": "Área do aeroporto",
  "hotelResults.filter.businessDistrict": "Distrito financeiro",
  "hotelResults.filter.nearAttractions": "Perto das atrações",
  "hotelResults.filter.residentialArea": "Área residencial",
  "hotelResults.filter.singleRoom": "Quarto individual",
  "hotelResults.filter.doubleRoom": "Quarto duplo",
  "hotelResults.filter.twinRoom": "Quarto twin",
  "hotelResults.filter.familyRoom": "Quarto familiar",
  "hotelResults.filter.standardRoom": "Quarto standard",
  "hotelResults.filter.deluxeRoom": "Quarto deluxe",
  "hotelResults.filter.studio": "Estúdio",
  "hotelResults.filter.twinBeds": "Camas de solteiro",
  "hotelResults.filter.doubleBed": "Cama de casal",
  "hotelResults.filter.queenBed": "Cama queen-size",
  "hotelResults.filter.kingBed": "Cama king-size",
  searchRentalCarsEveryPartTrip:
    "Pesquise carros de aluguel para cada etapa da sua viagem",
  exploreCarsByTripStyle: "Explore carros de aluguel por estilo de viagem",
  carsTripStyleBody:
    "Escolha um tipo de carro e abriremos os resultados com o contexto da pesquisa pronto.",
  "carsTripStyle.economy.title": "Carros econômicos",
  "carsTripStyle.economy.subtitle":
    "Pesquisas acessíveis para trajetos urbanos e viagens solo",
  "carsTripStyle.economy.cta": "Iniciar pesquisa de carro econômico",
  "carsTripStyle.economy.ariaLabel":
    "Iniciar pesquisa de carro econômico com retirada no centro da cidade",
  "carsTripStyle.economy.imageAlt":
    "Carros compactos urbanos circulando entre prédios no centro da cidade",
  "carsTripStyle.suv.title": "SUVs",
  "carsTripStyle.suv.subtitle":
    "Espaço para viagens em família, bagagem e trajetos mais longos",
  "carsTripStyle.suv.cta": "Abrir pesquisa de aluguel de SUV",
  "carsTripStyle.suv.ariaLabel":
    "Abrir pesquisa de aluguel de SUV com retirada no aeroporto",
  "carsTripStyle.suv.imageAlt":
    "SUV em uma estrada aberta perto de montanhas",
  "carsTripStyle.luxury.title": "Carros de luxo",
  "carsTripStyle.luxury.subtitle":
    "Contexto de pesquisa premium para negócios ou viagens especiais",
  "carsTripStyle.luxury.cta": "Planejar pesquisa de carro de luxo",
  "carsTripStyle.luxury.ariaLabel":
    "Planejar pesquisa de carro de luxo com retirada na área do hotel",
  "carsTripStyle.luxury.imageAlt":
    "Carro premium estacionado perto de um edifício moderno e elegante",
  "carsTripStyle.van.title": "Vans",
  "carsTripStyle.van.subtitle":
    "Contexto de pesquisa para viagens em grupo e bagagem da família",
  "carsTripStyle.van.cta": "Pesquisar vans para viagens em grupo",
  "carsTripStyle.van.ariaLabel":
    "Pesquisar vans para viagens em grupo com retirada no aeroporto",
  "carsTripStyle.van.imageAlt":
    "Van de passageiros viajando por uma estrada panorâmica iluminada",
  "carsTrust.0.title": "Feito para viagens completas",
  "carsTrust.0.description":
    "Planeje voos, estadias e transporte terrestre em um único fluxo no Kurioticket.",
  "carsTrust.1.title": "Detalhes da retirada primeiro",
  "carsTrust.1.description":
    "Informe local de retirada, datas, horários e idade do motorista para que sua pesquisa de aluguel comece com os detalhes corretos da viagem.",
  "carsTrust.2.title": "Revisão clara do aluguel",
  "carsTrust.2.description":
    "Revise preço final, disponibilidade, taxas e regras do aluguel com o provedor antes de reservar.",
  carsPickupPointsTitle: "Comece pelos pontos populares de retirada de carros",
  carsPickupPointsBody:
    "Escolha um tipo de retirada e abriremos a página de resultados de carros com os detalhes da pesquisa prontos.",
  "carsPickup.Airport.title": "Retiradas no aeroporto",
  "carsPickup.Airport.subtitle":
    "Comece por grandes pontos de chegada em aeroportos",
  "carsPickup.Airport.ariaLabel":
    "Abrir resultados de carros para retirada no aeroporto",
  "carsPickup.Airport.imageAlt":
    "Avião estacionado em um portão de aeroporto ao pôr do sol",
  "carsPickup.City center.title": "Retiradas no centro da cidade",
  "carsPickup.City center.subtitle":
    "Retire perto de hotéis no centro e distritos comerciais",
  "carsPickup.City center.ariaLabel":
    "Abrir resultados de carros para retirada no centro da cidade",
  "carsPickup.City center.imageAlt":
    "Carros circulando por uma rua urbana entre prédios altos",
  "carsPickup.Train station.title": "Retiradas em estações de trem",
  "carsPickup.Train station.subtitle":
    "Continue sua viagem após chegadas de trem",
  "carsPickup.Train station.ariaLabel":
    "Abrir resultados de carros para retirada em estação de trem",
  "carsPickup.Train station.imageAlt":
    "Plataforma de trem com trilhos chegando a uma estação urbana",
  "carsPickup.Hotel area.title": "Retiradas na área do hotel",
  "carsPickup.Hotel area.subtitle":
    "Planeje a retirada do carro perto de onde você está hospedado",
  "carsPickup.Hotel area.ariaLabel":
    "Abrir resultados de carros para retirada na área do hotel",
  "carsPickup.Hotel area.imageAlt":
    "Exterior de hotel com palmeiras e entrada para carros",
  "carsSearch.pickupLocationLabel": "LOCAL DE RETIRADA",
  "carsSearch.pickupLocationPlaceholder": "Aeroporto, cidade ou endereço",
  "carsSearch.returnLocationPlaceholder":
    "Cidade, aeroporto ou endereço de devolução",
  "carsSearch.returnToSameLocation": "Devolver no mesmo local",
  "carsSearch.differentReturnLocation": "Local de devolução diferente",
  "carsSearch.rentalDatesLabel": "DATAS DO ALUGUEL",
  "carsSearch.rentalDatePlaceholder": "Data de retirada — Data de devolução",
  "carsSearch.pickupReturnTimeLabel": "HORÁRIO DE RETIRADA / DEVOLUÇÃO",
  "carsSearch.pickupReturnTimeSummary":
    "Retirada {pickupTime} — Devolução {returnTime}",
  "carsSearch.driverAgeLabel": "IDADE DO MOTORISTA",
  "carsSearch.driverAgeAnyAge": "Qualquer idade",
  "carsSearch.clearPickupLocation": "Limpar local de retirada",
  "carsSearch.clearReturnLocation": "Limpar local de devolução",
  "carsSearch.chooseRentalDatesAria":
    "Escolher datas de retirada e devolução do aluguel",
  "carsSearch.rentalDatePickerAria": "Seletor de datas do aluguel",
  "carsSearch.chooseRentalDates": "Escolha as datas do aluguel",
  "carsSearch.previousMonth": "Mês anterior",
  "carsSearch.previousMonthShort": "Ant.",
  "carsSearch.nextMonth": "Próximo mês",
  "carsSearch.nextMonthShort": "Próx.",
  "carsSearch.selectDateAriaPrefix": "Selecionar",
  "carsSearch.startsNewPickupDate": "inicia uma nova data de retirada",
  "carsSearch.choosePickupReturnTimesAria":
    "Escolher horários de retirada e devolução",
  "carsSearch.pickupReturnTimeSelectorAria":
    "Seletor de horário de retirada e devolução",
  "carsSearch.pickupTimeLabel": "Horário de retirada",
  "carsSearch.returnTimeLabel": "Horário de devolução",
  carsSearchPreparing: "Preparando pesquisa de carros...",
  "carsResults.resultsLabel": "Resultados de carros",
  "carsResults.resultsFor": "Resultados de carros para {location}",
  "carsResults.carResultsAria": "Resultados de carros",
  "carsResults.carFiltersAria": "Filtros de carros",
  "carsResults.filterBy": "Filtrar por",
  "carsResults.activeFilterCount": "{count} ativo(s)",
  "carsResults.selectedFilterCount": "{count} selecionado(s)",
  "carsResults.reset": "Redefinir",
  "carsResults.resetFilters": "Redefinir filtros",
  "carsResults.openFilters": "Abrir filtros",
  "carsResults.openFiltersWithCount": "Abrir filtros, {count} ativo(s)",
  "carsResults.closeFilters": "Fechar filtros",
  "carsResults.edit": "Editar",
  "carsResults.editSearch": "Editar pesquisa",
  "carsResults.editCarSearch": "Editar pesquisa de carros",
  "carsResults.closeEditSearch": "Fechar edição da pesquisa",
  "carsResults.carRentalSearch": "Pesquisa de aluguel de carros",
  "carsResults.searchCars": "Pesquisar carros",
  "carsResults.pickupLocation": "Local de retirada",
  "carsResults.returnLocation": "Local de devolução",
  "carsResults.pickupLocationNeeded": "local de retirada necessário",
  "carsResults.pickupToReturn": "{pickup} → {return}",
  "carsResults.sameAsPickup": "Igual à retirada",
  "carsResults.selectRentalDates": "Selecionar datas do aluguel",
  "carsResults.selectDate": "Selecionar data",
  "carsResults.selectDates": "Selecionar datas",
  "carsResults.rentalDates": "Datas do aluguel",
  "carsResults.rentalDatePlaceholder": "Data de retirada — Data de devolução",
  "carsResults.rentalDateRangeCalendar": "Calendário do período de aluguel",
  "carsResults.selectPickupThenReturn": "Selecione a retirada e depois a devolução",
  "carsResults.pickupReturnTime": "Horário de retirada / devolução",
  "carsResults.pickupReturnTimeSelector": "Seletor de horário de retirada e devolução",
  "carsResults.pickupTime": "Horário de retirada",
  "carsResults.returnTime": "Horário de devolução",
  "carsResults.driverAge": "Idade do motorista",
  "carsResults.anyDriverAgeRange": "Qualquer idade do motorista 18–70",
  "carsResults.yearsOld": "anos",
  "carsResults.emptyInventory": "O inventário de carros em tempo real ainda não está disponível para esta pesquisa. Atualize os detalhes da pesquisa acima ou tente novamente mais tarde.",
  "carsResults.enterPickupDetails": "Informe os detalhes de retirada acima para preparar uma pesquisa de carros.",
  "carsResults.vehicleType": "Tipo de veículo",
  "carsResults.smallCars": "Carros pequenos",
  "carsResults.mediumCars": "Carros médios",
  "carsResults.suvs": "SUVs",
  "carsResults.transmission": "Transmissão",
  "carsResults.automatic": "Automático",
  "carsResults.manual": "Manual",
  "carsResults.seats": "Assentos",
  "carsResults.seats4Plus": "4+ assentos",
  "carsResults.seats5Plus": "5+ assentos",
  "carsResults.seats7Plus": "7+ assentos",
  "carsResults.bags": "Bagagens",
  "carsResults.bags2Plus": "2+ bagagens",
  "carsResults.bags3Plus": "3+ bagagens",
  "carsResults.bags4Plus": "4+ bagagens",
  "carsResults.fuelPolicy": "Política de combustível",
  "carsResults.fullToFull": "Cheio para cheio",
  "carsResults.sameToSame": "Mesmo nível",
  "carsResults.mileagePolicy": "Política de quilometragem",
  "carsResults.unlimitedMileage": "Quilometragem ilimitada",
  "carsResults.limitedMileage": "Quilometragem limitada",
  "carsResults.cancellation": "Cancelamento",
  "carsResults.freeCancellation": "Cancelamento grátis",
  "carsResults.payAtPickup": "Pagar na retirada",
  "carsResults.pickupLocationType": "Tipo de local de retirada",
  "carsResults.airportCounter": "Balcão no aeroporto",
  "carsResults.shuttlePickup": "Retirada com traslado",
  "carsResults.cityLocation": "Local na cidade",
  "carsResults.location.airport": "Aeroporto",
  "carsResults.location.cityCenter": "Centro da cidade",
  "carsResults.location.hotelArea": "Área de hotéis",
  "carsResults.location.trainStation": "Estação de trem",
  "carsFaq.heading": "Perguntas frequentes sobre carros",
  "carsFaq.0.question":
    "Quais informações preciso para pesquisar um carro de aluguel?",
  "carsFaq.0.answer":
    "Informe o local de retirada, as datas de retirada e devolução, os horários de retirada e devolução, a idade do motorista e se você pretende devolver o carro em outro local.",
  "carsFaq.1.question": "Posso devolver o carro em outro local?",
  "carsFaq.1.answer":
    "Sim. Selecione Local de devolução diferente no formulário de pesquisa e informe a cidade, aeroporto ou endereço onde pretende devolver o carro.",
  "carsFaq.2.question":
    "Por que a idade do motorista importa no aluguel de carros?",
  "carsFaq.2.answer":
    "Provedores de aluguel podem aplicar regras, taxas, disponibilidade de veículos ou requisitos de depósito diferentes conforme a idade do motorista e o local.",
  "carsFaq.3.question":
    "O que devo verificar antes de reservar um carro de aluguel?",
  "carsFaq.3.answer":
    "Revise o local de retirada e devolução, datas, horários, política de quilometragem, política de combustível, opções de seguro, termos de cancelamento, requisitos de depósito e documentos exigidos antes de reservar.",
  "carsFaq.4.question": "Onde o preço final do aluguel é confirmado?",
  "carsFaq.4.answer":
    "O provedor confirma preço final, disponibilidade do veículo, impostos, taxas, requisitos de depósito e regras do aluguel antes da reserva.",
  "carsFaq.5.question": "Quais documentos posso precisar na retirada?",
  "carsFaq.5.answer":
    "Provedores de aluguel podem solicitar carteira de motorista válida, cartão de pagamento, documento de identidade e quaisquer documentos exigidos pelo país ou local de retirada.",
  supportEyebrow: "Central de ajuda do Kurioticket",
  supportTitle: "Suporte ao cliente",
  supportBeforeContactHeading: "Antes de entrar em contato",
  supportBeforeContactDescription:
    "Inclua o e-mail da sua conta Kurioticket, o que você estava tentando fazer, a rota ou o hotel, se for relevante, e qualquer página de provedor para a qual você foi redirecionado. Não envie números completos de cartão de pagamento nem números de documentos de viagem sensíveis.",
  supportTicketHeading: "Criar um chamado de suporte",
  supportFormEmailLabel: "E-mail",
  supportFormSubjectLabel: "Assunto",
  supportFormCategoryLabel: "Categoria",
  supportCategorySearchHelp: "Ajuda com pesquisa",
  supportCategoryPriceAlerts: "Alertas de preço",
  supportCategoryPartnerRedirect: "Redirecionamento para provedor",
  supportCategoryAccountHelp: "Ajuda com conta",
  supportFormMessageLabel: "Como podemos ajudar?",
  supportFormMessagePlaceholder:
    "Compartilhe o contexto da rota, hotel, alerta ou conta.",
  supportFormSubmit: "Enviar solicitação",
  supportFormSending: "Enviando...",
  supportFormSuccessPrefix: "Chamado",
  supportFormSuccessSuffix: "aberto.",
  supportFormErrorFallback: "Não foi possível abrir o chamado.",
  supportFaqHeading: "Perguntas frequentes",
  supportFaqAccountQuestion: "Ajuda com conta e login",
  supportFaqAccountAnswer:
    "O Kurioticket pode ajudar com acesso à conta, problemas de login, cadastro, acesso ao perfil e problemas da plataforma relacionados à conta.",
  supportFaqSearchQuestion: "Ajuda com pesquisa e resultados",
  supportFaqSearchAnswer:
    "O Kurioticket pode ajudar quando a pesquisa de voos ou hotéis não funciona, os resultados não carregam, os filtros estão confusos ou os preços e provedores não aparecem como esperado.",
  supportFaqSavedTripsQuestion: "Viagens salvas e alertas",
  supportFaqSavedTripsAnswer:
    "O Kurioticket pode ajudar com viagens salvas, pesquisas recentes, alertas de preço, problemas de notificação e ferramentas de viagem vinculadas à conta.",
  supportFaqRedirectQuestion:
    "Ajuda com reserva e redirecionamento para provedor",
  supportFaqRedirectAnswer:
    "O Kurioticket pode ajudar se o redirecionamento para um parceiro ou provedor falhar, abrir a página errada ou não preservar a viagem ou os detalhes da pesquisa selecionados.",
  supportFaqAlreadyBookedQuestion: "Já reservou com um provedor?",
  supportFaqAlreadyBookedAnswer:
    "Se sua reserva foi concluída com uma companhia aérea, hotel, agência de viagens ou provedor externo, esse provedor é responsável por alterações na reserva, reembolsos, cancelamentos, check-in, embarque, recibos e documentos de viagem.",
  supportFaqChangeBookingQuestion: "O Kurioticket pode alterar minha reserva?",
  supportFaqChangeBookingAnswer:
    "O Kurioticket só pode ajudar com reservas feitas diretamente pelo Kurioticket se, e quando, a reserva direta estiver disponível. Para reservas concluídas com provedores externos, entre em contato diretamente com esse provedor.",
  supportFaqWhyRedirectedQuestion: "Por que fui enviado para outro provedor?",
  supportFaqWhyRedirectedAnswer:
    "O Kurioticket é uma plataforma de pesquisa e comparação de viagens, e alguns resultados redirecionam para provedores confiáveis onde você conclui a reserva, o pagamento e o suporte específico do provedor.",

  serviceGuaranteeEyebrow: "Compromisso de serviço do Kurioticket",
  serviceGuaranteeTitle: "Garantia de serviço",
  serviceGuaranteeDescription:
    "Queremos que os viajantes entendam como o Kurioticket funciona e o que podem esperar ao usar nossa plataforma.",
  serviceGuaranteeFaqHeading: "Perguntas frequentes",
  serviceGuaranteeFaqDescription:
    "Estas respostas explicam o papel do Kurioticket como plataforma de pesquisa e comparação de viagens.",
  serviceGuaranteeFaqWhatGuaranteeQuestion: "O que o Kurioticket garante?",
  serviceGuaranteeFaqWhatGuaranteeAnswer:
    "O Kurioticket foi criado para ajudar os viajantes a comparar opções de viagem com clareza. Nosso objetivo é oferecer uma experiência de plataforma confiável, informações de pesquisa transparentes e caminhos claros para as páginas de reserva dos provedores.",
  serviceGuaranteeFaqResultsDisplayedQuestion:
    "Como os resultados de viagem são exibidos?",
  serviceGuaranteeFaqResultsDisplayedAnswer:
    "Os resultados são exibidos com base nas informações disponíveis dos provedores de viagem, incluindo rotas, datas, preços e detalhes do provedor quando disponíveis.",
  serviceGuaranteeFaqRedirectedQuestion:
    "Por que sou redirecionado para outro provedor?",
  serviceGuaranteeFaqRedirectedAnswer:
    "Alguns resultados são concluídos no site de um provedor externo. Ao escolher uma dessas opções, o Kurioticket redireciona você para que o provedor possa cuidar da reserva, do pagamento e do atendimento específico da viagem.",
  serviceGuaranteeFaqBookDirectlyQuestion:
    "Eu reservo diretamente no Kurioticket?",
  serviceGuaranteeFaqBookDirectlyAnswer:
    "O Kurioticket é principalmente uma plataforma de pesquisa e comparação de viagens. Se um resultado redirecionar para um provedor, a reserva será concluída com esse provedor, e não no Kurioticket.",
  serviceGuaranteeFaqPricesGuaranteedQuestion:
    "Os preços são sempre garantidos?",
  serviceGuaranteeFaqPricesGuaranteedAnswer:
    "Não. Os preços podem mudar conforme disponibilidade do provedor, impostos, taxas, moeda e momento da pesquisa. Sempre revise o preço final na página do provedor antes de reservar.",
  serviceGuaranteeFaqChooseProvidersQuestion:
    "Como o Kurioticket escolhe os provedores?",
  serviceGuaranteeFaqChooseProvidersAnswer:
    "O Kurioticket trabalha com provedores de viagem e fontes de dados que podem fornecer resultados de pesquisa relevantes. A disponibilidade, os preços e as opções exibidas podem variar conforme rota, destino e cobertura do provedor.",
  serviceGuaranteeFaqEncounterIssueQuestion:
    "O que devo fazer se encontrar um problema?",
  serviceGuaranteeFaqEncounterIssueAnswer:
    "Se o problema estiver relacionado à pesquisa, acesso à conta, viagens salvas, alertas ou a um redirecionamento do Kurioticket, entre em contato com o suporte do Kurioticket. Se você já reservou com um provedor, entre em contato com esse provedor para alterações na reserva, reembolsos, cancelamentos ou documentos de viagem.",
  serviceGuaranteeFaqContactSupportQuestion:
    "Como posso entrar em contato com o suporte?",
  serviceGuaranteeFaqContactSupportAnswer:
    "Use a página de suporte ao cliente e inclua o e-mail da sua conta, o que você estava tentando fazer e qualquer detalhe de rota, hotel ou provedor que possa nos ajudar a analisar o problema.",
  serviceGuaranteeHelpCardTitle:
    "Precisa de ajuda com sua conta ou pesquisa?",
  serviceGuaranteeSupportCta: "Contatar o suporte ao cliente",

};
