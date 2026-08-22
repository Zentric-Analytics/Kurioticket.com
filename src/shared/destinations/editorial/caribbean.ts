import type { ExploreDestinationEditorial, ExploreDestinationEditorialSourceReference } from "./types";

const provenance = (sourceReferences: readonly ExploreDestinationEditorialSourceReference[]) => ({
  source: "kurioticket-editorial" as const, sourceReferences, lastVerifiedAt: "2026-08-10",
});

/** Caribbean Batch 1 destinations that cleared authoritative-source review, in rollout order. */
export const caribbeanExploreDestinationEditorial = [
  {
    id: "cu-havana",
    summary: "Havana surrounds a historic Caribbean harbour with fortified architecture, civic squares and enduring musical institutions.",
    description: "Havana extends around a sheltered harbour on Cuba's northern coast, with the Malecón tracing its seaward edge. Old Havana preserves a layered colonial street plan, plazas and fortifications associated with the port's strategic history. Museums, theatres and music institutions across the city interpret Cuban art, performance and civic life within a distinctly urban setting.",
    highlights: ["Old Havana fortified core", "Malecón waterfront", "Plaza de la Catedral", "Museum of the City collections"],
    editorialProvenance: provenance([
      { title: "UNESCO — Old Havana and its Fortification System", url: "https://whc.unesco.org/en/list/204/" },
      { title: "Office of the Historian of the City of Havana", url: "https://www.lahabana.gob.cu/" },
    ]),
  },
  {
    id: "do-santo-domingo",
    summary: "Santo Domingo faces the Ozama River through a colonial core of monuments, museums and civic streets.",
    description: "Santo Domingo occupies the Caribbean coast at the mouth of the Ozama River, where its Colonial City forms the historic core. A gridded street plan connects the Cathedral of Santa María la Menor, Alcázar de Colón and early civic buildings. Museums and public squares interpret the city's role in the first sustained European colonial settlement of the Americas.",
    highlights: ["Colonial City street grid", "Alcázar de Colón", "Cathedral of Santa María la Menor", "Ozama River frontage"],
    editorialProvenance: provenance([
      { title: "UNESCO — Colonial City of Santo Domingo", url: "https://whc.unesco.org/en/list/526/" },
      { title: "Dominican Republic Ministry of Tourism — Santo Domingo", url: "https://www.godominicanrepublic.com/destinations/santo-domingo/" },
    ]),
  },
  {
    id: "do-punta-cana",
    summary: "Punta Cana occupies the Dominican Republic's eastern coast amid beaches, lagoons and established coastal communities.",
    description: "Punta Cana lies at the Dominican Republic's eastern edge, where the Atlantic and Caribbean coastal landscapes meet. The destination includes planned coastal districts and communities connected with Bávaro, while remaining distinct from the wider province and Higüey. Beaches, mangroves, freshwater lagoons and local ecological reserves provide a durable geographic framework beyond the area's resort development.",
    highlights: ["Punta Cana coastal headland", "Bávaro coastal district", "Indigenous Eyes ecological reserve", "Caribbean–Atlantic shoreline"],
    editorialProvenance: provenance([
      { title: "Dominican Republic Ministry of Tourism — Punta Cana", url: "https://www.godominicanrepublic.com/destinations/punta-cana/" },
      { title: "Grupo Puntacana Foundation — Indigenous Eyes Ecological Reserve", url: "https://www.puntacana.org/environment/indigenous-eyes-ecological-reserve/" },
    ]),
  },
  {
    id: "jm-kingston",
    summary: "Kingston rises beside a broad natural harbour with national museums, historic districts and influential music heritage.",
    description: "Kingston extends between its harbour and the foothills of eastern Jamaica, with downtown streets facing the waterfront. Civic squares, markets and surviving historic buildings record the capital's commercial and administrative development. The National Gallery of Jamaica, Devon House and music-focused institutions preserve artistic, architectural and social histories closely associated with the city locally.",
    highlights: ["Kingston Harbour setting", "National Gallery of Jamaica", "Devon House", "Trench Town music heritage"],
    editorialProvenance: provenance([
      { title: "Visit Jamaica — Kingston", url: "https://www.visitjamaica.com/plan-your-trip/explore-the-island/kingston/" },
      { title: "National Gallery of Jamaica", url: "https://nationalgalleryofjamaica.wordpress.com/" },
      { title: "Jamaica National Heritage Trust — Devon House", url: "https://jnht.com/site_devon_house.php" },
    ]),
  },
  {
    id: "jm-montego-bay",
    summary: "Montego Bay curves around a north-coast harbour shaped by commerce, civic history and tourism-era development.",
    description: "Montego Bay occupies a sheltered inlet on Jamaica's north coast and serves as the urban centre of Saint James. Sam Sharpe Square anchors the historic commercial core, where civic buildings and monuments recall emancipation and local public life. Markets, harbour streets and institutions such as the Montego Bay Cultural Centre interpret the city's distinct social and artistic history.",
    highlights: ["Sam Sharpe Square", "Montego Bay Cultural Centre", "North-coast harbour", "Historic market district"],
    editorialProvenance: provenance([
      { title: "Visit Jamaica — Montego Bay", url: "https://www.visitjamaica.com/plan-your-trip/explore-the-island/montego-bay/" },
      { title: "Jamaica National Heritage Trust — Sam Sharpe Square", url: "https://jnht.com/site_sam_sharpe_square.php" },
    ]),
  },
  {
    id: "tt-port-of-spain",
    summary: "Port of Spain borders the Gulf of Paria through civic districts, museums and Carnival-rooted cultural traditions.",
    description: "Port of Spain occupies Trinidad's northwest coast beside the Gulf of Paria, with a compact commercial and civic centre. Queen's Park Savannah borders the Magnificent Seven, a group of distinctive historic buildings reflecting varied architectural traditions. The National Museum and Art Gallery and the city's mas, calypso and steelpan institutions interpret cultural histories closely tied to Trinidad's capital.",
    highlights: ["Queen's Park Savannah", "Magnificent Seven architecture", "National Museum and Art Gallery", "Carnival arts heritage"],
    editorialProvenance: provenance([
      { title: "National Trust of Trinidad and Tobago — Magnificent Seven", url: "https://nationaltrust.tt/home/location/magnificent-seven/" },
      { title: "National Museum and Art Gallery of Trinidad and Tobago", url: "https://nationalmuseum.gov.tt/" },
    ]),
  },
  {
    id: "bb-bridgetown",
    summary: "Bridgetown lines the Constitution River and Carlisle Bay with mercantile streets, Parliament and garrison heritage.",
    description: "Bridgetown developed beside the Constitution River and Carlisle Bay, retaining an irregular street pattern shaped by maritime commerce. Its historic core includes Parliament Buildings, warehouses, churches and public spaces, while the associated Garrison lies beyond the centre. Museums and preserved military structures interpret the city's colonial administration, trading networks and later civic development within the wider UNESCO property.",
    highlights: ["Historic Bridgetown streets", "Parliament Buildings", "Carlisle Bay waterfront", "Bridgetown Garrison heritage"],
    editorialProvenance: provenance([
      { title: "UNESCO — Historic Bridgetown and its Garrison", url: "https://whc.unesco.org/en/list/1376/" },
      { title: "Barbados Museum & Historical Society", url: "https://www.barbmuse.org.bb/" },
    ]),
  },
  {
    id: "bs-nassau",
    summary: "Nassau faces a sheltered New Providence harbour with colonial forts, civic squares and Bahamian museums.",
    description: "Nassau occupies the northern shore of New Providence, facing a protected harbour across from separate Paradise Island. Its central streets connect Parliament Square, historic churches, markets and fortifications that reflect the city's colonial and maritime development. Museums and cultural institutions interpret Bahamian history, art and Junkanoo traditions without treating the wider archipelago as part of the city.",
    highlights: ["Nassau Harbour", "Parliament Square", "Fort Fincastle", "National Art Gallery of The Bahamas"],
    editorialProvenance: provenance([
      { title: "The Islands of The Bahamas — Nassau & Paradise Island", url: "https://www.bahamas.com/islands/nassau-paradise-island" },
      { title: "National Art Gallery of The Bahamas", url: "https://nagb.org.bs/" },
    ]),
  },
  {
    id: "ag-st-john-s",
    summary: "St. John's surrounds an Antiguan harbour with civic landmarks, market traditions and a longstanding port history.",
    description: "The city rises from a sheltered harbour on Antigua's northwest coast, with commercial streets focused on the waterfront. The cathedral's twin towers overlook a centre of civic buildings, markets and surviving historic fabric. The Museum of Antigua and Barbuda interprets Indigenous, colonial and post-emancipation histories from the former courthouse, keeping the account specific to the Antiguan capital.",
    highlights: ["St. John's Harbour", "St. John's Cathedral", "Museum of Antigua and Barbuda", "Public Market district"],
    editorialProvenance: provenance([
      { title: "Antigua and Barbuda Tourism Authority — St. John's", url: "https://www.visitantiguabarbuda.com/st-johns/" },
      { title: "Museum of Antigua and Barbuda", url: "https://www.antiguamuseums.net/" },
    ]),
  },
  {
    id: "aw-oranjestad",
    summary: "Oranjestad follows Aruba's southern waterfront through colourful civic architecture, museums and Dutch-Caribbean fort heritage.",
    description: "Oranjestad extends along Aruba's southern coast, where waterfront commerce meets a compact civic and museum district. Fort Zoutman and the Willem III Tower mark the settlement's nineteenth-century development, while restored buildings display Dutch-Caribbean architectural influences. Archaeological and historical collections interpret Aruba's Indigenous past, colonial connections and island society from institutions located within the capital.",
    highlights: ["Fort Zoutman", "Willem III Tower", "Oranjestad waterfront", "National Archaeological Museum Aruba"],
    editorialProvenance: provenance([
      { title: "Aruba Tourism Authority — Oranjestad", url: "https://www.aruba.com/us/our-island/regions/oranjestad" },
      { title: "Aruba Tourism Authority — Fort Zoutman Historical Museum", url: "https://www.aruba.com/us/explore/fort-zoutman-historical-museum" },
      { title: "National Archaeological Museum Aruba", url: "https://namaruba.org/" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
