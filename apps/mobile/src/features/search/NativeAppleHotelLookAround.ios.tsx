import { useEffect } from "react";
import { requireNativeViewManager, requireOptionalNativeModule } from "expo-modules-core";
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import type { NativeAppleHotelLookAroundStatus } from "./NativeAppleHotelLookAround";

type StatusEvent = { status: NativeAppleHotelLookAroundStatus };
type NativeProps = {
  style?: StyleProp<ViewStyle>;
  latitude: number;
  longitude: number;
  hotelName: string;
  onStatusChange?: (event: NativeSyntheticEvent<StatusEvent>) => void;
};
type ExpoViewRegistry = {
  getViewConfig?: (moduleName: string, viewName?: string) => unknown | null;
};

const nativeModule = requireOptionalNativeModule("KurioticketHotelLookAround");

function hasNativeLookAroundView() {
  if (!nativeModule) return false;
  try {
    const expoRuntime = (globalThis as typeof globalThis & { expo?: ExpoViewRegistry }).expo;
    return Boolean(expoRuntime?.getViewConfig?.("KurioticketHotelLookAround"));
  } catch {
    return false;
  }
}

const NativeView = hasNativeLookAroundView()
  ? requireNativeViewManager<NativeProps>("KurioticketHotelLookAround")
  : null;

export function NativeAppleHotelLookAround({
  latitude,
  longitude,
  hotelName,
  style,
  onStatusChange,
}: {
  latitude: number;
  longitude: number;
  hotelName: string;
  style?: StyleProp<ViewStyle>;
  onStatusChange: (status: NativeAppleHotelLookAroundStatus) => void;
}) {
  useEffect(() => {
    if (!NativeView) onStatusChange("unavailable");
  }, [onStatusChange]);

  if (!NativeView) return null;
  return (
    <NativeView
      style={style}
      latitude={latitude}
      longitude={longitude}
      hotelName={hotelName}
      onStatusChange={(event) => onStatusChange(event.nativeEvent.status)}
    />
  );
}
