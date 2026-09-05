import Constants from "expo-constants";
import { requireNativeViewManager, requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import type { NormalizedPasskeyAssertion } from "./nativePasskeys";

type TextEvent = { text: string };
type DiagnosticEvent = { stage: string; rpId?: string; domain?: string; code?: number };

type NativeProps = {
  style?: StyleProp<ViewStyle>;
  value?: string;
  placeholder?: string;
  enabled: boolean;
  autoFocus: boolean;
  diagnosticsEnabled: boolean;
  relyingPartyIdentifier?: string;
  challenge?: string;
  onChangeText?: (event: NativeSyntheticEvent<TextEvent>) => void;
  onFocus?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
  onBlur?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
  onSubmit?: (event: NativeSyntheticEvent<Record<string, never>>) => void;
  onPasskey?: (event: NativeSyntheticEvent<NormalizedPasskeyAssertion>) => void;
  onDiagnostic?: (event: NativeSyntheticEvent<DiagnosticEvent>) => void;
};

type ExpoViewRegistry = {
  getViewConfig?: (moduleName: string, viewName?: string) => unknown | null;
};

const nativeModule = Platform.OS === "ios"
  ? requireOptionalNativeModule("KurioticketPasskeyAutoFill")
  : null;

function hasNativePasskeyUsernameView(): boolean {
  if (Platform.OS !== "ios" || !nativeModule) return false;
  try {
    const expoRuntime = (globalThis as typeof globalThis & { expo?: ExpoViewRegistry }).expo;
    return Boolean(expoRuntime?.getViewConfig?.("KurioticketPasskeyAutoFill"));
  } catch {
    return false;
  }
}

const nativeViewRegistered = hasNativePasskeyUsernameView();
const NativeView = nativeViewRegistered
  ? requireNativeViewManager<NativeProps>("KurioticketPasskeyAutoFill")
  : null;

export function isNativePasskeyUsernameFieldAvailable() {
  return nativeViewRegistered;
}

export function NativePasskeyUsernameField({
  style,
  value,
  placeholder,
  enabled,
  rpId,
  challenge,
  onChangeText,
  onFocus,
  onBlur,
  onSubmit,
  onPasskey,
}: {
  style?: StyleProp<ViewStyle>;
  value: string;
  placeholder: string;
  enabled: boolean;
  rpId?: string;
  challenge?: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  onPasskey: (assertion: NormalizedPasskeyAssertion) => void;
}) {
  if (!NativeView) return null;

  const diagnosticsEnabled = Constants.expoConfig?.extra?.environment?.isPreview === true;
  return <NativeView
    style={style}
    value={value}
    placeholder={placeholder}
    enabled={enabled}
    autoFocus
    diagnosticsEnabled={diagnosticsEnabled}
    relyingPartyIdentifier={rpId}
    challenge={challenge}
    onChangeText={(event) => onChangeText(event.nativeEvent.text)}
    onFocus={() => onFocus?.()}
    onBlur={() => onBlur?.()}
    onSubmit={() => onSubmit?.()}
    onPasskey={(event) => onPasskey(event.nativeEvent)}
    onDiagnostic={(event) => {
      if (!diagnosticsEnabled) return;
      const { stage, rpId: diagnosticRpId, domain, code } = event.nativeEvent;
      console.info("[passkey-autofill]", { stage, rpId: diagnosticRpId, domain, code });
    }}
  />;
}
