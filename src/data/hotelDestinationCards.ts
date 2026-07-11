import { translations as enTranslations } from "@/lib/i18n/en";

export type HotelDestinationCard = {
  title: string;
  subtitle: string;
  destinationQuery: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
};

export const hotelsHeroImage =
  "/images/premium/hotels/kurioticket-hotels-hero-bellboy-guest-arrival-lobby-001.jpg";

export const hotelDestinationCards: HotelDestinationCard[] = [
  {
    title: enTranslations["hotelDestination.Tokyo.title"],
    subtitle: enTranslations["hotelDestination.Tokyo.subtitle"],
    destinationQuery: "Tokyo",
    image:
      "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tokyo skyline with dense high-rise buildings in daylight",
    linkLabel: enTranslations["hotelDestination.Tokyo.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.London.title"],
    subtitle: enTranslations["hotelDestination.London.subtitle"],
    destinationQuery: "London",
    image:
      "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tower Bridge and the River Thames in London under a blue sky",
    linkLabel: enTranslations["hotelDestination.London.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Paris.title"],
    subtitle: enTranslations["hotelDestination.Paris.subtitle"],
    destinationQuery: "Paris",
    image:
      "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Eiffel Tower and the Seine River in Paris at golden hour",
    linkLabel: enTranslations["hotelDestination.Paris.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.New York.title"],
    subtitle: enTranslations["hotelDestination.New York.subtitle"],
    destinationQuery: "New York",
    image:
      "https://images.pexels.com/photos/11182439/pexels-photo-11182439.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt:
      "New York City skyline with One World Trade Center and waterfront",
    linkLabel: enTranslations["hotelDestination.New York.linkLabel"],
  },
];

export const moreHotelDestinationCards: HotelDestinationCard[] = [
  {
    title: enTranslations["hotelDestination.Rome.title"],
    subtitle: enTranslations["hotelDestination.Rome.subtitle"],
    destinationQuery: "Rome",
    image:
      "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: enTranslations["hotelDestination.Rome.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Rome.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Dubai.title"],
    subtitle: enTranslations["hotelDestination.Dubai.subtitle"],
    destinationQuery: "Dubai",
    image:
      "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: enTranslations["hotelDestination.Dubai.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Dubai.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Singapore.title"],
    subtitle: enTranslations["hotelDestination.Singapore.subtitle"],
    destinationQuery: "Singapore",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Singapore.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Singapore.linkLabel"],
  },
  {
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
    title: enTranslations["hotelDestination.Toronto.title"],
    subtitle: enTranslations["hotelDestination.Toronto.subtitle"],
    destinationQuery: "Toronto",
    image:
      "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Toronto.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Toronto.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Amsterdam.title"],
    subtitle: enTranslations["hotelDestination.Amsterdam.subtitle"],
    destinationQuery: "Amsterdam",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Amsterdam.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Amsterdam.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Bangkok.title"],
    subtitle: enTranslations["hotelDestination.Bangkok.subtitle"],
    destinationQuery: "Bangkok",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Bangkok.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Bangkok.linkLabel"],
  },
  {
    title: enTranslations["hotelDestination.Cancun.title"],
    subtitle: enTranslations["hotelDestination.Cancun.subtitle"],
    destinationQuery: "Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
    imageAlt: enTranslations["hotelDestination.Cancun.imageAlt"],
    linkLabel: enTranslations["hotelDestination.Cancun.linkLabel"],
  },
  {
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
