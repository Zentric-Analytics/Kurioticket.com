import { destinationImageCatalog } from "@/data/hotelDestinationCards";
import { hotelDestinations } from "@/data/hotelDestinations";

export const homepageHotelCountryDestinationIds = [
  "us-new-york",
  "gb-london",
  "fr-paris",
  "ae-dubai",
  "jp-tokyo",
  "mx-cancun",
  "it-rome",
  "sg-singapore",
] as const;

export const homepageHotelCountryCardLayout = [
  "md:col-span-1 lg:col-span-3 min-h-[260px] lg:min-h-[300px]",
  "md:col-span-1 lg:col-span-3 min-h-[250px] lg:min-h-[260px]",
  "md:col-span-1 lg:col-span-3 min-h-[280px] lg:min-h-[330px]",
  "md:col-span-1 lg:col-span-3 min-h-[250px] lg:min-h-[260px]",
  "md:col-span-1 lg:col-span-3 min-h-[250px] lg:min-h-[260px]",
  "md:col-span-1 lg:col-span-3 min-h-[280px] lg:min-h-[320px]",
  "md:col-span-1 lg:col-span-3 min-h-[250px] lg:min-h-[260px]",
  "md:col-span-1 lg:col-span-3 min-h-[260px] lg:min-h-[300px]",
] as const;

const hotelDestinationCardByQuery = new Map(
  destinationImageCatalog.map((card) => [card.destinationQuery, card]),
);

export const homepageHotelCountryCards = homepageHotelCountryDestinationIds.map((id) => {
  const destination = hotelDestinations.find((item) => item.id === id);

  if (!destination) {
    throw new Error(`Homepage hotel country destination is not approved: ${id}`);
  }

  const imageCard =
    hotelDestinationCardByQuery.get(destination.name) ??
    hotelDestinationCardByQuery.get(destination.name.replace("ú", "u"));

  if (!imageCard) {
    throw new Error(`Homepage hotel country destination is missing an approved image: ${id}`);
  }

  return {
    ...destination,
    image: imageCard.image,
    imageAlt: imageCard.imageAlt,
    enabled: true,
  };
});

export type HomepageHotelCountryCard = (typeof homepageHotelCountryCards)[number];
