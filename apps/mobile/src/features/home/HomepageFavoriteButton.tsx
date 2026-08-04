import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { FavoriteButton, favoriteButtonColors } from "../../components/FavoriteButton";

export const homepageFavoriteColors = favoriteButtonColors;

export function HomepageFavoriteButton({
  saved,
  label,
  onPress,
  style,
}: {
  saved: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <FavoriteButton
      saved={saved}
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
    />
  );
}
