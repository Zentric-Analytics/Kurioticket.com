export type DemoHotelCatalogEntry = {
  id: string;
  name: string;
  areaLabel: string;
  nightlyPrice: number;
  currency: string;
  rating: number;
  reviewScore: number;
  reviewCount: number;
  imageUrls: string[];
  amenities: string[];
  roomType: string;
  cancellationInfo: string;
  taxesAndFeesIncluded: boolean;
  relatedIds: string[];
};

// Fictional demo inventory for the temporary Hotels product source. Prices and
// reviews are illustrative only; this catalogue exists to exercise the
// normalized Hotels UI contract. Future live providers should populate these
// same normalized fields from verified provider data.
export const demoHotelCatalog: DemoHotelCatalogEntry[] = [
  {
    id: "harborline-city",
    name: "Harborline City Hotel",
    areaLabel: "Central district",
    nightlyPrice: 139,
    currency: "USD",
    rating: 4.2,
    reviewScore: 8.4,
    reviewCount: 846,
    imageUrls: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85",
    ],
    amenities: ["Free Wi-Fi", "Late check-in", "Workspace", "Breakfast available"],
    roomType: "Flexible queen room",
    cancellationInfo: "Free cancellation before the demo cutoff window",
    taxesAndFeesIncluded: true,
    relatedIds: ["linen-house", "station-inn"],
  },
  { id: "linen-house", name: "Linen House Suites", areaLabel: "Museum district", nightlyPrice: 178, currency: "USD", rating: 4.7, reviewScore: 9.1, reviewCount: 512, imageUrls: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85"], amenities: ["Free Wi-Fi", "Quiet rooms", "Kitchenette", "24-hour desk"], roomType: "Studio suite", cancellationInfo: "Refundable demo rate with policy reviewed at checkout", taxesAndFeesIncluded: true, relatedIds: ["harborline-city", "gallery-court"] },
  { id: "station-inn", name: "Station Inn Express", areaLabel: "Airport corridor", nightlyPrice: 112, currency: "USD", rating: 3.8, reviewScore: 7.9, reviewCount: 1094, imageUrls: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85"], amenities: ["Airport shuttle", "Free Wi-Fi", "Late check-in"], roomType: "Standard double room", cancellationInfo: "Pay later demo option available", taxesAndFeesIncluded: false, relatedIds: ["harborline-city", "wayfarer-yard"] },
  { id: "riverside-loom", name: "Riverside Loom Hotel", areaLabel: "Riverside quarter", nightlyPrice: 164, currency: "USD", rating: 4.4, reviewScore: 8.7, reviewCount: 438, imageUrls: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85"], amenities: ["River-view lounge", "Free Wi-Fi", "Bike storage", "Breakfast available"], roomType: "King room", cancellationInfo: "Flexible cancellation window", taxesAndFeesIncluded: true, relatedIds: ["linen-house", "atlas-arcade"] },
  { id: "atlas-arcade", name: "Atlas Arcade Rooms", areaLabel: "Business district", nightlyPrice: 151, currency: "USD", rating: 4.0, reviewScore: 8.2, reviewCount: 679, imageUrls: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85"], amenities: ["Workspace", "Fitness room", "Free Wi-Fi", "Late check-in"], roomType: "Double business room", cancellationInfo: "Cancellation rules shown before demo booking", taxesAndFeesIncluded: false, relatedIds: ["riverside-loom", "station-inn"] },
  { id: "gallery-court", name: "Gallery Court Hotel", areaLabel: "Old town", nightlyPrice: 132, currency: "USD", rating: 4.1, reviewScore: 8.5, reviewCount: 371, imageUrls: ["https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85"], amenities: ["Breakfast available", "Free Wi-Fi", "Courtyard", "Concierge desk"], roomType: "Classic twin room", cancellationInfo: "Free cancellation before the demo cutoff window", taxesAndFeesIncluded: true, relatedIds: ["linen-house", "riverside-loom"] },
  { id: "wayfarer-yard", name: "Wayfarer Yard Hotel", areaLabel: "Waterfront", nightlyPrice: 189, currency: "USD", rating: 4.6, reviewScore: 9.0, reviewCount: 584, imageUrls: ["https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85"], amenities: ["Waterfront lounge", "Free Wi-Fi", "Breakfast available", "Fitness room"], roomType: "Superior king room", cancellationInfo: "Refundable demo rate with policy reviewed at checkout", taxesAndFeesIncluded: true, relatedIds: ["station-inn", "harborline-city"] },
];

export function getDemoHotelResultId(catalogueId: string): string {
  return `demo-catalog-${catalogueId}`;
}
