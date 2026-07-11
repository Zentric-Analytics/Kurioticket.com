import { destinationImageCatalog } from "@/data/hotelDestinationCards";
import { hotelDestinations } from "@/data/hotelDestinations";

export type HomepageHotelCountryLayoutVariant =
  | "landscape"
  | "square"
  | "portraitSquare"
  | "compactPortrait";

export type HomepageHotelCountryCardDefinition = {
  id: (typeof homepageHotelCountryDestinationIds)[number];
  countryCode: string;
  countryDisplayLabelKey: string;
  representativeCity: string;
  searchValue: string;
  image: string;
  imageAlt: string;
  layoutVariant: HomepageHotelCountryLayoutVariant;
  enabled: boolean;
};

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

export const homepageHotelCountryLayoutClasses: Record<
  HomepageHotelCountryLayoutVariant,
  string
> = {
  landscape:
    "min-h-[230px] md:min-h-[250px] lg:col-span-4 lg:min-h-[286px]",
  square:
    "min-h-[230px] md:min-h-[250px] lg:col-span-3 lg:min-h-[286px]",
  portraitSquare:
    "min-h-[240px] md:min-h-[270px] lg:col-span-3 lg:min-h-[318px]",
  compactPortrait:
    "min-h-[230px] md:min-h-[260px] lg:col-span-2 lg:min-h-[286px]",
} as const;

export const homepageHotelCountryCardLayout = [
  homepageHotelCountryLayoutClasses.landscape,
  homepageHotelCountryLayoutClasses.square,
  homepageHotelCountryLayoutClasses.portraitSquare,
  homepageHotelCountryLayoutClasses.compactPortrait,
  homepageHotelCountryLayoutClasses.square,
  homepageHotelCountryLayoutClasses.landscape,
  homepageHotelCountryLayoutClasses.landscape,
  homepageHotelCountryLayoutClasses.compactPortrait,
] as const;

const homepageHotelCountryLayoutVariants = [
  "landscape",
  "square",
  "portraitSquare",
  "compactPortrait",
  "square",
  "landscape",
  "landscape",
  "compactPortrait",
] as const satisfies readonly HomepageHotelCountryLayoutVariant[];

const countryDisplayLabelKeys: Record<
  (typeof homepageHotelCountryDestinationIds)[number],
  string
> = {
  "us-new-york": "homeHotelDestinationsCountry.unitedStates",
  "gb-london": "homeHotelDestinationsCountry.uk",
  "fr-paris": "homeHotelDestinationsCountry.france",
  "ae-dubai": "homeHotelDestinationsCountry.uae",
  "jp-tokyo": "homeHotelDestinationsCountry.japan",
  "mx-cancun": "homeHotelDestinationsCountry.mexico",
  "it-rome": "homeHotelDestinationsCountry.italy",
  "sg-singapore": "homeHotelDestinationsCountry.singapore",
};

const hotelDestinationCardByQuery = new Map(
  destinationImageCatalog.map((card) => [card.destinationQuery, card]),
);

export const homepageHotelCountryCards = homepageHotelCountryDestinationIds.map(
  (id, index) => {
    const destination = hotelDestinations.find((item) => item.id === id);

    if (!destination) {
      throw new Error(`Homepage hotel country destination is not approved: ${id}`);
    }

    const imageCard =
      hotelDestinationCardByQuery.get(destination.name) ??
      hotelDestinationCardByQuery.get(destination.name.replace("ú", "u"));

    if (!imageCard) {
      throw new Error(
        `Homepage hotel country destination is missing an approved image: ${id}`,
      );
    }

    return {
      id,
      name: destination.name,
      country: destination.country,
      countryCode: destination.countryCode,
      countryDisplayLabelKey: countryDisplayLabelKeys[id],
      representativeCity: destination.name,
      searchValue: destination.searchValue,
      image: imageCard.image,
      imageAlt: imageCard.imageAlt,
      layoutVariant: homepageHotelCountryLayoutVariants[index],
      enabled: true,
    } satisfies HomepageHotelCountryCardDefinition & {
      name: string;
      country: string;
    };
  },
);

export type HomepageHotelCountryCard = (typeof homepageHotelCountryCards)[number];
