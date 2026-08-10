import { airports } from "../airports";
import { buildCanonicalExploreDestinations } from "./exploreDestinationCatalogue";

export type ExploreDestinationEditorialSourceReference = {
  readonly title: string;
  readonly url: `https://${string}`;
};

export type ExploreDestinationEditorialProvenance = {
  readonly source: "kurioticket-editorial";
  readonly sourceReferences: readonly ExploreDestinationEditorialSourceReference[];
  readonly lastVerifiedAt: string;
};

export type ExploreDestinationEditorial = {
  /** Must resolve to one destination in the canonical Explore catalogue. */
  readonly id: string;
  readonly summary: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly editorialProvenance: ExploreDestinationEditorialProvenance;
};

const LAST_VERIFIED_AT = "2026-08-05";
const sourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: LAST_VERIFIED_AT,
});

const EUROPE_BATCH_1_LAST_VERIFIED_AT = "2026-08-08";
const europeBatch1SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: EUROPE_BATCH_1_LAST_VERIFIED_AT,
});

const EUROPE_BATCH_2_LAST_VERIFIED_AT = "2026-08-08";
const europeBatch2SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: EUROPE_BATCH_2_LAST_VERIFIED_AT,
});

const EUROPE_BATCH_3_LAST_VERIFIED_AT = "2026-08-08";
const europeBatch3SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: EUROPE_BATCH_3_LAST_VERIFIED_AT,
});

const EUROPE_BATCH_4_LAST_VERIFIED_AT = "2026-08-10";
const europeBatch4SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: EUROPE_BATCH_4_LAST_VERIFIED_AT,
});

const EUROPE_BATCH_5_LAST_VERIFIED_AT = "2026-08-10";
const europeBatch5SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: EUROPE_BATCH_5_LAST_VERIFIED_AT,
});

const AFRICA_BATCH_1_LAST_VERIFIED_AT = "2026-08-10";
const africaBatch1SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: AFRICA_BATCH_1_LAST_VERIFIED_AT,
});

const AFRICA_BATCH_2_LAST_VERIFIED_AT = "2026-08-10";
const africaBatch2SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: AFRICA_BATCH_2_LAST_VERIFIED_AT,
});

const AFRICA_BATCH_3_LAST_VERIFIED_AT = "2026-08-10";
const africaBatch3SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: AFRICA_BATCH_3_LAST_VERIFIED_AT,
});

const AFRICA_BATCH_4_LAST_VERIFIED_AT = "2026-08-10";
const africaBatch4SourceReferences = (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const,
  sourceReferences: references,
  lastVerifiedAt: AFRICA_BATCH_4_LAST_VERIFIED_AT,
});

