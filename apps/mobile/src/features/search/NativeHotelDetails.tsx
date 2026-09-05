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
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { HotelRoomOption } from "../../../../../src/lib/hotels/hotelRoomOptions";
import { appFonts } from "../../theme/typography";
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
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroWidth = viewportWidth - 32;
  const viewerWidth = viewportWidth - insets.left - insets.right;
  const images = initialImages.filter(
    (url, index) =>
      Boolean(url) && initialImages.indexOf(url) === index && !failed.has(url),
  );
  const [activeUrl, setActiveUrl] = useState<string | null>(images[0] ?? null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const viewerScroll = useRef<ScrollView>(null);
  const viewerThumbnails = useRef<ScrollView>(null);
  const activeIndex = Math.max(0, images.indexOf(activeUrl ?? ""));
  useEffect(() => {
    if (!activeUrl || !images.includes(activeUrl))
      setActiveUrl(images[0] ?? null);
  }, [activeUrl, images]);
  useEffect(() => {
    if (!viewerOpen) return;
    viewerScroll.current?.scrollTo({
      x: activeIndex * viewerWidth,
      animated: false,
    });
  }, [viewerOpen, viewerWidth]);
  const setActiveImage = (index: number) => {
    const next = images[index];
    if (!next) return false;
    setActiveUrl(next);
    return true;
  };
  const scrollInlineTo = (index: number, animated: boolean) =>
    scroll.current?.scrollTo({ x: index * heroWidth, animated });
  const scrollViewerTo = (index: number, animated: boolean) =>
    viewerScroll.current?.scrollTo({
      x: index * viewerWidth,
      animated,
    });
  const keepViewerThumbnailVisible = (index: number) =>
    viewerThumbnails.current?.scrollTo({
      x: Math.max(0, index * 104 - viewportWidth / 2 + 48),
      animated: true,
    });
  const choose = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollInlineTo(index, true);
  };
  const move = (delta: number) =>
    choose((activeIndex + delta + images.length) % images.length);
  const chooseInViewer = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollViewerTo(index, true);
    scrollInlineTo(index, false);
    keepViewerThumbnailVisible(index);
  };
  const moveInViewer = (delta: number) =>
    chooseInViewer((activeIndex + delta + images.length) % images.length);
  const openViewer = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollInlineTo(index, false);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
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
            setActiveImage(
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
          {images.map((url, index) => (
            <Pressable
              key={url}
              style={[s.hero, { width: heroWidth }]}
              accessibilityRole="button"
              accessibilityLabel={`Open photo ${index + 1} of ${images.length} for ${name}`}
              onPress={() => openViewer(index)}
            >
              <Image
                source={{ uri: url }}
                resizeMode="cover"
                style={s.heroImage}
                accessible={false}
                onError={() => fail(url)}
              />
            </Pressable>
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
              <ChevronLeft color="white" size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              onPress={() => move(1)}
              style={[s.arrow, s.right]}
            >
              <ChevronRight color="white" size={20} />
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
              accessibilityLabel={
                remaining > 0 ? "View all photos" : `Show photo ${index + 1}`
              }
              onPress={() =>
                remaining > 0 ? openViewer(index) : choose(index)
              }
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
                  <View style={s.remainingContent}>
                    <Images accessible={false} size={16} color="white" />
                    <Text style={s.remainingText}>+{remaining}</Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Modal
        visible={viewerOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeViewer}
        onShow={() => {
          scrollViewerTo(activeIndex, false);
          keepViewerThumbnailVisible(activeIndex);
        }}
      >
        <View
          accessibilityViewIsModal
          style={[
            s.viewer,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <View style={s.viewerHeader}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={s.viewerTitle}
            >
              Photos for {name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photo viewer"
              onPress={closeViewer}
              style={s.viewerClose}
            >
              <X color="#0F172A" size={20} />
            </Pressable>
          </View>
          <View style={s.viewerStage}>
            <ScrollView
              ref={viewerScroll}
              style={s.viewerPager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width;
                const index = Math.max(
                  0,
                  Math.min(
                    images.length - 1,
                    Math.round(event.nativeEvent.contentOffset.x / width),
                  ),
                );
                if (!setActiveImage(index)) return;
                scrollInlineTo(index, false);
                keepViewerThumbnailVisible(index);
              }}
            >
              {images.map((url) => (
                <View key={url} style={[s.viewerPage, { width: viewerWidth }]}>
                  <Image
                    source={{ uri: url }}
                    resizeMode="contain"
                    style={s.viewerImage}
                    accessibilityLabel={`${name} photo ${images.indexOf(url) + 1}`}
                    onError={() => fail(url)}
                  />
                </View>
              ))}
            </ScrollView>
            {images.length > 1 ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous photo"
                  onPress={() => moveInViewer(-1)}
                  style={[s.viewerArrow, s.viewerLeft]}
                >
                  <ChevronLeft color="#0F172A" size={24} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next photo"
                  onPress={() => moveInViewer(1)}
                  style={[s.viewerArrow, s.viewerRight]}
                >
                  <ChevronRight color="#0F172A" size={24} />
                </Pressable>
              </>
            ) : null}
            <Text style={s.viewerCounter}>
              {activeIndex + 1} of {images.length} photos
            </Text>
          </View>
          {images.length > 1 ? (
            <ScrollView
              ref={viewerThumbnails}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.viewerThumbnailStrip}
            >
              {images.map((url, index) => (
                <Pressable
                  key={url}
                  accessibilityRole="button"
                  accessibilityLabel={`Show photo ${index + 1}`}
                  accessibilityState={{ selected: activeIndex === index }}
                  onPress={() => chooseInViewer(index)}
                  style={[
                    s.viewerThumbnailFrame,
                    activeIndex === index && s.viewerThumbnailActive,
                  ]}
                >
                  <Image
                    source={{ uri: url }}
                    resizeMode="cover"
                    style={s.viewerThumbnail}
                    onError={() => fail(url)}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
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
  hero: { aspectRatio: 16 / 10 },
  heroImage: { width: "100%", height: "100%" },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  left: { left: 0, alignItems: "flex-start", paddingLeft: 8 },
  right: { right: 0, alignItems: "flex-end", paddingRight: 8 },
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
  remainingContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  remainingText: { color: "white", fontSize: 12, lineHeight: 16, fontWeight: "700", fontFamily: appFonts.bold },
  unavailable: {
    marginHorizontal: 16,
    aspectRatio: 16 / 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  viewer: { flex: 1, backgroundColor: "#020617" },
  viewerHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  viewerTitle: {
    flex: 1,
    minWidth: 0,
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  viewerClose: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  viewerStage: { flex: 1, position: "relative" },
  viewerPager: { flex: 1 },
  viewerPage: { flex: 1, height: "100%" },
  viewerImage: { width: "100%", height: "100%" },
  viewerArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.55)",
  },
  viewerLeft: { left: 12 },
  viewerRight: { right: 12 },
  viewerCounter: {
    position: "absolute",
    alignSelf: "center",
    bottom: 8,
    color: "white",
    backgroundColor: "rgba(2,6,23,.8)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  viewerThumbnailStrip: { gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  viewerThumbnailFrame: {
    width: 96,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.4)",
  },
  viewerThumbnailActive: { borderWidth: 3, borderColor: "white" },
  viewerThumbnail: { width: "100%", height: "100%" },
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
