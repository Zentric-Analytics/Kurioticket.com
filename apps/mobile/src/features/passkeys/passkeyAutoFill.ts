import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import type { NormalizedPasskeyAssertion } from "./nativePasskeys";

type AutoFillModule = {
  start: (relyingPartyIdentifier: string, challenge: string) => Promise<NormalizedPasskeyAssertion | null>;
  cancel: () => void;
};

const module = Platform.OS === "ios"
  ? requireOptionalNativeModule<AutoFillModule>("KurioticketPasskeyAutoFill")
  : null;

export function isPasskeyAutoFillAvailable(): boolean {
  return Platform.OS === "ios" && Boolean(module);
}

export async function startPasskeyAutoFill(input: { rpId: string; challenge: string }): Promise<NormalizedPasskeyAssertion | null> {
  if (!module) return null;
  return module.start(input.rpId, input.challenge);
}

export function cancelPasskeyAutoFill(): void {
  module?.cancel();
}
