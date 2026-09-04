import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import type { HotelRoomOption } from "../../../../../src/lib/hotels/hotelRoomOptions";
import type { HotelRoomDisplayPrice } from "./hotelDetailCurrency";

type HotelTheme = {
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  icon: string;
};

export { canonicalHotelAddress, hotelStaySummary, meaningfulHotelCenterDistance } from "./nativeHotelDetailsModel";

export type PresentedHotelRoomOption = HotelRoomOption & {
  displayPrice: HotelRoomDisplayPrice | null;
};

export function NativeHotelGallery({
  name,
  initialImages,
  theme,
  accentColor,
}: {
  name: string;
  initialImages: string[];
  theme: HotelTheme;
  accentColor: string;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const heroWidth = useWindowDimensions().width - 32;
  const images = initialImages.filter(
    (url, index) =>
      Boolean(url) && initialImages.indexOf(url) === index && !failed.has(url),
  );
  const [activeUrl, setActiveUrl] = useState<string | null>(images[0] ?? null);
  const scroll = useRef<ScrollView>(null);
  const activeIndex = Math.max(0, images.indexOf(activeUrl ?? ""));
  useEffect(() => {
    if (!activeUrl || !images.includes(activeUrl))
      setActiveUrl(images[0] ?? null);
  }, [activeUrl, images]);
  const choose = (index: number) => {
    const next = images[index];
    if (!next) return;
    setActiveUrl(next);
    scroll.current?.scrollTo({ x: index * heroWidth, animated: true });
  };
  const move = (delta: number) =>
    choose((activeIndex + delta + images.length) % images.length);
  const fail = (url: string) =>
    setFailed((current) => new Set(current).add(url));
  if (!images.length)
    return (
      <View style={[s.unavailable, { backgroundColor: theme.surface }]}>
        <Text style={{ color: theme.textSecondary }}>
          Property image unavailable
        </Text>
      </View>
    );
  return (
    <View style={s.gallery}>
      <View style={s.heroFrame}>
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const width = event.nativeEvent.layoutMeasurement.width;
            choose(
              Math.max(
                0,
                Math.min(
                  images.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / width),
                ),
              ),
            );
          }}
        >
          {images.map((url) => (
            <Image
              key={url}
              source={{ uri: url }}
              resizeMode="cover"
              style={[s.hero, { width: heroWidth }]}
              accessibilityLabel={`${name} photo ${images.indexOf(url) + 1}`}
              onError={() => fail(url)}
            />
          ))}
        </ScrollView>
        {images.length > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
              onPress={() => move(-1)}
              style={[s.arrow, s.left]}
            >
              <ChevronLeft color="white" size={24} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              onPress={() => move(1)}
              style={[s.arrow, s.right]}
            >
              <ChevronRight color="white" size={24} />
            </Pressable>
          </>
        ) : null}
        <Text style={s.counter}>
          {activeIndex + 1} / {images.length}
        </Text>
      </View>
      <View style={s.thumbnails}>
        {images.slice(0, 5).map((url, index) => {
          const remaining = index === 4 ? images.length - 5 : 0;
          return (
            <Pressable
              key={url}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${index + 1}`}
              onPress={() => choose(index)}
              style={[
                s.thumbnailFrame,
                activeIndex === index && { borderColor: accentColor },
              ]}
            >
              <Image
                source={{ uri: url }}
                style={s.thumbnail}
                onError={() => fail(url)}
              />
              {remaining > 0 ? (
                <View style={s.remaining}>
                  <Text style={s.remainingText}>+{remaining}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function HotelRoomOptionsModal({
  visible,
  onClose,
  options,
  theme,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  options: PresentedHotelRoomOption[];
  theme: HotelTheme;
  accentColor: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.modalBackdrop}>
        <View style={[s.modal, { backgroundColor: theme.surface }]}>
          <View style={s.modalHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>
                Room options
              </Text>
              <Text style={[s.copy, { color: theme.textSecondary }]}>
                Indicative planning choices. Final prices, availability, and
                terms are confirmed before booking.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close room options"
              onPress={onClose}
              style={s.close}
            >
              <X color={theme.icon} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.optionList}>
            {options.map((option) => (
              <View
                key={option.id}
                style={[s.option, { borderColor: theme.border }]}
              >
                <Text style={[s.optionName, { color: theme.textPrimary }]}>
                  {option.name}
                </Text>
                <Text style={[s.copy, { color: theme.textSecondary }]}>
                  {[option.bedConfiguration, option.mealPlan]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text
                  accessibilityLabel={option.displayPrice ? `${option.displayPrice.total.accessibilityLabel} total` : "Price unavailable"}
                  style={[s.optionPrice, { color: theme.textPrimary }]}
                >
                  {option.displayPrice ? `${option.displayPrice.total.formatted} total` : "Price unavailable"}
                </Text>
                <Text
                  accessibilityLabel={option.displayPrice ? `${option.displayPrice.nightly.accessibilityLabel} per night. ${option.cancellationInfo}` : `Price unavailable. ${option.cancellationInfo}`}
                  style={[s.copy, { color: theme.textSecondary }]}
                >
                  {option.displayPrice ? `${option.displayPrice.nightly.formatted} per night` : "Price unavailable"} · {option.cancellationInfo}
                </Text>
                <Text style={[s.planning, { color: accentColor }]}>
                  Planning option · indicative price
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  gallery: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
  heroFrame: {
    aspectRatio: 16 / 10,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#DCE2EB",
  },
  hero: { width: "100%", aspectRatio: 16 / 10 },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  left: { left: 8 },
  right: { right: 8 },
  counter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    color: "white",
    backgroundColor: "rgba(0,0,0,.68)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    fontWeight: "800",
  },
  thumbnails: { flexDirection: "row", gap: 6 },
  thumbnailFrame: {
    flex: 1,
    aspectRatio: 1.2,
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnail: { width: "100%", height: "100%" },
  remaining: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  remainingText: { color: "white", fontSize: 16, fontWeight: "900" },
  unavailable: {
    marginHorizontal: 16,
    aspectRatio: 16 / 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.45)",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "82%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeading: { flexDirection: "row", gap: 12 },
  modalTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    marginBottom: 4,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  optionList: { gap: 12, paddingTop: 18 },
  option: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  optionName: { fontSize: 15, fontWeight: "900" },
  optionPrice: { fontSize: 18, fontWeight: "900", marginTop: 4 },
  copy: { fontSize: 12, lineHeight: 18 },
  planning: { fontSize: 11, fontWeight: "800" },
});
