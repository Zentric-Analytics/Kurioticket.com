import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type NativeAppleCarLookAroundStatus =
  | "loading"
  | "ready"
  | "unavailable";

export type NativeAppleCarLookAroundPreviewProps = {
  latitude: number;
  longitude: number;
  locationLabel: string;
  style?: StyleProp<ViewStyle>;
  onStatusChange: (status: NativeAppleCarLookAroundStatus) => void;
};

export function NativeAppleCarLookAroundPreview({
  onStatusChange,
}: NativeAppleCarLookAroundPreviewProps) {
  useEffect(() => onStatusChange("unavailable"), [onStatusChange]);
  return null;
}
