import { translations as enTranslations } from "@/lib/i18n/en";
import {
  primaryHotelDestinationCards,
  type SharedHotelDestinationCard,
} from "@/shared/presentation/travelEntryPresentation";

export type HotelDestinationCard = SharedHotelDestinationCard;

export const hotelsHeroImage =
  "/images/premium/hotels/kurioticket-hotels-hero-bellboy-guest-arrival-lobby-001.jpg";

export const hotelDestinationCards: HotelDestinationCard[] = [
  ...primaryHotelDestinationCards,
];

export const moreHotelDestinationCards: HotelDestinationCard[] = [
  {
    canonicalDestinationId: "it-rome",
    title: enTranslations["hotelDestination.Rome.title"],
    subtitle: enTranslations["hotelDestination.Rome.subtitle"],
    destinationQuery: "Rome",
    image:
      "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: enTranslations["hotelDestination.Rome.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Rome.linkLabel"],
  },
  {
    canonicalDestinationId: "ae-dubai",
    title: enTranslations["hotelDestination.Dubai.title"],
    subtitle: enTranslations["hotelDestination.Dubai.subtitle"],
    destinationQuery: "Dubai",
    image:
      "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: enTranslations["hotelDestination.Dubai.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Dubai.linkLabel"],
  },
  {
    canonicalDestinationId: "sg-singapore",
    title: enTranslations["hotelDestination.Singapore.title"],
    subtitle: enTranslations["hotelDestination.Singapore.subtitle"],
    destinationQuery: "Singapore",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Singapore.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Singapore.linkLabel"],
  },
  {
    canonicalDestinationId: "es-barcelona",
    title: enTranslations["hotelDestination.Barcelona.title"],
    subtitle: enTranslations["hotelDestination.Barcelona.subtitle"],
    destinationQuery: "Barcelona",
    image:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Barcelona.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Barcelona.linkLabel"],
  },
];

export const globalHotelDestinationCards: HotelDestinationCard[] = [
  {
    canonicalDestinationId: "ca-toronto",
    title: enTranslations["hotelDestination.Toronto.title"],
    subtitle: enTranslations["hotelDestination.Toronto.subtitle"],
    destinationQuery: "Toronto",
    image:
      "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Toronto.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Toronto.linkLabel"],
  },
  {
    canonicalDestinationId: "nl-amsterdam",
    title: enTranslations["hotelDestination.Amsterdam.title"],
    subtitle: enTranslations["hotelDestination.Amsterdam.subtitle"],
    destinationQuery: "Amsterdam",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Amsterdam.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Amsterdam.linkLabel"],
  },
  {
    canonicalDestinationId: "th-bangkok",
    title: enTranslations["hotelDestination.Bangkok.title"],
    subtitle: enTranslations["hotelDestination.Bangkok.subtitle"],
    destinationQuery: "Bangkok",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Bangkok.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Bangkok.linkLabel"],
  },
  {
    canonicalDestinationId: "mx-cancun",
    title: enTranslations["hotelDestination.Cancun.title"],
    subtitle: enTranslations["hotelDestination.Cancun.subtitle"],
    destinationQuery: "Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Cancun.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Cancun.linkLabel"],
  },
  {
    canonicalDestinationId: "tr-istanbul",
    title: enTranslations["hotelDestination.Istanbul.title"],
    subtitle: enTranslations["hotelDestination.Istanbul.subtitle"],
    destinationQuery: "Istanbul",
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Istanbul.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Istanbul.linkLabel"],
  },
];


export const destinationImageCatalog = [
  ...hotelDestinationCards,
  ...moreHotelDestinationCards,
  ...globalHotelDestinationCards,
];