const rawExploreDestinationEditorial = [
  {
    id: "fr-paris",
    summary: "Paris combines landmark architecture, major museums, riverfront districts and long-standing food traditions across a compact, walkable capital.",
    description: "Paris is shaped by the Seine, historic avenues and neighbourhoods that range from the Latin Quarter to Montmartre. Visitors encounter Gothic churches, palace museums, formal gardens and contemporary cultural venues within the same urban fabric. Its cafe culture, markets, bakeries and restaurant traditions sit alongside internationally recognised collections at the Louvre and other museums, while nearby Versailles reflects the region's royal and garden heritage.",
    highlights: ["Seine riverfront and historic bridges", "Louvre and major art museums", "Montmartre and Latin Quarter neighbourhoods", "Bakeries, markets and cafe culture"],
    editorialProvenance: sourceReferences([{ title: "Paris je t'aime - Tourist Office", url: "https://parisjetaime.com/eng/" }, { title: "Musée du Louvre Official Website", url: "https://www.louvre.fr/en" }]),
  },
  {
    id: "gb-london",
    summary: "London layers royal landmarks, global museums, theatre districts, markets and riverside neighbourhoods along the Thames.",
    description: "London's identity comes from historic institutions and a broad set of neighbourhoods linked by the River Thames. Westminster, the City, South Bank and the West End place parliament, cathedrals, theatres and galleries close to everyday markets and parks. The Tower of London, national museums and contemporary cultural venues illustrate a city where medieval, Victorian and modern architecture remain visibly connected.",
    highlights: ["Thames riverside landmarks", "Tower of London and royal heritage", "West End theatres and museums", "Markets, parks and diverse neighbourhoods"],
    editorialProvenance: sourceReferences([{ title: "Visit London", url: "https://www.visitlondon.com/" }, { title: "Tower of London | Historic Royal Palaces", url: "https://www.hrp.org.uk/tower-of-london/" }]),
  },
  {
    id: "us-new-york",
    summary: "New York pairs dense neighbourhood life with harbour landmarks, major museums, performing arts and a distinctive skyline.",
    description: "New York is organised around boroughs and neighbourhoods with different cultural histories, from Lower Manhattan and Harlem to Brooklyn waterfront districts. The city is closely tied to its harbour, where the Statue of Liberty and Ellis Island represent long-standing civic symbols. Museums, Broadway theatres, parks, food communities and high-rise architecture give the destination a varied urban character that extends well beyond a single centre.",
    highlights: ["Statue of Liberty and New York Harbor", "Broadway and performing arts", "Central Park and urban green spaces", "Distinct borough neighbourhoods"],
    editorialProvenance: sourceReferences([{ title: "NYC Tourism + Conventions", url: "https://www.nyctourism.com/" }, { title: "Statue of Liberty National Monument | National Park Service", url: "https://www.nps.gov/stli/index.htm" }]),
  },
  {
    id: "id-bali",
    summary: "Bali is an Indonesian island destination known for Hindu temples, rice landscapes, beaches and village-based arts traditions.",
    description: "Bali combines coastal areas, inland villages and volcanic landscapes with a visible Hindu cultural calendar. Ubud is associated with crafts, dance and rice-field scenery, while southern and eastern coastlines support beach, surf and temple visits. UNESCO recognises Bali's subak water-management landscape, connecting agriculture, ritual and community organisation. The island's appeal rests on this mix of living culture, nature and established visitor districts.",
    highlights: ["Hindu temples and ceremonies", "Subak rice-terrace landscapes", "Ubud arts and craft traditions", "Beaches and coastal villages"],
    editorialProvenance: sourceReferences([{ title: "Wonderful Indonesia - Bali", url: "https://www.indonesia.travel/gb/en/destinations/bali-nusa-tenggara/bali.html" }, { title: "UNESCO Cultural Landscape of Bali Province", url: "https://whc.unesco.org/en/list/1194/" }]),
  },
  {
    id: "ng-lagos",
    summary: "Lagos is a coastal Nigerian metropolis with arts districts, markets, beaches and a prominent music and nightlife culture.",
    description: "Lagos spreads across mainland districts and islands connected by lagoons and Atlantic beaches. The city is known for contemporary art spaces, markets, music venues and creative industries as well as historic sites tied to its coastal settlement patterns. Areas such as Victoria Island, Ikoyi, Lekki and Lagos Island offer different views of business, food, galleries and waterfront life, while beaches and conservation areas add outdoor variety.",
    highlights: ["Coastal lagoons and Atlantic beaches", "Contemporary galleries and creative spaces", "Markets and Nigerian food culture", "Island and mainland neighbourhoods"],
    editorialProvenance: sourceReferences([{ title: "Lagos State Government - Tourism", url: "https://lagosstate.gov.ng/tourism/" }, { title: "Nike Art Foundation", url: "https://nikeartfoundation.com/" }]),
  },
  {
    id: "ae-dubai",
    summary: "Dubai combines Gulf trading heritage, modern architecture, beaches, desert landscapes and multicultural dining districts.",
    description: "Dubai's visitor landscape ranges from creek-side heritage quarters and souks to contemporary towers, museums, beaches and desert conservation areas. The city grew from a trading port, and that history remains visible around Dubai Creek and Al Fahidi. Modern districts add large-scale architecture, waterfront promenades and food from many resident communities, creating a destination where historic commerce and planned urban development sit side by side.",
    highlights: ["Dubai Creek and historic souks", "Contemporary skyline and waterfront districts", "Beaches and desert landscapes", "Multicultural dining"],
    editorialProvenance: sourceReferences([{ title: "Visit Dubai", url: "https://www.visitdubai.com/en" }, { title: "UNESCO - Cultural Sites of Al-Faw, Dubai and Sharjah", url: "https://whc.unesco.org/en/list/1641/" }]),
  },
  {
    id: "jp-tokyo",
    summary: "Tokyo blends historic temples, dense shopping districts, parks, rail-connected neighbourhoods and influential food culture.",
    description: "Tokyo is a large metropolitan destination where old and new districts sit close together. Asakusa and Ueno highlight temples, museums and traditional streets, while Shibuya, Shinjuku and Ginza show the city's commercial and design energy. Gardens, riverside areas and neighbourhood food streets soften the density. The city is also a practical base for experiencing Japanese performing arts, pop culture and regional cuisine.",
    highlights: ["Asakusa temples and traditional streets", "Shibuya, Shinjuku and Ginza districts", "Museums, gardens and urban parks", "Japanese food halls and neighbourhood dining"],
    editorialProvenance: sourceReferences([{ title: "GO TOKYO - The Official Tokyo Travel Guide", url: "https://www.gotokyo.org/en/index.html" }, { title: "Japan National Tourism Organization - Tokyo", url: "https://www.japan.travel/en/destinations/kanto/tokyo/" }]),
  },
  {
    id: "za-cape-town",
    summary: "Cape Town is defined by Table Mountain, Atlantic coastlines, historic districts, gardens and a layered cultural setting.",
    description: "Cape Town sits between mountains and the ocean, giving the city a strong landscape identity. Table Mountain National Park, beaches, harbours and botanical gardens frame urban districts such as the city centre, Bo-Kaap and the V&A Waterfront. Museums and heritage sites reflect complex local history, while nearby wine areas and coastal drives add regional context without changing the city's core appeal.",
    highlights: ["Table Mountain and coastal views", "Bo-Kaap and central heritage streets", "Harbours, beaches and gardens", "Museums and regional wine areas"],
    editorialProvenance: sourceReferences([{ title: "Cape Town Tourism", url: "https://www.capetown.travel/" }, { title: "SANParks - Table Mountain National Park", url: "https://www.sanparks.org/parks/table-mountain" }]),
  },
  {
    id: "it-rome",
    summary: "Rome connects ancient ruins, Renaissance and Baroque architecture, piazzas, churches and everyday food traditions in one capital city.",
    description: "Rome's historic layers are unusually visible, with ancient forums, amphitheatres, churches, fountains and palaces embedded in active neighbourhoods. The Colosseum and Roman Forum anchor the archaeological landscape, while areas such as Trastevere, Campo de' Fiori and the historic centre show street life, markets and trattorias. The city also serves as a gateway to Vatican museums and religious heritage within the metropolitan area.",
    highlights: ["Colosseum and Roman Forum", "Piazzas, fountains and Baroque streets", "Trastevere and historic neighbourhoods", "Roman food traditions"],
    editorialProvenance: sourceReferences([{ title: "Turismo Roma", url: "https://www.turismoroma.it/en" }, { title: "CoopCulture - Colosseum", url: "https://www.coopculture.it/en/poi/colosseum/" }]),
  },
  {
    id: "tr-istanbul",
    summary: "Istanbul spans Europe and Asia with imperial monuments, Bosphorus waterfronts, bazaars and layered food traditions.",
    description: "Istanbul's character comes from its position on the Bosphorus and its long Byzantine and Ottoman history. Sultanahmet contains landmarks such as Hagia Sophia, the Blue Mosque area and the Hippodrome, while the Grand Bazaar, Galata, Kadıköy and waterfront neighbourhoods show commerce, ferries and daily life. The city's architecture, bathhouses, tea gardens and street food reflect centuries of exchange between regions.",
    highlights: ["Hagia Sophia and Sultanahmet monuments", "Bosphorus ferries and waterfronts", "Grand Bazaar and historic commerce", "Galata and Kadıköy neighbourhoods"],
    editorialProvenance: sourceReferences([{ title: "Istanbul Official Tourism Portal", url: "https://istanbul.com/" }, { title: "Hagia Sophia History and Experience Museum", url: "https://muze.gen.tr/muze-detay/ayasofya" }]),
  },
  {
    id: "th-bangkok",
    summary: "Bangkok combines river temples, royal heritage, markets, canals, shopping districts and a widely recognised street-food culture.",
    description: "Bangkok is shaped by the Chao Phraya River, canal communities and a fast-moving urban core. The Grand Palace and important temples sit near older districts, while markets, malls and neighbourhood food streets show the city's daily rhythm. Museums, river piers and traditional houses add context to Thai art and history. The destination is distinguished by the contrast between ceremonial landmarks and dense, informal street life.",
    highlights: ["Chao Phraya River and canals", "Grand Palace and temple districts", "Markets and street-food culture", "Museums and traditional houses"],
    editorialProvenance: sourceReferences([{ title: "Tourism Authority of Thailand - Bangkok", url: "https://www.tourismthailand.org/Destinations/Provinces/Bangkok/219" }, { title: "The Grand Palace Bangkok", url: "https://www.royalgrandpalace.th/en/home" }]),
  },
  {
    id: "es-barcelona",
    summary: "Barcelona mixes Mediterranean waterfronts, Gothic streets, modernist architecture, markets and Catalan cultural institutions.",
    description: "Barcelona's setting between the sea and surrounding hills shapes its neighbourhoods and public spaces. The Gothic Quarter preserves medieval streets, while Eixample is closely associated with modernist architecture, including Gaudí's Sagrada Família. Markets, museums, beaches and plazas support a strong street-level culture. Catalan language, food traditions and design heritage help distinguish the city from other Mediterranean capitals.",
    highlights: ["Sagrada Família and modernist architecture", "Gothic Quarter streets", "Mediterranean beaches and waterfront", "Markets and Catalan food traditions"],
    editorialProvenance: sourceReferences([{ title: "Visit Barcelona", url: "https://www.barcelonaturisme.com/wv3/en/" }, { title: "Sagrada Família Official Website", url: "https://sagradafamilia.org/en/" }]),
  },
  {
    id: "eg-cairo",
    summary: "Cairo brings together Pharaonic monuments, Islamic architecture, Coptic heritage, Nile districts and busy market streets.",
    description: "Cairo's visitor identity spans ancient, medieval and modern Egypt. The nearby Giza Plateau anchors the Pharaonic landscape, while the Egyptian Museum and other collections hold major archaeological material. Within the city, Islamic Cairo, Coptic sites, Nile bridges and markets reveal different religious and urban histories. The result is a dense capital where monumental heritage and everyday street life are closely intertwined.",
    highlights: ["Giza Plateau monuments", "Egyptian Museum collections", "Islamic Cairo architecture", "Nile bridges and market streets"],
    editorialProvenance: sourceReferences([{ title: "Egyptian Tourism Authority", url: "https://www.experienceegypt.eg/" }, { title: "Egyptian Ministry of Tourism and Antiquities - Giza Plateau", url: "https://egymonuments.gov.eg/archaeological-sites/giza-plateau/" }]),
  },
  {
    id: "ma-marrakesh",
    summary: "Marrakesh is known for its historic medina, gardens, craft souks, palaces and links to the Atlas Mountains.",
    description: "Marrakesh centres on a walled medina where souks, riads, mosques and public squares form the historic urban pattern. UNESCO recognises the medina for its cultural value, including monuments such as the Koutoubia Mosque area, old gates and traditional houses. Gardens and palace sites add quieter spaces, while craft workshops and Moroccan food traditions remain central to the visitor experience.",
    highlights: ["UNESCO-listed medina", "Souks, riads and craft workshops", "Gardens and palace architecture", "Moroccan food traditions"],
    editorialProvenance: sourceReferences([{ title: "Visit Marrakech", url: "https://visitmarrakech.com/" }, { title: "UNESCO Medina of Marrakesh", url: "https://whc.unesco.org/en/list/331/" }]),
  },
  {
    id: "sg-singapore",
    summary: "Singapore combines garden landscapes, heritage districts, waterfront architecture, hawker food culture and efficient urban design.",
    description: "Singapore is a compact island city-state with distinct cultural districts, waterfront promenades and large public gardens. Chinatown, Little India and Kampong Gelam reflect different community histories, while Marina Bay and Gardens by the Bay show contemporary planning and landscape design. Hawker centres, museums and riverfront areas connect food traditions with civic and commercial life, making the destination highly varied despite its small size.",
    highlights: ["Gardens by the Bay and waterfront promenades", "Chinatown, Little India and Kampong Gelam", "Hawker centres and food heritage", "Museums and riverfront districts"],
    editorialProvenance: sourceReferences([{ title: "Visit Singapore", url: "https://www.visitsingapore.com/en/" }, { title: "Gardens by the Bay", url: "https://www.gardensbythebay.com.sg/" }]),
  },
  {
    id: "nl-amsterdam",
    summary: "Amsterdam is organised around canals, cycling streets, museums, historic houses and neighbourhood cafes.",
    description: "Amsterdam's canal ring and compact street pattern shape much of the visitor experience. The city includes major museums such as the Rijksmuseum, historic merchant houses, markets and waterfront redevelopment areas. Cycling infrastructure, brown cafes and neighbourhoods beyond the central canal belt help define daily life. Its cultural identity combines Golden Age heritage with contemporary design, music and food scenes.",
    highlights: ["Canal ring and historic bridges", "Rijksmuseum and major museums", "Cycling streets and neighbourhood cafes", "Markets and waterfront districts"],
    editorialProvenance: sourceReferences([{ title: "I amsterdam", url: "https://www.iamsterdam.com/en" }, { title: "Rijksmuseum", url: "https://www.rijksmuseum.nl/en" }]),
  },
  {
    id: "ca-toronto",
    summary: "Toronto is a diverse lakefront city with neighbourhood food scenes, museums, theatres, parks and skyline views.",
    description: "Toronto sits on Lake Ontario and is known for culturally varied neighbourhoods, from Kensington Market and Chinatown to Queen West and the Distillery District. The city includes major museums, performing arts venues, sports grounds and waterfront public spaces. Ravines, islands and parks add green relief to the urban grid, while its food culture reflects long-standing and newer immigrant communities.",
    highlights: ["Lake Ontario waterfront and islands", "Kensington Market and diverse neighbourhoods", "Museums and performing arts", "Ravines, parks and skyline views"],
    editorialProvenance: sourceReferences([{ title: "Destination Toronto", url: "https://www.destinationtoronto.com/" }, { title: "Royal Ontario Museum", url: "https://www.rom.on.ca/" }]),
  },
  {
    id: "us-los-angeles",
    summary: "Los Angeles spans beaches, film heritage, museums, hills, diverse neighbourhoods and a broad Southern California food culture.",
    description: "Los Angeles is a spread-out city shaped by the Pacific coast, mountain views and many distinct communities. Hollywood and studio history remain important, but the destination also includes art museums, music venues, historic downtown architecture, beach cities and food corridors influenced by global migration. Griffith Park, the Getty Center and coastal areas show how culture and landscape sit close together across the basin.",
    highlights: ["Hollywood and film heritage", "Pacific beaches and coastal districts", "Getty Center and major museums", "Griffith Park and hill views"],
    editorialProvenance: sourceReferences([{ title: "Discover Los Angeles", url: "https://www.discoverlosangeles.com/" }, { title: "Getty Center", url: "https://www.getty.edu/visit/center/" }]),
  },
  {
    id: "ng-abuja",
    summary: "Abuja is Nigeria's planned capital, noted for broad avenues, civic landmarks, rock formations and nearby natural sites.",
    description: "Abuja differs from older Nigerian cities because it was developed as a planned federal capital. Government districts, wide roads and civic monuments define the urban layout, while landmarks such as Aso Rock and nearby parks give the city a strong landscape setting. Cultural centres, markets and restaurants add local texture, and surrounding natural attractions provide day-trip context without relying on temporary events.",
    highlights: ["Aso Rock and civic landmarks", "Planned capital avenues", "Cultural centres and markets", "Nearby parks and waterfalls"],
    editorialProvenance: sourceReferences([{ title: "Visit Abuja", url: "https://visitabuja.ng/" }, { title: "National Park Service Nigeria - Gurara Waterfalls", url: "https://nationalparkservice.gov.ng/parks/gurara-waterfalls/" }]),
  },
  {
    id: "gh-accra",
    summary: "Accra combines Atlantic beaches, independence-era landmarks, markets, art spaces and lively Ghanaian food and music culture.",
    description: "Accra is Ghana's coastal capital, with neighbourhoods that connect beaches, markets, memorials and contemporary creative spaces. Independence Square and the Kwame Nkrumah Memorial Park reflect national history, while Jamestown, Osu and Labadi show different layers of coastal settlement, nightlife and food culture. Galleries, craft markets and music venues contribute to a city identity rooted in both heritage and current urban creativity.",
    highlights: ["Independence landmarks and memorials", "Jamestown coastal heritage", "Markets, galleries and crafts", "Beaches, music and Ghanaian food"],
    editorialProvenance: sourceReferences([{ title: "Visit Ghana - Kwame Nkrumah Memorial Park", url: "https://visitghana.com/attractions/kwame-nkrumah-memorial-park/" }, { title: "Visit Ghana - Jamestown Lighthouse", url: "https://visitghana.com/attractions/jamestown-lighthouse/" }]),
  },
  {
    id: "za-johannesburg",
    summary: "Johannesburg is an inland South African city shaped by mining history, townships, museums, markets and contemporary arts.",
    description: "Johannesburg grew around gold mining and remains a major cultural and commercial centre. The city includes heritage sites linked to South Africa's democratic history, such as Constitution Hill and the Apartheid Museum, alongside districts like Maboneng, Braamfontein and Soweto. Markets, galleries, music venues and restaurants reflect a changing urban culture, while nearby archaeological landscapes add wider regional context.",
    highlights: ["Apartheid Museum and Constitution Hill", "Soweto heritage and street culture", "Maboneng and Braamfontein arts districts", "Markets and inland city views"],
    editorialProvenance: sourceReferences([{ title: "Visit Joburg", url: "https://visit.joburg/" }, { title: "Apartheid Museum", url: "https://www.apartheidmuseum.org/" }]),
  },
  {
    id: "ke-nairobi",
    summary: "Nairobi pairs East African city life with museums, markets, restaurants and wildlife landscapes close to the urban edge.",
    description: "Nairobi is Kenya's capital and a regional hub with a distinctive mix of urban culture and nearby natural areas. Nairobi National Park sits close to the city, while museums, markets and neighbourhood restaurants introduce Kenyan history, crafts and food traditions. Districts such as Westlands, Karen and the central business area offer different visitor settings, from galleries and cafes to conservation-focused attractions.",
    highlights: ["Nairobi National Park", "Museums and Kenyan heritage", "Markets, crafts and local dining", "Karen and Westlands neighbourhoods"],
    editorialProvenance: sourceReferences([{ title: "Magical Kenya - Nairobi", url: "https://www.magicalkenya.com/places-to-visit/cities/nairobi/" }, { title: "Kenya Wildlife Service - Nairobi National Park", url: "https://www.kws.go.ke/nairobi-national-park" }]),
  },
  {
    id: "pt-lisbon",
    summary: "Lisbon is a hilly Atlantic capital with tiled streets, river viewpoints, historic trams, music traditions and seafood cuisine.",
    description: "Lisbon rises from the Tagus River into neighbourhoods known for viewpoints, tiled facades and narrow streets. Alfama, Baixa, Chiado and Belém connect medieval lanes, rebuilt downtown squares, monasteries and maritime history. Trams, markets, museums and fado venues add to the city's cultural identity, while nearby beaches and riverfront promenades reflect its Atlantic setting.",
    highlights: ["Tagus River viewpoints", "Alfama, Baixa and Chiado streets", "Belém monuments and maritime heritage", "Fado venues and seafood traditions"],
    editorialProvenance: sourceReferences([{ title: "Visit Lisboa", url: "https://www.visitlisboa.com/" }, { title: "Lisboa Official City Website - Visit", url: "https://www.lisboa.pt/en/visit" }]),
  },
  {
    id: "au-sydney",
    summary: "Sydney combines harbour landmarks, coastal walks, beaches, museums, Indigenous heritage and varied neighbourhood dining.",
    description: "Sydney's harbour setting strongly shapes its identity, with the Opera House, ferries, coves and bridge views at the centre of many visits. Coastal areas such as Bondi and Manly add beaches and walking routes, while neighbourhoods including Surry Hills, Newtown and The Rocks offer food, markets and historic streets. Museums and cultural institutions also present Aboriginal and Torres Strait Islander heritage alongside contemporary Australian arts.",
    highlights: ["Sydney Harbour and Opera House", "Bondi, Manly and coastal walks", "The Rocks and inner-city neighbourhoods", "Museums and Indigenous heritage"],
    editorialProvenance: sourceReferences([{ title: "Sydney.com", url: "https://www.sydney.com/" }, { title: "Sydney Opera House", url: "https://www.sydneyoperahouse.com/" }]),
  },
  {
    id: "br-rio-de-janeiro",
    summary: "Rio de Janeiro is defined by mountains, beaches, music culture, historic districts and dramatic Atlantic viewpoints.",
    description: "Rio de Janeiro's landscape is central to its appeal, with granite peaks, forests and beaches woven into the urban area. Copacabana, Ipanema, Sugarloaf Mountain and Corcovado are established reference points, while the UNESCO-listed cultural landscape recognises the relationship between city and natural setting. Historic centre streets, samba traditions, museums and neighbourhood food culture add depth beyond the shoreline.",
    highlights: ["Copacabana and Ipanema beaches", "Sugarloaf and Corcovado viewpoints", "UNESCO cultural landscape", "Samba, museums and historic centre streets"],
    editorialProvenance: sourceReferences([{ title: "Riotur - Visit Rio", url: "https://riotur.rio/en/welcome/" }, { title: "UNESCO Rio de Janeiro Carioca Landscapes", url: "https://whc.unesco.org/en/list/1100/" }]),
  },
  {
    id: "dk-copenhagen",
    summary: "Copenhagen combines harbourfront districts, royal architecture, cycling streets, design institutions and established Nordic food traditions.",
    description: "Copenhagen occupies islands beside the Øresund, with canals and harbour spaces woven through the centre. Nyhavn, Christianshavn and the royal complex at Amalienborg illustrate its maritime, residential and monarchical history. Designmuseum Danmark and historic streets reflect Danish design traditions, while markets, bakeries and waterside neighbourhoods connect the city's built heritage with everyday food culture.",
    highlights: ["Nyhavn harbourfront", "Amalienborg palace complex", "Christianshavn canals", "Danish design and food traditions"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "VisitCopenhagen - Official Guide to Copenhagen", url: "https://www.visitcopenhagen.com/" }, { title: "Designmuseum Danmark", url: "https://designmuseum.dk/en/" }]),
  },
  {
    id: "ee-tallinn",
    summary: "Tallinn combines a fortified medieval centre, Baltic waterfront, wooden neighbourhoods and contemporary Estonian cultural institutions.",
    description: "Tallinn stands on the Gulf of Finland, where the walled Old Town rises above a Baltic harbour. Toompea Castle, Town Hall Square and surviving towers trace the city's medieval civic history, recognised by UNESCO. Kadriorg adds a palace, park and art museums, while Kalamaja's wooden houses and the Telliskivi area show later industrial and residential layers beyond the historic walls.",
    highlights: ["UNESCO-listed Old Town", "Toompea Castle and city walls", "Kadriorg Palace and park", "Kalamaja wooden neighbourhood"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "Visit Tallinn - Official City Guide", url: "https://www.visittallinn.ee/eng/visitor" }, { title: "UNESCO Historic Centre (Old Town) of Tallinn", url: "https://whc.unesco.org/en/list/822/" }]),
  },
  {
    id: "fi-helsinki",
    summary: "Helsinki pairs Baltic shorelines, neoclassical civic architecture, island fortifications, design districts and Finnish sauna culture.",
    description: "Helsinki extends across a Baltic peninsula and archipelago, with ferries linking the centre to nearby islands. Senate Square, Helsinki Cathedral and the Market Square define its neoclassical and waterfront core, while Suomenlinna preserves an extensive UNESCO-listed sea fortress. The Design District, public saunas and food halls reflect traditions of Finnish craft, communal bathing and seasonal ingredients within the modern capital.",
    highlights: ["Senate Square and Helsinki Cathedral", "Suomenlinna sea fortress", "Design District streets", "Public saunas and food halls"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "MyHelsinki - Helsinki City Guide", url: "https://www.myhelsinki.fi/en" }, { title: "UNESCO Fortress of Suomenlinna", url: "https://whc.unesco.org/en/list/583/" }]),
  },
  {
    id: "is-reykjavik",
    summary: "Reykjavík combines a North Atlantic waterfront, colourful low-rise streets, geothermal pools and Icelandic cultural institutions.",
    description: "Reykjavík faces Faxaflói bay on Iceland's southwest coast, with mountains visible beyond the working harbour. Hallgrímskirkja, Harpa Concert Hall and the old harbour give the compact centre distinct architectural reference points. City museums interpret settlement and maritime history, while geothermal swimming pools, seafood kitchens and nearby coastal paths connect daily life to the island's geology and North Atlantic setting.",
    highlights: ["Hallgrímskirkja skyline", "Harpa Concert Hall", "Old harbour and Faxaflói bay", "Geothermal swimming pools"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "Visit Reykjavík - Official Tourist Information", url: "https://visitreykjavik.is/" }, { title: "Reykjavík City Museum", url: "https://reykjavikcitymuseum.is/" }]),
  },
  {
    id: "lv-riga",
    summary: "Riga brings together a Daugava riverfront, medieval streets, Art Nouveau architecture and Latvian market traditions.",
    description: "Riga stands beside the Daugava River near the Gulf of Riga, with its historic centre spanning medieval and later urban layers. The cathedral, House of the Black Heads and central squares anchor the Old Town, while an extensive Art Nouveau district reflects rapid growth around 1900. Central Market, wooden architecture and Latvian cultural institutions broaden the city's heritage beyond its UNESCO-listed core.",
    highlights: ["UNESCO-listed historic centre", "Art Nouveau district", "House of the Black Heads", "Riga Central Market"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "LiveRiga - Official Riga Travel Guide", url: "https://www.liveriga.com/en/" }, { title: "UNESCO Historic Centre of Riga", url: "https://whc.unesco.org/en/list/852/" }]),
  },
  {
    id: "lt-vilnius",
    summary: "Vilnius combines a baroque Old Town, wooded river valleys, historic religious sites and Lithuanian cultural institutions.",
    description: "Vilnius occupies the valleys of the Neris and Vilnia rivers, with wooded hills surrounding its historic centre. Cathedral Square, Gediminas Castle Tower and the Gates of Dawn mark different civic, defensive and religious layers. UNESCO recognises the Old Town's varied Gothic, Renaissance, Baroque and classical fabric, while Užupis, markets and museums extend the capital's cultural life across the river and beyond its central streets.",
    highlights: ["UNESCO-listed Vilnius Old Town", "Gediminas Castle Tower", "Gates of Dawn", "Užupis riverside district"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "Go Vilnius - Official Vilnius Guide", url: "https://www.govilnius.lt/visit-vilnius" }, { title: "UNESCO Vilnius Historic Centre", url: "https://whc.unesco.org/en/list/541/" }]),
  },
  {
    id: "no-oslo",
    summary: "Oslo combines an inner-fjord setting, forested edges, maritime museums, contemporary architecture and Norwegian cultural institutions.",
    description: "Oslo sits at the head of the Oslofjord, bordered by islands, hills and extensive forest. The medieval fortress at Akershus, the harbour promenade and the Opera House connect historic defences with newer waterfront architecture. Museums devoted to Munch, polar exploration and Norwegian maritime history complement neighbourhood food halls and sculpture parks, giving the capital a cultural landscape closely tied to land and water.",
    highlights: ["Oslofjord islands and waterfront", "Akershus Fortress", "Opera House harbourfront", "Munch and maritime museums"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "VisitOSLO - Official Travel Guide to Oslo", url: "https://www.visitoslo.com/en/" }, { title: "MUNCH Museum Oslo", url: "https://www.munch.no/en/" }]),
  },
  {
    id: "pl-warsaw",
    summary: "Warsaw combines a reconstructed historic centre, Vistula riverbanks, royal residences and institutions documenting Polish history.",
    description: "Warsaw spreads along the Vistula River, with boulevards and natural riverbanks dividing its varied districts. The reconstructed Old Town, Royal Castle and Royal Route record the capital's destruction and rebuilding, while Łazienki Park preserves a palace-and-garden landscape. POLIN Museum, former industrial areas and neighbourhood markets present Jewish, civic and everyday histories alongside the city's post-war and contemporary architecture.",
    highlights: ["Reconstructed UNESCO Old Town", "Royal Route and Łazienki Park", "Vistula riverbanks", "POLIN Museum of Polish Jews"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "Go2Warsaw - Official Tourist Website of Warsaw", url: "https://warsawtour.pl/en/main-page/" }, { title: "POLIN Museum of the History of Polish Jews", url: "https://www.polin.pl/en" }]),
  },
  {
    id: "se-stockholm",
    summary: "Stockholm spans Baltic islands with a medieval centre, royal institutions, maritime museums and Swedish design traditions.",
    description: "Stockholm occupies an archipelago setting where bridges and ferries link districts across Lake Mälaren and the Baltic Sea. Gamla Stan contains medieval lanes, the Royal Palace and civic landmarks, while Djurgården brings together museums and parkland. The preserved seventeenth-century Vasa warship, design collections, food halls and waterside neighbourhoods connect Sweden's maritime history with the capital's cultural and domestic traditions.",
    highlights: ["Gamla Stan medieval lanes", "Royal Palace", "Vasa Museum on Djurgården", "Archipelago ferries and waterways"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "Visit Stockholm - The Official Guide", url: "https://www.visitstockholm.com/" }, { title: "The Vasa Museum", url: "https://www.vasamuseet.se/en" }]),
  },
  {
    id: "de-berlin",
    summary: "Berlin combines Prussian landmarks, twentieth-century memorials, museum collections, waterways and distinctive neighbourhood cultural scenes.",
    description: "Berlin spreads along the River Spree, with parks, canals and neighbourhood centres breaking up the German capital's broad urban fabric. Brandenburg Gate, the Reichstag and remnants of the Berlin Wall trace political ruptures from Prussian rule through division and reunification. Museum Island, recognised by UNESCO, anchors major collections, while districts such as Kreuzberg and Prenzlauer Berg add markets, courtyards and varied food traditions.",
    highlights: ["Brandenburg Gate and Reichstag", "Berlin Wall memorial sites", "UNESCO-listed Museum Island", "Kreuzberg canals and markets"],
    editorialProvenance: europeBatch1SourceReferences([{ title: "visitBerlin - Berlin's Official Travel Website", url: "https://www.visitberlin.de/en" }, { title: "UNESCO Museumsinsel (Museum Island), Berlin", url: "https://whc.unesco.org/en/list/896/" }]),
  },
  {
    id: "at-vienna",
    summary: "Vienna layers imperial architecture, Danube landscapes, music institutions, coffeehouse traditions and distinct residential districts.",
    description: "Vienna extends from the Danube and its canal across a city shaped by imperial and modern development. The Hofburg, Ringstrasse and Schönbrunn Palace trace Habsburg history, while the MuseumsQuartier and Secession represent later artistic movements. Traditional coffeehouses, markets and wine-producing neighbourhoods at the city's edge connect longstanding food customs with the cultural institutions of Austria's capital.",
    highlights: ["Hofburg and Ringstrasse", "Schönbrunn Palace and gardens", "MuseumsQuartier and Secession", "Coffeehouses and Viennese wine culture"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Vienna Tourist Board - Vienna.info", url: "https://www.wien.info/en" }, { title: "UNESCO Historic Centre of Vienna", url: "https://whc.unesco.org/en/list/1033/" }]),
  },
  {
    id: "cz-prague",
    summary: "Prague unfolds beside the Vltava through medieval quarters, baroque landmarks, historic bridges and Czech cultural institutions.",
    description: "Prague occupies both banks of the Vltava, with hills and bridges shaping the historic centre. Prague Castle, Charles Bridge and Old Town Square reveal Romanesque, Gothic and Baroque layers recognised within the UNESCO-listed core. Malá Strana, Josefov and riverside districts add neighbourhood context, while concert halls, traditional beer culture and Czech cuisine reflect enduring civic and social traditions.",
    highlights: ["Prague Castle complex", "Charles Bridge and Vltava riverfront", "Old Town Square", "Malá Strana and Josefov"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Prague City Tourism - Official Tourist Website", url: "https://www.prague.eu/en" }, { title: "UNESCO Historic Centre of Prague", url: "https://whc.unesco.org/en/list/616/" }]),
  },
  {
    id: "hu-budapest",
    summary: "Budapest spans the Danube with thermal baths, hilltop monuments, grand boulevards and Hungarian food traditions.",
    description: "Budapest joins hilly Buda and flatter Pest across the Danube, with bridges defining the city's central views. Buda Castle, the Parliament building and Andrássy Avenue represent royal, civic and nineteenth-century development within its UNESCO-recognised landscape. Historic thermal baths, the Great Market Hall and established café traditions connect the capital's geology and architecture with Hungarian bathing and food culture.",
    highlights: ["Buda Castle and Castle Hill", "Parliament and Danube bridges", "Andrássy Avenue", "Historic thermal baths"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Budapest Brand - Official Budapest Guide", url: "https://www.budapestinfo.hu/" }, { title: "UNESCO Budapest, including the Banks of the Danube", url: "https://whc.unesco.org/en/list/400/" }]),
  },
  {
    id: "be-brussels",
    summary: "Brussels brings together medieval guild architecture, Art Nouveau streets, European institutions and Belgian culinary traditions.",
    description: "Brussels grew around the Senne valley, and its centre retains a compact network of squares and historic streets. Grand-Place, the Galeries Royales and Art Nouveau houses associated with Victor Horta document commercial and architectural history, while the European Quarter reflects the city's institutional role. Comic art, neighbourhood markets, chocolate, waffles and brewing traditions contribute further strands of Belgian cultural life.",
    highlights: ["UNESCO-listed Grand-Place", "Victor Horta Art Nouveau houses", "European Quarter institutions", "Comic art and brewing traditions"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "visit.brussels - Official Brussels Tourism Website", url: "https://www.visit.brussels/en/visitors" }, { title: "UNESCO Major Town Houses of Victor Horta", url: "https://whc.unesco.org/en/list/1005/" }]),
  },
  {
    id: "ch-zurich",
    summary: "Zurich links a lakeside setting, Limmat riverfront, medieval lanes, major art collections and Swiss guild history.",
    description: "Zurich lies where the Limmat leaves Lake Zurich, with wooded hills rising beyond the urban waterfront. The Grossmünster, Fraumünster and narrow Old Town streets reflect religious and guild history, while Bahnhofstrasse marks later commercial growth. Kunsthaus Zürich, lakeside promenades and former industrial quarters such as Zürich-West connect established cultural institutions with the city's changing architectural fabric.",
    highlights: ["Lake Zurich and Limmat waterfront", "Grossmünster and Fraumünster", "Old Town guild houses", "Kunsthaus and Zürich-West"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Zurich Tourism - Official City Guide", url: "https://www.zuerich.com/en" }, { title: "Kunsthaus Zürich", url: "https://www.kunsthaus.ch/en/" }]),
  },
  {
    id: "ch-geneva",
    summary: "Geneva sits between lake and mountains, shaped by Reformation heritage, diplomacy, watchmaking and international institutions.",
    description: "Geneva occupies the western end of Lake Geneva where the Rhône flows toward the French border. The Jet d'Eau, St Pierre Cathedral and Old Town form central landmarks, while museums interpret the Reformation, watchmaking and humanitarian history. International organisations in the Nations district, lakeside parks and long-established chocolate traditions reflect the city's civic, diplomatic and craft identities.",
    highlights: ["Jet d'Eau and lakeside parks", "St Pierre Cathedral and Old Town", "Nations district institutions", "Watchmaking and Reformation museums"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Geneva Tourism - Official Website", url: "https://www.geneve.com/en" }, { title: "City of Geneva - Discover Geneva", url: "https://www.geneve.ch/en/what-geneva/discover-geneva" }]),
  },
  {
    id: "de-munich",
    summary: "Munich features Bavarian civic architecture, extensive parks, major museums, neighbourhood markets and brewing traditions.",
    description: "Munich stands on the Isar River north of the Bavarian Alps, with green corridors extending through the city. Marienplatz, the Residenz and Nymphenburg Palace trace civic and royal history, while the Kunstareal and Deutsches Museum hold major art, science and technology collections. The English Garden, Viktualienmarkt and established beer-hall culture connect public landscapes with Bavarian food and social traditions.",
    highlights: ["Marienplatz and the Residenz", "Nymphenburg Palace", "English Garden and Isar riverbanks", "Kunstareal and Deutsches Museum"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Munich Travel - Official City Guide", url: "https://www.munich.travel/en" }, { title: "Deutsches Museum", url: "https://www.deutsches-museum.de/en" }]),
  },
  {
    id: "de-frankfurt",
    summary: "Frankfurt sets a modern skyline beside a historic riverfront, museum district, market halls and civic heritage.",
    description: "Frankfurt developed around a Main River crossing, and its riverbanks remain central to the city's geography. The reconstructed Römerberg, Imperial Cathedral and Goethe House represent medieval, imperial and literary history, contrasting with the financial district's towers. Museumsufer institutions, Sachsenhausen streets and the Kleinmarkthalle add art collections, cider traditions and regional food culture to the urban centre.",
    highlights: ["Römerberg and Imperial Cathedral", "Main River and Museumsufer", "Goethe House", "Sachsenhausen cider traditions"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Visit Frankfurt - Official City Tourism Portal", url: "https://www.visitfrankfurt.travel/en" }, { title: "Städel Museum", url: "https://www.staedelmuseum.de/en" }]),
  },
  {
    id: "gr-athens",
    summary: "Athens presents ancient monuments, neoclassical streets, hillside neighbourhoods, archaeological museums and enduring Greek food traditions.",
    description: "Athens spreads across the Attica basin between surrounding mountains and the Saronic Gulf. The Acropolis, Ancient Agora and Acropolis Museum document the ancient city, while Syntagma Square and neoclassical buildings reflect the modern capital's development. Plaka, Monastiraki and central markets connect archaeological landscapes with residential streets, crafts and Greek cooking traditions rooted in olive oil, grains and seasonal produce.",
    highlights: ["Acropolis and Parthenon", "Ancient Agora", "Plaka and Monastiraki", "Acropolis Museum collections"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "This is Athens - Official Athens Guide", url: "https://www.thisisathens.org/" }, { title: "UNESCO Acropolis, Athens", url: "https://whc.unesco.org/en/list/404/" }]),
  },
  {
    id: "ie-dublin",
    summary: "Dublin follows the River Liffey through Georgian squares, literary institutions, historic markets and coastal neighbourhoods.",
    description: "Dublin straddles the River Liffey on Ireland's east coast, with the bay and nearby mountains framing the city. Dublin Castle, Trinity College and Georgian squares trace medieval, academic and eighteenth-century development, while national museums preserve art and archaeology. Literary landmarks, traditional music venues, food markets and coastal villages around Dublin Bay reflect the wider cultural landscape of the Irish capital.",
    highlights: ["River Liffey and Georgian squares", "Dublin Castle", "Trinity College and literary heritage", "National museums and coastal villages"],
    editorialProvenance: europeBatch2SourceReferences([{ title: "Visit Dublin - Official Dublin Tourism Guide", url: "https://www.visitdublin.com/" }, { title: "Dublin Castle - Government of Ireland", url: "https://www.dublincastle.ie/" }]),
  },
  {
    id: "al-tirana",
    summary: "Tirana centres on Skanderbeg Square, with Ottoman landmarks, modern civic architecture and nearby mountain landscapes.",
    description: "Tirana lies on a plain between the Adriatic coast and Mount Dajti, with broad boulevards meeting a compact centre. Skanderbeg Square brings together the Et'hem Bey Mosque, National Historical Museum and twentieth-century civic buildings. The New Bazaar, Blloku and former Cold War sites add market culture, residential history and evidence of Albania's political transformations.",
    highlights: ["Skanderbeg Square", "Et'hem Bey Mosque", "New Bazaar and Blloku", "Mount Dajti landscape"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "National Tourism Agency of Albania", url: "https://akt.gov.al/en/" }, { title: "Municipality of Tirana", url: "https://tirana.al/en/" }]),
  },
  {
    id: "ba-sarajevo",
    summary: "Sarajevo follows the Miljacka River through Ottoman quarters, Austro-Hungarian streets and surrounding mountain slopes.",
    description: "Sarajevo occupies a valley along the Miljacka River, enclosed by mountains that frame its linear urban form. Baščaršija preserves Ottoman-era lanes, the Gazi Husrev-beg Mosque and craft traditions, while City Hall represents the later Austro-Hungarian period. The Latin Bridge, museums and religious buildings document intersecting communities and pivotal events in the Bosnian capital's history.",
    highlights: ["Baščaršija market quarter", "Gazi Husrev-beg Mosque", "City Hall and Latin Bridge", "Miljacka valley setting"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Visit Sarajevo - Official Tourism Portal", url: "https://sarajevo.travel/en" }, { title: "Historical Museum of Bosnia and Herzegovina", url: "https://muzej.ba/" }]),
  },
  {
    id: "bg-sofia",
    summary: "Sofia rests below Vitosha Mountain, marked by Roman remains, Orthodox churches and broad civic boulevards.",
    description: "Sofia occupies a high basin beneath Vitosha Mountain, where mineral springs influenced settlement from antiquity onward. Roman Serdica remains sit near the Alexander Nevsky Cathedral, St George Rotunda and later civic buildings in the centre. The National Archaeological Museum, Central Market Hall and surrounding parks connect Bulgaria's ancient, religious and modern urban histories.",
    highlights: ["Alexander Nevsky Cathedral", "Roman Serdica remains", "St George Rotunda", "Vitosha Mountain backdrop"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Visit Sofia - Official Tourism Portal", url: "https://visitsofia.bg/en/" }, { title: "National Archaeological Institute with Museum", url: "https://naim.bg/en/" }]),
  },
  {
    id: "hr-zagreb",
    summary: "Zagreb extends between Medvednica and the Sava, joining historic hill districts with civic institutions and markets.",
    description: "Zagreb spreads southward from Medvednica Mountain toward the Sava River, with the historic core divided between two hilltop settlements. Gradec and Kaptol contain St Mark's Church, Zagreb Cathedral and medieval street patterns. Ban Jelačić Square, Dolac Market and the Lower Town's parks and museums trace the Croatian capital's commercial and nineteenth-century civic development.",
    highlights: ["Gradec and Kaptol", "St Mark's Church", "Dolac Market", "Lower Town parks and museums"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Zagreb Tourist Board", url: "https://www.infozagreb.hr/en/" }, { title: "Zagreb City Museum", url: "https://mgz.hr/en/" }]),
  },
  {
    id: "gr-thessaloniki",
    summary: "Thessaloniki faces the Thermaic Gulf with Byzantine monuments, Ottoman traces, markets and a long waterfront.",
    description: "Thessaloniki stretches along the Thermaic Gulf, with an upper walled town rising behind its gridded centre and waterfront. The Rotunda, Church of Saint Demetrius and surviving Byzantine walls belong to a UNESCO-listed group of early Christian and Byzantine monuments. The White Tower, Modiano Market and archaeological museums reflect later Ottoman, Jewish and modern Greek chapters.",
    highlights: ["Thermaic Gulf waterfront", "UNESCO-listed Byzantine monuments", "White Tower", "Upper Town walls"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Thessaloniki Tourism Organisation", url: "https://visit-thessaloniki.com/" }, { title: "UNESCO Paleochristian and Byzantine Monuments of Thessalonika", url: "https://whc.unesco.org/en/list/456/" }]),
  },
  {
    id: "me-podgorica",
    summary: "Podgorica lies where rivers meet, shaped by Ottoman remains, modern civic districts and nearby archaeological heritage.",
    description: "Podgorica occupies a plain around the Morača and Ribnica rivers, between Lake Skadar and Montenegro's interior mountains. Stara Varoš preserves an Ottoman clock tower and lanes, while bridges and postwar boulevards define later layers of the capital. The city museums, Ribnica confluence and nearby Roman settlement of Doclea provide archaeological, geographic and civic context.",
    highlights: ["Morača and Ribnica rivers", "Stara Varoš clock tower", "Millennium Bridge", "Doclea archaeological site"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Podgorica Tourism Organisation", url: "https://podgorica.travel/en/" }, { title: "Museums and Galleries of Podgorica", url: "https://muzejiigalerijepg.me/" }]),
  },
  {
    id: "mk-skopje",
    summary: "Skopje spans the Vardar River, with Ottoman market streets, Byzantine heritage and twentieth-century urban layers.",
    description: "Skopje occupies the Vardar valley, where bridges connect the commercial centre with the hillside Old Bazaar. The Stone Bridge, Kale Fortress and Mustafa Pasha Mosque represent medieval and Ottoman layers, while the Mother Teresa Memorial House records modern local history. Museums and buildings reconstructed after the 1963 earthquake document North Macedonia's archaeological, cultural and urban development.",
    highlights: ["Stone Bridge and Vardar River", "Old Bazaar", "Kale Fortress", "Mother Teresa Memorial House"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Visit Skopje - Official City Guide", url: "https://visitskopje.mk/" }, { title: "Museum of the Republic of North Macedonia", url: "https://museum.org.mk/" }]),
  },
  {
    id: "ro-bucharest",
    summary: "Bucharest presents broad boulevards, Orthodox churches, Belle Époque buildings, village architecture and extensive urban parks.",
    description: "Bucharest developed on the Dâmbovița River across a generally flat plain, with boulevards and parks structuring its dispersed centre. Lipscani's lanes, Stavropoleos Church and the Romanian Athenaeum preserve mercantile, religious and Belle Époque layers. The Palace of Parliament, National Museum of Art and open-air Village Museum illustrate contrasting political, artistic and vernacular histories of Romania.",
    highlights: ["Lipscani historic quarter", "Romanian Athenaeum", "Village Museum", "Stavropoleos Church"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Romania Travel - Bucharest", url: "https://romaniatourism.com/bucharest.html" }, { title: "Dimitrie Gusti National Village Museum", url: "https://muzeul-satului.ro/en/" }]),
  },
  {
    id: "rs-belgrade",
    summary: "Belgrade occupies the Danube-Sava confluence, combining fortress landscapes, historic quarters and modern cultural institutions.",
    description: "Belgrade stands where the Sava meets the Danube, a strategic setting visible from the fortress and Kalemegdan park. Knez Mihailova Street links that complex with the historic centre, while Skadarlija retains a smaller-scale district of nineteenth-century streets. The National Museum, riverside areas and Museum of Yugoslavia interpret Serbian art, urban life and twentieth-century state history.",
    highlights: ["Danube-Sava confluence", "Belgrade Fortress and Kalemegdan", "Knez Mihailova Street", "Skadarlija historic quarter"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Tourist Organization of Belgrade", url: "https://www.tob.rs/en" }, { title: "Belgrade Fortress", url: "https://www.beogradskatvrdjava.co.rs/?lang=en" }]),
  },
  {
    id: "si-ljubljana",
    summary: "Ljubljana follows a green river corridor through baroque streets, Plečnik landmarks, markets and castle views.",
    description: "Ljubljana sits in a basin beside the Ljubljanica River, with a castle hill overlooking its compact pedestrian centre. Architect Jože Plečnik reshaped the riverbanks, bridges, market and civic spaces in a body of work recognised by UNESCO. Baroque churches, the Central Market, Tivoli Park and museums connect the Slovenian capital's medieval fabric with later cultural and landscape design.",
    highlights: ["Ljubljanica riverbanks and bridges", "Ljubljana Castle", "Plečnik's Central Market", "Tivoli Park"],
    editorialProvenance: europeBatch3SourceReferences([{ title: "Visit Ljubljana - Official City Guide", url: "https://www.visitljubljana.com/en/visitors/" }, { title: "UNESCO Works of Jože Plečnik in Ljubljana", url: "https://whc.unesco.org/en/list/1643/" }]),
  },
  {
    id: "de-cologne",
    summary: "Cologne lines the Rhine with a Gothic cathedral, Roman heritage, museums and distinctive historic quarters.",
    description: "Cologne developed on both banks of the Rhine from the Roman settlement of Colonia, whose remains survive beneath the modern centre. Its UNESCO-listed cathedral dominates a skyline that also includes Romanesque churches, while the Old Town, Museum Ludwig and Romano-Germanic collections trace religious, artistic and archaeological history. Riverside promenades and the Belgian Quarter add contrasting urban settings.",
    highlights: ["Cologne Cathedral", "Rhine riverfront", "Romanesque churches", "Museum Ludwig"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Cologne Tourist Board", url: "https://www.cologne-tourism.com/" }, { title: "UNESCO Cologne Cathedral", url: "https://whc.unesco.org/en/list/292/" }]),
  },
  {
    id: "de-dusseldorf",
    summary: "Düsseldorf stretches beside the Rhine through an old quarter, modern harbour architecture and major art collections.",
    description: "Düsseldorf occupies a broad bend of the Rhine, with a riverside promenade joining the Altstadt to the redeveloped MedienHafen. The old quarter contains churches, breweries and narrow lanes, while Königsallee follows a landscaped canal through the central shopping district. Collections at K20 and K21, alongside buildings by international architects, reflect the city's established visual-art and design culture.",
    highlights: ["Rhine promenade", "Altstadt lanes and breweries", "MedienHafen architecture", "K20 and K21 art collections"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Visit Düsseldorf", url: "https://www.visitduesseldorf.de/en" }, { title: "Kunstsammlung Nordrhein-Westfalen", url: "https://www.kunstsammlung.de/en/" }]),
  },
  {
    id: "de-hamburg",
    summary: "Hamburg centres on the Elbe and Alster, shaped by port heritage, brick warehouses and maritime culture.",
    description: "Hamburg grew around the Elbe, Alster lakes and a working port that has long connected the city with maritime trade. UNESCO-listed Speicherstadt preserves red-brick warehouse blocks and canals beside the contemporary HafenCity district and Elbphilharmonie. St Michael's Church, the Kunsthalle and neighbourhoods such as St Pauli broaden the picture beyond the waterfront's commercial and architectural history.",
    highlights: ["Speicherstadt warehouses", "Elbphilharmonie", "Elbe harbour", "Alster lakes"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Hamburg Travel", url: "https://www.hamburg-travel.com/" }, { title: "UNESCO Speicherstadt and Kontorhaus District", url: "https://whc.unesco.org/en/list/1467/" }]),
  },
  {
    id: "de-stuttgart",
    summary: "Stuttgart occupies a vineyard-lined basin with palace squares, modernist landmarks and influential automotive museums.",
    description: "Stuttgart spreads across a wooded basin and surrounding hills where vineyards reach close to central neighbourhoods. Schlossplatz anchors the civic centre, while the Weissenhof Estate records a significant chapter in modernist housing and architecture. The Mercedes-Benz and Porsche museums interpret regional engineering history, and the State Gallery, market hall and extensive parks add artistic, culinary and landscape context.",
    highlights: ["Schlossplatz", "Weissenhof Estate", "Automotive museums", "Hillside vineyards"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Stuttgart Tourist Board", url: "https://www.stuttgart-tourist.de/en" }, { title: "Mercedes-Benz Museum", url: "https://www.mercedes-benz.com/en/art-and-culture/museum/" }]),
  },
  {
    id: "lu-luxembourg",
    summary: "Luxembourg rises above the Alzette valleys, preserving fortified quarters, bridges and European civic institutions.",
    description: "Luxembourg City occupies a plateau cut by the Alzette and Pétrusse valleys, creating dramatic levels between the upper town and lower quarters. UNESCO recognises its old town and fortifications, including surviving casemates shaped by successive European powers. The Grund, Grand Ducal Palace and Kirchberg's museums and European institutions connect medieval streets with the capital's contemporary civic role.",
    highlights: ["UNESCO-listed old quarters", "Bock Casemates", "Grund river district", "Kirchberg cultural institutions"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Visit Luxembourg", url: "https://www.visitluxembourg.com/" }, { title: "UNESCO City of Luxembourg", url: "https://whc.unesco.org/en/list/699/" }]),
  },
  {
    id: "es-madrid",
    summary: "Madrid gathers royal architecture, expansive parks, historic neighbourhoods and nationally significant art collections on Spain's plateau.",
    description: "Madrid stands on Spain's central plateau, with broad boulevards and dense historic districts arranged around royal and civic spaces. The Prado, Reina Sofía and Thyssen-Bornemisza museums form a major art corridor beside Retiro Park, part of a UNESCO-listed cultural landscape. Plaza Mayor, the Royal Palace, neighbourhood markets and traditional food houses reveal further layers of courtly and everyday urban history.",
    highlights: ["Prado Museum", "Retiro Park", "Royal Palace", "Plaza Mayor"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Official Tourism Website of Madrid", url: "https://www.esmadrid.com/en" }, { title: "Museo Nacional del Prado", url: "https://www.museodelprado.es/en" }]),
  },
  {
    id: "gb-manchester",
    summary: "Manchester reflects industrial history through canals, warehouses, civic architecture, music venues and diverse neighbourhoods.",
    description: "Manchester developed beside the Irwell and a network of canals that supported its growth as a centre of textile manufacturing. Converted warehouses in Castlefield and Ancoats stand near Victorian civic buildings, while the Science and Industry Museum interprets transport and industrial change. Galleries, football heritage, music venues and food districts across the Northern Quarter and Rusholme represent later cultural layers.",
    highlights: ["Castlefield canals", "Industrial-era warehouses", "Manchester Art Gallery", "Northern Quarter"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Visit Manchester", url: "https://www.visitmanchester.com/" }, { title: "Science and Industry Museum", url: "https://www.scienceandindustrymuseum.org.uk/" }]),
  },
  {
    id: "it-milan",
    summary: "Milan unfolds around its cathedral through Renaissance heritage, design districts, galleries and longstanding fashion culture.",
    description: "Milan lies in the Po Valley, with the Duomo and Galleria Vittorio Emanuele II defining its monumental centre. Leonardo's Last Supper, the Sforza Castle and Brera's gallery and streets preserve Renaissance and later artistic history. Navigli canals, modern architecture and institutions devoted to design and fashion show how craft, commerce and cultural production continue across distinct neighbourhoods.",
    highlights: ["Milan Cathedral", "Leonardo's Last Supper", "Brera district", "Navigli canals"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "YesMilano Official Tourism Site", url: "https://www.yesmilano.it/en" }, { title: "Duomo di Milano Official Site", url: "https://www.duomomilano.it/en/" }]),
  },
  {
    id: "fr-nice",
    summary: "Nice follows the Mediterranean beneath coastal hills, with promenades, baroque streets, markets and modern art heritage.",
    description: "Nice extends around the Bay of Angels between the Mediterranean and the foothills of the Alps. Its UNESCO-listed winter-resort townscape includes the Promenade des Anglais, villas and gardens shaped by international visitors, while Vieux Nice retains baroque churches, narrow lanes and the Cours Saleya market. Museums devoted to Matisse and Chagall connect the coastal setting with twentieth-century artistic heritage.",
    highlights: ["Promenade des Anglais", "Vieux Nice", "Cours Saleya market", "Matisse Museum"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Explore Nice Côte d'Azur", url: "https://www.explorenicecotedazur.com/en/" }, { title: "UNESCO Winter Resort Town of the Riviera", url: "https://whc.unesco.org/en/list/1635/" }]),
  },
  {
    id: "pt-porto",
    summary: "Porto descends to the Douro through tiled streets, historic churches, bridges and riverside mercantile quarters.",
    description: "Porto rises in steep tiers from the Douro, where Ribeira's lanes and quays face the port-wine lodges of Vila Nova de Gaia. UNESCO recognises the historic centre, Luís I Bridge and Serra do Pilar Monastery as an urban landscape shaped by maritime commerce. São Bento station, tiled churches, markets and contemporary cultural institutions extend that heritage across the hills.",
    highlights: ["Ribeira riverfront", "Luís I Bridge", "Tiled churches and São Bento", "Port-wine lodge district"],
    editorialProvenance: europeBatch4SourceReferences([{ title: "Visit Porto", url: "https://visitporto.travel/en-GB" }, { title: "UNESCO Historic Centre of Oporto", url: "https://whc.unesco.org/en/list/755/" }]),
  },
  {
    id: "ua-kyiv",
    summary: "Kyiv rises along the Dnipro with medieval monasteries, broad boulevards, museums and layered urban history.",
    description: "Kyiv occupies wooded hills on both banks of the Dnipro, with the historic upper city overlooking the river. Saint Sophia Cathedral and the Kyiv-Pechersk Lavra preserve outstanding medieval architecture, mosaics, monastic traditions and archaeological evidence recognised by UNESCO. Podil's streets, the Golden Gate and national museums trace the capital's development through princely, commercial and later civic eras.",
    highlights: ["Saint Sophia Cathedral", "Kyiv-Pechersk Lavra", "Podil historic district", "Dnipro riverbanks"],
    editorialProvenance: europeBatch5SourceReferences([{ title: "Kyiv City Official Travel Guide", url: "https://guide.kyivcity.gov.ua/en" }, { title: "UNESCO Kyiv: Saint-Sophia Cathedral and Kyiv-Pechersk Lavra", url: "https://whc.unesco.org/en/list/527/" }]),
  },
  {
    id: "cy-larnaca",
    summary: "Larnaca extends beside Cyprus's southern coast, linking a palm-lined seafront with churches, archaeology and salt-lake landscapes.",
    description: "Larnaca occupies a low coastal plain in southern Cyprus, where the Finikoudes promenade borders the Mediterranean beside the historic centre. The Church of Saint Lazarus, medieval fort and Pierides Museum reflect Byzantine, Ottoman and archaeological layers associated with ancient Kition. West of the city, Larnaca Salt Lake and Hala Sultan Tekke form a distinctive wetland and religious landscape.",
    highlights: ["Finikoudes promenade", "Church of Saint Lazarus", "Ancient Kition", "Larnaca Salt Lake"],
    editorialProvenance: europeBatch5SourceReferences([{ title: "Larnaka Tourism Board", url: "https://larnakaregion.com/en/" }, { title: "Visit Cyprus - Larnaka", url: "https://www.visitcyprus.com/discover-cyprus/cities-regions/larnaka/" }]),
  },
  {
    id: "ru-moscow",
    summary: "Moscow developed around the Moskva River, with fortified landmarks, radial streets, galleries and distinctive architectural layers.",
    description: "Moscow grew around the Kremlin beside the Moskva River, and successive ring roads and radial avenues still structure the capital. Red Square, Saint Basil's Cathedral and the Kremlin ensemble represent medieval and imperial history recognised by UNESCO. The Tretyakov Gallery, Bolshoi Theatre, Metro architecture and preserved districts such as Zamoskvorechye broaden its cultural and urban record.",
    highlights: ["Kremlin and Red Square", "Saint Basil's Cathedral", "Tretyakov Gallery", "Moscow Metro architecture"],
    editorialProvenance: europeBatch5SourceReferences([{ title: "Discover Moscow", url: "https://discover.moscow/en/" }, { title: "UNESCO Kremlin and Red Square, Moscow", url: "https://whc.unesco.org/en/list/545/" }]),
  },
  {
    id: "cy-paphos",
    summary: "Paphos spans a Cypriot harbour and inland hills rich in classical archaeology, mosaics and early Christian heritage.",
    description: "Paphos lies on Cyprus's southwest coast, with a harbour district below the older inland town of Pano Paphos. Its UNESCO archaeological complex encompasses Roman villas with mosaic floors, the Tombs of the Kings and remains linked to ancient religious traditions. The medieval castle, Agia Kyriaki Chrysopolitissa and surrounding coastal landscapes connect later Christian history with the city's classical foundations.",
    highlights: ["Paphos Archaeological Park", "Tombs of the Kings", "Roman villa mosaics", "Medieval harbour castle"],
    editorialProvenance: europeBatch5SourceReferences([{ title: "Pafos Regional Board of Tourism", url: "https://www.visitpafos.org.cy/" }, { title: "UNESCO Paphos", url: "https://whc.unesco.org/en/list/79/" }]),
  },
  {
    id: "ru-st-petersburg",
    summary: "St. Petersburg lines the Neva delta with imperial palaces, canals, formal squares and major art collections.",
    description: "Planned across islands and waterways of the Neva delta, the city gives canals, embankments and bridges a central role. The UNESCO-listed historic centre includes the Winter Palace, Palace Square, Peter and Paul Fortress and monumental avenues shaped during the imperial period. Hermitage collections, cathedrals, theatres and literary museums document its artistic and intellectual traditions across several centuries.",
    highlights: ["Winter Palace and Hermitage", "Neva embankments and canals", "Peter and Paul Fortress", "Palace Square"],
    editorialProvenance: europeBatch5SourceReferences([{ title: "Visit Petersburg", url: "https://visit-petersburg.ru/en/" }, { title: "State Hermitage Museum", url: "https://www.hermitagemuseum.org/wps/portal/hermitage/?lng=en" }, { title: "UNESCO Historic Centre of Saint Petersburg", url: "https://whc.unesco.org/en/list/540/" }]),
  },
  {
    id: "et-addis-ababa",
    summary: "Addis Ababa occupies a highland plateau, with national museums, historic churches, markets and Entoto foothills.",
    description: "Addis Ababa spreads across a high plateau beneath the Entoto hills, where eucalyptus woodland borders the northern city. The National Museum and Ethnological Museum interpret Ethiopian archaeology, art and cultural traditions, while Holy Trinity Cathedral records twentieth-century religious and national history. Merkato's trading streets and the Piazza district reflect the capital's commercial growth and varied urban fabric.",
    highlights: ["Entoto hill landscape", "National Museum of Ethiopia", "Holy Trinity Cathedral", "Merkato trading district"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Visit Ethiopia - Addis Ababa", url: "https://visitethiopia.et/destinations/addis-ababa/" }, { title: "Addis Ababa City Administration", url: "https://addisababa.gov.et/" }]),
  },
  {
    id: "ke-mombasa",
    summary: "Mombasa occupies a coral island and mainland coast shaped by Swahili heritage, trade and beaches.",
    description: "Mombasa's historic centre occupies an island beside the Indian Ocean, linked to mainland districts and a long trading coastline. UNESCO-listed Fort Jesus records Portuguese presence and later contests over the port, while Old Town retains narrow streets, carved doors and Swahili architecture. Markets, mosques and coastal food traditions reflect exchanges among African, Arab, Asian and European communities.",
    highlights: ["Fort Jesus", "Old Town Swahili architecture", "Mombasa Island waterfront", "Coastal markets and food traditions"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "National Museums of Kenya - Fort Jesus", url: "https://museums.or.ke/fort-jesus/" }, { title: "UNESCO Fort Jesus, Mombasa", url: "https://whc.unesco.org/en/list/1295/" }]),
  },
  {
    id: "tz-dar-es-salaam",
    summary: "Dar es Salaam extends along the Indian Ocean through historic civic quarters, markets and coastal reserves.",
    description: "Dar es Salaam lies around a natural harbour on Tanzania's Indian Ocean coast, with a centre shaped by maritime trade and colonial administration. The National Museum presents archaeological and historical collections, while the open-air Village Museum documents building traditions from across Tanzania. Kariakoo Market, waterfront civic buildings and nearby marine reserves place commerce, architecture and coastal ecology within the city's setting.",
    highlights: ["Indian Ocean harbour", "National Museum of Tanzania", "Village Museum homesteads", "Kariakoo Market"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Tanzania Tourism - Dar es Salaam", url: "https://www.tanzaniatourism.go.tz/destination/dar-es-salaam" }, { title: "National Museum of Tanzania", url: "https://www.nmt.go.tz/" }]),
  },
  {
    id: "tz-zanzibar",
    summary: "Zanzibar encompasses an Indian Ocean archipelago where Swahili culture, spice farming and coral-stone heritage meet.",
    description: "Zanzibar is an Indian Ocean archipelago whose largest islands are Unguja and Pemba; the canonical destination refers to this wider island setting. Stone Town, the historic quarter of Zanzibar City on Unguja, preserves coral-stone buildings shaped by African, Arab, Indian and European exchange. Spice-growing areas, fishing communities and coastal forests provide further context beyond the urban heritage site.",
    highlights: ["Stone Town of Zanzibar", "Unguja and Pemba islands", "Spice-growing landscapes", "Jozani coastal forest"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Zanzibar Commission for Tourism", url: "https://zanzibartourism.go.tz/" }, { title: "UNESCO Stone Town of Zanzibar", url: "https://whc.unesco.org/en/list/173/" }]),
  },
  {
    id: "ug-entebbe",
    summary: "Entebbe occupies a Lake Victoria peninsula with botanical collections, wildlife conservation and lakeshore landscapes.",
    description: "Entebbe extends along a peninsula on Lake Victoria, giving the town wooded shores and a close relationship with the lake. The National Botanical Gardens conserve tropical plants and bird habitat, while the Uganda Wildlife Conservation Education Centre cares for native wildlife and supports conservation education. Older administrative buildings and lakeside streets reflect Entebbe's distinct civic history apart from Kampala.",
    highlights: ["Lake Victoria peninsula", "National Botanical Gardens", "Uganda Wildlife Conservation Education Centre", "Lakeside administrative heritage"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Uganda Wildlife Conservation Education Centre", url: "https://uwec.ug/" }, { title: "National Agricultural Research Organisation", url: "https://www.naro.go.ug/" }]),
  },
  {
    id: "rw-kigali",
    summary: "Kigali spreads across green hills, linking memorial sites, museums, markets and evolving neighbourhood arts districts.",
    description: "Kigali is arranged across ridges and valleys, with neighbourhoods extending over the hilly landscape of Rwanda's capital. The Kigali Genocide Memorial documents the 1994 genocide against the Tutsi through remembrance, archives and education, while the Rwanda Art Museum presents national visual culture. Kimironko Market, Nyamirambo streets and local craft centres illustrate everyday commerce and creative life.",
    highlights: ["Kigali Genocide Memorial", "Rwanda Art Museum", "Kimironko Market", "Nyamirambo neighbourhood"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Visit Rwanda - Kigali", url: "https://www.visitrwanda.com/destinations/kigali/" }, { title: "Kigali Genocide Memorial", url: "https://kgm.rw/" }]),
  },
  {
    id: "mg-antananarivo",
    summary: "Antananarivo rises across highland ridges, marked by royal heritage, brick neighbourhoods, markets and urban wetlands.",
    description: "Antananarivo occupies steep ridges in Madagascar's central highlands, with stairways and brick houses following the slopes. The Upper Town contains the Rova royal complex, Andafiavaratra Palace and historic churches associated with the Merina kingdom and later state history. Analakely Market, Lake Anosy and the Tsimbazaza museum and botanical grounds add commercial, civic and natural-history perspectives within the capital.",
    highlights: ["Rova of Antananarivo", "Upper Town brick architecture", "Analakely Market", "Lake Anosy"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "UNESCO Upper Town of Antananarivo", url: "https://whc.unesco.org/en/tentativelists/6078/" }, { title: "Madagascar National Tourism Board", url: "https://madagascar-tourisme.com/en/" }]),
  },
  {
    id: "sc-mahe",
    summary: "Mahé is Seychelles' largest island, defined by granitic peaks, forest reserves, beaches and Creole heritage.",
    description: "Mahé is a mountainous granitic island whose forested interior rises above narrow coastal settlements and beaches. Morne Seychellois National Park protects the island's highest landscapes and endemic habitats, while Beau Vallon and southern coves show contrasting shorelines. Victoria, situated on Mahé, contributes markets, museums and Creole civic heritage without defining the whole island destination.",
    highlights: ["Morne Seychellois National Park", "Beau Vallon coastline", "Granitic mountain landscape", "Victoria's Creole market heritage"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Tourism Seychelles - Mahé", url: "https://www.seychelles.com/destination/mahe" }, { title: "Seychelles Parks and Gardens Authority", url: "https://www.spga.gov.sc/" }]),
  },
  {
    id: "mu-mauritius",
    summary: "Mauritius is a volcanic Indian Ocean island with multicultural heritage, forested uplands and coral-fringed coasts.",
    description: "Mauritius is considered at country and island scale, from coral-fringed shores to a volcanic interior of plateaus, gorges and forest. UNESCO sites at Aapravasi Ghat and Le Morne Cultural Landscape preserve histories of indentured labour, slavery and resistance. Markets, religious places, Creole traditions and protected landscapes reflect the island's African, Asian and European cultural connections.",
    highlights: ["Le Morne Cultural Landscape", "Aapravasi Ghat", "Black River Gorges", "Multicultural market and food traditions"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Mauritius Tourism Promotion Authority", url: "https://mauritiusnow.com/" }, { title: "UNESCO Aapravasi Ghat", url: "https://whc.unesco.org/en/list/1227/" }, { title: "UNESCO Le Morne Cultural Landscape", url: "https://whc.unesco.org/en/list/1259/" }]),
  },
  {
    id: "re-saint-denis",
    summary: "Saint-Denis frames Réunion's northern coast with Creole architecture, civic gardens, museums and mountain backdrops.",
    description: "Saint-Denis stands on Réunion's northern coast between the Indian Ocean and steep volcanic uplands. Rue de Paris is lined with Creole houses and civic buildings, including Villa Déramond-Barre and the former bishop's palace, while the Jardin de l'État anchors a historic public garden. The Léon Dierx Museum, markets and seafront trace the city's artistic, commercial and colonial layers.",
    highlights: ["Rue de Paris Creole houses", "Jardin de l'État", "Léon Dierx Museum", "Barachois seafront"],
    editorialProvenance: africaBatch1SourceReferences([{ title: "Île de La Réunion Tourisme - Saint-Denis", url: "https://en.reunion.fr/organize/towns-and-villages/saint-denis/" }, { title: "Musée Léon Dierx", url: "https://museesreunion.fr/musee-leon-dierx/" }]),
  },
  {
    id: "dz-algiers",
    summary: "Algiers rises above the Mediterranean through white hillside quarters, Ottoman heritage and a historic casbah.",
    description: "Algiers extends in tiers above a Mediterranean bay, with white buildings giving the capital its long-established visual identity. The UNESCO-listed Casbah preserves a dense historic urban fabric of lanes, houses, mosques and Ottoman palaces descending toward the waterfront. Within its lower edge, the restored Palais des Raïs complex documents domestic architecture and the city's maritime connections.",
    highlights: ["Casbah of Algiers", "Palais des Raïs", "Ottoman palaces and mosques", "Mediterranean hillside quarters"],
    editorialProvenance: africaBatch2SourceReferences([{ title: "UNESCO - Kasbah of Algiers", url: "https://whc.unesco.org/en/list/565/" }, { title: "Palais des Raïs - Bastion 23", url: "https://www.musee-palaisdesrais-bastion23.dz/" }]),
  },
  {
    id: "ma-casablanca",
    summary: "Casablanca faces the Atlantic with twentieth-century boulevards, Art Deco architecture and a working waterfront.",
    description: "Casablanca developed around its Atlantic port, and broad central avenues record the city's rapid twentieth-century expansion. Art Deco and neo-Moorish buildings shape districts around Mohammed V Square, while the older medina retains a tighter street pattern beside the harbour. The Hassan II Mosque stands partly above the ocean, linking monumental Moroccan craftsmanship with the city's coastal setting.",
    highlights: ["Hassan II Mosque", "Mohammed V Square", "Art Deco city centre", "Old medina and Atlantic port"],
    editorialProvenance: africaBatch2SourceReferences([{ title: "Visit Casablanca", url: "https://visitcasablanca.ma/" }, { title: "Hassan II Mosque Foundation", url: "https://www.fmh2.ma/" }]),
  },
  {
    id: "eg-sharm-el-sheikh",
    summary: "Sharm El Sheikh occupies southern Sinai between Red Sea reefs, desert mountains and protected coastal landscapes.",
    description: "Sharm El Sheikh lies at the southern end of the Sinai Peninsula, where arid mountains meet the gulfs of Aqaba and Suez. Coral reefs and clear Red Sea waters define its coastal landscape and marine habitats. South of the city, Ras Mohammed National Park protects reef, mangrove, desert and shoreline environments around the peninsula's southernmost headland.",
    highlights: ["Ras Mohammed National Park", "Red Sea coral reefs", "Southern Sinai mountains", "Gulfs of Aqaba and Suez"],
    editorialProvenance: africaBatch2SourceReferences([{ title: "Experience Egypt - Sharm El Sheikh", url: "https://www.experienceegypt.eg/en/city/13/sharm-el-sheikh" }, { title: "UNESCO - Ras Mohammed", url: "https://whc.unesco.org/en/tentativelists/182/" }]),
  },
  {
    id: "tn-tunis",
    summary: "Tunis centres on a historic medina framed by later boulevards, civic architecture and longstanding craft traditions.",
    description: "Tunis grew from its medina toward a later European-planned quarter, creating contrasting street patterns around the capital's centre. UNESCO recognises the medina for its mosques, madrasas, palaces, houses and souks, with the Zitouna Mosque anchoring its historic fabric. Beyond the old city, Avenue Habib Bourguiba and the Bardo Museum add civic architecture and archaeological collections to the urban context.",
    highlights: ["Medina of Tunis", "Zitouna Mosque", "Avenue Habib Bourguiba", "Bardo Museum collections"],
    editorialProvenance: africaBatch2SourceReferences([{ title: "UNESCO - Medina of Tunis", url: "https://whc.unesco.org/en/list/36/" }, { title: "Discover Tunisia - Tunis and its surroundings", url: "https://www.discovertunisia.com/en/discover/around-tunis" }]),
  },
  {
    id: "za-durban",
    summary: "Durban follows the Indian Ocean through subtropical gardens, beaches, markets and layered port-city heritage.",
    description: "Durban extends around a major Indian Ocean harbour, with the beachfront and central districts reflecting its maritime setting. The Durban Botanic Gardens preserves subtropical plant collections in a historic civic landscape, while markets and museums document Zulu, Indian and colonial influences. Art Deco buildings, harbour views and the KwaMuhle Museum add architectural and social-history context within the city.",
    highlights: ["Indian Ocean beachfront", "Durban Botanic Gardens", "KwaMuhle Museum", "Victoria Street Market"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "Durban Tourism", url: "https://visitdurban.travel/" }, { title: "Durban Botanic Gardens", url: "https://durbanbotanicgardens.org.za/" }]),
  },
  {
    id: "bw-gaborone",
    summary: "Gaborone combines a planned capital centre, cultural collections, public monuments and nearby hill landscapes.",
    description: "Gaborone developed as Botswana's capital beside the Notwane River, with broad roads and government precincts shaping its urban plan. The National Museum and Art Gallery interprets archaeology, ethnography and visual culture, while the Three Dikgosi Monument commemorates a defining episode in national history. Kgale Hill and the Gaborone Dam place rocky terrain and water landscapes close to the city.",
    highlights: ["National Museum and Art Gallery", "Three Dikgosi Monument", "Kgale Hill", "Gaborone Dam"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "Botswana Tourism Organisation", url: "https://www.botswanatourism.co.bw/" }, { title: "Botswana Government - National Museum and Art Gallery", url: "https://www.gov.bw/ministries/national-museum-and-art-gallery" }]),
  },
  {
    id: "zw-harare",
    summary: "Harare spreads across a highveld setting with galleries, archives, civic gardens and modern urban architecture.",
    description: "Harare occupies Zimbabwe's highveld, where broad avenues and jacaranda-lined streets frame its central civic districts. The National Gallery of Zimbabwe presents local and regional visual art, while the National Archives preserves documentary records, photographs and historical collections. Harare Gardens, the Kopje and early twentieth-century buildings provide further perspectives on the capital's landscape and urban development.",
    highlights: ["National Gallery of Zimbabwe", "National Archives collections", "Harare Gardens", "The Kopje"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "National Gallery of Zimbabwe", url: "https://nationalgallery.co.zw/" }, { title: "National Archives of Zimbabwe", url: "https://www.archives.gov.zw/" }]),
  },
  {
    id: "zm-lusaka",
    summary: "Lusaka is a plateau capital shaped by civic institutions, markets, museums and urban nature reserves.",
    description: "Lusaka stands on a broad plateau, with government avenues, commercial districts and residential neighbourhoods forming Zambia's capital. The Lusaka National Museum presents archaeology, ethnography, history and contemporary art, while Kabwata Cultural Village supports craft traditions in an urban setting. Markets and the nearby Munda Wanga environmental park add everyday commercial life and conservation context to the city.",
    highlights: ["Lusaka National Museum", "Kabwata Cultural Village", "City Market", "Munda Wanga environmental park"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "National Museums Board of Zambia", url: "https://www.museumszambia.org/" }, { title: "Zambia Ministry of Tourism", url: "https://www.mot.gov.zm/" }]),
  },
  {
    id: "mz-maputo",
    summary: "Maputo faces its bay through railway heritage, markets, tropical avenues and distinctive architectural layers.",
    description: "Maputo occupies a broad bay on the Indian Ocean, with acacia-lined avenues connecting its centre to waterfront districts. The landmark railway station and CFM museum interpret transport history, while the Central Market reflects the capital's long commercial role. Portuguese-era civic buildings, Mozambican art institutions and the iron Casa de Ferro reveal varied architectural and cultural layers across the city.",
    highlights: ["Maputo railway station", "CFM railway museum", "Mercado Central", "Casa de Ferro"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "Visit Mozambique", url: "https://www.visitmozambique.gov.mz/" }, { title: "Portos e Caminhos de Ferro de Moçambique", url: "https://www.cfm.co.mz/" }]),
  },
  {
    id: "na-windhoek",
    summary: "Windhoek occupies a central highland basin with civic landmarks, museums and layered architectural heritage.",
    description: "Windhoek lies in a central Namibian highland basin, with ridges enclosing the capital's compact civic centre. The Independence Memorial Museum and National Art Gallery interpret national history and visual culture, while the Windhoek City Museum documents local urban development. Christuskirche, Tintenpalast gardens and surviving German colonial-era buildings form part of a complex architectural landscape presented within its historical context.",
    highlights: ["Windhoek City Museum", "Independence Memorial Museum", "Christuskirche", "Tintenpalast gardens"],
    editorialProvenance: africaBatch3SourceReferences([{ title: "City of Windhoek", url: "https://www.windhoekcc.org.na/" }, { title: "Museums Association of Namibia - Windhoek City Museum", url: "https://www.museums.com.na/museums/windhoek/windhoek-city-museum" }]),
  },
  {
    id: "ci-abidjan",
    summary: "Abidjan extends around the Ébrié Lagoon, with civic architecture, museums, markets and protected forest.",
    description: "Abidjan occupies peninsulas and islands around the Ébrié Lagoon, with bridges linking its principal districts. Plateau concentrates civic institutions and modern towers, while the Musée des Civilisations de Côte d'Ivoire preserves archaeological, artistic and ethnographic collections. Banco National Park protects tropical forest beside the urban area, adding an ecological counterpoint to markets and lagoon-side neighbourhoods.",
    highlights: ["Ébrié Lagoon", "Plateau civic district", "Musée des Civilisations", "Banco National Park"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Côte d'Ivoire Tourisme", url: "https://www.sublimeci.com/" }, { title: "Office Ivoirien des Parcs et Réserves", url: "https://www.oipr.ci/" }]),
  },
  {
    id: "gm-banjul",
    summary: "Banjul occupies a low island at the Gambia River mouth, with museums, markets and civic landmarks.",
    description: "Banjul stands on St Mary's Island where the Gambia River reaches the Atlantic, giving the compact capital a waterfront setting. The National Museum of The Gambia documents archaeology, history and cultural traditions in the city centre. Albert Market, colonial-era civic buildings and Arch 22 trace commercial and political layers within Banjul proper rather than the wider metropolitan area.",
    highlights: ["Gambia River mouth", "National Museum of The Gambia", "Albert Market", "Arch 22"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "National Centre for Arts and Culture", url: "https://ncac.gm/" }, { title: "Ministry of Tourism and Culture, The Gambia", url: "https://motc.gov.gm/" }]),
  },
  {
    id: "bj-cotonou",
    summary: "Cotonou lies between the Gulf of Guinea and Lake Nokoué, centred on markets and civic monuments.",
    description: "Cotonou occupies a narrow coastal strip between the Gulf of Guinea and Lake Nokoué, crossed by a lagoon channel. Dantokpa Market reflects the city's longstanding commercial role, while the Place de l'Amazone anchors a newer civic landscape. Cultural venues, government buildings and busy central streets distinguish Benin's largest urban centre without extending its scope to Ouidah or Abomey.",
    highlights: ["Lake Nokoué lagoon setting", "Dantokpa Market", "Place de l'Amazone", "Cotonou civic centre"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Benin Tourism", url: "https://benin-tourisme.com/" }, { title: "Government of Benin", url: "https://www.gouv.bj/" }]),
  },
  {
    id: "sn-dakar",
    summary: "Dakar occupies the Cap-Vert Peninsula, shaped by Atlantic shores, museums, markets and national monuments.",
    description: "Dakar extends across the Cap-Vert Peninsula, with Atlantic headlands and bays framing Senegal's capital. The IFAN Museum and Museum of Black Civilisations hold major historical and artistic collections, while markets and civic monuments record the city's regional role. Gorée Island, reached offshore from Dakar by ferry, preserves a distinct UNESCO-listed historic settlement rather than a central-city neighbourhood.",
    highlights: ["Cap-Vert Peninsula", "Museum of Black Civilisations", "IFAN Museum", "Offshore Gorée Island"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Senegal Tourism", url: "https://www.visitezlesenegal.com/" }, { title: "UNESCO Island of Gorée", url: "https://whc.unesco.org/en/list/26/" }]),
  },
  {
    id: "ng-enugu",
    summary: "Enugu rests below wooded hills, with coal-mining history, markets, museums and established civic institutions.",
    description: "Enugu developed below the Udi hills and became closely associated with coal extraction during the twentieth century. The National Museum presents archaeological and cultural material, while the former colliery landscape records the industrial origins behind the Coal City name. Ogbete Market, civic buildings and neighbourhood streets place that history within a continuing state-capital setting rather than southeastern Nigeria generally.",
    highlights: ["Udi hill setting", "Coal-mining heritage", "National Museum Enugu", "Ogbete Market"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Enugu State Government", url: "https://enugustate.gov.ng/" }, { title: "National Commission for Museums and Monuments", url: "https://museum.ng/" }]),
  },
  {
    id: "sl-freetown",
    summary: "Freetown rises around a broad natural harbour, with museums, markets and layered settlement heritage.",
    description: "Freetown occupies steep hills beside one of West Africa's broad natural harbours, with streets descending toward the waterfront. The Sierra Leone National Museum interprets archaeology, history and cultural traditions, while surviving civic and religious buildings reflect the city's settlement history. Markets and designated monuments provide durable points of reference without relying on claims about recently altered landmarks.",
    highlights: ["Freetown natural harbour", "Sierra Leone National Museum", "Historic civic buildings", "Central markets"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Sierra Leone Ministry of Tourism and Cultural Affairs", url: "https://tourism.gov.sl/" }, { title: "Monuments and Relics Commission", url: "https://mrc.gov.sl/" }]),
  },
  {
    id: "tg-lome",
    summary: "Lomé faces the Gulf of Guinea through markets, museums, civic spaces and colonial-era architecture.",
    description: "Lomé extends along Togo's Gulf of Guinea coast, where the seafront meets a compact civic and commercial centre. The National Museum interprets the country's archaeology, history and arts, while the restored Palais de Lomé presents exhibitions within a former gubernatorial complex. Market streets, craft traditions and surviving colonial-era buildings give the capital a distinctly urban context separate from Togo-wide attractions.",
    highlights: ["Gulf of Guinea seafront", "Togo National Museum", "Palais de Lomé", "Grand Market district"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Togo Tourism", url: "https://togotourisme.tg/" }, { title: "Palais de Lomé", url: "https://palaisdelome.com/" }]),
  },
  {
    id: "lr-monrovia",
    summary: "Monrovia occupies an Atlantic peninsula, with national museums, markets and sites connected to Liberia's founding.",
    description: "Monrovia spreads across a peninsula and adjoining coastal districts between the Atlantic and the Mesurado River. The National Museum of Liberia preserves historical and cultural collections in the city, while Providence Island marks an important site in the settlement narrative of modern Liberia. Waterside Market and civic buildings add commercial and architectural context without extending the record to the distant international airport.",
    highlights: ["Mesurado River peninsula", "National Museum of Liberia", "Providence Island", "Waterside Market"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Liberia Ministry of Information, Cultural Affairs and Tourism", url: "https://www.micat.gov.lr/" }, { title: "UNESCO Providence Island", url: "https://whc.unesco.org/en/tentativelists/6603/" }]),
  },
  {
    id: "ng-port-harcourt",
    summary: "Port Harcourt developed beside the Bonny River system, with markets, cultural institutions and planned civic districts.",
    description: "Port Harcourt occupies low-lying terrain within the Niger Delta's network of rivers and creeks, giving waterways a central geographic role. The city developed as a port and retains planned civic districts alongside older commercial streets. The Rivers State Museum, cultural centres and Mile One Market document local history, arts and everyday trade without treating attractions elsewhere in Rivers State as city sites.",
    highlights: ["Bonny River waterways", "Rivers State Museum", "Mile One Market", "Port Harcourt civic districts"],
    editorialProvenance: africaBatch4SourceReferences([{ title: "Rivers State Government", url: "https://www.riversstate.gov.ng/" }, { title: "National Commission for Museums and Monuments", url: "https://museum.ng/" }]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const canonicalDestinationIds = new Set(
  buildCanonicalExploreDestinations(airports).map(({ id }) => id),
);

export function validateExploreDestinationEditorial(
  records: readonly ExploreDestinationEditorial[],
): readonly ExploreDestinationEditorial[] {
  const seen = new Set<string>();
  const errors: string[] = [];

  records.forEach((record, index) => {
    if (seen.has(record.id)) errors.push(`Duplicate Explore editorial destination ID: ${record.id}`);
    seen.add(record.id);
    if (!canonicalDestinationIds.has(record.id)) errors.push(`Unknown Explore editorial destination ID at index ${index}: ${record.id}`);
    if (!record.summary.trim()) errors.push(`Explore editorial ${record.id} has an empty summary`);
    if (!record.description.trim()) errors.push(`Explore editorial ${record.id} has an empty description`);
    if (record.highlights.length < 3 || record.highlights.length > 5) errors.push(`Explore editorial ${record.id} must have 3-5 highlights`);
    const normalizedHighlights = new Set<string>();
    for (const highlight of record.highlights) {
      const normalized = highlight.trim().toLocaleLowerCase();
      if (!normalized) errors.push(`Explore editorial ${record.id} has an empty highlight`);
      if (normalizedHighlights.has(normalized)) errors.push(`Explore editorial ${record.id} has duplicate highlight: ${highlight}`);
      normalizedHighlights.add(normalized);
    }
    const references = record.editorialProvenance.sourceReferences;
    if (!references.length) errors.push(`Explore editorial ${record.id} is missing source references`);
    if (references.length < 2) errors.push(`Explore editorial ${record.id} must have at least two source references`);
    const sourceUrls = new Set<string>();
    const sourceTitles = new Set<string>();
    for (const reference of references) {
      const normalizedTitle = reference.title.trim().toLocaleLowerCase();
      if (!normalizedTitle) errors.push(`Explore editorial ${record.id} has an empty source title`);
      if (sourceTitles.has(normalizedTitle)) errors.push(`Explore editorial ${record.id} has duplicate source title: ${reference.title}`);
      sourceTitles.add(normalizedTitle);
      if (!reference.url.startsWith("https://")) errors.push(`Explore editorial ${record.id} has a non-HTTPS source URL: ${reference.url}`);
      if (sourceUrls.has(reference.url)) errors.push(`Explore editorial ${record.id} has duplicate source URL: ${reference.url}`);
      sourceUrls.add(reference.url);
    }
    const date = record.editorialProvenance.lastVerifiedAt;
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (
      !DATE_PATTERN.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) errors.push(`Explore editorial ${record.id} has an invalid verification date: ${date}`);
    if (record.editorialProvenance.source !== "kurioticket-editorial") errors.push(`Explore editorial ${record.id} has unsupported editorial provenance source`);
  });

  if (errors.length) throw new Error(`Invalid Explore destination editorial data:\n${errors.join("\n")}`);
  return records;
}

export const exploreDestinationEditorial = validateExploreDestinationEditorial(rawExploreDestinationEditorial);

export const exploreDestinationEditorialById = new Map(
  exploreDestinationEditorial.map((record) => [record.id, record]),
);

export function requireExploreDestinationEditorial(id: string): ExploreDestinationEditorial {
  const editorial = exploreDestinationEditorialById.get(id);
  if (!editorial) throw new Error(`Unknown Explore destination editorial ID: ${id}`);
  return editorial;
}
