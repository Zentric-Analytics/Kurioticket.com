import type { ExploreDestinationEditorial, ExploreDestinationEditorialSourceReference } from "./types";

const centralAmericaBatch1SourceReferences =
  (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
    source: "kurioticket-editorial" as const,
    sourceReferences: references,
    lastVerifiedAt: "2026-08-10",
  });

/** Central America Batch 1 destinations that cleared authoritative-source review, in rollout order. */
export const centralAmericaExploreDestinationEditorial = [
  {
    id: "gt-guatemala-city",
    summary: "Guatemala City occupies a highland valley shaped by civic architecture, museums and Maya cultural collections.",
    description: "Guatemala City spreads across a highland valley, with a historic civic core set amid later avenues and neighbourhoods. The National Palace of Culture anchors the central district beside the Plaza de la Constitución and Metropolitan Cathedral. Archaeological and ethnographic museums preserve Maya collections and interpret Guatemala's long cultural history from institutions located within the capital.",
    highlights: ["National Palace of Culture", "Plaza de la Constitución", "Metropolitan Cathedral", "National archaeology collections"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "Guatemala Ministry of Culture and Sports — National Palace of Culture", url: "https://mcd.gob.gt/palacio-nacional-de-la-cultura/" },
      { title: "Museums of Guatemala — National Museum of Archaeology and Ethnology", url: "https://museosdeguatemala.org/museo-nacional-de-arqueologia-y-etnologia/" },
    ]),
  },
  {
    id: "sv-san-salvador",
    summary: "San Salvador fills a volcanic basin with a historic centre, civic monuments and national cultural institutions.",
    description: "San Salvador extends across a volcanic basin, where the historic centre forms a dense civic and religious core. The Metropolitan Cathedral, National Palace and National Theatre frame public spaces associated with the capital's architectural development. Elsewhere in the city, the National Museum of Anthropology interprets Salvadoran archaeology and cultural history, while established markets reflect everyday urban commerce.",
    highlights: ["Metropolitan Cathedral", "National Theatre of San Salvador", "Historic centre civic core", "National Museum of Anthropology"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "El Salvador Ministry of Culture — National Museum of Anthropology Dr. David J. Guzmán", url: "https://www.cultura.gob.sv/museo-nacional-de-antropologia-dr-david-j-guzman/" },
      { title: "El Salvador Ministry of Culture — National Theatre of San Salvador", url: "https://www.cultura.gob.sv/teatro-nacional-de-san-salvador/" },
    ]),
  },
  {
    id: "ni-managua",
    summary: "Managua extends beside Lake Managua through civic landmarks, cultural institutions and a dispersed urban landscape.",
    description: "Managua occupies the southern shore of Lake Managua, with a dispersed cityscape shaped by successive periods of rebuilding and expansion. Near the historic civic centre, the Old Cathedral and National Palace of Culture mark prominent chapters of the capital's architecture. The National Museum's collections and nearby monuments interpret Nicaragua's archaeology, art and public history without relying on current institutional conditions.",
    highlights: ["Lake Managua shoreline", "Old Cathedral of Managua", "National Palace of Culture", "National Museum collections"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "Nicaraguan Institute of Culture — National Palace of Culture", url: "https://www.inc.gob.ni/palacio-nacional-de-la-cultura/" },
      { title: "Nicaraguan Institute of Culture — National Museum of Nicaragua Diocleciano Chaves", url: "https://www.inc.gob.ni/museo-nacional-de-nicaragua-diocleciano-chaves/" },
    ]),
  },
  {
    id: "cr-san-jose",
    summary: "San José centres on civic architecture, historic markets and museums interpreting Costa Rica's cultural development.",
    description: "San José developed on Costa Rica's Central Valley plateau, where compact central districts retain civic buildings, parks and commercial streets. The National Theatre expresses the city's coffee-era cultural ambitions through elaborate architecture and public art. Nearby museums preserve archaeological, artistic and monetary collections, while the Central Market records longstanding patterns of food, craft and everyday commerce within the capital.",
    highlights: ["National Theatre of Costa Rica", "Central Market of San José", "National Museum collections", "Pre-Columbian Gold Museum"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "National Theatre of Costa Rica — History", url: "https://www.teatronacional.go.cr/Historia" },
      { title: "National Museum of Costa Rica", url: "https://www.museocostarica.go.cr/" },
    ]),
  },
  {
    id: "pa-panama-city",
    summary: "Panama City faces Panama Bay through archaeological ruins, colonial streetscapes and a modern urban centre.",
    description: "Panama City stretches along Panama Bay, linking a modern skyline with historic districts that record successive urban foundations. Panamá Viejo preserves archaeological remains of the first European-founded settlement on the Pacific coast of the Americas, while Casco Antiguo reflects the later colonial city. Museums and civic spaces interpret the capital's relationship with regional trade and the wider Panama Canal system.",
    highlights: ["Panamá Viejo archaeological site", "Casco Antiguo streetscapes", "Panama Bay waterfront", "Interoceanic trade history"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "UNESCO — Archaeological Site of Panamá Viejo and Historic District of Panamá", url: "https://whc.unesco.org/en/list/790/" },
      { title: "Patronato Panamá Viejo — Monumental Complex", url: "https://www.patronatopanamaviejo.org/" },
    ]),
  },
  {
    id: "hn-san-pedro-sula",
    summary: "San Pedro Sula is a northwestern Honduran city shaped by civic spaces, markets and cultural institutions.",
    description: "San Pedro Sula occupies the Sula Valley in northwestern Honduras, with its central district organized around long-established civic and commercial spaces. Parque Central and the Cathedral of San Pedro Apóstol form prominent landmarks in the urban core, while Guamilito Market reflects the city's commercial traditions. The Museum of Anthropology and History interprets local and regional archaeology, history and cultural life.",
    highlights: ["Parque Central", "Cathedral of San Pedro Apóstol", "Guamilito Market", "Museum of Anthropology and History"],
    editorialProvenance: centralAmericaBatch1SourceReferences([
      { title: "Municipality of San Pedro Sula", url: "https://www.sanpedrosula.hn/" },
      { title: "Museum of Anthropology and History of San Pedro Sula", url: "https://museosps.org/" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
