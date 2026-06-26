import { countryCodeToCountryName, countryMatchesCode, normalizeCountryCode } from "@/lib/geo/context";
import { getCountryDisplayNameForLocale } from "@/lib/region/countryDisplayNames";
import { distanceKm } from "@/lib/geo/distance";

export type AirportOption = {
  code: string;
  name?: string;
  city: string;
  airport: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  priority?: number;
};

type AirportSeed = readonly [
  code: string,
  city: string,
  airport: string,
  countryCode: string,
  lat: number,
  lon: number,
  countryOrPriority?: string | number,
  priorityOverride?: number,
];

// Global commercial-airport suggestion catalog. Seeded from public airport references
// that derive from OurAirports/BigAirports-style scheduled-service airport data;
// intentionally limited to major passenger airports so API responses stay small.
const airportSeeds: AirportSeed[] = [
  ["ATL", "Atlanta", "Hartsfield-Jackson Atlanta International Airport", "US", 33.6407, -84.4277],
  ["JFK", "New York", "John F. Kennedy International Airport", "US", 40.6413, -73.7781],
  ["LAX", "Los Angeles", "Los Angeles International Airport", "US", 33.9416, -118.4085],
  ["ORD", "Chicago", "O'Hare International Airport", "US", 41.9742, -87.9073],
  ["DFW", "Dallas-Fort Worth", "Dallas/Fort Worth International Airport", "US", 32.8998, -97.0403],
  ["DEN", "Denver", "Denver International Airport", "US", 39.8561, -104.6737],
  ["SFO", "San Francisco", "San Francisco International Airport", "US", 37.6213, -122.379],
  ["MIA", "Miami", "Miami International Airport", "US", 25.7959, -80.287],
  ["SEA", "Seattle", "Seattle-Tacoma International Airport", "US", 47.4502, -122.3088],
  ["IAH", "Houston", "George Bush Intercontinental Airport", "US", 29.9902, -95.3368, 98],
  ["HOU", "Houston", "William P. Hobby Airport", "US", 29.6454, -95.2789, 86],
  ["YYZ", "Toronto", "Toronto Pearson International Airport", "CA", 43.6777, -79.6248, 98],
  ["YTZ", "Toronto", "Billy Bishop Toronto City Airport", "CA", 43.6275, -79.3962, 72],
  ["YVR", "Vancouver", "Vancouver International Airport", "CA", 49.1951, -123.1779],
  ["YUL", "Montreal", "Montréal-Trudeau International Airport", "CA", 45.47, -73.7408],
  ["MEX", "Mexico City", "Mexico City International Airport", "MX", 19.4363, -99.0721],
  ["CUN", "Cancún", "Cancún International Airport", "MX", 21.0365, -86.8771],
  ["GDL", "Guadalajara", "Miguel Hidalgo y Costilla Guadalajara International Airport", "MX", 20.5218, -103.3112],
  ["GUA", "Guatemala City", "La Aurora International Airport", "GT", 14.5833, -90.5275],
  ["SAL", "San Salvador", "Monseñor Óscar Arnulfo Romero International Airport", "SV", 13.4409, -89.0557],
  ["SAP", "San Pedro Sula", "Ramón Villeda Morales International Airport", "HN", 15.4526, -87.9236],
  ["MGA", "Managua", "Augusto C. Sandino International Airport", "NI", 12.1415, -86.1682],
  ["SJO", "San José", "Juan Santamaría International Airport", "CR", 9.9939, -84.2088],
  ["PTY", "Panama City", "Tocumen International Airport", "PA", 9.0714, -79.3835],
  ["HAV", "Havana", "José Martí International Airport", "CU", 22.9892, -82.4091],
  ["SDQ", "Santo Domingo", "Las Américas International Airport", "DO", 18.4297, -69.6689],
  ["PUJ", "Punta Cana", "Punta Cana International Airport", "DO", 18.5674, -68.3634],
  ["KIN", "Kingston", "Norman Manley International Airport", "JM", 17.9357, -76.7875],
  ["MBJ", "Montego Bay", "Sangster International Airport", "JM", 18.5037, -77.9134],
  ["POS", "Port of Spain", "Piarco International Airport", "TT", 10.5954, -61.3372],
  ["BGI", "Bridgetown", "Grantley Adams International Airport", "BB", 13.0746, -59.4925],
  ["NAS", "Nassau", "Lynden Pindling International Airport", "BS", 25.039, -77.4662],
  ["ANU", "St. John's", "V. C. Bird International Airport", "AG", 17.1367, -61.7927],
  ["AUA", "Oranjestad", "Queen Beatrix International Airport", "AW", 12.5014, -70.0152],
  ["BOG", "Bogotá", "El Dorado International Airport", "CO", 4.7016, -74.1469],
  ["MDE", "Medellín", "José María Córdova International Airport", "CO", 6.1645, -75.4231],
  ["UIO", "Quito", "Mariscal Sucre International Airport", "EC", -0.1292, -78.3575],
  ["GYE", "Guayaquil", "José Joaquín de Olmedo International Airport", "EC", -2.1574, -79.8836],
  ["LIM", "Lima", "Jorge Chávez International Airport", "PE", -12.0219, -77.1143],
  ["LPB", "La Paz", "El Alto International Airport", "BO", -16.5133, -68.1923],
  ["VVI", "Santa Cruz", "Viru Viru International Airport", "BO", -17.6448, -63.1354],
  ["SCL", "Santiago", "Arturo Merino Benítez International Airport", "CL", -33.3928, -70.7858],
  ["EZE", "Buenos Aires", "Ministro Pistarini International Airport", "AR", -34.8222, -58.5358],
  ["AEP", "Buenos Aires", "Jorge Newbery Airfield", "AR", -34.5592, -58.4156],
  ["MVD", "Montevideo", "Carrasco International Airport", "UY", -34.8384, -56.0308],
  ["ASU", "Asunción", "Silvio Pettirossi International Airport", "PY", -25.2399, -57.5191],
  ["GRU", "São Paulo", "São Paulo/Guarulhos International Airport", "BR", -23.4356, -46.4731],
  ["GIG", "Rio de Janeiro", "Rio de Janeiro/Galeão International Airport", "BR", -22.809999, -43.2506],
  ["BSB", "Brasília", "Brasília International Airport", "BR", -15.8697, -47.9208],
  ["MAO", "Manaus", "Eduardo Gomes International Airport", "BR", -3.0386, -60.0497],
  ["LHR", "London", "Heathrow Airport", "GB", 51.47, -0.4543, 100],
  ["LGW", "London", "Gatwick Airport", "GB", 51.1537, -0.1821, 88],
  ["LCY", "London", "London City Airport", "GB", 51.5053, 0.0553, 74],
  ["STN", "London", "London Stansted Airport", "GB", 51.885, 0.235, 72],
  ["LTN", "London", "London Luton Airport", "GB", 51.8747, -0.3683, 70],
  ["MAN", "Manchester", "Manchester Airport", "GB", 53.3537, -2.2749],
  ["DUB", "Dublin", "Dublin Airport", "IE", 53.4213, -6.2701],
  ["KEF", "Reykjavík", "Keflavík International Airport", "IS", 63.985, -22.6056],
  ["CDG", "Paris", "Charles de Gaulle Airport", "FR", 49.0097, 2.5479],
  ["ORY", "Paris", "Paris Orly Airport", "FR", 48.7233, 2.3794],
  ["NCE", "Nice", "Nice Côte d'Azur Airport", "FR", 43.6584, 7.2159],
  ["AMS", "Amsterdam", "Amsterdam Airport Schiphol", "NL", 52.3105, 4.7683],
  ["BRU", "Brussels", "Brussels Airport", "BE", 50.9014, 4.4844],
  ["LUX", "Luxembourg", "Luxembourg Airport", "LU", 49.6233, 6.2044],
  ["FRA", "Frankfurt", "Frankfurt Airport", "DE", 50.0379, 8.5622],
  ["MUC", "Munich", "Munich Airport", "DE", 48.3538, 11.7861],
  ["BER", "Berlin", "Berlin Brandenburg Airport", "DE", 52.3667, 13.5033],
  ["DUS", "Düsseldorf", "Düsseldorf Airport", "DE", 51.2895, 6.7668],
  ["HAM", "Hamburg", "Hamburg Airport", "DE", 53.6304, 9.9882],
  ["CGN", "Cologne", "Cologne Bonn Airport", "DE", 50.8659, 7.1427],
  ["STR", "Stuttgart", "Stuttgart Airport", "DE", 48.6899, 9.2219],
  ["ZRH", "Zurich", "Zurich Airport", "CH", 47.4581, 8.5555],
  ["GVA", "Geneva", "Geneva Airport", "CH", 46.2381, 6.109],
  ["VIE", "Vienna", "Vienna International Airport", "AT", 48.1103, 16.5697],
  ["MAD", "Madrid", "Adolfo Suárez Madrid-Barajas Airport", "ES", 40.4983, -3.5676],
  ["BCN", "Barcelona", "Josep Tarradellas Barcelona-El Prat Airport", "ES", 41.2974, 2.0833],
  ["LIS", "Lisbon", "Humberto Delgado Airport", "PT", 38.7813, -9.1359],
  ["OPO", "Porto", "Francisco Sá Carneiro Airport", "PT", 41.2481, -8.6814],
  ["FCO", "Rome", "Leonardo da Vinci-Fiumicino Airport", "IT", 41.8003, 12.2389],
  ["MXP", "Milan", "Milan Malpensa Airport", "IT", 45.6306, 8.7281],
  ["ATH", "Athens", "Athens International Airport", "GR", 37.9364, 23.9445],
  ["SKG", "Thessaloniki", "Thessaloniki Airport", "GR", 40.5197, 22.9709],
  ["LCA", "Larnaca", "Larnaca International Airport", "CY", 34.8751, 33.6249],
  ["PFO", "Paphos", "Paphos International Airport", "CY", 34.718, 32.4857],
  ["CPH", "Copenhagen", "Copenhagen Airport", "DK", 55.618, 12.656],
  ["OSL", "Oslo", "Oslo Airport", "NO", 60.1939, 11.1004],
  ["ARN", "Stockholm", "Stockholm Arlanda Airport", "SE", 59.6519, 17.9186],
  ["HEL", "Helsinki", "Helsinki Airport", "FI", 60.3172, 24.9633],
  ["WAW", "Warsaw", "Warsaw Chopin Airport", "PL", 52.1657, 20.9671],
  ["PRG", "Prague", "Václav Havel Airport Prague", "CZ", 50.1008, 14.26],
  ["BUD", "Budapest", "Budapest Ferenc Liszt International Airport", "HU", 47.4298, 19.2611],
  ["OTP", "Bucharest", "Henri Coandă International Airport", "RO", 44.5711, 26.085],
  ["SOF", "Sofia", "Sofia Airport", "BG", 42.6967, 23.4114],
  ["BEG", "Belgrade", "Belgrade Nikola Tesla Airport", "RS", 44.8184, 20.3091],
  ["ZAG", "Zagreb", "Zagreb Airport", "HR", 45.7429, 16.0688],
  ["LJU", "Ljubljana", "Ljubljana Jože Pučnik Airport", "SI", 46.2237, 14.4576],
  ["TIA", "Tirana", "Tirana International Airport", "AL", 41.4147, 19.7206],
  ["SKP", "Skopje", "Skopje International Airport", "MK", 41.9616, 21.6214],
  ["SJJ", "Sarajevo", "Sarajevo International Airport", "BA", 43.8246, 18.3315],
  ["TGD", "Podgorica", "Podgorica Airport", "ME", 42.3594, 19.2519],
  ["RIX", "Riga", "Riga International Airport", "LV", 56.9236, 23.9711],
  ["TLL", "Tallinn", "Tallinn Airport", "EE", 59.4133, 24.8328],
  ["VNO", "Vilnius", "Vilnius Airport", "LT", 54.6341, 25.2858],
  ["IST", "Istanbul", "Istanbul Airport", "TR", 41.2753, 28.7519, "Türkiye"],
  ["SAW", "Istanbul", "Sabiha Gökçen International Airport", "TR", 40.8986, 29.3092, "Türkiye"],
  ["KBP", "Kyiv", "Boryspil International Airport", "UA", 50.345, 30.8947],
  ["EVN", "Yerevan", "Zvartnots International Airport", "AM", 40.1473, 44.3959],
  ["TBS", "Tbilisi", "Tbilisi International Airport", "GE", 41.6692, 44.9547],
  ["GYD", "Baku", "Heydar Aliyev International Airport", "AZ", 40.4675, 50.0467],
  ["SVO", "Moscow", "Sheremetyevo International Airport", "RU", 55.9726, 37.4146],
  ["LED", "St. Petersburg", "Pulkovo Airport", "RU", 59.8003, 30.2625],
  ["CMN", "Casablanca", "Mohammed V International Airport", "MA", 33.3675, -7.5899],
  ["RAK", "Marrakesh", "Marrakesh Menara Airport", "MA", 31.6069, -8.0363],
  ["ALG", "Algiers", "Houari Boumediene Airport", "DZ", 36.691, 3.2154],
  ["TUN", "Tunis", "Tunis-Carthage International Airport", "TN", 36.851, 10.2272],
  ["CAI", "Cairo", "Cairo International Airport", "EG", 30.1219, 31.4056],
  ["SSH", "Sharm El Sheikh", "Sharm El Sheikh International Airport", "EG", 27.9773, 34.3949],
  ["TIP", "Tripoli", "Mitiga International Airport", "LY", 32.8941, 13.276],
  ["LOS", "Lagos", "Murtala Muhammed International Airport", "NG", 6.5774, 3.3212],
  ["ABV", "Abuja", "Nnamdi Azikiwe International Airport", "NG", 9.0068, 7.2632],
  ["PHC", "Port Harcourt", "Port Harcourt International Airport", "NG", 5.0155, 6.9496],
  ["KAN", "Kano", "Mallam Aminu Kano International Airport", "NG", 12.0476, 8.5246],
  ["ACC", "Accra", "Kotoka International Airport", "GH", 5.6052, -0.1668],
  ["ABJ", "Abidjan", "Félix-Houphouët-Boigny International Airport", "CI", 5.2614, -3.9263],
  ["DKR", "Dakar", "Blaise Diagne International Airport", "SN", 14.67, -17.0733],
  ["BJL", "Banjul", "Banjul International Airport", "GM", 13.3379, -16.6522],
  ["CKY", "Conakry", "Ahmed Sékou Touré International Airport", "GN", 9.5769, -13.612],
  ["FNA", "Freetown", "Freetown International Airport", "SL", 8.6164, -13.1955],
  ["ROB", "Monrovia", "Roberts International Airport", "LR", 6.2338, -10.3623],
  ["OUA", "Ouagadougou", "Ouagadougou Airport", "BF", 12.3532, -1.5124],
  ["BKO", "Bamako", "Modibo Keita International Airport", "ML", 12.5335, -7.9499],
  ["NIM", "Niamey", "Diori Hamani International Airport", "NE", 13.4815, 2.1836],
  ["LFW", "Lomé", "Lomé-Tokoin International Airport", "TG", 6.1656, 1.2545],
  ["COO", "Cotonou", "Cadjehoun Airport", "BJ", 6.3572, 2.3844],
  ["NSI", "Yaoundé", "Yaoundé Nsimalen International Airport", "CM", 3.7226, 11.5533],
  ["DLA", "Douala", "Douala International Airport", "CM", 4.0061, 9.7195],
  ["LBV", "Libreville", "Léon-Mba International Airport", "GA", 0.4586, 9.4123],
  ["BZV", "Brazzaville", "Maya-Maya Airport", "CG", -4.2517, 15.253],
  ["FIH", "Kinshasa", "N'djili Airport", "CD", -4.3858, 15.4446],
  ["LAD", "Luanda", "Quatro de Fevereiro Airport", "AO", -8.8584, 13.2312],
  ["ADD", "Addis Ababa", "Addis Ababa Bole International Airport", "ET", 8.9779, 38.7993],
  ["NBO", "Nairobi", "Jomo Kenyatta International Airport", "KE", -1.3192, 36.9278],
  ["MBA", "Mombasa", "Moi International Airport", "KE", -4.0348, 39.5942],
  ["DAR", "Dar es Salaam", "Julius Nyerere International Airport", "TZ", -6.8781, 39.2026],
  ["ZNZ", "Zanzibar", "Abeid Amani Karume International Airport", "TZ", -6.222, 39.2249],
  ["EBB", "Entebbe", "Entebbe International Airport", "UG", 0.0424, 32.4435],
  ["KGL", "Kigali", "Kigali International Airport", "RW", -1.9686, 30.1395],
  ["BJM", "Bujumbura", "Bujumbura International Airport", "BI", -3.324, 29.3185],
  ["JIB", "Djibouti", "Djibouti-Ambouli International Airport", "DJ", 11.5473, 43.1595],
  ["HGA", "Hargeisa", "Hargeisa Egal International Airport", "SO", 9.5182, 44.0888],
  ["KRT", "Khartoum", "Khartoum International Airport", "SD", 15.5895, 32.5532],
  ["JUB", "Juba", "Juba International Airport", "SS", 4.872, 31.6011],
  ["CPT", "Cape Town", "Cape Town International Airport", "ZA", -33.9715, 18.6021],
  ["JNB", "Johannesburg", "O. R. Tambo International Airport", "ZA", -26.1392, 28.246],
  ["DUR", "Durban", "King Shaka International Airport", "ZA", -29.6144, 31.1197],
  ["LUN", "Lusaka", "Kenneth Kaunda International Airport", "ZM", -15.3308, 28.4526],
  ["HRE", "Harare", "Robert Gabriel Mugabe International Airport", "ZW", -17.9318, 31.0928],
  ["MPM", "Maputo", "Maputo International Airport", "MZ", -25.9208, 32.5726],
  ["GBE", "Gaborone", "Sir Seretse Khama International Airport", "BW", -24.5552, 25.9182],
  ["WDH", "Windhoek", "Hosea Kutako International Airport", "NA", -22.4799, 17.4709],
  ["MRU", "Mauritius", "Sir Seewoosagur Ramgoolam International Airport", "MU", -20.4302, 57.6836],
  ["SEZ", "Mahé", "Seychelles International Airport", "SC", -4.6743, 55.5218],
  ["TNR", "Antananarivo", "Ivato International Airport", "MG", -18.7969, 47.4788],
  ["RUN", "Saint-Denis", "Roland Garros Airport", "RE", -20.8901, 55.5164, "Réunion"],
  ["DXB", "Dubai", "Dubai International Airport", "AE", 25.2532, 55.3657, 100],
  ["DWC", "Dubai", "Al Maktoum International Airport", "AE", 24.8964, 55.1614, 68],
  ["AUH", "Abu Dhabi", "Zayed International Airport", "AE", 24.4329, 54.6511],
  ["DOH", "Doha", "Hamad International Airport", "QA", 25.2731, 51.6081],
  ["BAH", "Manama", "Bahrain International Airport", "BH", 26.2708, 50.6336],
  ["KWI", "Kuwait City", "Kuwait International Airport", "KW", 29.2266, 47.9689],
  ["RUH", "Riyadh", "King Khalid International Airport", "SA", 24.9576, 46.6988],
  ["JED", "Jeddah", "King Abdulaziz International Airport", "SA", 21.6796, 39.1565],
  ["MCT", "Muscat", "Muscat International Airport", "OM", 23.5933, 58.2844],
  ["AMM", "Amman", "Queen Alia International Airport", "JO", 31.7226, 35.9932],
  ["BEY", "Beirut", "Beirut-Rafic Hariri International Airport", "LB", 33.8209, 35.4884],
  ["TLV", "Tel Aviv", "Ben Gurion Airport", "IL", 32.0114, 34.8867],
  ["IKA", "Tehran", "Imam Khomeini International Airport", "IR", 35.4161, 51.1522],
  ["BGW", "Baghdad", "Baghdad International Airport", "IQ", 33.2625, 44.2346],
  ["DEL", "New Delhi", "Indira Gandhi International Airport", "IN", 28.5562, 77.1],
  ["BOM", "Mumbai", "Chhatrapati Shivaji Maharaj International Airport", "IN", 19.09, 72.8679],
  ["BLR", "Bengaluru", "Kempegowda International Airport", "IN", 13.1986, 77.7066],
  ["MAA", "Chennai", "Chennai International Airport", "IN", 12.9941, 80.1709],
  ["HYD", "Hyderabad", "Rajiv Gandhi International Airport", "IN", 17.2403, 78.4294],
  ["CCU", "Kolkata", "Netaji Subhas Chandra Bose International Airport", "IN", 22.6547, 88.4467],
  ["COK", "Kochi", "Cochin International Airport", "IN", 10.152, 76.4019],
  ["ISB", "Islamabad", "Islamabad International Airport", "PK", 33.5607, 72.8516],
  ["KHI", "Karachi", "Jinnah International Airport", "PK", 24.9065, 67.1608],
  ["LHE", "Lahore", "Allama Iqbal International Airport", "PK", 31.5216, 74.4036],
  ["DAC", "Dhaka", "Hazrat Shahjalal International Airport", "BD", 23.8433, 90.3978],
  ["CMB", "Colombo", "Bandaranaike International Airport", "LK", 7.1808, 79.8841],
  ["MLE", "Malé", "Velana International Airport", "MV", 4.1918, 73.5291],
  ["KTM", "Kathmandu", "Tribhuvan International Airport", "NP", 27.6966, 85.3591],
  ["PBH", "Paro", "Paro International Airport", "BT", 27.4032, 89.4246],
  ["TAS", "Tashkent", "Tashkent International Airport", "UZ", 41.2579, 69.2812],
  ["ALA", "Almaty", "Almaty International Airport", "KZ", 43.3521, 77.0405],
  ["FRU", "Bishkek", "Manas International Airport", "KG", 43.0613, 74.4776],
  ["DYU", "Dushanbe", "Dushanbe International Airport", "TJ", 38.5433, 68.825],
  ["ASB", "Ashgabat", "Ashgabat International Airport", "TM", 37.9868, 58.361],
  ["PEK", "Beijing", "Beijing Capital International Airport", "CN", 40.0799, 116.6031],
  ["PKX", "Beijing", "Beijing Daxing International Airport", "CN", 39.5098, 116.4105],
  ["PVG", "Shanghai", "Shanghai Pudong International Airport", "CN", 31.1443, 121.8083],
  ["CAN", "Guangzhou", "Guangzhou Baiyun International Airport", "CN", 23.3924, 113.2988],
  ["SZX", "Shenzhen", "Shenzhen Bao'an International Airport", "CN", 22.6393, 113.8107],
  ["HKG", "Hong Kong", "Hong Kong International Airport", "HK", 22.308, 113.9185],
  ["MFM", "Macau", "Macau International Airport", "MO", 22.1496, 113.591],
  ["TPE", "Taipei", "Taiwan Taoyuan International Airport", "TW", 25.0777, 121.2328],
  ["HND", "Tokyo", "Haneda Airport", "JP", 35.5494, 139.7798],
  ["NRT", "Tokyo", "Narita International Airport", "JP", 35.7719, 140.3929],
  ["KIX", "Osaka", "Kansai International Airport", "JP", 34.4347, 135.244],
  ["ICN", "Seoul", "Incheon International Airport", "KR", 37.4602, 126.4407],
  ["GMP", "Seoul", "Gimpo International Airport", "KR", 37.5583, 126.7906],
  ["ULN", "Ulaanbaatar", "Chinggis Khaan International Airport", "MN", 47.6469, 106.8198],
  ["BKK", "Bangkok", "Suvarnabhumi Airport", "TH", 13.69, 100.7501],
  ["DMK", "Bangkok", "Don Mueang International Airport", "TH", 13.9126, 100.6067],
  ["HKT", "Phuket", "Phuket International Airport", "TH", 8.1132, 98.3169],
  ["SIN", "Singapore", "Singapore Changi Airport", "SG", 1.3644, 103.9915],
  ["KUL", "Kuala Lumpur", "Kuala Lumpur International Airport", "MY", 2.7456, 101.7072],
  ["PEN", "Penang", "Penang International Airport", "MY", 5.2971, 100.2769],
  ["CGK", "Jakarta", "Soekarno-Hatta International Airport", "ID", -6.1256, 106.6559],
  ["DPS", "Denpasar", "Ngurah Rai International Airport", "ID", -8.7482, 115.167],
  ["MNL", "Manila", "Ninoy Aquino International Airport", "PH", 14.5086, 121.0198],
  ["CEB", "Cebu", "Mactan-Cebu International Airport", "PH", 10.3075, 123.9794],
  ["HAN", "Hanoi", "Noi Bai International Airport", "VN", 21.2212, 105.8072],
  ["SGN", "Ho Chi Minh City", "Tan Son Nhat International Airport", "VN", 10.8188, 106.6519],
  ["PNH", "Phnom Penh", "Phnom Penh International Airport", "KH", 11.5466, 104.8441],
  ["REP", "Siem Reap", "Siem Reap-Angkor International Airport", "KH", 13.3692, 104.2231],
  ["VTE", "Vientiane", "Wattay International Airport", "LA", 17.9883, 102.5633],
  ["RGN", "Yangon", "Yangon International Airport", "MM", 16.9073, 96.1332],
  ["BWN", "Bandar Seri Begawan", "Brunei International Airport", "BN", 4.9442, 114.9284],
  ["DIL", "Dili", "Presidente Nicolau Lobato International Airport", "TL", -8.5464, 125.5247],
  ["SYD", "Sydney", "Sydney Kingsford Smith Airport", "AU", -33.9399, 151.1753],
  ["MEL", "Melbourne", "Melbourne Airport", "AU", -37.669, 144.841],
  ["BNE", "Brisbane", "Brisbane Airport", "AU", -27.3842, 153.1175],
  ["PER", "Perth", "Perth Airport", "AU", -31.9403, 115.9669],
  ["ADL", "Adelaide", "Adelaide Airport", "AU", -34.945, 138.5306],
  ["AKL", "Auckland", "Auckland Airport", "NZ", -37.0082, 174.785],
  ["WLG", "Wellington", "Wellington International Airport", "NZ", -41.3272, 174.8053],
  ["CHC", "Christchurch", "Christchurch Airport", "NZ", -43.4894, 172.5322],
  ["NAN", "Nadi", "Nadi International Airport", "FJ", -17.7554, 177.4434],
  ["PPT", "Papeete", "Faa'a International Airport", "PF", -17.5537, -149.606],
  ["POM", "Port Moresby", "Jacksons International Airport", "PG", -9.4434, 147.22],
  ["HIR", "Honiara", "Honiara International Airport", "SB", -9.428, 160.0548],
  ["VLI", "Port Vila", "Bauerfield International Airport", "VU", -17.6993, 168.3198],
  ["APW", "Apia", "Faleolo International Airport", "WS", -13.82997, -172.0083],
  ["TBU", "Nukuʻalofa", "Fuaʻamotu International Airport", "TO", -21.2412, -175.1496],
  ["RAR", "Rarotonga", "Rarotonga International Airport", "CK", -21.2027, -159.8056],
  ["GUM", "Guam", "Antonio B. Won Pat International Airport", "GU", 13.4839, 144.797],
  ["SPN", "Saipan", "Saipan International Airport", "MP", 15.119, 145.729],
];

