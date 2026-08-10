import type { ExploreDestinationEditorial, ExploreDestinationEditorialSourceReference } from "./types";

const provenance = (sourceReferences: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const, sourceReferences, lastVerifiedAt: "2026-08-10",
});

/** Oceania Batch 1 destinations that cleared authoritative-source review, in rollout order. */
export const oceaniaExploreDestinationEditorial = [
  {
    id: "au-melbourne",
    summary: "Melbourne follows the Yarra River through civic landmarks, laneways, markets and major cultural institutions.",
    description: "Melbourne developed around the Yarra River, with a compact central grid bordered by parks and established inner neighbourhoods. Victorian-era arcades and buildings stand alongside the city's distinctive network of lanes and contemporary Federation Square. Museums, galleries and Queen Victoria Market sustain cultural and commercial traditions grounded in the city rather than the wider attractions of Victoria.",
    highlights: ["Yarra River city centre", "Melbourne laneways and arcades", "Federation Square", "Queen Victoria Market"],
    editorialProvenance: provenance([
      { title: "City of Melbourne — Melbourne's history", url: "https://www.melbourne.vic.gov.au/melbournes-history" },
      { title: "Museums Victoria", url: "https://museumsvictoria.com.au/" },
    ]),
  },
  {
    id: "au-brisbane",
    summary: "Brisbane curves around its namesake river through civic gardens, South Bank and Queensland cultural institutions.",
    description: "Brisbane's central districts occupy bends of the Brisbane River, which shapes the city's bridges, waterfronts and public spaces. South Bank gathers parklands and Queensland's principal museum, gallery and performance institutions opposite the civic centre. The City Botanic Gardens and historic buildings record layers of urban development specific to Brisbane, without extending the destination across South East Queensland.",
    highlights: ["Brisbane River bends", "South Bank Parklands", "Queensland Cultural Centre", "City Botanic Gardens"],
    editorialProvenance: provenance([
      { title: "Brisbane City Council — Brisbane Botanic Gardens", url: "https://www.brisbane.qld.gov.au/parks-and-recreation/botanic-gardens" },
      { title: "Queensland Art Gallery and Gallery of Modern Art", url: "https://www.qagoma.qld.gov.au/" },
    ]),
  },
  {
    id: "au-perth",
    summary: "Perth rises beside the Swan River with parkland, historic streets and Western Australian cultural institutions.",
    description: "Perth's centre occupies the Swan River's northern bank, framed by the water and the elevated landscapes of Kings Park. Historic buildings and streets around the central business district trace the city's colonial and civic development. Galleries, museums and Noongar cultural interpretation place Perth within southwestern Australia while keeping Fremantle, Rottnest Island and distant Western Australian regions geographically distinct.",
    highlights: ["Swan River setting", "Kings Park landscapes", "Historic Perth centre", "Western Australian Museum Boola Bardip"],
    editorialProvenance: provenance([
      { title: "City of Perth — Visit Perth", url: "https://visitperth.com/" },
      { title: "Botanic Gardens and Parks Authority — Kings Park", url: "https://www.bgpa.wa.gov.au/kings-park" },
    ]),
  },
  {
    id: "au-adelaide",
    summary: "Adelaide retains a planned centre encircled by park lands, civic boulevards, markets and cultural institutions.",
    description: "Adelaide's gridded centre and surrounding Park Lands reflect the planned urban form established in the nineteenth century. North Terrace aligns civic buildings, museums, galleries and university architecture along the northern edge of the city centre. Adelaide Central Market and public squares express enduring commercial and social life within the city, distinct from South Australia's wine regions and coastal destinations.",
    highlights: ["Adelaide Park Lands", "North Terrace institutions", "Adelaide Central Market", "Planned city squares"],
    editorialProvenance: provenance([
      { title: "City of Adelaide — Adelaide Park Lands", url: "https://www.cityofadelaide.com.au/about-adelaide/adelaide-park-lands/" },
      { title: "South Australian Museum", url: "https://www.samuseum.sa.gov.au/" },
    ]),
  },
  {
    id: "nz-auckland",
    summary: "Auckland spans an isthmus between harbours, shaped by volcanic landforms, waterfronts and Māori cultural heritage.",
    description: "Auckland occupies a narrow isthmus between the Waitematā and Manukau harbours, where volcanic cones punctuate the urban landscape. Its central waterfront, civic spaces and historic neighbourhoods reflect successive layers of maritime and urban development. Auckland War Memorial Museum and other cultural institutions interpret Tāmaki Makaurau's Māori histories, natural environment and diverse communities within the city and its immediate setting.",
    highlights: ["Waitematā Harbour waterfront", "Auckland volcanic landscape", "Auckland War Memorial Museum", "Tāmaki Makaurau Māori heritage"],
    editorialProvenance: provenance([
      { title: "Auckland Council — Tūpuna Maunga", url: "https://www.aucklandcouncil.govt.nz/parks-recreation/Pages/tupuna-maunga-volcanic-cones.aspx" },
      { title: "Auckland War Memorial Museum", url: "https://www.aucklandmuseum.com/" },
    ]),
  },
  {
    id: "nz-wellington",
    summary: "Wellington occupies a compact harbour setting with civic architecture, hillside neighbourhoods and national cultural institutions.",
    description: "Wellington curves around a sheltered harbour, with a compact centre rising into steep surrounding hills and established neighbourhoods. The waterfront links civic spaces, public art and cultural buildings, including the national museum Te Papa Tongarewa. Historic streets, government architecture and museums convey the city's Māori and colonial histories without expanding its scope to the wider Wellington Region or Wairarapa.",
    highlights: ["Wellington Harbour waterfront", "Museum of New Zealand Te Papa Tongarewa", "Civic and government architecture", "Historic hillside neighbourhoods"],
    editorialProvenance: provenance([
      { title: "Wellington City Council — Wellington waterfront", url: "https://wellington.govt.nz/arts-and-culture/arts/wellington-waterfront" },
      { title: "Museum of New Zealand Te Papa Tongarewa", url: "https://www.tepapa.govt.nz/" },
    ]),
  },
  {
    id: "nz-christchurch",
    summary: "Christchurch extends across the Canterbury Plains around the Ōtākaro Avon River, gardens and cultural landmarks.",
    description: "Christchurch occupies the Canterbury Plains, with the Ōtākaro Avon River winding through its central streets and green spaces. The Botanic Gardens, historic street pattern and surviving heritage places reveal the city's planned colonial form and architectural history. Museums and cultural institutions interpret Canterbury's natural environment and Ngāi Tahu heritage without making claims about present rebuilding, restoration, access or temporary locations.",
    highlights: ["Ōtākaro Avon River", "Christchurch Botanic Gardens", "Historic central street pattern", "Canterbury and Ngāi Tahu heritage"],
    editorialProvenance: provenance([
      { title: "Christchurch City Council — Christchurch Botanic Gardens", url: "https://ccc.govt.nz/parks-and-gardens/christchurch-botanic-gardens" },
      { title: "Canterbury Museum", url: "https://www.canterburymuseum.com/" },
    ]),
  },
  {
    id: "fj-nadi",
    summary: "Nadi occupies western Viti Levu, centred on a market town shaped by Fiji's diverse communities.",
    description: "Nadi lies on western Viti Levu, where the town developed inland from Nadi Bay amid the island's sugar-growing lowlands. Its central market gathers produce and everyday commerce from surrounding communities. The Sri Siva Subramaniya Temple and the town's iTaukei and Indo-Fijian cultural setting provide a distinct local identity without extending Nadi to Denarau or the offshore island groups.",
    highlights: ["Western Viti Levu setting", "Nadi municipal market", "Sri Siva Subramaniya Temple", "iTaukei and Indo-Fijian heritage"],
    editorialProvenance: provenance([
      { title: "Tourism Fiji — Nadi", url: "https://www.fiji.travel/places-to-go/nadi" },
      { title: "Nadi Town Council", url: "https://naditowncouncil.com.fj/" },
    ]),
  },
  {
    id: "pf-papeete",
    summary: "Papeete faces Tahiti's harbour through a civic centre of markets, gardens and Polynesian urban history.",
    description: "Papeete stands on Tahiti's northwestern shore, where its harbour and waterfront frame French Polynesia's principal urban centre. The municipal market sustains established trades in produce, flowers, food and handicrafts within the city. Bougainville Park, civic buildings and the Maison de la Culture reflect Papeete's public life and Polynesian cultural context without absorbing the attractions of Tahiti's other districts or islands.",
    highlights: ["Papeete harbour waterfront", "Papeete municipal market", "Bougainville Park", "Maison de la Culture"],
    editorialProvenance: provenance([
      { title: "Tahiti Tourisme — Papeete", url: "https://www.tahititourisme.com/islands/tahiti/papeete/" },
      { title: "City of Papeete", url: "https://www.papeete.pf/" },
    ]),
  },
  {
    id: "pg-port-moresby",
    summary: "Port Moresby overlooks the Gulf of Papua through Motu-Koitabu country and national civic institutions.",
    description: "Port Moresby extends along the Gulf of Papua within the traditional lands of the Motu and Koitabu peoples. The National Museum and Art Gallery interprets Papua New Guinea's cultural and natural heritage from its Waigani setting. Parliament House and the National Capital Botanical Gardens anchor a civic and institutional district distinct from the country's distant highlands, islands and other cultural landscapes.",
    highlights: ["Gulf of Papua shoreline", "Motu-Koitabu cultural context", "National Museum and Art Gallery", "Waigani civic precinct"],
    editorialProvenance: provenance([
      { title: "National Museum and Art Gallery of Papua New Guinea", url: "https://www.museumpng.gov.pg/" },
      { title: "National Capital District Commission — Amazing Port Moresby", url: "https://www.amazingportmoresby.com/" },
    ]),
  },
  {
    id: "sb-honiara",
    summary: "Honiara follows Guadalcanal's northern coast through a waterfront capital shaped by national cultural institutions.",
    description: "Honiara stretches along Guadalcanal's north coast, facing Iron Bottom Sound and centred on a compact administrative waterfront. The Solomon Islands National Museum preserves archaeological, historical and cultural collections in the city. Central Market and the National Art Gallery express Honiara's continuing civic and commercial role, while Guadalcanal's more distant wartime landscapes remain outside the central destination's boundaries.",
    highlights: ["Iron Bottom Sound waterfront", "Solomon Islands National Museum", "Honiara Central Market", "National Art Gallery"],
    editorialProvenance: provenance([
      { title: "Solomon Islands National Museum", url: "https://solomons.gov.sb/ministry-of-culture-and-tourism/national-museum/" },
      { title: "Tourism Solomons — Honiara", url: "https://www.visitsolomons.com.sb/where-to-go/honiara/" },
    ]),
  },
  {
    id: "vu-port-vila",
    summary: "Port Vila curves around Efate's southwestern harbour beside markets and Vanuatu's principal cultural institutions.",
    description: "Port Vila occupies a sheltered harbour on Efate's southwestern coast, with civic and commercial districts following the waterfront. The Vanuatu Cultural Centre and National Museum document the archipelago's archaeology, customary knowledge, art and languages from the capital. Markets, public spaces and surviving colonial-era layers define the city's own history without turning wider Efate or other Vanuatu islands into Port Vila attractions.",
    highlights: ["Port Vila harbour", "Vanuatu Cultural Centre", "National Museum of Vanuatu", "Port Vila market"],
    editorialProvenance: provenance([
      { title: "Vanuatu Tourism Office — Port Vila", url: "https://www.vanuatu.travel/en/provinces/shefa-province/port-vila" },
      { title: "Vanuatu Cultural Centre", url: "https://vanuatuculturalcentre.vu/" },
    ]),
  },
  {
    id: "ws-apia",
    summary: "Apia lines Upolu's northern coast with a harbour, markets and institutions central to Samoan history.",
    description: "Apia occupies a natural harbour on Upolu's northern coast, where the waterfront meets the country's principal civic and commercial centre. The Museum of Samoa interprets archaeology, material culture and national history from within the capital. Fugalei Market and the Mulinuʻu peninsula's historic and ceremonial landscape give Apia a specific sense of place distinct from Upolu's villages, mountains and wider coastline.",
    highlights: ["Apia harbour waterfront", "Museum of Samoa", "Fugalei Market", "Mulinuʻu historic peninsula"],
    editorialProvenance: provenance([
      { title: "Samoa Tourism Authority — Apia", url: "https://www.samoa.travel/discover/our-regions/upolu/apia/" },
      { title: "Ministry of Education and Culture — Museum of Samoa", url: "https://www.mesc.gov.ws/museum-of-samoa/" },
    ]),
  },
  {
    id: "to-nuku-alofa",
    summary: "Nukuʻalofa faces the Fangaʻuta Lagoon waterfront through markets, royal landmarks and Tongan civic history.",
    description: "Nukuʻalofa occupies northern Tongatapu beside Fangaʻuta Lagoon, with its waterfront defining the capital's compact urban form. The Royal Palace and royal tombs record enduring dimensions of Tonga's constitutional and chiefly history. Talamahu Market and national cultural collections ground the city in everyday trade and Tongan heritage without extending its scope across Tongatapu or the kingdom's other island groups.",
    highlights: ["Fangaʻuta Lagoon waterfront", "Nukuʻalofa Royal Palace", "Royal Tombs", "Talamahu Market"],
    editorialProvenance: provenance([
      { title: "Tonga Tourism — Nukuʻalofa", url: "https://tongatourism.travel/destinations/nukualofa/" },
      { title: "Tonga Ministry of Tourism", url: "https://tourismtonga.gov.to/" },
    ]),
  },
  {
    id: "ck-rarotonga",
    summary: "Rarotonga is a volcanic island encircled by lagoon, coastal settlements and Cook Islands cultural landmarks.",
    description: "Rarotonga rises from a mountainous volcanic interior, with settlements and a reef-fringed lagoon circling its narrow coastal plain. Avarua, the principal settlement, contains the Cook Islands Library and Museum and historic civic and mission landmarks. Marae, cultural institutions and the island's interior tracks convey Polynesian histories within Rarotonga, without importing the landscapes or traditions of the outer Cook Islands.",
    highlights: ["Volcanic mountain interior", "Rarotonga lagoon and reef", "Avarua historic centre", "Cook Islands Library and Museum"],
    editorialProvenance: provenance([
      { title: "Cook Islands Tourism — Rarotonga", url: "https://cookislands.travel/islands/rarotonga" },
      { title: "Cook Islands Library and Museum Society", url: "https://cook-islands-library-museum.org/" },
    ]),
  },
  {
    id: "gu-guam",
    summary: "Guam is a limestone and volcanic island whose historic places sustain layered CHamoru cultural heritage.",
    description: "Guam is the largest island in Micronesia, with limestone plateaus, volcanic hills and a coastline of bays and reefs. Hagåtña's museums and historic sites interpret CHamoru life alongside Spanish and later American periods. The island-wide scope also includes ancient latte stone sites and War in the Pacific memorial landscapes, while keeping Guam's distinct settlements and their histories geographically clear.",
    highlights: ["CHamoru cultural heritage", "Hagåtña historic sites", "Ancient latte stone places", "War in the Pacific memorial landscapes"],
    editorialProvenance: provenance([
      { title: "Guam Visitors Bureau — History and culture", url: "https://www.visitguam.com/about-guam/history-culture/" },
      { title: "National Park Service — War in the Pacific National Historical Park", url: "https://www.nps.gov/wapa/index.htm" },
    ]),
  },
  {
    id: "mp-saipan",
    summary: "Saipan's limestone island landscape holds Chamorro and Carolinian heritage alongside layered twentieth-century history.",
    description: "Saipan is a raised limestone island in the Northern Mariana Islands, bordered by western lagoons and an eastern coastal escarpment. Chamorro and Carolinian histories remain present in cultural collections, community traditions and settlement landscapes. The Northern Mariana Islands Museum and American Memorial Park interpret island history and the Second World War without treating the rest of the archipelago as part of Saipan.",
    highlights: ["Saipan limestone landscape", "Chamorro and Carolinian heritage", "Northern Mariana Islands Museum", "American Memorial Park"],
    editorialProvenance: provenance([
      { title: "Marianas Visitors Authority — Saipan", url: "https://www.mymarianas.com/saipan/" },
      { title: "National Park Service — American Memorial Park", url: "https://www.nps.gov/amme/index.htm" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
