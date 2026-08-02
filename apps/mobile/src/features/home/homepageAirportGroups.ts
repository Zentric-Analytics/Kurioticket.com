export type HomepageAirportGroup = {
  code: string;
  city: string;
  country: string;
  airportCodes: readonly string[];
  aliases: readonly string[];
};

/** Recognized IATA metropolitan-area codes used only by the homepage picker. */
export const homepageAirportGroups: readonly HomepageAirportGroup[] = [
  { code: "NYC", city: "New York", country: "United States", airportCodes: ["JFK", "EWR", "LGA", "SWF"], aliases: ["New York City", "Manhattan"] },
  { code: "WAS", city: "Washington", country: "United States", airportCodes: ["IAD", "DCA", "BWI"], aliases: ["Washington DC", "District of Columbia"] },
  { code: "CHI", city: "Chicago", country: "United States", airportCodes: ["ORD", "MDW"], aliases: ["Chicagoland"] },
  { code: "YTO", city: "Toronto", country: "Canada", airportCodes: ["YYZ", "YTZ", "YHM"], aliases: ["Greater Toronto Area", "GTA"] },
  { code: "LON", city: "London", country: "United Kingdom", airportCodes: ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"], aliases: ["Greater London"] },
  { code: "PAR", city: "Paris", country: "France", airportCodes: ["CDG", "ORY", "BVA"], aliases: ["Ile de France"] },
  { code: "MIL", city: "Milan", country: "Italy", airportCodes: ["MXP", "LIN", "BGY"], aliases: ["Milano"] },
  { code: "ROM", city: "Rome", country: "Italy", airportCodes: ["FCO", "CIA"], aliases: ["Roma"] },
  { code: "MOW", city: "Moscow", country: "Russia", airportCodes: ["SVO", "DME", "VKO", "ZIA"], aliases: ["Moskva"] },
  { code: "STO", city: "Stockholm", country: "Sweden", airportCodes: ["ARN", "BMA", "NYO", "VST"], aliases: ["Stockholm County"] },
  { code: "TYO", city: "Tokyo", country: "Japan", airportCodes: ["HND", "NRT"], aliases: ["Greater Tokyo"] },
  { code: "SEL", city: "Seoul", country: "South Korea", airportCodes: ["ICN", "GMP"], aliases: ["Seoul Capital Area"] },
  { code: "BJS", city: "Beijing", country: "China", airportCodes: ["PEK", "PKX"], aliases: ["Peking"] },
  { code: "OSA", city: "Osaka", country: "Japan", airportCodes: ["KIX", "ITM", "UKB"], aliases: ["Keihanshin", "Kansai"] },
  { code: "SHA", city: "Shanghai", country: "China", airportCodes: ["PVG", "SHA"], aliases: ["Shanghai Municipality"] },
  { code: "JKT", city: "Jakarta", country: "Indonesia", airportCodes: ["CGK", "HLP"], aliases: ["Greater Jakarta", "Jabodetabek"] },
  { code: "RIO", city: "Rio de Janeiro", country: "Brazil", airportCodes: ["GIG", "SDU"], aliases: ["Rio"] },
  { code: "SAO", city: "Sao Paulo", country: "Brazil", airportCodes: ["GRU", "CGH", "VCP"], aliases: ["São Paulo"] },
  { code: "BUE", city: "Buenos Aires", country: "Argentina", airportCodes: ["EZE", "AEP"], aliases: ["Greater Buenos Aires"] },
];
