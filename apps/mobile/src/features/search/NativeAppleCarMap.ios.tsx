import { NativeAppleHotelMap } from "./NativeAppleHotelMap";
import type { NativeAppleCarMapProps } from "./NativeAppleCarMap.types";

const CAR_FULL_MAP_LEGAL_LABEL_INSETS = {
  top: 0,
  right: 12,
  bottom: 8,
  left: 0,
};

export function NativeAppleCarMap({ latitude, longitude, locationLabel, interactive = false }: NativeAppleCarMapProps) {
  return <NativeAppleHotelMap latitude={latitude} longitude={longitude} hotelName={locationLabel} interactive={interactive} legalLabelInsets={interactive ? CAR_FULL_MAP_LEGAL_LABEL_INSETS : undefined} />;
}
