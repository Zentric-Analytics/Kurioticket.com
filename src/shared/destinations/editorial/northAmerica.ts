import type { ExploreDestinationEditorial, ExploreDestinationEditorialSourceReference } from "./types";

const northAmericaBatch1SourceReferences =
  (references: readonly ExploreDestinationEditorialSourceReference[]) => ({
    source: "kurioticket-editorial" as const,
    sourceReferences: references,
    lastVerifiedAt: "2026-08-10",
  });

/** United States destinations introduced by North America Batch 1, in rollout order. */
export const northAmericaExploreDestinationEditorial = [
  {
    id: "us-atlanta",
    summary: "Atlanta traces its rail-founded growth through civil rights landmarks, historic neighbourhoods and established cultural institutions.",
    description: "Atlanta developed as a railway junction, and that transport history remains fundamental to the city's urban identity. The Martin Luther King Jr National Historical Park preserves places connected with King's life and the civil rights movement in the Sweet Auburn neighbourhood. Museums and historic districts provide further perspectives on the city's social, architectural and cultural development.",
    highlights: ["Martin Luther King, Jr. National Historical Park", "Sweet Auburn historic district", "Atlanta railroad heritage", "Atlanta History Center collections"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "National Park Service — Martin Luther King, Jr. National Historical Park", url: "https://www.nps.gov/malu/index.htm" },
      { title: "Atlanta History Center — Locomotion: Railroads and the Making of Atlanta", url: "https://www.atlantahistorycenter.com/exhibitions/locomotion-railroads-and-the-making-of-atlanta/" },
    ]),
  },
  {
    id: "us-chicago",
    summary: "Chicago is defined by Lake Michigan, the Chicago River, influential architecture and enduring artistic institutions.",
    description: "Chicago meets Lake Michigan along an extensive urban waterfront, while the Chicago River threads through its architectural core. Buildings associated with successive schools of design make the city a major record of American urban architecture. The Art Institute of Chicago and Museum Campus anchor prominent collections, while neighbourhood venues sustain the city's deep connections with blues and jazz.",
    highlights: ["Chicago River architecture", "Lake Michigan waterfront", "Art Institute of Chicago", "Museum Campus collections"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Chicago Park District — Lakefront Trail", url: "https://www.chicagoparkdistrict.com/parks-facilities/lakefront-trail" },
      { title: "Art Institute of Chicago — About Us", url: "https://www.artic.edu/about-us" },
    ]),
  },
  {
    id: "us-dallas-fort-worth",
    summary: "Dallas-Fort Worth spans two distinct cities whose arts, civic history and western heritage shape the metroplex.",
    description: "Dallas-Fort Worth is a dual-city metropolitan destination, not a single municipality, with distinct cultural centres in each city. Dallas's Arts District gathers museums, performance venues and civic architecture near the downtown core. In Fort Worth, the Cultural District houses major museums, while the Stockyards preserve buildings and traditions associated with the city's livestock and western heritage.",
    highlights: ["Dallas Arts District", "Dallas civic architecture", "Fort Worth Cultural District", "Fort Worth Stockyards heritage"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Dallas Arts District — About the District", url: "https://www.dallasartsdistrict.org/about/" },
      { title: "Fort Worth Stockyards — History", url: "https://www.fortworthstockyards.org/history" },
    ]),
  },
  {
    id: "us-denver",
    summary: "Denver's Front Range setting frames civic architecture, historic districts, museums and a lasting railway legacy.",
    description: "Denver occupies the high plains beside Colorado's Front Range, with the Rocky Mountains forming geographic context beyond the city. Union Station recalls the rail connections that shaped downtown growth and the surrounding historic district. Civic buildings, established neighbourhoods and institutions such as the Denver Art Museum document the city's architectural development and cultural life without placing mountain destinations inside Denver.",
    highlights: ["Front Range urban setting", "Denver Union Station", "Lower Downtown historic district", "Denver Art Museum"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Denver Union Station — History", url: "https://www.denverunionstation.com/history/" },
      { title: "Denver Art Museum — About", url: "https://www.denverartmuseum.org/en/about" },
    ]),
  },
  {
    id: "us-san-francisco",
    summary: "San Francisco's steep peninsula cityscape encompasses cable cars, historic waterfronts and culturally distinctive neighbourhoods.",
    description: "San Francisco occupies a hilly peninsula between the Pacific Ocean and its namesake bay, giving streets and waterfronts a distinctive topography. Cable cars preserve a transport history closely tied to the city's steep terrain, while the northern waterfront records maritime activity. Chinatown and the Mission District express cultural histories rooted specifically within San Francisco rather than the wider Bay Area.",
    highlights: ["Historic cable car system", "San Francisco maritime waterfront", "Chinatown streetscapes", "Mission District heritage"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "San Francisco Municipal Transportation Agency — Cable Cars", url: "https://www.sfmta.com/getting-around/muni/cable-cars" },
      { title: "National Park Service — San Francisco Maritime National Historical Park", url: "https://www.nps.gov/safr/index.htm" },
    ]),
  },
  {
    id: "us-miami",
    summary: "Miami's Biscayne Bay setting reflects Cuban and Caribbean influence through neighbourhoods, arts and waterfront culture.",
    description: "Miami extends along Biscayne Bay, where waterfront development and inland neighbourhoods shape the city's tropical urban geography. Little Havana expresses enduring Cuban cultural influence through community institutions, foodways, music and public life, while Wynwood is known for arts spaces and murals. Miami Beach and its Art Deco district lie in a separate municipality across the bay, not within Miami city.",
    highlights: ["Biscayne Bay waterfront", "Little Havana cultural heritage", "Wynwood arts district", "Miami River history"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Greater Miami Convention & Visitors Bureau — Little Havana", url: "https://www.miamiandbeaches.com/neighborhoods/little-havana" },
      { title: "Greater Miami Convention & Visitors Bureau — Wynwood", url: "https://www.miamiandbeaches.com/neighborhoods/wynwood" },
    ]),
  },
  {
    id: "us-seattle",
    summary: "Seattle rises beside Elliott Bay with a historic market, waterfront districts and influential music institutions.",
    description: "Seattle occupies an isthmus between Puget Sound and Lake Washington, with Elliott Bay defining its downtown waterfront. Pike Place Market and Pioneer Square preserve distinct layers of commercial, civic and architectural history near the central shore. Museums and music institutions interpret the city's cultural development, while surrounding mountains remain part of Seattle's regional setting rather than attractions within the city.",
    highlights: ["Pike Place Market", "Pioneer Square historic district", "Elliott Bay waterfront", "Seattle music heritage"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Pike Place Market — Market History", url: "https://www.pikeplacemarket.org/about-pike-place-market/" },
      { title: "Seattle Department of Neighborhoods — Pioneer Square Preservation District", url: "https://www.seattle.gov/neighborhoods/programs-and-services/historic-preservation/historic-districts/pioneer-square" },
    ]),
  },
  {
    id: "us-houston",
    summary: "Houston's bayou-crossed landscape supports major museums, historic neighbourhoods and institutions interpreting human spaceflight.",
    description: "Houston developed across a low Gulf Coast plain crossed by bayous, waterways that remain central to its urban geography. The Museum District gathers cultural and scientific institutions, while historic neighbourhoods record successive periods of the city's growth. Southeast of central Houston, Space Center Houston serves as the visitor centre for NASA's Johnson Space Center and interprets the history of human spaceflight.",
    highlights: ["Buffalo Bayou urban landscape", "Houston Museum District", "Historic Houston neighbourhoods", "Space Center Houston"],
    editorialProvenance: northAmericaBatch1SourceReferences([
      { title: "Houston Museum District — About", url: "https://houmuse.org/about/" },
      { title: "Space Center Houston — About Us", url: "https://spacecenter.org/about-us/" },
    ]),
  },
] as const satisfies readonly ExploreDestinationEditorial[];
