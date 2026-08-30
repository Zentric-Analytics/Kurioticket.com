import {
  getHotelDestinationPrimaryLabel,
  getHotelDestinationSupportingLabel,
  hotelDestinations,
} from "@/data/hotelDestinations";
import { getLocationFieldDisplay } from "./locationFieldDisplay";

export function getHotelLocationFieldDisplay(value: string, locale?: string | null) {
  const trimmed = value.trim();
  const destination = hotelDestinations.find((item) => item.searchValue === trimmed);
  if (!destination) return getLocationFieldDisplay(value);
  return {
    primary: getHotelDestinationPrimaryLabel(destination, locale),
    secondary: getHotelDestinationSupportingLabel(destination, locale),
  };
}
