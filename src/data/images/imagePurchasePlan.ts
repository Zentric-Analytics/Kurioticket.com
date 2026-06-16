import { imageInventory } from "./imageInventory";
import type { ImageDimensions, ImageUsage, ImageVendor, InventoriedImage } from "./imageTypes";

export type ImagePurchaseCategory = {
  id: string;
  label: string;
  productionPriority: InventoriedImage["productionPriority"];
  products: InventoriedImage["product"][];
  usages: ImageUsage[];
  pageSurfaces: string[];
  candidateCount: number;
  firstBatchTarget: number;
  rationale: string;
};

export type ImagePurchaseBatch = "A" | "B" | "C";
export type ImagePurchaseApprovalStatus = "shopping-needed" | "purchased-pending-crops";
export type ImagePurchaseSourceType = "premium-stock" | "owned" | "provider";
export type ImagePurchaseVendor = ImageVendor;

export type PremiumImagePurchaseEntry = {
  id: string;
  title: string;
  product: InventoriedImage["product"];
  usage: ImageUsage;
  priority: InventoriedImage["productionPriority"];
  targetSurface: string;
  replacementTargetIds: string[];
  destination?: string;
  country?: string;
  region?: string;
  imageBrief: string;
  mustHave: string[];
  mustAvoid: string[];
  preferredComposition: string;
  mobileCropRequirement: string;
  desktopCropRequirement: string;
  recommendedAspectRatios: string[];
  preferredSourceType: ImagePurchaseSourceType;
  acceptableVendors: ImagePurchaseVendor[];
  licenseRequirement: string;
  launchCritical: boolean;
  approvalStatus: ImagePurchaseApprovalStatus;
  purchasedAssetPath?: string;
  sourcePage?: string;
  vendor?: ImagePurchaseVendor;
  license?: string;
  collection?: string;
  stockFileId?: string;
  dimensions?: ImageDimensions;
  cropApprovalNotes?: string;
  buyingBatch: ImagePurchaseBatch;
  notes: string;
};

export type PurchasedPremiumImageAsset = {
  id: string;
  title: string;
  runtimePath: string;
  vendor: ImagePurchaseVendor;
  license: string;
  collection: string;
  stockFileId: string;
  dimensions: ImageDimensions;
  sourcePage: string;
  intendedUse: string;
  registrySlot?: string;
  approvalStatus: Extract<ImagePurchaseApprovalStatus, "purchased-pending-crops">;
  cropApprovalNotes: string;
};

const premiumCandidates = imageInventory.filter((image) => image.premiumReplacementRequired);
const standardVendors: ImagePurchaseVendor[] = ["iStock", "Adobe Stock", "Shutterstock", "Getty/iStock"];
const standardLicenseRequirement =
  "Commercial web and mobile-web license covering Kurioticket marketing, metasearch UI, paid acquisition landing pages, email crops, worldwide use, and retained receipt/license records.";
const purchasedPendingCropApprovalNotes =
  "Purchased full-size asset; final desktop and mobile crop approval pending staging crop QA.";

type PurchaseEntryInput = Omit<
  PremiumImagePurchaseEntry,
  "acceptableVendors" | "approvalStatus" | "preferredSourceType" | "licenseRequirement"
> &
  Partial<Pick<PremiumImagePurchaseEntry, "approvalStatus">>;

function purchaseEntry(entry: PurchaseEntryInput): PremiumImagePurchaseEntry {
  return {
    ...entry,
    preferredSourceType: "premium-stock",
    acceptableVendors: [...standardVendors],
    licenseRequirement: standardLicenseRequirement,
    approvalStatus: entry.approvalStatus ?? "shopping-needed",
  };
}

export const phase4aPurchasedPremiumFlightAssets: PurchasedPremiumImageAsset[] = [
  {
    id: "phase-3-002-global-flight-search-hero",
    title: "Global flights brand hero - airport departure confidence",
    runtimePath: "/images/premium/flights/kurioticket-flight-hero-airplane-terminal-sunset-001.jpg",
    vendor: "iStock",
    license: "Standard",
    collection: "Essentials",
    stockFileId: "1218436213",
    dimensions: "2047 x 1365",
    sourcePage:
      "https://www.istockphoto.com/photo/modern-passenger-airplane-parked-to-terminal-building-gate-at-airside-apron-of-gm1218436213-356036421",
    intendedUse: "Primary Flights hero / global flight search hero",
    registrySlot: "phase-3-002-global-flight-search-hero",
    approvalStatus: "purchased-pending-crops",
    cropApprovalNotes: purchasedPendingCropApprovalNotes,
  },
  {
    id: "premium-flight-support-aircraft-gangway-terminal-istock-1470585865",
    title: "Secondary flight support image - aircraft at terminal gangway",
    runtimePath: "/images/premium/flights/kurioticket-flight-support-aircraft-gangway-terminal-002.jpg",
    vendor: "iStock",
    license: "Standard",
    collection: "Essentials",
    stockFileId: "1470585865",
    dimensions: "2047 x 1365",
    sourcePage:
      "https://www.istockphoto.com/photo/aircraft-is-attached-to-the-terminal-gangway-of-the-airport-building-preparation-for-gm1470585865-501392082",
    intendedUse: "Secondary flight support image",
    registrySlot: "premium-flight-support-aircraft-gangway-terminal-istock-1470585865",
    approvalStatus: "purchased-pending-crops",
    cropApprovalNotes: purchasedPendingCropApprovalNotes,
  },
];

