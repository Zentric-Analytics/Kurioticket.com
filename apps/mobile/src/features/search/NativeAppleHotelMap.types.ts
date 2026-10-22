export type NativeAppleHotelMapInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type NativeAppleHotelMapProps = {
  latitude: number;
  longitude: number;
  hotelName: string;
  interactive?: boolean;
  legalLabelInsets?: NativeAppleHotelMapInsets;
};
