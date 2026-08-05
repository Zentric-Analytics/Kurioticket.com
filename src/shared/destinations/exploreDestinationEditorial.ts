import { CURATED_POPULAR_EXPLORE_DESTINATION_IDS } from "./exploreDestinationPopularIds";

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
  readonly id: (typeof CURATED_POPULAR_EXPLORE_DESTINATION_IDS)[number];
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
] as const satisfies readonly ExploreDestinationEditorial[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateExploreDestinationEditorial(
  records: readonly ExploreDestinationEditorial[],
): readonly ExploreDestinationEditorial[] {
  const curatedIds = new Set<string>(CURATED_POPULAR_EXPLORE_DESTINATION_IDS);
  const seen = new Set<string>();
  const errors: string[] = [];

  records.forEach((record, index) => {
    if (seen.has(record.id)) errors.push(`Duplicate Explore editorial destination ID: ${record.id}`);
    seen.add(record.id);
    if (!curatedIds.has(record.id)) errors.push(`Unknown or non-curated Explore editorial destination ID at index ${index}: ${record.id}`);
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
    for (const reference of references) {
      if (!reference.title.trim()) errors.push(`Explore editorial ${record.id} has an empty source title`);
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

  for (const id of CURATED_POPULAR_EXPLORE_DESTINATION_IDS) {
    if (!seen.has(id)) errors.push(`Missing Explore editorial destination ID: ${id}`);
  }
  if (records.length !== CURATED_POPULAR_EXPLORE_DESTINATION_IDS.length) errors.push(`Explore editorial dataset must contain exactly ${CURATED_POPULAR_EXPLORE_DESTINATION_IDS.length} records; received ${records.length}`);
  const ids = records.map((record) => record.id);
  if (JSON.stringify(ids) !== JSON.stringify(CURATED_POPULAR_EXPLORE_DESTINATION_IDS)) errors.push("Explore editorial destination IDs must match the curated popular order exactly");
  if (errors.length) throw new Error(`Invalid Explore destination editorial data:\n${errors.join("\n")}`);
  return records;
}

export const exploreDestinationEditorial = validateExploreDestinationEditorial(rawExploreDestinationEditorial);

export const exploreDestinationEditorialById = new Map(
  exploreDestinationEditorial.map((record) => [record.id, record]),
);

export function requireExploreDestinationEditorial(id: string): ExploreDestinationEditorial {
  const editorial = exploreDestinationEditorialById.get(id as ExploreDestinationEditorial["id"]);
  if (!editorial) throw new Error(`Unknown Explore destination editorial ID: ${id}`);
  return editorial;
}