const categoryDefinitions: Array<Omit<ImagePurchaseCategory, "pageSurfaces" | "candidateCount">> = [
  {
    id: "phase-3-homepage-flight-discovery",
    label: "Homepage flight discovery and route inspiration",
    productionPriority: "p0-launch-critical",
    products: ["flights"],
    usages: ["flight-inspiration-card"],
    firstBatchTarget: 18,
    rationale:
      "Homepage fare discovery cards are high-trust acquisition surfaces and should receive the first premium destination/route set.",
  },
  {
    id: "phase-3-market-home-destinations",
    label: "Market homepage destination modules",
    productionPriority: "p0-launch-critical",
    products: ["destinations"],
    usages: ["homepage-destination-card"],
    firstBatchTarget: 18,
    rationale:
      "Localized home modules repeat across markets and should use premium images for the top global cities before broad launch.",
  },
  {
    id: "phase-3-hotels-landing-destinations",
    label: "Hotels landing destination cards",
    productionPriority: "p0-launch-critical",
    products: ["hotels", "destinations"],
    usages: ["hotel-destination-card"],
    firstBatchTarget: 10,
    rationale:
      "Hotels landing destination cards should carry premium city or resort imagery without implying specific property facts.",
  },
  {
    id: "phase-3-hotel-fallbacks",
    label: "Hotel result fallback pool",
    productionPriority: "p0-launch-critical",
    products: ["hotels"],
    usages: ["hotel-result-fallback"],
    firstBatchTarget: 10,
    rationale:
      "Fallback hotel imagery must stay generic, premium, and non-misleading whenever provider-real property images are unavailable.",
  },
  {
    id: "phase-3-cars-landing",
    label: "Cars landing discovery and pickup cards",
    productionPriority: "p0-launch-critical",
    products: ["cars"],
    usages: ["car-trip-style-card", "car-pickup-card"],
    firstBatchTarget: 6,
    rationale:
      "Cars landing imagery needs owned or premium generic mobility visuals that do not imply specific rental inventory, pricing, or availability.",
  },
  {
    id: "phase-3-destination-index",
    label: "Destination index cards",
    productionPriority: "p1-public-important",
    products: ["destinations"],
    usages: ["destination-page-card"],
    firstBatchTarget: 12,
    rationale:
      "The public destination index is a browsing and SEO surface that should move from free stock to curated premium city imagery.",
  },
  {
    id: "phase-3-deals-and-flight-results",
    label: "Deals and flight result support cards",
    productionPriority: "p1-public-important",
    products: ["deals", "flights"],
    usages: ["deal-card", "flight-route-card"],
    firstBatchTarget: 6,
    rationale:
      "Deals and result-page inspiration cards are important public surfaces but can follow the homepage and hotel fallback sets.",
  },
];

export const phase3ImagePurchasePlan: ImagePurchaseCategory[] = categoryDefinitions.map((category) => {
  const matches = premiumCandidates.filter(
    (image) =>
      image.productionPriority === category.productionPriority &&
      category.products.includes(image.product) &&
      category.usages.some((usage) => (Array.isArray(image.usage) ? image.usage.includes(usage) : image.usage === usage)),
  );

  return {
    ...category,
    products: [...category.products],
    usages: [...category.usages],
    pageSurfaces: [...new Set(matches.flatMap((image) => image.pageSurfaces))].sort(),
    candidateCount: matches.length,
  };
});