const airportCountry = (countryCode: string, country?: string) => country || countryCodeToCountryName(countryCode) || countryCode;

const defaultAirportPriority = (index: number) => Math.max(20, 90 - Math.floor(index / 3));

const readAirportSeedCountry = (countryOrPriority?: string | number) =>
  typeof countryOrPriority === "string" ? countryOrPriority : undefined;

const readAirportSeedPriority = (index: number, countryOrPriority?: string | number, priorityOverride?: number) => {
  const candidate = typeof countryOrPriority === "number" ? countryOrPriority : priorityOverride;
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? Math.max(0, Math.min(100, candidate))
    : defaultAirportPriority(index);
};

export const airports: AirportOption[] = airportSeeds.map((seed, index) => {
  const [code, city, airport, countryCode, lat, lon, countryOrPriority, priorityOverride] = seed;
  const country = readAirportSeedCountry(countryOrPriority);

  return {
    code,
    name: airport,
    city,
    airport,
    country: airportCountry(countryCode, country),
    countryCode,
    latitude: lat,
    longitude: lon,
    lat,
    lon,
    priority: readAirportSeedPriority(index, countryOrPriority, priorityOverride),
  };
});

export const destinationDefaults = ["LHR", "CDG", "DXB", "JFK", "LAX", "AMS", "MAD", "FCO", "SIN", "HND", "DOH"];

