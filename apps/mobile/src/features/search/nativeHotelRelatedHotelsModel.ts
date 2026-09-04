import type { PublicHotelResult } from "../../../../../src/lib/types";
import { classifyHotels, type ContractResult } from "../../../../../src/lib/travel/searchContract";
import type { ExchangeRates } from "../currency/displayCurrency";
import { createHotelRoomDisplayPrice, type HotelDisplayPriceSnapshot } from "./hotelDetailCurrency";

export type NativeRelatedHotel = {
  hotel: PublicHotelResult;
  result: ContractResult<PublicHotelResult>;
  classificationStars: number | null;
  location: string;
  displayPrices: HotelDisplayPriceSnapshot | null;
};

function relatedLocation(hotel: PublicHotelResult) {
  const values = [hotel.neighbourhood, hotel.location]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return values.filter((value, index) =>
    values.findIndex((candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase()) === index,
  ).join(", ");
}

export function prepareNativeRelatedHotels({
  hotels,
  currentHotelId,
  displayCurrency,
  rates,
}: {
  hotels: PublicHotelResult[];
  currentHotelId: string;
  displayCurrency?: string | null;
  rates: ExchangeRates;
}): NativeRelatedHotel[] {
  const seen = new Set<string>([currentHotelId]);
  return hotels.filter((hotel) => {
    if (!hotel.id || seen.has(hotel.id)) return false;
    seen.add(hotel.id);
    return true;
  }).slice(0, 7).map((hotel) => {
    const result = classifyHotels([hotel], [], "native-hotel-details-related").results[0];
    const validStars = Number.isInteger(hotel.classificationStars)
      && hotel.classificationStars! >= 1
      && hotel.classificationStars! <= 5;
    const hasPrices = Number.isFinite(hotel.pricePerNight)
      && Number.isFinite(hotel.totalPrice)
      && Boolean(hotel.currency)
      && Boolean(displayCurrency);
    return {
      hotel,
      result,
      classificationStars: validStars ? hotel.classificationStars! : null,
      location: relatedLocation(hotel),
      displayPrices: hasPrices
        ? createHotelRoomDisplayPrice(
            hotel.pricePerNight!, hotel.totalPrice!, hotel.currency!, displayCurrency!, rates,
          )
        : null,
    };
  });
}
