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
  {
    id: "cl-santiago",
    summary: "Santiago occupies an Andean basin around historic civic spaces, museums and established cultural neighbourhoods.",
    description: "Santiago's central commune lies within a broad Andean basin, with mountain ranges defining the capital's wider metropolitan setting. Plaza de Armas anchors the historic centre through civic buildings, religious architecture and long-established streets. Museums, cultural centres and neighbourhoods such as Lastarria interpret Chilean art, memory and urban history while keeping the destination distinct from the surrounding Metropolitan Region.",
    highlights: ["Plaza de Armas", "Historic civic centre", "Chilean Museum of Pre-Columbian Art", "Lastarria cultural quarter"],
    editorialProvenance: provenance([
      { title: "Municipality of Santiago — Santiago Tourism", url: "https://www.santiagoturismo.cl/" },
      { title: "Chilean Museum of Pre-Columbian Art", url: "https://museo.precolombino.cl/" },
    ]),
  },
  {
    id: "ar-buenos-aires",
    summary: "Buenos Aires faces the Río de la Plata through civic landmarks, historic neighbourhoods and tango institutions.",
    description: "Buenos Aires occupies the western shore of the Río de la Plata as an autonomous city separate from its surrounding province. Plaza de Mayo gathers civic architecture at the historic core, while San Telmo and La Boca retain distinct streetscapes and cultural histories. Museums, theatres and tango institutions document immigration, art and performance traditions that shaped the city's identity.",
    highlights: ["Plaza de Mayo civic ensemble", "San Telmo historic streets", "La Boca cultural heritage", "Buenos Aires tango traditions"],
    editorialProvenance: provenance([
      { title: "Buenos Aires City — Official tourism site", url: "https://turismo.buenosaires.gob.ar/" },
      { title: "UNESCO — Tango", url: "https://ich.unesco.org/en/RL/tango-00258" },
    ]),
  },
  {
    id: "uy-montevideo",
    summary: "Montevideo follows the Río de la Plata waterfront through historic districts, civic architecture and cultural institutions.",
    description: "Montevideo extends along the Río de la Plata, where the rambla connects the city's urban shoreline and established districts. Ciudad Vieja preserves plazas, civic buildings and cultural institutions around the original port-side core. The Mercado del Puerto, museums and performance spaces reflect commercial, artistic and culinary histories specific to the capital rather than Uruguay's wider coastal resorts.",
    highlights: ["Rambla waterfront", "Ciudad Vieja", "Mercado del Puerto", "Cabildo museum collections"],
    editorialProvenance: provenance([
      { title: "Municipality of Montevideo — Tourism", url: "https://www.descubrimontevideo.uy/" },
      { title: "Municipality of Montevideo — Cabildo Museum", url: "https://museos.montevideo.gub.uy/museos/museo-historico-cabildo" },
    ]),
  },
  {
    id: "py-asuncion",
    summary: "Asunción rises beside the Paraguay River through historic civic buildings, markets, museums and cultural institutions.",
    description: "Asunción developed on elevated ground beside the Paraguay River, with bayside geography shaping its historic urban core. The Palacio de los López and nearby civic buildings mark a centre of national history, while traditional markets express longstanding commercial life. Museums and cultural institutions interpret Paraguayan art, memory and Indigenous heritage within the capital, distinct from Greater Asunción and neighbouring Luque.",
    highlights: ["Paraguay River setting", "Palacio de los López", "Historic central district", "Casa de la Independencia Museum"],
    editorialProvenance: provenance([
      { title: "National Secretariat of Tourism — Visit Paraguay", url: "https://visitparaguay.travel/" },
      { title: "Casa de la Independencia Museum", url: "https://www.casadelaindependencia.org.py/" },
    ]),
  },
  {
    id: "br-sao-paulo",
    summary: "São Paulo spans a plateau through modernist landmarks, historic streets, museums and immigrant cultural traditions.",
    description: "São Paulo city spreads across a southeastern plateau, distinct from its namesake state and surrounding metropolitan municipalities. Avenida Paulista and MASP represent its modern cultural landscape, while the historic centre preserves civic, religious and commercial architecture. Municipal museums, markets and neighbourhood institutions trace migration, industry and artistic experimentation within the city without extending its scope to statewide beaches or countryside.",
    highlights: ["Avenida Paulista", "MASP collections", "Historic central architecture", "Municipal Market traditions"],
    editorialProvenance: provenance([
      { title: "São Paulo City Hall — Museum of the City", url: "https://www.museudacidade.prefeitura.sp.gov.br/" },
      { title: "São Paulo Museum of Art", url: "https://masp.org.br/" },
    ]),
  },
  {
    id: "br-brasilia",
    summary: "Brasília centres a planned modernist ensemble of monumental civic architecture, cultural institutions and residential superblocks.",
    description: "Brasília's planned central ensemble occupies the Brazilian highlands within the wider Federal District. Lúcio Costa's urban plan organizes monumental, residential and civic scales, while Oscar Niemeyer's architecture defines landmarks along the Monumental Axis. Museums and cultural institutions interpret the capital's planned-city history and modernism without treating every surrounding administrative region as part of the central ensemble.",
    highlights: ["UNESCO modernist urban plan", "Monumental Axis", "Oscar Niemeyer civic architecture", "Residential superblocks"],
    editorialProvenance: provenance([
      { title: "UNESCO — Brasilia", url: "https://whc.unesco.org/en/list/445/" },
      { title: "Federal District Secretariat of Tourism — Brasília", url: "https://www.turismo.df.gov.br/" },
    ]),
  },
  {
    id: "br-manaus",
    summary: "Manaus stands beside the Rio Negro with port-city heritage, markets, museums and rubber-era architecture.",
    description: "Manaus occupies the north bank of the Rio Negro, where its urban history developed around river trade and port activity. Teatro Amazonas and other ornate buildings recall the rubber-boom period, while central markets reflect enduring regional exchange. Museums and cultural institutions connect the city's Indigenous, industrial and artistic histories to its Amazonian setting without equating Manaus with the entire rainforest.",
    highlights: ["Rio Negro waterfront", "Teatro Amazonas", "Adolpho Lisboa Municipal Market", "Rubber-era architecture"],
    editorialProvenance: provenance([
      { title: "Amazonas State Culture Portal — Teatro Amazonas", url: "https://cultura.am.gov.br/portal/teatro-amazonas/" },
      { title: "Manaus City Hall — Tourism", url: "https://manausdestino.com.br/" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
