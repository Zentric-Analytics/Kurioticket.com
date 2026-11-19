import { createContext, forwardRef, useContext, type ReactNode } from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps, type TextStyle } from "react-native";
import { useAppTheme } from "../../theme/AppTheme";
import { homeFontFamily, homeFontWeight, homeTextColor } from "./homeHotelPresentation";

const HomePresentation = createContext(false);
const HomeTextWeight = createContext("400");
export const useHomePresentation = () => useContext(HomePresentation);
export function HomePresentationProvider({ children }: { children: ReactNode }) {
  return <HomePresentation.Provider value>{children}</HomePresentation.Provider>;
}

// These shared primitives pass through untouched outside the Home subtree.
export const Text = forwardRef<NativeText, TextProps>(function HomeText({ style, ...props }, ref) {
  const enabled = useHomePresentation();
  const inheritedWeight = useContext(HomeTextWeight);
  const { theme } = useAppTheme();
  if (!enabled) return <NativeText ref={ref} {...props} style={style} />;
  const flattened = StyleSheet.flatten(style) ?? {};
  const weight = homeFontWeight(flattened.fontWeight, inheritedWeight);
  const color = homeTextColor(flattened.color, theme);
  return <HomeTextWeight.Provider value={weight}><NativeText ref={ref} {...props} style={[style, {
    fontFamily: homeFontFamily(weight), fontWeight: weight as TextStyle["fontWeight"],
    ...(color ? { color } : {}),
  }]} /></HomeTextWeight.Provider>;
});

export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function HomeTextInput({ style, placeholderTextColor, ...props }, ref) {
  const enabled = useHomePresentation();
  const { theme } = useAppTheme();
  if (!enabled) return <NativeTextInput ref={ref} {...props} style={style} placeholderTextColor={placeholderTextColor} />;
  const flattened = StyleSheet.flatten(style) ?? {};
  const weight = homeFontWeight(flattened.fontWeight);
  const color = homeTextColor(flattened.color, theme);
  return <NativeTextInput ref={ref} {...props} placeholderTextColor={homeTextColor(placeholderTextColor, theme) ?? placeholderTextColor} style={[style, {
    fontFamily: homeFontFamily(weight), fontWeight: weight as TextStyle["fontWeight"],
    ...(color ? { color } : {}),
  }]} />;
});
