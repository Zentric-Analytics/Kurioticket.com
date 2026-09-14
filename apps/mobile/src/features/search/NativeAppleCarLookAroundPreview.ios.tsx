import { useEffect } from "react";
import {
  requireNativeViewManager,
  requireOptionalNativeModule,
} from "expo-modules-core";
import type { NativeSyntheticEvent } from "react-native";
import type {
  NativeAppleCarLookAroundPreviewProps,
  NativeAppleCarLookAroundStatus,
} from "./NativeAppleCarLookAroundPreview";

type StatusEvent = { status: NativeAppleCarLookAroundStatus };
type NativeProps = Omit<
  NativeAppleCarLookAroundPreviewProps,
  "onStatusChange"
> & {
  onStatusChange?: (event: NativeSyntheticEvent<StatusEvent>) => void;
};
type ExpoViewRegistry = {
  getViewConfig?: (moduleName: string, viewName?: string) => unknown | null;
};

const nativeModule = requireOptionalNativeModule("KurioticketCarLookAround");

function hasNativeView() {
  if (!nativeModule) return false;
  try {
    const expoRuntime = (
      globalThis as typeof globalThis & { expo?: ExpoViewRegistry }
    ).expo;
    return Boolean(expoRuntime?.getViewConfig?.("KurioticketCarLookAround"));
  } catch {
    return false;
  }
}

const NativeView = hasNativeView()
  ? requireNativeViewManager<NativeProps>("KurioticketCarLookAround")
  : null;

export function NativeAppleCarLookAroundPreview({
  onStatusChange,
  ...props
}: NativeAppleCarLookAroundPreviewProps) {
  useEffect(() => {
    if (!NativeView) onStatusChange("unavailable");
  }, [onStatusChange]);

  if (!NativeView) return null;
  return (
    <NativeView
      {...props}
      onStatusChange={(event) => onStatusChange(event.nativeEvent.status)}
    />
  );
}
