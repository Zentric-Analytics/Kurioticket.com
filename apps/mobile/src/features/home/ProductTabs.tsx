import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";

export type SearchProduct = "flights" | "hotels" | "cars" | "deals";

type ProductIcon = "airplane" | "bed" | "car" | "pricetag";

type Product = {
  id: SearchProduct;
  label: string;
  icon: ProductIcon;
};

const products = [
  {
    id: "flights",
    label: "Flights",
    icon: "airplane",
  },
  {
    id: "hotels",
    label: "Hotels",
    icon: "bed",
  },
  {
    id: "cars",
    label: "Cars",
    icon: "car",
  },
  {
    id: "deals",
    label: "Deals",
    icon: "pricetag",
  },
] as const satisfies readonly Product[];

function ProductGlyph({ icon, color }: { icon: ProductIcon; color: string }) {
  const path = {
    airplane: "M2.5 12.5 21 4l-5.5 14-4.2-4.4-4.1 3.4 1.5-5.4-6.2.9Z",
    bed: "M4 10.5V6.2h2v4.3h12a3 3 0 0 1 3 3V18h-2v-2H5v2H3V6.2h1v4.3Zm4.3-1.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z",
    car: "M5.2 16.5H4v-4.1l2.2-5.2A2 2 0 0 1 8 6h8a2 2 0 0 1 1.8 1.2l2.2 5.2v4.1h-1.2V18h-2v-1.5H7.2V18h-2v-1.5Zm1-5h11.6l-1.5-3.6A.6.6 0 0 0 15.8 7H8.2a.6.6 0 0 0-.5.9l-1.5 3.6Zm1.1 3a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm9.4 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z",
    pricetag:
      "M4 12.8V5h7.8L21 14.2 14.2 21 4 12.8Zm3-4.1a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 0 0-3.4 0Z",
  }[icon];

  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={path} fill={color} />
    </Svg>
  );
}

export function ProductTabs({
  selectedProduct,
  onSelectProduct,
}: {
  selectedProduct: SearchProduct;
  onSelectProduct: (product: SearchProduct) => void;
}) {
  return (
    <View style={styles.products} accessibilityLabel="Travel products">
      {products.map((product) => {
        const selected = selectedProduct === product.id;
        const foreground = selected ? "white" : colors.navy;

        return (
          <Pressable
            key={product.id}
            accessibilityRole="tab"
            accessibilityLabel={product.label}
            accessibilityState={{ selected }}
            onPress={() => onSelectProduct(product.id)}
            style={({ pressed }) => [
              styles.product,
              selected && styles.productActive,
              pressed && styles.productPressed,
            ]}
          >
            <ProductGlyph icon={product.icon} color={foreground} />
            <Text
              numberOfLines={1}
              style={[styles.productText, selected && styles.productActiveText]}
            >
              {product.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  products: { flexDirection: "row", gap: 8 },
  product: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  productActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  productPressed: { opacity: 0.7 },
  productText: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  productActiveText: { color: "white" },
});
