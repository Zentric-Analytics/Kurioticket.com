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
] as const satisfies readonly ExploreDestinationEditorial[];