const airportCountryMatches = (airport: AirportOption, countryCode?: string) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) return false;
  return airport.countryCode === normalizedCountryCode || countryMatchesCode(airport.country, normalizedCountryCode);
};

export const getDefaultAirports = (params: { context: "origin" | "destination"; countryCode?: string; lat?: number; lon?: number; limit?: number; }) => {
  const limit = params.limit ?? 8;
  const destinationOrder = new Map(destinationDefaults.map((code, index) => [code, index]));
  const sameCountryAirports = params.countryCode
    ? airports.filter((airport) => airportCountryMatches(airport, params.countryCode))
    : [];
  const sourceAirports = params.context === "origin" && sameCountryAirports.length > 0 ? sameCountryAirports : airports;

  return [...sourceAirports]
    .sort((a, b) => {
      if (params.context === "destination" && params.countryCode) {
        const aMatch = airportCountryMatches(a, params.countryCode) ? 1 : 0;
        const bMatch = airportCountryMatches(b, params.countryCode) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      if (typeof params.lat === "number" && typeof params.lon === "number") {
        const ad = typeof a.lat === "number" && typeof a.lon === "number" ? distanceKm(params.lat, params.lon, a.lat, a.lon) : Number.POSITIVE_INFINITY;
        const bd = typeof b.lat === "number" && typeof b.lon === "number" ? distanceKm(params.lat, params.lon, b.lat, b.lon) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
      }
      if (params.context === "destination") {
        const ad = destinationOrder.get(a.code) ?? 999;
        const bd = destinationOrder.get(b.code) ?? 999;
        if (ad !== bd) return ad - bd;
      }
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return a.city.localeCompare(b.city);
    })
    .slice(0, limit);
};

type AirportDisplayLocale =
  | "en-us"
  | "ar"
  | "nl"
  | "es-es"
  | "fr"
  | "de-de"
  | "it-it"
  | "pt-br"
  | "zh-cn"
  | "ja"
  | "ko"
  | "hi";

const activeAirportDisplayLocales = new Set<AirportDisplayLocale>([
  "en-us",
  "ar",
  "nl",
  "es-es",
  "fr",
  "de-de",
  "it-it",
  "pt-br",
  "zh-cn",
  "ja",
  "ko",
  "hi",
]);

const normalizeAirportDisplayLocale = (locale: string | null | undefined): AirportDisplayLocale => {
  const normalized = locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (activeAirportDisplayLocales.has(normalized as AirportDisplayLocale)) {
    return normalized as AirportDisplayLocale;
  }

  if (normalized.startsWith("es-")) return "es-es";
  if (normalized.startsWith("de-")) return "de-de";
  if (normalized.startsWith("it-")) return "it-it";
  if (normalized.startsWith("pt-")) return "pt-br";
  if (normalized === "zh" || normalized.startsWith("zh-hans") || normalized.startsWith("zh-cn")) return "zh-cn";
  if (normalized.startsWith("ar-")) return "ar";
  if (normalized.startsWith("fr-")) return "fr";
  if (normalized.startsWith("nl-")) return "nl";
  if (normalized.startsWith("ja-")) return "ja";
  if (normalized.startsWith("ko-")) return "ko";
  if (normalized.startsWith("hi-")) return "hi";

  return "en-us";
};

type LocalizedCityNames = Record<AirportDisplayLocale, string>;
type LocalizedCityNameOverrides = Partial<LocalizedCityNames>;

const cityDisplayNameOverrides: Record<string, LocalizedCityNameOverrides> = {
  "Abuja": { "en-us": "Abuja", ar: "أبوجا", nl: "Abuja", "es-es": "Abuya", fr: "Abuja", "de-de": "Abuja", "it-it": "Abuja", "pt-br": "Abuja", "zh-cn": "阿布贾", ja: "アブジャ", ko: "아부자", hi: "अबुजा" },
  "Accra": { "en-us": "Accra", ar: "أكرا", nl: "Accra", "es-es": "Acra", fr: "Accra", "de-de": "Accra", "it-it": "Accra", "pt-br": "Acra", "zh-cn": "阿克拉", ja: "アクラ", ko: "아크라", hi: "अक्रा" },
  "Addis Ababa": { "en-us": "Addis Ababa", ar: "أديس أبابا", nl: "Addis Abeba", "es-es": "Adís Abeba", fr: "Addis-Abeba", "de-de": "Addis Abeba", "it-it": "Addis Abeba", "pt-br": "Adis Abeba", "zh-cn": "亚的斯亚贝巴", ja: "アディスアベバ", ko: "아디스아바바", hi: "अदीस अबाबा" },
  "Amsterdam": { "en-us": "Amsterdam", ar: "أمستردام", nl: "Amsterdam", "es-es": "Ámsterdam", fr: "Amsterdam", "de-de": "Amsterdam", "it-it": "Amsterdam", "pt-br": "Amsterdã", "zh-cn": "阿姆斯特丹", ja: "アムステルダム", ko: "암스테르담" },
  "Barcelona": { "en-us": "Barcelona", ar: "برشلونة", nl: "Barcelona", "es-es": "Barcelona", fr: "Barcelone", "de-de": "Barcelona", "it-it": "Barcellona", "pt-br": "Barcelona", "zh-cn": "巴塞罗那", ja: "バルセロナ", ko: "바르셀로나", hi: "बार्सिलोना" },
  "Berlin": { "en-us": "Berlin", ar: "برلين", nl: "Berlijn", "es-es": "Berlín", fr: "Berlin", "de-de": "Berlin", "it-it": "Berlino", "pt-br": "Berlim", "zh-cn": "柏林", ja: "ベルリン", ko: "베를린" },
  "Brussels": { "en-us": "Brussels", ar: "بروكسل", nl: "Brussel", "es-es": "Bruselas", fr: "Bruxelles", "de-de": "Brüssel", "it-it": "Bruxelles", "pt-br": "Bruxelas", "zh-cn": "布鲁塞尔", ja: "ブリュッセル", ko: "브뤼셀" },
  "Cairo": { "en-us": "Cairo", ar: "القاهرة", nl: "Caïro", "es-es": "El Cairo", fr: "Le Caire", "de-de": "Kairo", "it-it": "Il Cairo", "pt-br": "Cairo", "zh-cn": "开罗", ja: "カイロ", ko: "카이로", hi: "काहिरा" },
  "Cancún": { "en-us": "Cancun", ar: "كانكون", nl: "Cancun", "es-es": "Cancún", fr: "Cancún", "de-de": "Cancún", "it-it": "Cancún", "pt-br": "Cancún", "zh-cn": "坎昆", ja: "カンクン", ko: "칸쿤", hi: "कैनकन" },
  "Cape Town": { "en-us": "Cape Town", ar: "كيب تاون", nl: "Kaapstad", "es-es": "Ciudad del Cabo", fr: "Le Cap", "de-de": "Kapstadt", "it-it": "Città del Capo", "pt-br": "Cidade do Cabo", "zh-cn": "开普敦", ja: "ケープタウン", ko: "케이프타운", hi: "केप टाउन" },
  "Doha": { "en-us": "Doha", ar: "الدوحة", nl: "Doha", "es-es": "Doha", fr: "Doha", "de-de": "Doha", "it-it": "Doha", "pt-br": "Doha", "zh-cn": "多哈", ja: "ドーハ", ko: "도하", hi: "दोहा" },
  "Dubai": { "en-us": "Dubai", ar: "دبي", nl: "Dubai", "es-es": "Dubái", fr: "Dubaï", "de-de": "Dubai", "it-it": "Dubai", "pt-br": "Dubai", "zh-cn": "迪拜", ja: "ドバイ", ko: "두바이", hi: "दुबई" },
  "Edmonton": { "en-us": "Edmonton", ar: "إدمونتون", nl: "Edmonton", "es-es": "Edmonton", fr: "Edmonton", "de-de": "Edmonton", "it-it": "Edmonton", "pt-br": "Edmonton", "zh-cn": "埃德蒙顿", ja: "エドモントン", ko: "에드먼턴", hi: "एडमंटन" },
  "Frankfurt": { "en-us": "Frankfurt", ar: "فرانكفورت", nl: "Frankfurt", "es-es": "Fráncfort", fr: "Francfort", "de-de": "Frankfurt", "it-it": "Francoforte", "pt-br": "Frankfurt", "zh-cn": "法兰克福", ja: "フランクフルト", ko: "프랑크푸르트" },
  "Honolulu": { "en-us": "Honolulu", ar: "هونولولو", nl: "Honolulu", "es-es": "Honolulu", fr: "Honolulu", "de-de": "Honolulu", "it-it": "Honolulu", "pt-br": "Honolulu", "zh-cn": "檀香山", ja: "ホノルル", ko: "호놀룰루" },
  "Istanbul": { "en-us": "Istanbul", ar: "إسطنبول", nl: "Istanboel", "es-es": "Estambul", fr: "Istanbul", "de-de": "Istanbul", "it-it": "Istanbul", "pt-br": "Istambul", "zh-cn": "伊斯坦布尔", ja: "イスタンブール", ko: "이스탄불", hi: "इस्तांबुल" },
  "Kano": { "en-us": "Kano", ar: "كانو", nl: "Kano", "es-es": "Kano", fr: "Kano", "de-de": "Kano", "it-it": "Kano", "pt-br": "Kano", "zh-cn": "卡诺", ja: "カノ", ko: "카노", hi: "कानो" },
  "Johannesburg": { "en-us": "Johannesburg", ar: "جوهانسبرغ", nl: "Johannesburg", "es-es": "Johannesburgo", fr: "Johannesburg", "de-de": "Johannesburg", "it-it": "Johannesburg", "pt-br": "Joanesburgo", "zh-cn": "约翰内斯堡", ja: "ヨハネスブルグ", ko: "요하네스버그", hi: "जोहान्सबर्ग" },
  "Kigali": { "en-us": "Kigali", ar: "كيغالي", nl: "Kigali", "es-es": "Kigali", fr: "Kigali", "de-de": "Kigali", "it-it": "Kigali", "pt-br": "Kigali", "zh-cn": "基加利", ja: "キガリ", ko: "키갈리", hi: "किगाली" },
  "La Paz": { "en-us": "La Paz", ar: "لاباز", nl: "La Paz", "es-es": "La Paz", fr: "La Paz", "de-de": "La Paz", "it-it": "La Paz", "pt-br": "La Paz", "zh-cn": "拉巴斯", ja: "ラパス", ko: "라파스", hi: "ला पाज़" },
  "Lae": { "en-us": "Lae", ar: "لاي", nl: "Lae", "es-es": "Lae", fr: "Lae", "de-de": "Lae", "it-it": "Lae", "pt-br": "Lae", "zh-cn": "莱城", ja: "ラエ", ko: "라에" },
  "Lansing": { "en-us": "Lansing", ar: "لانسنغ", nl: "Lansing", "es-es": "Lansing", fr: "Lansing", "de-de": "Lansing", "it-it": "Lansing", "pt-br": "Lansing", "zh-cn": "兰辛", ja: "ランシング", ko: "랜싱" },
  "Lawton": { "en-us": "Lawton", ar: "لوتون", nl: "Lawton", "es-es": "Lawton", fr: "Lawton", "de-de": "Lawton", "it-it": "Lawton", "pt-br": "Lawton", "zh-cn": "劳顿", ja: "ロートン", ko: "로턴" },
  "Lagos": { "en-us": "Lagos", ar: "لاغوس", nl: "Lagos", "es-es": "Lagos", fr: "Lagos", "de-de": "Lagos", "it-it": "Lagos", "pt-br": "Lagos", "zh-cn": "拉各斯", ja: "ラゴス", ko: "라고스", hi: "लागोस" },
  "Luanda": { "en-us": "Luanda", ar: "لواندا", nl: "Luanda", "es-es": "Luanda", fr: "Luanda", "de-de": "Luanda", "it-it": "Luanda", "pt-br": "Luanda", "zh-cn": "罗安达", ja: "ルアンダ", ko: "루안다", hi: "लुआंडा" },
  "Las Vegas": { "en-us": "Las Vegas", ar: "لاس فيغاس", nl: "Las Vegas", "es-es": "Las Vegas", fr: "Las Vegas", "de-de": "Las Vegas", "it-it": "Las Vegas", "pt-br": "Las Vegas", "zh-cn": "拉斯维加斯", ja: "ラスベガス", ko: "라스베이거스", hi: "लास वेगास" },
  "Lisbon": { "en-us": "Lisbon", ar: "لشبونة", nl: "Lissabon", "es-es": "Lisboa", fr: "Lisbonne", "de-de": "Lissabon", "it-it": "Lisbona", "pt-br": "Lisboa", "zh-cn": "里斯本", ja: "リスボン", ko: "리스본" },
  "London": { "en-us": "London", ar: "لندن", nl: "Londen", "es-es": "Londres", fr: "Londres", "de-de": "London", "it-it": "Londra", "pt-br": "Londres", "zh-cn": "伦敦", ja: "ロンドン", ko: "런던", hi: "लंदन" },
  "Los Angeles": { "en-us": "Los Angeles", ar: "لوس أنجلوس", nl: "Los Angeles", "es-es": "Los Ángeles", fr: "Los Angeles", "de-de": "Los Angeles", "it-it": "Los Angeles", "pt-br": "Los Angeles", "zh-cn": "洛杉矶", ja: "ロサンゼルス", ko: "로스앤젤레스", hi: "लॉस एंजेलिस" },
  "Madrid": { "en-us": "Madrid", ar: "مدريد", nl: "Madrid", "es-es": "Madrid", fr: "Madrid", "de-de": "Madrid", "it-it": "Madrid", "pt-br": "Madri", "zh-cn": "马德里", ja: "マドリード", ko: "마드리드" },
  "Milan": { "en-us": "Milan", ar: "ميلانو", nl: "Milaan", "es-es": "Milán", fr: "Milan", "de-de": "Mailand", "it-it": "Milano", "pt-br": "Milão", "zh-cn": "米兰", ja: "ミラノ", ko: "밀라노" },
  "Montreal": { "en-us": "Montreal", ar: "مونتريال", nl: "Montreal", "es-es": "Montreal", fr: "Montréal", "de-de": "Montreal", "it-it": "Montréal", "pt-br": "Montreal", "zh-cn": "蒙特利尔", ja: "モントリオール", ko: "몬트리올" },
  "Munich": { "en-us": "Munich", ar: "ميونخ", nl: "München", "es-es": "Múnich", fr: "Munich", "de-de": "München", "it-it": "Monaco di Baviera", "pt-br": "Munique", "zh-cn": "慕尼黑", ja: "ミュンヘン", ko: "뮌헨" },
  "Nairobi": { "en-us": "Nairobi", ar: "نيروبي", nl: "Nairobi", "es-es": "Nairobi", fr: "Nairobi", "de-de": "Nairobi", "it-it": "Nairobi", "pt-br": "Nairóbi", "zh-cn": "内罗毕", ja: "ナイロビ", ko: "나이로비", hi: "नैरोबी" },
  "New York": { "en-us": "New York", ar: "نيويورك", nl: "New York", "es-es": "Nueva York", fr: "New York", "de-de": "New York", "it-it": "New York", "pt-br": "Nova York", "zh-cn": "纽约", ja: "ニューヨーク", ko: "뉴욕", hi: "न्यूयॉर्क" },
  "Paris": { "en-us": "Paris", ar: "باريس", nl: "Parijs", "es-es": "París", fr: "Paris", "de-de": "Paris", "it-it": "Parigi", "pt-br": "Paris", "zh-cn": "巴黎", ja: "パリ", ko: "파리", hi: "पेरिस" },
  "Puerto Vallarta": { "en-us": "Puerto Vallarta", ar: "بويرتو فالارتا", nl: "Puerto Vallarta", "es-es": "Puerto Vallarta", fr: "Puerto Vallarta", "de-de": "Puerto Vallarta", "it-it": "Puerto Vallarta", "pt-br": "Puerto Vallarta", "zh-cn": "巴亚尔塔港", ja: "プエルトバジャルタ", ko: "푸에르토바야르타", hi: "पुएर्तो वाल्यार्ता" },
  "Rome": { "en-us": "Rome", ar: "روما", nl: "Rome", "es-es": "Roma", fr: "Rome", "de-de": "Rom", "it-it": "Roma", "pt-br": "Roma", "zh-cn": "罗马", ja: "ローマ", ko: "로마", hi: "रोम" },
  "San Diego": { "en-us": "San Diego", ar: "سان دييغو", nl: "San Diego", "es-es": "San Diego", fr: "San Diego", "de-de": "San Diego", "it-it": "San Diego", "pt-br": "San Diego", "zh-cn": "圣迭戈", ja: "サンディエゴ", ko: "샌디에이고" },
  "Singapore": { "en-us": "Singapore", ar: "سنغافورة", nl: "Singapore", "es-es": "Singapur", fr: "Singapour", "de-de": "Singapur", "it-it": "Singapore", "pt-br": "Singapura", "zh-cn": "新加坡", ja: "シンガポール", ko: "싱가포르", hi: "सिंगापुर" },
  "Sydney": { "en-us": "Sydney", ar: "سيدني", nl: "Sydney", "es-es": "Sídney", fr: "Sydney", "de-de": "Sydney", "it-it": "Sydney", "pt-br": "Sydney", "zh-cn": "悉尼", ja: "シドニー", ko: "시드니" },
  "Tokyo": { "en-us": "Tokyo", ar: "طوكيو", nl: "Tokio", "es-es": "Tokio", fr: "Tokyo", "de-de": "Tokio", "it-it": "Tokyo", "pt-br": "Tóquio", "zh-cn": "东京", ja: "東京", ko: "도쿄", hi: "टोक्यो" },
  "Toronto": { "en-us": "Toronto", ar: "تورونتو", nl: "Toronto", "es-es": "Toronto", fr: "Toronto", "de-de": "Toronto", "it-it": "Toronto", "pt-br": "Toronto", "zh-cn": "多伦多", ja: "トロント", ko: "토론토", hi: "टोरंटो" },
  "Vancouver": { "en-us": "Vancouver", ar: "فانكوفر", nl: "Vancouver", "es-es": "Vancouver", fr: "Vancouver", "de-de": "Vancouver", "it-it": "Vancouver", "pt-br": "Vancouver", "zh-cn": "温哥华", ja: "バンクーバー", ko: "밴쿠버" },
  "Venice": { "en-us": "Venice", ar: "البندقية", nl: "Venetië", "es-es": "Venecia", fr: "Venise", "de-de": "Venedig", "it-it": "Venezia", "pt-br": "Veneza", "zh-cn": "威尼斯", ja: "ヴェネツィア", ko: "베네치아" },
  "Zurich": { "en-us": "Zurich", ar: "زيورخ", nl: "Zürich", "es-es": "Zúrich", fr: "Zurich", "de-de": "Zürich", "it-it": "Zurigo", "pt-br": "Zurique", "zh-cn": "苏黎世", ja: "チューリッヒ", ko: "취리히" },
};

const createIdentityLocalizedCityNames = (city: string): LocalizedCityNames => ({
  "en-us": city,
  ar: city,
  nl: city,
  "es-es": city,
  fr: city,
  "de-de": city,
  "it-it": city,
  "pt-br": city,
  "zh-cn": city,
  ja: city,
  ko: city,
  hi: city,
});

export const cityDisplayNames: Record<string, LocalizedCityNames> = Object.fromEntries(
  [...new Set([...airports.map((airport) => airport.city), ...Object.keys(cityDisplayNameOverrides)])].map((city) => [
    city,
    { ...createIdentityLocalizedCityNames(city), ...cityDisplayNameOverrides[city] },
  ]),
) as Record<string, LocalizedCityNames>;

export function getAirportCityLocalizationCoverage() {
  const uniqueCities = new Set(airports.map((airport) => airport.city));
  return [...activeAirportDisplayLocales].map((locale) => {
    const missing = [...uniqueCities].filter((city) => !cityDisplayNames[city]?.[locale]);
    return {
      locale,
      total: uniqueCities.size,
      localized: uniqueCities.size - missing.length,
      fallback: missing.length,
      missing: missing.slice(0, 50),
    };
  });
}

export function getLocalizedAirportCountryName(airport: Pick<AirportOption, "country" | "countryCode">, locale?: string | null) {
  if (!airport.countryCode) return airport.country;
  return getCountryDisplayNameForLocale(airport.countryCode, locale, airport.country);
}

export function getAirportCountryLocalizationCoverage() {
  const uniqueCountries = new Map<string, string | undefined>();
  for (const airport of airports) {
    if (airport.countryCode) uniqueCountries.set(airport.countryCode, airport.country);
  }

  return [...activeAirportDisplayLocales].map((locale) => {
    const missing = [...uniqueCountries.entries()]
      .filter(([countryCode, fallbackName]) => !getCountryDisplayNameForLocale(countryCode, locale, fallbackName))
      .map(([countryCode]) => countryCode);

    return {
      locale,
      total: uniqueCountries.size,
      localized: uniqueCountries.size - missing.length,
      fallback: missing.length,
      missing,
    };
  });
}

export function getLocalizedCityName(city: string, locale?: string | null) {
  const displayLocale = normalizeAirportDisplayLocale(locale);
  return cityDisplayNames[city]?.[displayLocale] ?? city;
}

export function formatLocalizedAirportLabel({ city, code, locale }: { city: string; code: string; locale?: string | null }) {
  return `${getLocalizedCityName(city, locale)} (${code})`;
}

export function formatAirportLabel(airport: AirportOption, locale?: string | null) {
  return formatLocalizedAirportLabel({ city: airport.city, code: airport.code, locale });
}
