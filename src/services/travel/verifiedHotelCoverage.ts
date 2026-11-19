import type { HotelDestinationSuggestion } from "@/data/hotelDestinations";

export type VerifiedHotelCoverageProperty = {
  destinationId: string;
  name: string;
  streetAddress: string;
  latitude: number;
  longitude: number;
  officialSourceUrl: string;
  locationSourceUrl: string;
  lastReviewed: string;
};

/**
 * Source-backed discovery properties used only to prove destination coverage.
 * They intentionally carry no price, availability, classification, room or amenity claims.
 */
export const verifiedHotelCoverageProperties: readonly VerifiedHotelCoverageProperty[] =
  [
    {
      destinationId: "ae-abu-dhabi",
      name: "Royal M Hotel by Gewan Abu Dhabi",
      streetAddress:
        "Royal M Hotel by Gewan Abu Dhabi, شارع سنان بن خادم المهيري, البطين, أبو ظبي, أبوظبي, أبو ظبي, الإمارات العربية المتحدة",
      latitude: 24.4485023,
      longitude: 54.338003,
      officialSourceUrl: "https://royalmhotels.com/abudhabi/",
      locationSourceUrl: "https://www.openstreetmap.org/way/1303481084",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ae-dubai",
      name: "The First Collection Business Bay, Dubai, a Tribute Portfolio Hotel",
      streetAddress:
        "The First Collection Business Bay, Dubai, a Tribute Portfolio Hotel, شارع الأعمال, الخليج التجاري, دبي, 215373, الإمارات العربية المتحدة",
      latitude: 25.1781877,
      longitude: 55.2678486,
      officialSourceUrl:
        "https://www.marriott.com/en-us/hotels/dxbtb-the-first-collection-business-bay-dubai-a-tribute-portfolio-hotel/overview/",
      locationSourceUrl: "https://www.openstreetmap.org/way/1076132569",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ae-sharjah",
      name: "The Chedi Al Bait, Sharjah",
      streetAddress:
        "فندق ذا تشيدي البيت, شارع الكورنيش, Rolla, الغرب, مدينة الشارقة, الشارقة, الإمارات العربية المتحدة",
      latitude: 25.3588955,
      longitude: 55.3841642,
      officialSourceUrl:
        "https://www.ghmhotels.com/en/the-chedi-al-bait-sharjah/",
      locationSourceUrl: "https://www.openstreetmap.org/way/1108489969",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ar-buenos-aires",
      name: "Four Seasons",
      streetAddress:
        "Four Seasons, 1086, Posadas, Retiro, Buenos Aires, Comuna 1, Ciudad Autónoma de Buenos Aires, C1014AAD, Argentina",
      latitude: -34.5906065,
      longitude: -58.3826201,
      officialSourceUrl: "https://www.fourseasons.com/es/buenosaires/",
      locationSourceUrl: "https://www.openstreetmap.org/way/61920011",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "au-brisbane",
      name: "Riverside Hotel Southbank",
      streetAddress:
        "Riverside Hotel Southbank, 20, Montague Road, South Bank, South Brisbane, Brisbane, Queensland, 4101, Australia",
      latitude: -27.4712638,
      longitude: 153.0161535,
      officialSourceUrl: "https://riversidehotel.com.au/",
      locationSourceUrl: "https://www.openstreetmap.org/way/530229996",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "au-melbourne",
      name: "The Langham",
      streetAddress:
        "The Langham, 1, Southgate Avenue, Southbank, Melbourne, Victoria, 3006, Australia",
      latitude: -37.8205784,
      longitude: 144.9657396,
      officialSourceUrl:
        "https://www.langhamhotels.com/en/the-langham/melbourne/",
      locationSourceUrl: "https://www.openstreetmap.org/way/11914778",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "au-sydney",
      name: "Shangri-La Hotel",
      streetAddress:
        "Shangri-La Hotel, 176, Cumberland Street, The Rocks, Sydney, New South Wales, 2000, Australia",
      latitude: -33.8612917,
      longitude: 151.2065925,
      officialSourceUrl: "http://www.shangri-la.com/sydney/shangrila/",
      locationSourceUrl: "https://www.openstreetmap.org/way/335697864",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "br-rio",
      name: "Radisson Hotel Barra Rio de Janeiro",
      streetAddress:
        "Radisson Hotel Barra Rio de Janeiro, 600, Avenida Evandro Lins e Silva, Barra da Tijuca, Rio de Janeiro, Região Sudeste, 22631-470, Brasil",
      latitude: -23.0044949,
      longitude: -43.3276884,
      officialSourceUrl:
        "https://www.radissonhotels.com/en-us/hotels/radisson-barra-de-tijuca",
      locationSourceUrl: "https://www.openstreetmap.org/way/779042795",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "br-salvador",
      name: "Rede Concept Hotel Salvador",
      streetAddress:
        "Rede Concept Hotel Salvador, 1207, Rua Doutor Augusto Lopes Pontes, Costa Azul, Salvador, Bahia, Região Nordeste, 41760-035, Brasil",
      latitude: -12.9821958,
      longitude: -38.4414582,
      officialSourceUrl: "https://redeconcepthotelsalvador.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/376978610",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "br-sao-paulo",
      name: "Rosewood São Paulo",
      streetAddress:
        "Rosewood São Paulo, Rua Itapeva, Bixiga, Bela Vista, São Paulo, Região Sudeste, 01332-000, Brasil",
      latitude: -23.5598897,
      longitude: -46.6524164,
      officialSourceUrl: "https://www.rosewoodhotels.com/en/sao-paulo",
      locationSourceUrl: "https://www.openstreetmap.org/way/405790501",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ca-montreal",
      name: "Hotel 10",
      streetAddress:
        "Hotel 10, 10, Rue Sherbrooke Ouest, Ville-Marie, Montréal, Agglomération de Montréal, Montréal (région administrative), Québec, H2X 4C9, Canada",
      latitude: 45.5121838,
      longitude: -73.5692112,
      officialSourceUrl: "https://www.hotel10montreal.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/130660352",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ca-toronto",
      name: "Fairmont Royal York Hotel",
      streetAddress:
        "Fairmont Royal York Hotel, 100, Front Street West, South Core, Spadina—Fort York, Toronto, Golden Horseshoe, Ontario, M5J 1E3, Canada",
      latitude: 43.6459092,
      longitude: -79.3813637,
      officialSourceUrl: "https://www.fairmont.com/royal-york-toronto/",
      locationSourceUrl: "https://www.openstreetmap.org/way/31728160",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ca-vancouver",
      name: "Hotel At The Waldorf",
      streetAddress:
        "Hotel At The Waldorf, 1489, East Hastings Street, Grandview-Woodland, Vancouver, Metro Vancouver Regional District, British Columbia, V5L 1N9, Canada",
      latitude: 49.2814894,
      longitude: -123.074332,
      officialSourceUrl: "https://www.hotelatthewaldorf.ca/",
      locationSourceUrl: "https://www.openstreetmap.org/node/3789313502",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ch-zurich",
      name: "Mama Shelter",
      streetAddress:
        "Mama Shelter, 44, Schulstrasse, Oerlikon, Kreis 11, Zürich, Bezirk Zürich, Zürich, 8050, Schweiz/Suisse/Svizzera/Svizra",
      latitude: 47.410819,
      longitude: 8.5439538,
      officialSourceUrl: "https://mamashelter.com/zurich/",
      locationSourceUrl: "https://www.openstreetmap.org/way/42922208",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "cn-shanghai",
      name: "和平饭店",
      streetAddress:
        "和平饭店, 20, 南京东路, 外滩源, 外滩街道, 上海市, 黄浦区, 上海市, 200002, 中国",
      latitude: 31.2410848,
      longitude: 121.485078,
      officialSourceUrl: "https://www.fairmont.com/peacehotel",
      locationSourceUrl: "https://www.openstreetmap.org/relation/2376366",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "co-cartagena",
      name: "GHL Collection Armeria Real Hotel",
      streetAddress:
        "GHL Collection Armeria Real Hotel, Carrera 11, Calle de las Palmas, Getsemaní, Cartagena de Indias, Dique, Bolívar, RAP Caribe, 130003, Colombia",
      latitude: 10.4181441,
      longitude: -75.5454794,
      officialSourceUrl: "https://www.armeriarealhotel.com/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/2173134",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "de-berlin",
      name: "The Westin Grand Berlin",
      streetAddress:
        "The Westin Grand Berlin, 158-164, Friedrichstraße, Dorotheenstadt, Mitte, Berlin, 10117, Deutschland",
      latitude: 52.5158768,
      longitude: 13.3886042,
      officialSourceUrl: "https://www.westin-berlin.com/",
      locationSourceUrl: "https://www.openstreetmap.org/node/86001788",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "de-cologne",
      name: "B&B Hotel Köln-City",
      streetAddress:
        "B&B Hotel Köln-City, 115, Oskar-Jäger-Straße, Ehrenfeld, Köln, Nordrhein-Westfalen, 50825, Deutschland",
      latitude: 50.9428475,
      longitude: 6.9083051,
      officialSourceUrl: "https://www.hotel-bb.com/en/hotel/koeln-city",
      locationSourceUrl: "https://www.openstreetmap.org/way/914690530",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "de-frankfurt",
      name: "Leonardo Royal Hotel Frankfurt",
      streetAddress:
        "Leonardo Royal Hotel Frankfurt, Mailänder Straße, Sachsenhausen Süd, Sachsenhausen, Süd, Frankfurt am Main, Hessen, 60598, Deutschland",
      latitude: 50.0914498,
      longitude: 8.6907053,
      officialSourceUrl:
        "https://www.leonardo-hotels.de/leonardo-royal-hotel-frankfurt",
      locationSourceUrl: "https://www.openstreetmap.org/node/35354592",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "de-hamburg",
      name: "Hotel Hafen Hamburg",
      streetAddress:
        "Hotel Hafen Hamburg, 9, Seewartenstraße, St. Pauli, Hamburg-Mitte, Hamburg, 20459, Deutschland",
      latitude: 53.5469682,
      longitude: 9.969637,
      officialSourceUrl: "https://www.hotel-hafen-hamburg.de/",
      locationSourceUrl: "https://www.openstreetmap.org/way/57378504",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "de-munich",
      name: "Hotel Bayerischer Hof",
      streetAddress:
        "Hotel Bayerischer Hof, 6, Promenadeplatz, Kreuzviertel, Altstadt-Lehel, München, Bayern, 80333, Deutschland",
      latitude: 48.1404741,
      longitude: 11.5729285,
      officialSourceUrl: "https://www.bayerischerhof.de/",
      locationSourceUrl: "https://www.openstreetmap.org/way/34102840",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "eg-cairo",
      name: "Marriott Mena House, Cairo",
      streetAddress:
        "Marriott Mena House, Cairo, 6, طريق القاهرة, الاسكندرية الصحراوي, كوم الأخضر, كفرة نصار, الجيزة, 12556, مصر",
      latitude: 29.9858579,
      longitude: 31.1327491,
      officialSourceUrl:
        "https://www.marriott.com/en-us/hotels/caimn-marriott-mena-house-cairo/overview/",
      locationSourceUrl: "https://www.openstreetmap.org/node/7666925600",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "es-barcelona",
      name: "Mandarin Oriental",
      streetAddress:
        "Mandarin Oriental, 38-40, Passeig de Gràcia (lateral Besòs), la Dreta de l'Eixample, l'Eixample, Barcelona, Barcelonès, Barcelona, Catalunya, 08007, España",
      latitude: 41.391381,
      longitude: 2.166914,
      officialSourceUrl:
        "https://www.mandarinoriental.com/es-es/barcelona/passeig-de-gracia",
      locationSourceUrl: "https://www.openstreetmap.org/relation/9336464",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "es-madrid",
      name: "The Palace",
      streetAddress:
        "The Palace, 7, Plaza de las Cortes, Barrio de las Letras, Cortes, Centro, Madrid, Comunidad de Madrid, 28014, España",
      latitude: 40.4154544,
      longitude: -3.6958024,
      officialSourceUrl:
        "https://www.marriott.com/es/hotels/madcl-the-palace-a-luxury-collection-hotel-madrid/overview/",
      locationSourceUrl: "https://www.openstreetmap.org/node/167302776",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "es-seville",
      name: "Hotel Melia",
      streetAddress:
        "Hotel Melia, 2, Calle Doctor Pedro de Castro, Huerta de la Salud, Distrito Sur, Sevilla, Andalucía, 41018, España",
      latitude: 37.3781461,
      longitude: -5.9831113,
      officialSourceUrl:
        "https://www.melia.com/en/hotels/spain/seville/melia-sevilla",
      locationSourceUrl: "https://www.openstreetmap.org/way/70081022",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "es-valencia",
      name: "The Westin",
      streetAddress:
        "The Westin, 16, Carrer del Naturalista Rafael Cisternas, Exposició, el Pla del Real, València, Comarca de València, València / Valencia, Comunitat Valenciana, 46021, España",
      latitude: 39.4729327,
      longitude: -0.3607578,
      officialSourceUrl:
        "https://www.marriott.com/en-us/hotels/vlcwi-the-westin-valencia/overview/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/17051068",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "fr-cdg-area",
      name: "citizenM Paris Charles de Gaulle Airport",
      streetAddress: "7 Rue de Rome, 93290 Roissy-en-France, France",
      latitude: 49.0094766,
      longitude: 2.5563297,
      officialSourceUrl:
        "https://www.citizenm.com/hotels/europe/paris/charles-de-gaulle-airport-hotel",
      locationSourceUrl: "https://www.openstreetmap.org/way/510716283",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "fr-lyon",
      name: "InterContinental Lyon - Hotel Dieu",
      streetAddress:
        "InterContinental Lyon - Hotel Dieu, 20, Quai Jules Courmont, Bellecour, Lyon 2e Arrondissement, Lyon, Métropole de Lyon, Rhône, Auvergne-Rhône-Alpes, France métropolitaine, 69002, France",
      latitude: 45.7588583,
      longitude: 4.8369033,
      officialSourceUrl: "https://lyon.intercontinental.com/",
      locationSourceUrl: "https://www.openstreetmap.org/node/6058647076",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "fr-marseille",
      name: "greet Hotel Marseille Centre Saint Charles",
      streetAddress:
        "greet Hotel Marseille Centre Saint Charles, 4, Allée Léon Gambetta, Le Chapitre, Marseille 1er Arrondissement, Marseille, Bouches-du-Rhône, Provence-Alpes-Côte d'Azur, France métropolitaine, 13001, France",
      latitude: 43.2988642,
      longitude: 5.3812103,
      officialSourceUrl: "https://all.accor.com/hotel/B675/index.de.shtml",
      locationSourceUrl: "https://www.openstreetmap.org/node/388275064",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "fr-nice",
      name: "Hôtel Negresco",
      streetAddress:
        "Hôtel Negresco, Rue du Commandant Berretta, Carré d'Or, La Buffa, Nice, Alpes-Maritimes, Provence-Alpes-Côte d'Azur, France métropolitaine, 06000, France",
      latitude: 43.6947097,
      longitude: 7.2577521,
      officialSourceUrl: "https://www.hotel-negresco-nice.com/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/4563464",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gb-birmingham",
      name: "Grand Hotel",
      streetAddress:
        "Grand Hotel, 1, Church Street, Ladywood, Birmingham, West Midlands, England, B3 2FE, United Kingdom",
      latitude: 52.481982,
      longitude: -1.8992876,
      officialSourceUrl: "https://www.thegrandhotelbirmingham.co.uk",
      locationSourceUrl: "https://www.openstreetmap.org/way/56395995",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gb-edinburgh",
      name: "The Scotsman Hotel",
      streetAddress:
        "The Scotsman Hotel, 20-24, North Bridge, Abbeyhill, Old Town, City of Edinburgh, Alba / Scotland, EH1 1TR, United Kingdom",
      latitude: 55.9510822,
      longitude: -3.1885303,
      officialSourceUrl: "http://www.thescotsmanhotel.co.uk/",
      locationSourceUrl: "https://www.openstreetmap.org/node/2339288065",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gb-heathrow-area",
      name: "Hilton Garden Inn London Heathrow Airport",
      streetAddress:
        "Hilton Garden Inn London Heathrow Airport, Eastern Perimeter Road, Hatton Cross, London Borough of Hillingdon, Greater London, England, TW6 2SQ, United Kingdom",
      latitude: 51.4683672,
      longitude: -0.4189246,
      officialSourceUrl:
        "https://www.hilton.com/en/hotels/lhrepgi-hilton-garden-inn-london-heathrow-airport/",
      locationSourceUrl: "https://www.openstreetmap.org/way/187395726",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gb-manchester",
      name: "The Lowry Hotel",
      streetAddress:
        "The Lowry Hotel, 50, Dearmans Place, Trinity, Blackfriars, City Centre, Salford, Greater Manchester, England, M3 5LH, United Kingdom",
      latitude: 53.4832283,
      longitude: -2.2506165,
      officialSourceUrl: "https://www.thelowryhotel.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/256472973",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gh-accra",
      name: "Fiesta Royale Hotel",
      streetAddress:
        "Fiesta Royale Hotel, South Legon, Accra, Ayawaso West Municipal District, Greater Accra Region, Ghana",
      latitude: 5.6191212,
      longitude: -0.1913947,
      officialSourceUrl: "https://fiestahospitality.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/449177361",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "gh-kumasi",
      name: "Fosua Hotel",
      streetAddress:
        "Fosua Hotel, Adum Road, Adum, Kumasi, Kumasi Metropolitan District, Ashanti Region, AK-010-1295, Ghana",
      latitude: 6.6889061,
      longitude: -1.6196901,
      officialSourceUrl: "https://fosuahotelgh.com/",
      locationSourceUrl: "https://www.openstreetmap.org/node/14040377145",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "hk-hong-kong",
      name: "8度海逸酒店 Harbour Plaza 8 Degrees",
      streetAddress:
        "8度海逸酒店 Harbour Plaza 8 Degrees, 九龍城道 Kowloon City Road, 靠背石 Kau Pui Shek, 馬頭涌 Ma Tau Chung, 九龍城區 Kowloon City District, 九龍 Kowloon, 香港 Hong Kong, 中国",
      latitude: 22.3229275,
      longitude: 114.1906938,
      officialSourceUrl: "https://www.harbour-plaza.com/8degrees/en/",
      locationSourceUrl: "https://www.openstreetmap.org/way/126052285",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "id-bali",
      name: "1000 Dream Bungalow & Restaurant",
      streetAddress:
        "1000 Dream Bungalow & Restaurant, Jalan Hotel Puri Bagus, Danginmargi, Pemaron, Buleleng, Bali, 81119, Indonesia",
      latitude: -8.1291429,
      longitude: 115.0603416,
      officialSourceUrl: "https://seribudream.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/389123402",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "in-bengaluru",
      name: "Taj West End",
      streetAddress:
        "Taj West End, Race Course Road, Fair Field Layout, High Grounds, Sampangirama Nagar, Bengaluru Central City Corporation, Bengaluru, Bangalore North, Bengaluru Urban, Karnataka, 560001, India",
      latitude: 12.9854295,
      longitude: 77.5845146,
      officialSourceUrl:
        "https://www.tajhotels.com/en-in/taj/taj-west-end-bengaluru",
      locationSourceUrl: "https://www.openstreetmap.org/way/38872927",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "in-delhi",
      name: "Hotel GTC",
      streetAddress:
        "Hotel GTC, E-514, Indramohan Bhardwaj Marg, Greater Kailash, Alaknanda, South, Delhi, South Delhi, Delhi, 110048, India",
      latitude: 28.5369298,
      longitude: 77.2394367,
      officialSourceUrl: "https://hotelgtc.in/",
      locationSourceUrl: "https://www.openstreetmap.org/way/351866119",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "in-goa",
      name: "Taj Fort Aguada Resort & Spa, Goa",
      streetAddress: "Sinquerim Beach, Candolim, Goa 403515, India",
      latitude: 15.4976094,
      longitude: 73.7670984,
      officialSourceUrl:
        "https://www.tajhotels.com/en-in/hotels/taj-fort-aguada-goa",
      locationSourceUrl: "https://www.openstreetmap.org/node/8410571504",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "in-mumbai",
      name: "Hotel Marine Plaza",
      streetAddress:
        "Hotel Marine Plaza, Marine Drive, Mantralaya, Fort, A Ward, Mumbai Zone 1, Mumbai City District, Maharashtra, 400023, India",
      latitude: 18.9311659,
      longitude: 72.8230972,
      officialSourceUrl: "https://www.hotelmarineplaza.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/40309557",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "it-florence",
      name: "Savoy",
      streetAddress:
        "Savoy, Piazza della Repubblica, Quartiere 1, Firenze, Toscana, 50123, Italia",
      latitude: 43.7717214,
      longitude: 11.2545542,
      officialSourceUrl: "http://www.hotelsavoy.it/",
      locationSourceUrl: "https://www.openstreetmap.org/node/262796018",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "it-milan",
      name: "Principe di Savoia",
      streetAddress:
        "Principe di Savoia, 17, Piazza della Repubblica, Centrale, Municipio 2, Milano, Rodano, Milano, Lombardia, 20124, Italia",
      latitude: 45.4797878,
      longitude: 9.1963935,
      officialSourceUrl:
        "https://www.dorchestercollection.com/en/milan/hotel-principe-di-savoia/",
      locationSourceUrl: "https://www.openstreetmap.org/node/298985382",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "it-rome",
      name: "Adoro Otium Hotel",
      streetAddress:
        "Adoro Otium Hotel, 280, Via delle Sette Chiese, Tor Marancia, Municipio Roma VIII, Roma, Roma Capitale, Lazio, 00147, Italia",
      latitude: 41.8586632,
      longitude: 12.504465,
      officialSourceUrl: "https://www.adorohotel.it/",
      locationSourceUrl: "https://www.openstreetmap.org/way/1349107731",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "it-venice",
      name: "Hotel Ai Cavalieri",
      streetAddress:
        "Hotel Ai Cavalieri, 6108, Calle de Borgoloco, Castello, Venezia-Murano-Burano, Murano, Venezia, Veneto, 30122, Italia",
      latitude: 45.4383977,
      longitude: 12.3400801,
      officialSourceUrl: "https://www.hotelaicavalieri.com/it/",
      locationSourceUrl: "https://www.openstreetmap.org/way/493305245",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "jp-kyoto",
      name: "Kyoto Yura Hotel MGallery",
      streetAddress:
        "Kyoto Yura Hotel MGallery, 大橋町, 東山区, 京都市, 京都府, 605-0009, 日本",
      latitude: 35.0089347,
      longitude: 135.7739989,
      officialSourceUrl:
        "https://www.accorhotels.com/gb/hotel-B2Z1-kyoto-sanjo-hotel-mgallery-opening-april-2019/index.shtml",
      locationSourceUrl: "https://www.openstreetmap.org/way/720177306",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "jp-osaka",
      name: "DoubleTree by Hilton Osaka Castle",
      streetAddress:
        "DoubleTree by Hilton Osaka Castle, 1, 大手前一丁目, 中央区, 大阪市, 大阪府, 540-0008, 日本",
      latitude: 34.6906022,
      longitude: 135.5220421,
      officialSourceUrl:
        "https://www.hilton.com/en/hotels/osaocdi-doubletree-osaka-castle/",
      locationSourceUrl: "https://www.openstreetmap.org/node/12025521060",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ke-mombasa",
      name: "The Reef hotel",
      streetAddress:
        "The Reef hotel, Mount Kenya Road, Kenol, ziwa La Ng'ombe ward, Nyali, Mombasa, 80100, Kenya",
      latitude: -4.0286323,
      longitude: 39.7204302,
      officialSourceUrl: "https://reefhotelkenya.com/",
      locationSourceUrl: "https://www.openstreetmap.org/node/1315895449",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ke-nairobi",
      name: "Fairmont The Norfolk",
      streetAddress:
        "Fairmont The Norfolk, Harry Thuku Road, City Centre sublocation, Starehe location, CBD division, Starehe, Nairobi, 46464, Kenya",
      latitude: -1.2781088,
      longitude: 36.8164987,
      officialSourceUrl: "https://www.fairmont.com/norfolk-hotel-nairobi/",
      locationSourceUrl: "https://www.openstreetmap.org/way/83245285",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "kr-seoul",
      name: "시그니엘 서울",
      streetAddress:
        "시그니엘 서울, 잠실로, 신천동, 잠실6동, 송파구, 서울특별시, 05551, 대한민국",
      latitude: 37.5125735,
      longitude: 127.1028174,
      officialSourceUrl: "https://www.lottehotel.com/seoul-signiel/en.html",
      locationSourceUrl: "https://www.openstreetmap.org/node/5785435656",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ma-marrakesh",
      name: "Hotel Riu Tikida Palmeraie",
      streetAddress:
        "Hotel Riu Tikida Palmeraie, N8, km 6, Route de Fes, Annakhil ⵏⴰⵅⵉⵍ النخيل, Arrondissement d'Annakhil مقاطعة النخيل, Marrakech ⵎⵕⵕⴰⴽⵯⵛ مراكش, Pachalik de Marrakech, Préfecture de Marrakech عمالة مراكش, Marrakech-Safi ⵎⵕⵕⴰⴽⵛ-ⴰⵙⴼⵉ مراكش-أسفي, 40007, Maroc ⵍⵎⵖⵔⵉⴱ المغرب",
      latitude: 31.6505454,
      longitude: -7.9375358,
      officialSourceUrl:
        "https://www.riu.com/en/hotel/morocco/marrakech/hotel-riu-tikida-palmeraie",
      locationSourceUrl: "https://www.openstreetmap.org/way/335906857",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "mx-cancun",
      name: "Hotel Riu Ventura",
      streetAddress:
        "Hotel Riu Ventura, Boulevard Kukulcán, Zona Hotelera, Cancún, Benito Juárez, Distrito 8, Quintana Roo, 77500, México",
      latitude: 21.0581597,
      longitude: -86.7808023,
      officialSourceUrl:
        "https://www.riu.com/en/hotel/mexico/cancun/hotel-riu-ventura",
      locationSourceUrl: "https://www.openstreetmap.org/way/1369653284",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "mx-guadalajara",
      name: "Hotel Riu Plaza Guadalajara",
      streetAddress:
        "Hotel Riu Plaza Guadalajara, Avenida Guadalupe, Jardines de Los Arcos 1a Sección, Guadalajara, Región Centro, Jalisco, 45040, México",
      latitude: 20.6658159,
      longitude: -103.3937283,
      officialSourceUrl:
        "https://www.riu.com/es/hotel/mexico/guadalajara/hotel-riu-plaza-guadalajara",
      locationSourceUrl: "https://www.openstreetmap.org/way/814265084",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "mx-mexico-city",
      name: "Four Seasons Hotel Mexico City",
      streetAddress:
        "Four Seasons Hotel Mexico City, 500, Avenida Paseo de la Reforma, Juárez, Condesa, Ciudad de México, Cuauhtémoc, Ciudad de México, 06600, México",
      latitude: 19.42293,
      longitude: -99.1742051,
      officialSourceUrl: "https://www.fourseasons.com/es/mexico/",
      locationSourceUrl: "https://www.openstreetmap.org/node/13807008024",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "my-kuala-lumpur",
      name: "The Federal Kuala Lumpur",
      streetAddress:
        "The Federal Kuala Lumpur, 35, Jalan Bukit Bintang, Bukit Bintang, Kuala Lumpur, 55100, Malaysia",
      latitude: 3.1443151,
      longitude: 101.7088664,
      officialSourceUrl:
        "https://www.fhihotels.com/index.php/federal-contact-us",
      locationSourceUrl: "https://www.openstreetmap.org/way/28271279",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ng-abuja",
      name: "Transcorp Hilton Abuja",
      streetAddress:
        "Transcorp Hilton Abuja, 1, Zambezi Crescent, Maitama, Abuja, Municipal Area Council, Federal Capital Territory, 900001, Nigeria",
      latitude: 9.074966,
      longitude: 7.494881,
      officialSourceUrl:
        "https://www.hilton.com/en/hotels/abuhitw-transcorp-hilton-abuja/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/12186132",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ng-lagos",
      name: "Federal Palace & Casino",
      streetAddress:
        "Federal Palace & Casino, 6-8, Ahmadu Bello Way, Victoria Island, Ikoyi, Eti Osa, Lagos, 101241, Nigeria",
      latitude: 6.4305593,
      longitude: 3.4073679,
      officialSourceUrl: "http://www.suninternational.com/federal-palace",
      locationSourceUrl: "https://www.openstreetmap.org/way/567150477",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ng-port-harcourt",
      name: "Hotel Presidential",
      streetAddress:
        "Hotel Presidential, Port Harcourt - Aba Expressway, Rivers State House of Assembly Quarters, Rumu-Ola, Rumuokwuta, Obio/Akpor, Rivers, 101014, Nigeria",
      latitude: 4.8300043,
      longitude: 7.0037717,
      officialSourceUrl: "https://presidential-hotel.com/about-us/",
      locationSourceUrl: "https://www.openstreetmap.org/node/5586215922",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "nl-amsterdam",
      name: "Conscious Hotel Museum Square",
      streetAddress:
        "Conscious Hotel Museum Square, De Lairessestraat, Museumkwartier, Oud-Zuid, Zuid, Amsterdam, Noord-Holland, Nederland, 1071 JL, Nederland",
      latitude: 52.3549022,
      longitude: 4.8773412,
      officialSourceUrl: "https://conscioushotels.com",
      locationSourceUrl: "https://www.openstreetmap.org/way/277121073",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "nl-rotterdam",
      name: "Hotel New York",
      streetAddress:
        "Hotel New York, 1, Koninginnenhoofd, Wilhelminapier, Kop van Zuid, Feijenoord, Rotterdam, Zuid-Holland, Nederland, 3072 AD, Nederland",
      latitude: 51.9040923,
      longitude: 4.4845052,
      officialSourceUrl: "https://hotelnewyork.nl",
      locationSourceUrl: "https://www.openstreetmap.org/node/2790953172",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "nl-the-hague",
      name: "ARQ Paleis Hotel",
      streetAddress:
        "ARQ Paleis Hotel, 26, Molenstraat, Kortenbos, Centrum, Den Haag, Zuid-Holland, Nederland, 2513 BL, Nederland",
      latitude: 52.0797723,
      longitude: 4.3064225,
      officialSourceUrl: "https://www.arqpaleishotel.nl/",
      locationSourceUrl: "https://www.openstreetmap.org/node/2722493798",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "pe-lima",
      name: "Hotel y Spa Golf de Los Incas",
      streetAddress:
        "Hotel y Spa Golf de Los Incas, 500, Cerros de Camacho, Monterrico, Santiago de Surco, Lima, Lima Metropolitana, Lima, 10051, Perú",
      latitude: -12.088993,
      longitude: -76.9624248,
      officialSourceUrl:
        "https://www.golfincahotel.com/main.php?WebCode=GOLF_SPA",
      locationSourceUrl: "https://www.openstreetmap.org/way/400618556",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "ph-manila",
      name: "The Peninsula Manila",
      streetAddress:
        "The Peninsula Manila, Ayala Avenue, San Lorenzo, District I, Makati, Southern Manila District, Metro Manila, 1226, Philippines",
      latitude: 14.5549507,
      longitude: 121.0251943,
      officialSourceUrl: "https://manila.peninsula.com/en/default",
      locationSourceUrl: "https://www.openstreetmap.org/way/22648530",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "sa-riyadh",
      name: "DoubleTree by Hilton Hotel Riyadh - Al Muroj Business Gate",
      streetAddress:
        "DoubleTree by Hilton Hotel Riyadh - Al Muroj Business Gate, 2653, علي بن الخصيب, المروج, الرياض, محافظة الرياض, منطقة الرياض, 12283, السعودية",
      latitude: 24.7645227,
      longitude: 46.6573815,
      officialSourceUrl:
        "https://www.hilton.com/en/hotels/ruhamdi-doubletree-riyadh-al-muroj-business-gate/",
      locationSourceUrl: "https://www.openstreetmap.org/way/503362698",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "sg-singapore",
      name: "Mandarin Oriental Singapore",
      streetAddress:
        "Mandarin Oriental Singapore, 5, Raffles Avenue, Marina Centre, Civic District, Downtown Core, Central Region, Singapore, 039797, Singapore",
      latitude: 1.2906606,
      longitude: 103.858324,
      officialSourceUrl: "https://www.mandarinoriental.com",
      locationSourceUrl: "https://www.openstreetmap.org/node/4302905986",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "th-bangkok",
      name: "Baiyoke Sky Hotel",
      streetAddress: "Baiyoke Sky Hotel, 222, กรุงเทพมหานคร, 10330, ประเทศไทย",
      latitude: 13.7544058,
      longitude: 100.5403134,
      officialSourceUrl: "https://baiyokesky.baiyokehotel.com/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/18728184",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "tr-istanbul",
      name: "Aria Palace Taksim Hotel",
      streetAddress:
        "Aria Palace Taksim Hotel, 11, Atıf Yılmaz Caddesi, Hüseyinağa, Hüseyinağa Mahallesi, Beyoğlu, İstanbul, Marmara Bölgesi, 34150, Türkiye",
      latitude: 41.0354318,
      longitude: 28.9801001,
      officialSourceUrl: "https://www.ariapalacetaksim.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/604661067",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-chicago",
      name: "Wyndham Chicago McCormick Hotel",
      streetAddress:
        "Wyndham Chicago McCormick Hotel, 11, West 26th Street, Douglas, Chicago, South Chicago Township, Cook County, Illinois, 60616, United States",
      latitude: 41.8451066,
      longitude: -87.6278219,
      officialSourceUrl:
        "https://www.wyndhamhotels.com/wyndham/chicago-illinois/wyndham-chicago-mccormick/",
      locationSourceUrl: "https://www.openstreetmap.org/way/210537356",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-honolulu",
      name: "Halekulani Hotel",
      streetAddress:
        "Halekulani Hotel, 2199, Kalia Road, Waikīkī, East Honolulu, Honolulu, Honolulu County, Hawaii, 96815, United States",
      latitude: 21.2779627,
      longitude: -157.8323674,
      officialSourceUrl: "https://www.halekulani.com/",
      locationSourceUrl: "https://www.openstreetmap.org/way/245567931",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-jfk-area",
      name: "TWA Hotel",
      streetAddress:
        "TWA Hotel, 1, Idlewild Drive, Queens, Queens County, New York, 11430, United States",
      latitude: 40.6457688,
      longitude: -73.777674,
      officialSourceUrl: "https://www.twahotel.com/hotel",
      locationSourceUrl: "https://www.openstreetmap.org/node/6227799210",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-las-vegas",
      name: "Hotel MGM Grand Las Vegas",
      streetAddress:
        "Hotel MGM Grand Las Vegas, 3799, South Las Vegas Boulevard, Las Vegas, Clark County, Nevada, 89109, United States",
      latitude: 36.1027891,
      longitude: -115.1694006,
      officialSourceUrl: "http://www.mgmgrand.com",
      locationSourceUrl: "https://www.openstreetmap.org/way/116770006",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-los-angeles",
      name: "InterContinental Los Angeles Downtown",
      streetAddress:
        "900 Wilshire Boulevard, Los Angeles, California 90017, United States",
      latitude: 34.0500222,
      longitude: -118.2600358,
      officialSourceUrl:
        "https://www.ihg.com/intercontinental/hotels/us/en/los-angeles/laxhc/hoteldetail",
      locationSourceUrl: "https://www.openstreetmap.org/node/9956137767",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-miami",
      name: "Biltmore Hotel Miami Coral Gables",
      streetAddress:
        "Biltmore Hotel Miami Coral Gables, 1200, Anastasia Avenue, Coral Gables, Miami-Dade County, Florida, 33134, United States",
      latitude: 25.7408959,
      longitude: -80.2777056,
      officialSourceUrl: "https://www.biltmorehotel.com/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/9351650",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-orlando",
      name: "Disney's Grand Floridian Resort & Spa",
      streetAddress:
        "Disney's Grand Floridian Resort & Spa, 4401, Floridian Way, Bay Lake, Kissimmee, Orange County, Florida, 34747, United States",
      latitude: 28.4112847,
      longitude: -81.5876989,
      officialSourceUrl:
        "https://disneyworld.disney.go.com/resorts/grand-floridian-resort-and-spa/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/5329045",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "us-san-francisco",
      name: "The Fairmont San Francisco Hotel",
      streetAddress:
        "The Fairmont San Francisco Hotel, 950, Mason Street, Lower Nob Hill, Nob Hill, South of Market, San Francisco, California, 94108, United States",
      latitude: 37.79242,
      longitude: -122.4097691,
      officialSourceUrl: "https://www.fairmont.com/san-francisco/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/16217497",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "za-cape-town",
      name: "Breakwater Lodge",
      streetAddress:
        "Breakwater Lodge, Portswood Road, Foreshore, Cape Town Ward 115, Cape Town, City of Cape Town, Western Cape, 8001, South Africa",
      latitude: -33.9078543,
      longitude: 18.4157694,
      officialSourceUrl:
        "https://www.marriott.com/en-us/hotels/cptbr-protea-hotel-cape-town-waterfront-breakwater-lodge/overview/",
      locationSourceUrl: "https://www.openstreetmap.org/relation/332373",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "za-durban",
      name: "Gooderson Tropicana Hotel",
      streetAddress:
        "Gooderson Tropicana Hotel, 85, O.R. Tambo Parade, South Beach, Durban, eThekwini Metropolitan Municipality, KwaZulu-Natal, 4001, South Africa",
      latitude: -29.8567377,
      longitude: 31.0390321,
      officialSourceUrl: "https://www.tropicanahotel.co.za/",
      locationSourceUrl: "https://www.openstreetmap.org/way/70534413",
      lastReviewed: "2026-09-02",
    },
    {
      destinationId: "za-johannesburg",
      name: "Premier Hotel Quatermain",
      streetAddress:
        "Premier Hotel Quatermain, 60, West Road South, Morning Side Extentions, Johannesburg Ward 103, Sandton, City of Johannesburg Metropolitan Municipality, Gauteng, 2052, South Africa",
      latitude: -26.0842071,
      longitude: 28.0576825,
      officialSourceUrl: "https://www.premierhotels.co.za/quatermain",
      locationSourceUrl: "https://www.openstreetmap.org/way/507659432",
      lastReviewed: "2026-09-02",
    },
  ] as const;

export function findVerifiedHotelCoverageProperty(
  destination: Pick<HotelDestinationSuggestion, "id">,
) {
  return verifiedHotelCoverageProperties.find(
    (property) => property.destinationId === destination.id,
  );
}
