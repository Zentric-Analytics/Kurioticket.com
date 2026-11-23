import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type NativeAppleHotelLookAroundStatus = "loading" | "ready" | "unavailable";

export function NativeAppleHotelLookAround({
  onStatusChange,
}: {
  latitude: number;
  longitude: number;
  hotelName: string;
  style?: StyleProp<ViewStyle>;
  onStatusChange: (status: NativeAppleHotelLookAroundStatus) => void;
}) {
  useEffect(() => {
    onStatusChange("unavailable");
  }, [onStatusChange]);
  return null;
}