export const phase3FirstSixtyPurchaseList: PremiumImagePurchaseEntry[] = [
  purchaseEntry({
    id: "phase-3-001-global-homepage-hero",
    title: "Global homepage hero — premium travel planning moment",
    product: "global",
    usage: "homepage-hero",
    priority: "p0-launch-critical",
    targetSurface: "Homepage hero",
    replacementTargetIds: ["homepage-hero-hotel-terrace-unsplash"],
    region: "Global",
    imageBrief:
      "Premium wide travel-planning hero with a real traveler overlooking a recognizable but non-exclusive city or waterfront scene, warm natural light, and clean negative space for homepage search UI overlays.",
    mustHave: ["Authentic human scale", "Premium global travel tone", "Generous left and center negative space"],
    mustAvoid: ["Fake booking screens", "Visible third-party brands", "Specific hotel property claims", "AI-generated landmarks"],
    preferredComposition: "Wide environmental scene with focal subject in the right third and calm negative space for copy/search modules.",
    mobileCropRequirement: "Subject and destination cue must remain legible in a centered 4:5 crop without cutting faces or skyline.",
    desktopCropRequirement: "Must support a 16:9 and 21:9 hero crop with overlay-safe space across the left half.",
    recommendedAspectRatios: ["21:9", "16:9", "4:5"],
    launchCritical: true,
    approvalStatus: "purchased-pending-crops",
    purchasedAssetPath: "/images/premium/homepage/kurioticket-homepage-hero-businesswoman-modern-city-luggage-001.jpg",
    sourcePage:
      "https://www.istockphoto.com/photo/businesswoman-arriving-in-a-modern-city-with-rolling-luggage-gm2236043419-651355204?searchscope=image%2Cfilm",
    vendor: "iStock",
    license: "Standard",
    collection: "Essentials",
    stockFileId: "2236043419",
    dimensions: "2047 x 1380",
    cropApprovalNotes: purchasedPendingCropApprovalNotes,
    buyingBatch: "A",
    notes:
      "Purchased iStock asset is stored locally for future homepage hero replacement; final desktop/mobile crop approval remains pending staging QA, and no live UI replacement happens in this PR.",
  }),
  purchaseEntry({
    id: "phase-3-002-global-flight-search-hero",
    title: "Global flights brand hero — airport departure confidence",
    product: "global",
    usage: "homepage-hero",
    priority: "p0-launch-critical",
    targetSurface: "Homepage flight search hero/brand fallback",
    replacementTargetIds: ["inventory-data-homediscovery-ts-flights-marketing-photoid"],
    region: "Global",
    imageBrief: "Premium airport or aircraft-window travel scene that communicates confident flight search without showing a specific airline, fare, route, gate number, or availability claim.",
    mustHave: ["Clean airport or aircraft context", "Aspirational but realistic lighting", "No airline dependency"],
    mustAvoid: ["Readable airline logos", "Boarding passes with personal data", "Price or availability graphics"],
    preferredComposition: "Traveler or aircraft detail offset to one side with uncluttered space for interface overlays.",
    mobileCropRequirement: "Must retain the travel cue in a tight portrait crop without relying on tiny text.",
    desktopCropRequirement: "Must remain calm behind search UI at 16:9 and 21:9.",
    recommendedAspectRatios: ["21:9", "16:9", "4:5"],
    launchCritical: true,
    approvalStatus: "purchased-pending-crops",
    purchasedAssetPath: "/images/premium/flights/kurioticket-flight-hero-airplane-terminal-sunset-001.jpg",
    sourcePage:
      "https://www.istockphoto.com/photo/modern-passenger-airplane-parked-to-terminal-building-gate-at-airside-apron-of-gm1218436213-356036421",
    vendor: "iStock",
    license: "Standard",
    collection: "Essentials",
    stockFileId: "1218436213",
    dimensions: "2047 x 1365",
    cropApprovalNotes: purchasedPendingCropApprovalNotes,
    buyingBatch: "A",
    notes:
      "Purchased iStock asset is stored locally for Phase 4A governance; final desktop/mobile crop approval remains pending staging QA, and no URL replacement happens in this PR.",
  }),
  purchaseEntry({
    id: "phase-3-003-global-hotel-search-hero",
    title: "Global hotels brand hero — generic premium stay",
    product: "global",
    usage: "homepage-hero",
    priority: "p0-launch-critical",
    targetSurface: "Hotels landing/search hero support",
    replacementTargetIds: ["homepage-hero-hotel-terrace-unsplash", "hotel-fallback-resort-unsplash"],
    region: "Global",
    imageBrief: "Premium generic lodging atmosphere such as a lobby, terrace, or exterior arrival scene that feels upscale while clearly not representing a specific listed hotel property.",
    mustHave: ["Generic hospitality context", "No unique property identifiers", "Warm trustworthy mood"],
    mustAvoid: ["Recognizable hotel brand marks", "Room numbers", "Amenity claims for a specific property"],
    preferredComposition: "Architectural or lifestyle scene with broad crop flexibility and no critical detail on edges.",
    mobileCropRequirement: "Portrait crop must not imply a specific room or amenity entitlement.",
    desktopCropRequirement: "Wide crop should preserve premium atmosphere with room for copy/search UI.",
    recommendedAspectRatios: ["16:9", "3:2", "4:5"],
    launchCritical: true,
    buyingBatch: "A",
    notes: "Can inform the Phase 4 hotel fallback art direction but must remain generic.",
  }),
  purchaseEntry({
    id: "phase-3-004-global-destination-grid-hero",
    title: "Global destination discovery hero — world city collage alternative",
    product: "global",
    usage: "homepage-hero",
    priority: "p0-launch-critical",
    targetSurface: "Homepage and destination discovery brand support",
    replacementTargetIds: ["inventory-app-destinations-destinationcard-tsx-destinations-fallback-only-1500530855697-b586d89ba3ee"],
    region: "Global",
    imageBrief: "Premium single-frame destination discovery scene with diverse travelers or layered city/coast context that can support global destination browsing without pointing to one paid provider.",
    mustHave: ["Broad global appeal", "Authentic destination context", "Flexible crop"],
    mustAvoid: ["Over-touristed cliché-only framing", "Composite or AI-looking landmarks", "Provider logos"],
    preferredComposition: "Balanced scene with a strong mid-ground and clean upper area for overlays.",
    mobileCropRequirement: "Destination cue must remain recognizable at 4:5 and 1:1.",
    desktopCropRequirement: "Must work as a wide hero or large destination-card fallback.",
    recommendedAspectRatios: ["16:9", "3:2", "1:1", "4:5"],
    launchCritical: true,
    buyingBatch: "A",
    notes: "Global fallback for destination discovery when city-specific art is not yet purchased.",
  }),
  purchaseEntry({
    id: "phase-3-005-global-deals-hero",
    title: "Global deals brand hero — flexible getaway",
    product: "global",
    usage: "deal-card",
    priority: "p1-public-important",
    targetSurface: "Deals page hero/card support",
    replacementTargetIds: ["inventory-app-deals-page-tsx-deals-marketing-1464037866556-6812c9d1c72e"],
    region: "Global",
    imageBrief: "Premium flexible-getaway image that suggests discovery and value without showing fake prices, coupon language, fare calendars, or provider inventory.",
    mustHave: ["Optimistic travel value mood", "Usable card crop", "No price claims"],
    mustAvoid: ["Sale tags", "Fake booking UI", "Airline/hotel logos", "Unreadable clutter"],
    preferredComposition: "Simple lifestyle or destination scene with strong color and space for deal labels.",
    mobileCropRequirement: "Must work in a square or 4:5 card crop with no tiny-text dependency.",
    desktopCropRequirement: "Must support 16:9 card layouts and larger promotional tiles.",
    recommendedAspectRatios: ["16:9", "4:3", "1:1", "4:5"],
    launchCritical: false,
    buyingBatch: "A",
    notes: "Support image for the P1 deals surface; no pricing or availability should be implied.",
  }),
  purchaseEntry({
    id: "phase-3-006-global-cars-hero",
    title: "Global cars brand hero — generic rental mobility",
    product: "global",
    usage: "car-trip-style-card",
    priority: "p0-launch-critical",
    targetSurface: "Cars landing hero/discovery support",
    replacementTargetIds: ["cars-economy-city-unsplash", "cars-airport-pickup-unsplash"],
    region: "Global",
    imageBrief: "Premium generic rental-car journey image with a clean vehicle or travel road context that does not imply a specific supplier, vehicle class availability, price, or included amenity.",
    mustHave: ["Generic modern mobility context", "No supplier branding", "Clean premium lighting"],
    mustAvoid: ["License plates as focal point", "Rental company logos", "Specific model availability claims"],
    preferredComposition: "Vehicle or road subject offset with safe crop margins for card labels.",
    mobileCropRequirement: "Vehicle/travel cue must remain readable in 4:5 without cutting the car awkwardly.",
    desktopCropRequirement: "Must support wide cards and possible hero crop without UI collision.",
    recommendedAspectRatios: ["16:9", "3:2", "4:5"],
    launchCritical: true,
    buyingBatch: "A",
    notes: "Brand-level cars art direction; Phase 4 should keep provider and availability behavior untouched.",
  }),
  ...[
    ["phase-3-007-home-destination-new-york", "New York", "United States", "North America", "homepage-destination-new-york-pexels", "premium skyline and street-level New York scene with recognizable Manhattan context"],
    ["phase-3-008-home-destination-london", "London", "United Kingdom", "Europe", "homepage-destination-london-pexels", "premium London city scene with Thames, bridge, or historic skyline context"],
    ["phase-3-009-home-destination-paris", "Paris", "France", "Europe", "homepage-destination-paris-pexels", "premium Paris scene with Eiffel Tower or Seine context, elegant but not over-filtered"],
    ["phase-3-010-home-destination-dubai", "Dubai", "United Arab Emirates", "Middle East", "homepage-destination-dubai-pexels", "premium Dubai skyline scene with Burj Khalifa context and clean modern light"],
    ["phase-3-011-home-destination-miami", "Miami", "United States", "North America", "homepage-destination-miami-unsplash", "premium Miami beach or Art Deco district scene with palms and coastal energy"],
    ["phase-3-012-home-destination-las-vegas", "Las Vegas", "United States", "North America", "homepage-destination-las-vegas-unsplash", "premium Las Vegas Strip night scene with clean lights and no casino-brand focus"],
    ["phase-3-013-home-destination-los-angeles", "Los Angeles", "United States", "North America", "homepage-destination-los-angeles-unsplash", "premium Los Angeles skyline, palms, or coastal city scene in warm light"],
    ["phase-3-014-home-destination-johannesburg", "Johannesburg", "South Africa", "Africa", "inventory-data-markethomecontent-ts-destinations-marketing-1604633193983-5ad0f0f9d4f8", "premium Johannesburg skyline or urban culture scene with golden-hour credibility"],
    ["phase-3-015-home-destination-accra", "Accra", "Ghana", "Africa", "inventory-data-markethomecontent-ts-destinations-marketing-1509099836639-18ba1795216d", "premium Accra coastal or city lifestyle scene with authentic West Africa context"],
    ["phase-3-016-home-destination-nairobi", "Nairobi", "Kenya", "Africa", "inventory-data-markethomecontent-ts-destinations-marketing-1611348586804-61bf6c080437", "premium Nairobi skyline or national-park-adjacent city scene with truthful context"],
    ["phase-3-017-home-destination-istanbul", "Istanbul", "Türkiye", "Europe/Asia", "inventory-data-markethomecontent-ts-destinations-marketing-1541432901042-2d8bd64b4a9b", "premium Istanbul waterfront scene with domes, minarets, or Bosphorus context"],
    ["phase-3-018-home-destination-zanzibar", "Zanzibar", "Tanzania", "Africa", "inventory-data-markethomecontent-ts-destinations-marketing-1586861635167-e5223aadc9fe", "premium Zanzibar beach or Stone Town scene with natural color and no resort-specific promise"],
    ["phase-3-019-home-destination-toronto", "Toronto", "Canada", "North America", "hotel-destination-toronto-unsplash", "premium Toronto skyline with CN Tower and lake or downtown context"],
    ["phase-3-020-home-destination-singapore", "Singapore", "Singapore", "Asia", "inventory-data-markethomecontent-ts-destinations-marketing-1525625293386-3f8f99389edd", "premium Singapore skyline or Marina Bay scene with polished metasearch quality"],
    ["phase-3-021-home-destination-bangkok", "Bangkok", "Thailand", "Asia", "inventory-data-markethomecontent-ts-destinations-marketing-1508009603885-50cf7c579365", "premium Bangkok skyline, river, or temple-adjacent city scene with real destination context"],
    ["phase-3-022-home-destination-cancun", "Cancun", "Mexico", "North America", "inventory-data-markethomecontent-ts-destinations-marketing-1552074284-5e88ef1aef18", "premium Cancun beach scene with turquoise water and no specific resort implication"],
    ["phase-3-023-home-destination-amsterdam", "Amsterdam", "Netherlands", "Europe", "inventory-data-markethomecontent-ts-destinations-marketing-1512470876302-972faa2aa9a4", "premium Amsterdam canal scene with bridge, bikes, or house fronts preserved"],
    ["phase-3-024-home-destination-barcelona", "Barcelona", "Spain", "Europe", "inventory-data-markethomecontent-ts-destinations-marketing-1583422409516-2895a77efded", "premium Barcelona city scene with Sagrada Familia or Eixample context"],
  ].map(([id, destination, country, region, targetId, brief], index) =>
    purchaseEntry({
      id,
      title: `Homepage destination card — ${destination}`,
      product: "destinations",
      usage: "homepage-destination-card",
      priority: "p0-launch-critical",
      targetSurface: "Homepage/market destination cards",
      replacementTargetIds: [targetId],
      destination,
      country,
      region,
      imageBrief: `${brief}; should feel premium, current, and trustworthy for a global travel metasearch homepage card.`,
      mustHave: ["Recognizable destination cue", "Premium natural color", "No misleading property or provider claim"],
      mustAvoid: ["Oversaturated postcard look", "Crowd-heavy closeups", "Visible booking/provider branding", "AI-looking landmark distortions"],
      preferredComposition: "Landmark or skyline context centered with safe edges for rounded card crops and overlay text.",
      mobileCropRequirement: "Must keep the primary landmark or destination cue readable in a 4:5 crop.",
      desktopCropRequirement: "Must support 16:9 and 3:2 card crops without cutting the main skyline or landmark.",
      recommendedAspectRatios: ["16:9", "3:2", "4:5", "1:1"],
      launchCritical: true,
      buyingBatch: index < 10 ? "A" : "B",
      notes: "Purchase as a reusable premium destination-card asset; do not replace the current URL until Phase 4.",
    }),
  ),
  ...[
    ["phase-3-025-hotel-destination-tokyo", "Tokyo", "Japan", "Asia", "hotel-destination-tokyo-pexels", "premium Tokyo skyline or neighborhood arrival scene for hotel browsing"],
    ["phase-3-026-hotel-destination-rome", "Rome", "Italy", "Europe", "hotel-destination-rome-pexels", "premium Rome historic city scene with Colosseum or streetscape context"],
    ["phase-3-027-hotel-destination-singapore", "Singapore", "Singapore", "Asia", "hotel-destination-singapore-unsplash", "premium Singapore hotel-market destination scene with skyline polish"],
    ["phase-3-028-hotel-destination-barcelona", "Barcelona", "Spain", "Europe", "hotel-destination-barcelona-unsplash", "premium Barcelona hotel-market destination scene with warm city architecture"],
    ["phase-3-029-hotel-destination-toronto", "Toronto", "Canada", "North America", "hotel-destination-toronto-unsplash", "premium Toronto hotel-market destination scene with skyline and lake context"],
    ["phase-3-030-hotel-destination-amsterdam", "Amsterdam", "Netherlands", "Europe", "hotel-destination-amsterdam-unsplash", "premium Amsterdam canal hotel-market scene with bridge and house-front detail"],
    ["phase-3-031-hotel-destination-bangkok", "Bangkok", "Thailand", "Asia", "hotel-destination-bangkok-unsplash", "premium Bangkok hotel-market scene with river skyline or elevated city view"],
    ["phase-3-032-hotel-destination-cancun", "Cancun", "Mexico", "North America", "hotel-destination-cancun-unsplash", "premium Cancun hotel-market beach scene that avoids resort-specific promises"],
    ["phase-3-033-hotel-destination-istanbul", "Istanbul", "Türkiye", "Europe/Asia", "hotel-destination-istanbul-unsplash", "premium Istanbul hotel-market waterfront scene with cultural skyline cues"],
    ["phase-3-034-hotel-destination-london", "London", "United Kingdom", "Europe", "homepage-destination-london-pexels", "premium London hotel-market scene suitable for stays discovery"],
  ].map(([id, destination, country, region, targetId, brief], index) =>
    purchaseEntry({
      id,
      title: `Hotels landing destination card — ${destination}`,
      product: "hotels",
      usage: "hotel-destination-card",
      priority: "p0-launch-critical",
      targetSurface: "Hotels landing destination cards",
      replacementTargetIds: [targetId],
      destination,
      country,
      region,
      imageBrief: `${brief}; should sell the destination for hotel search without implying a specific listed property, room, amenity, rating, or availability.`,
      mustHave: ["Destination-level hotel browsing relevance", "Recognizable city/resort context", "No property-specific claim"],
      mustAvoid: ["Specific hotel signage", "Room or pool shots tied to one property", "Supplier logos", "Fake ratings or prices"],
      preferredComposition: "City or resort destination context with enough breathing room for compact hotel landing cards.",
      mobileCropRequirement: "Must remain recognizable in a 4:5 card crop and avoid implying a bookable property amenity.",
      desktopCropRequirement: "Must support 16:9 and 3:2 destination card crops with landmark/context intact.",
      recommendedAspectRatios: ["16:9", "3:2", "4:5", "1:1"],
      launchCritical: true,
      buyingBatch: index < 4 ? "A" : "B",
      notes: "Hotels destination purchase; Phase 4 must keep hotel provider imagery separate from generic marketing imagery.",
    }),
  ),
  ...[
    ["phase-3-035-flight-inspiration-new-york", "New York route inspiration", "New York", "United States", "North America", "homepage-destination-new-york-pexels"],
    ["phase-3-036-flight-inspiration-london", "London route inspiration", "London", "United Kingdom", "Europe", "homepage-destination-london-pexels"],
    ["phase-3-037-flight-inspiration-paris", "Paris route inspiration", "Paris", "France", "Europe", "inventory-data-homediscovery-ts-flights-marketing-2082103"],
    ["phase-3-038-flight-inspiration-dubai", "Dubai route inspiration", "Dubai", "United Arab Emirates", "Middle East", "homepage-destination-dubai-pexels"],
    ["phase-3-039-flight-inspiration-tokyo", "Tokyo route inspiration", "Tokyo", "Japan", "Asia", "hotel-destination-tokyo-pexels"],
    ["phase-3-040-flight-inspiration-rome", "Rome route inspiration", "Rome", "Italy", "Europe", "hotel-destination-rome-pexels"],
    ["phase-3-041-flight-route-bali", "Bali flight result route card", "Bali", "Indonesia", "Asia", "inventory-components-results-flightresultsclient-tsx-flights-fallback-only-1537953773345-d172ccf13cf1"],
    ["phase-3-042-flight-route-cancun", "Cancun flight result route card", "Cancun", "Mexico", "North America", "inventory-components-results-flightresultsclient-tsx-flights-fallback-only-1552074284-5e88ef1aef18"],
    ["phase-3-043-flight-route-santorini", "Santorini flight result route card", "Santorini", "Greece", "Europe", "inventory-components-results-flightresultsclient-tsx-flights-fallback-only-1507525428034-b723cf961d3e"],
    ["phase-3-044-flight-route-dubai", "Dubai flight result route card", "Dubai", "United Arab Emirates", "Middle East", "inventory-components-results-flightresultsclient-tsx-flights-fallback-only-1518509562904-e7ef99cdcc86"],
  ].map(([id, title, destination, country, region, targetId], index) =>
    purchaseEntry({
      id,
      title: `Flight ${title}`,
      product: "flights",
      usage: index < 6 ? "flight-inspiration-card" : "flight-route-card",
      priority: index < 6 ? "p0-launch-critical" : "p1-public-important",
      targetSurface: index < 6 ? "Homepage discovery fares" : "Flight results route inspiration cards",
      replacementTargetIds: [targetId],
      destination,
      country,
      region,
      imageBrief: `Premium destination-led flight inspiration image for ${destination}, showing a truthful destination cue rather than an airline, aircraft, fare, or availability claim.`,
      mustHave: ["Destination recognizable at card size", "Aspirational travel intent", "No airline or fare claim"],
      mustAvoid: ["Airline logos", "Fake boarding passes", "Price graphics", "Overcrowded terminal scenes"],
      preferredComposition: "Clean destination scene that can sit behind compact route/fare text while keeping the focal landmark visible.",
      mobileCropRequirement: "Must preserve the main destination cue in a square or 4:5 crop.",
      desktopCropRequirement: "Must support 16:9 route cards and compact horizontal inspiration cards.",
      recommendedAspectRatios: ["16:9", "4:3", "1:1", "4:5"],
      launchCritical: index < 6,
      buyingBatch: index < 6 ? "B" : "C",
      notes: "Flight image should inspire route discovery only; Phase 4 must not alter search, pricing, or provider behavior.",
    }),
  ),
  ...[
    ["phase-3-045-hotel-fallback-resort-exterior", "Generic premium resort exterior", "hotel-fallback-resort-unsplash"],
    ["phase-3-046-hotel-fallback-city-lobby", "Generic city hotel lobby", "hotel-fallback-city-unsplash"],
    ["phase-3-047-hotel-fallback-pool-atmosphere", "Generic pool atmosphere", "hotel-fallback-pool-unsplash"],
    ["phase-3-048-hotel-fallback-suite-detail", "Generic suite detail", "hotel-fallback-suite-unsplash"],
    ["phase-3-049-hotel-fallback-room-neutral", "Generic neutral guest room", "hotel-fallback-room-unsplash"],
    ["phase-3-050-hotel-fallback-boutique-exterior", "Generic boutique hotel exterior", "inventory-components-results-hotelcard-tsx-hotels-fallback-only-1445019980597-93fa8acb246c"],
    ["phase-3-051-hotel-fallback-breakfast-lounge", "Generic breakfast or lounge atmosphere", "inventory-components-results-hotelcard-tsx-hotels-fallback-only-1542314831-068cd1dbfeeb"],
    ["phase-3-052-hotel-fallback-family-stay", "Generic family-friendly stay atmosphere", "inventory-components-results-hotelcard-tsx-hotels-fallback-only-1551882547-ff40c63fe5fa"],
    ["phase-3-053-hotel-fallback-business-stay", "Generic business-travel hotel atmosphere", "inventory-components-results-hotelcard-tsx-hotels-fallback-only-1564501049412-61c2a3083791"],
    ["phase-3-054-hotel-fallback-apartment-stay", "Generic apartment-style stay atmosphere", "inventory-components-results-hotelcard-tsx-hotels-fallback-only-1582719508461-905c673771fd"],
  ].map(([id, title, targetId]) =>
    purchaseEntry({
      id,
      title: `Hotel fallback/result pool — ${title}`,
      product: "hotels",
      usage: "hotel-result-fallback",
      priority: "p0-launch-critical",
      targetSurface: "Hotel fallback/result pool",
      replacementTargetIds: [targetId],
      region: "Global",
      imageBrief: `${title} image for use only when provider-real property imagery is missing; must feel premium while remaining explicitly generic and non-property-specific.`,
      mustHave: ["Generic hospitality context", "Premium but neutral tone", "No identifiable hotel brand"],
      mustAvoid: ["Specific hotel exterior signage", "Distinctive room/amenity promises", "Visible ratings, prices, or booking UI", "People as primary focus"],
      preferredComposition: "Neutral hospitality scene with center-safe focal point and no unique property-identifying details.",
      mobileCropRequirement: "Must still read as generic fallback imagery in a tight HotelCard crop.",
      desktopCropRequirement: "Must support horizontal HotelCard object-cover crop without implying exact property facts.",
      recommendedAspectRatios: ["16:9", "4:3", "3:2"],
      launchCritical: true,
      buyingBatch: "C",
      notes: "Fallback-only purchase. Provider-real hotel images must always take precedence when available.",
    }),
  ),
  ...[
    ["phase-3-055-cars-economy-city", "Economy city rental", "cars-economy-city-unsplash", "city street or compact car context"],
    ["phase-3-056-cars-suv-road", "SUV road trip", "cars-suv-road-unsplash", "SUV or road-trip context without model-specific availability"],
    ["phase-3-057-cars-luxury-arrival", "Luxury arrival", "cars-luxury-unsplash", "premium vehicle arrival detail with no badge emphasis"],
    ["phase-3-058-cars-van-family", "Van or family trip", "cars-van-road-unsplash", "family van or luggage-ready road-trip context"],
    ["phase-3-059-cars-airport-pickup", "Airport pickup", "cars-airport-pickup-unsplash", "airport curbside pickup context without rental supplier branding"],
    ["phase-3-060-cars-train-station-pickup", "Train station pickup", "cars-train-station-pickup-unsplash", "rail station or city pickup mobility context"],
  ].map(([id, title, targetId, brief]) =>
    purchaseEntry({
      id,
      title: `Cars landing image — ${title}`,
      product: "cars",
      usage: title.includes("pickup") || title.includes("Airport") || title.includes("Train") ? "car-pickup-card" : "car-trip-style-card",
      priority: "p0-launch-critical",
      targetSurface: "Cars landing trip style and pickup cards",
      replacementTargetIds: [targetId],
      region: "Global",
      imageBrief: `Premium ${brief} for cars landing discovery; should support car-rental shopping without implying a specific supplier, price, vehicle class inventory, or availability.`,
      mustHave: ["Generic rental mobility cue", "No supplier branding", "Clean premium crop"],
      mustAvoid: ["Readable license plates", "Rental company logos", "Specific car model promise", "Price or availability text"],
      preferredComposition: "Vehicle or pickup environment with safe negative space for card copy and no critical details at edges.",
      mobileCropRequirement: "Vehicle or pickup cue must remain visible in a 4:5 crop.",
      desktopCropRequirement: "Must support 16:9 and 3:2 landing-card crops without cutting the vehicle unnaturally.",
      recommendedAspectRatios: ["16:9", "3:2", "4:5"],
      launchCritical: true,
      buyingBatch: "C",
      notes: "Cars imagery must remain generic; Phase 4 must not change pricing, availability, redirects, or provider behavior.",
    }),
  ),
];

export const phase3FirstSixtyCandidateImages = phase3FirstSixtyPurchaseList;

export const phase3PurchaseBatchCounts = phase3FirstSixtyPurchaseList.reduce<Record<ImagePurchaseBatch, number>>(
  (counts, image) => {
    counts[image.buyingBatch] += 1;
    return counts;
  },
  { A: 0, B: 0, C: 0 },
);

export const phase3PurchaseProductUsageBreakdown = phase3FirstSixtyPurchaseList.reduce<Record<string, number>>((counts, image) => {
  const key = `${image.product} / ${image.usage}`;
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

export const phase3LaunchCriticalPurchaseCandidatesByProduct = phase3FirstSixtyPurchaseList.reduce<Record<string, number>>(
  (counts, image) => {
    if (!image.launchCritical) return counts;
    counts[image.product] = (counts[image.product] ?? 0) + 1;
    return counts;
  },
  {},
);

export const phase3TopTenHighestImpactPurchases = phase3FirstSixtyPurchaseList.slice(0, 10);
