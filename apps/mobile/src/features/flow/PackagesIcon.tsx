import { Building2, CarFront, Plane } from "lucide-react-native";
import { View } from "react-native";

type PackagesIconProps = {
  size?: number;
  color?: string;
};

/** The canonical customer-facing mark for the combined Flights + Hotels + Cars product. */
export function PackagesIcon({ size = 24, color = "#071A48" }: PackagesIconProps) {
  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size }}
    >
      <View style={{ position: "absolute", left: "27%", top: 0 }}>
        <Building2 color={color} size={size * 0.68} strokeWidth={1.8} />
      </View>
      <View style={{ position: "absolute", bottom: 0, left: 0, transform: [{ rotate: "-12deg" }] }}>
        <Plane color={color} size={size * 0.58} strokeWidth={2} />
      </View>
      <View style={{ position: "absolute", bottom: 0, right: 0 }}>
        <CarFront color={color} size={size * 0.5} strokeWidth={2} />
      </View>
    </View>
  );
}
