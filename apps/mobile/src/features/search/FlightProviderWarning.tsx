import { Text, type StyleProp, type TextStyle } from "react-native";

/** Keep provider partial failures visible alongside the offers that succeeded. */
export function FlightProviderWarning({ message, style }: { message: string; style?: StyleProp<TextStyle> }) {
  return message.trim() ? <Text accessibilityRole="alert" style={style}>{message}</Text> : null;
}
