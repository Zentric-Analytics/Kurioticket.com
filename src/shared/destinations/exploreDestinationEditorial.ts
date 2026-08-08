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
