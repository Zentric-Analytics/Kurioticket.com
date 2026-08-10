import type { ExploreDestinationEditorial, ExploreDestinationEditorialSourceReference } from "./types";

const provenance = (sourceReferences: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const, sourceReferences, lastVerifiedAt: "2026-08-10",
});

/** South America Batch 1 destinations that cleared authoritative-source review, in rollout order. */
export const southAmericaExploreDestinationEditorial = [
  {
    id: "co-bogota",
    summary: "Bogotá occupies a high Andean plateau with historic civic spaces, museums and enduring cultural institutions.",
    description: "Bogotá spreads across a high plateau in the eastern Andes, beneath the ridges that frame the city. La Candelaria retains colonial streets, churches and civic buildings around Plaza de Bolívar. The Gold Museum and Botero Museum anchor a broad network of cultural institutions interpreting pre-Hispanic metalwork, Colombian history and art within the capital.",
    highlights: ["La Candelaria historic streets", "Plaza de Bolívar", "Gold Museum collections", "Botero Museum"],
    editorialProvenance: provenance([
      { title: "Banco de la República — Gold Museum", url: "https://www.banrepcultural.org/bogota/museo-del-oro" },
      { title: "Banco de la República — Botero Museum", url: "https://www.banrepcultural.org/bogota/museo-botero" },
    ]),
  },
  {
    id: "co-medellin",
    summary: "Medellín extends along the Aburrá Valley through civic plazas, neighbourhoods and prominent art institutions.",
    description: "Medellín follows the narrow floor and slopes of the Aburrá Valley, giving the city a strongly linear form. Plaza Botero gathers monumental sculptures beside the Museo de Antioquia in the traditional centre. Collections, public art and neighbourhood cultural spaces trace local artistic life alongside the commercial and industrial history that shaped the city.",
    highlights: ["Aburrá Valley urban setting", "Plaza Botero sculptures", "Museo de Antioquia", "Historic central district"],
    editorialProvenance: provenance([
      { title: "Medellín Travel — Official city guide", url: "https://www.medellin.travel/" },
      { title: "Museo de Antioquia", url: "https://museodeantioquia.co/" },
    ]),
  },
  {
    id: "ec-quito",
    summary: "Quito rises within an Andean basin around a historic centre of churches, monasteries and civic squares.",
    description: "Quito occupies a long Andean basin, with urban districts extending between mountain slopes and volcanic ridges. Its UNESCO-listed historic centre preserves a street grid, plazas, monasteries and richly decorated churches developed over several centuries. Museums and restored civic buildings interpret the city's Indigenous foundations, colonial religious art and republican history without extending the destination to Ecuador's surrounding highlands.",
    highlights: ["Historic Centre of Quito", "Plaza Grande", "San Francisco church and convent", "City museum collections"],
    editorialProvenance: provenance([
      { title: "UNESCO — City of Quito", url: "https://whc.unesco.org/en/list/2/" },
      { title: "Quito Museums Foundation", url: "https://fundacionmuseosquito.gob.ec/" },
    ]),
  },
  {
    id: "ec-guayaquil",
    summary: "Guayaquil lines the Guayas River with waterfront landmarks, hillside streets and port-city cultural institutions.",
    description: "Guayaquil developed on the western bank of the Guayas River, where its waterfront records a longstanding port-city identity. The Malecón connects civic monuments and public spaces, while Las Peñas climbs Cerro Santa Ana through narrow streets and traditional houses. Museums and cultural institutions present the city's archaeological, artistic and maritime histories within a distinctly urban coastal setting.",
    highlights: ["Guayas River waterfront", "Malecón Simón Bolívar", "Las Peñas neighbourhood", "Municipal Museum collections"],
    editorialProvenance: provenance([
      { title: "Guayaquil is My Destination — Official tourism portal", url: "https://www.guayaquilesmidestino.com/" },
      { title: "Municipality of Guayaquil", url: "https://www.guayaquil.gob.ec/" },
    ]),
  },
  {
    id: "pe-lima",
    summary: "Lima occupies Peru's Pacific desert coast amid monumental squares, religious complexes and archaeological layers.",
    description: "Lima stands on a coastal desert plain above the Pacific, with river valleys shaping its long urban history. The UNESCO-listed historic centre gathers Plaza Mayor, churches, convents and civic architecture associated with the viceregal and republican city. Archaeological sites such as Huaca Pucllana and museum collections reveal much earlier cultures within Lima itself, distinct from neighbouring Callao.",
    highlights: ["Historic Centre of Lima", "Plaza Mayor civic ensemble", "San Francisco religious complex", "Huaca Pucllana archaeology"],
    editorialProvenance: provenance([
      { title: "UNESCO — Historic Centre of Lima", url: "https://whc.unesco.org/en/list/500/" },
      { title: "Peru Ministry of Culture — Huaca Pucllana Site Museum", url: "https://museos.cultura.pe/museos/museo-de-sitio-pucllana" },
    ]),
  },
  {
    id: "bo-la-paz",
    summary: "La Paz fills a high Andean basin with steep neighbourhoods, markets and national cultural institutions.",
    description: "La Paz descends through a dramatic high-altitude basin beneath surrounding Andean peaks, creating steep and densely layered neighbourhoods. As Bolivia's seat of government, its centre includes colonial churches, republican civic buildings and long-established market streets. National museums and the Witches' Market interpret Indigenous traditions, material culture and the political history of the city without absorbing neighbouring El Alto.",
    highlights: ["High Andean basin", "Witches' Market", "San Francisco church", "National Museum of Ethnography and Folklore"],
    editorialProvenance: provenance([
      { title: "La Paz Municipal Government — Tourism", url: "https://lapaz.bo/turismo/" },
      { title: "National Museum of Ethnography and Folklore", url: "https://www.musef.org.bo/" },
    ]),
  },
  {
    id: "bo-santa-cruz",
    summary: "Santa Cruz anchors Bolivia's eastern lowlands through a radial centre, civic architecture and regional museums.",
    description: "Santa Cruz occupies the tropical plains of eastern Bolivia, where a radial street pattern defines the city's historic centre. Plaza 24 de Septiembre and the cathedral form a civic and religious focus amid arcaded buildings and market traditions. Museums and cultural institutions document lowland archaeology, regional art and the urban development of Santa Cruz de la Sierra without encompassing the wider department.",
    highlights: ["Plaza 24 de Septiembre", "Metropolitan Cathedral", "Historic centre arcades", "Lowland cultural collections"],
    editorialProvenance: provenance([
      { title: "Santa Cruz de la Sierra Municipal Government", url: "https://www.gmsantacruz.gob.bo/" },
      { title: "Bolivia Ministry of Cultures, Decolonization and Depatriarchalization", url: "https://www.minculturas.gob.bo/" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
