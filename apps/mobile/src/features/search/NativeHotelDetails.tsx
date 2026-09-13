import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { HotelRoomOption } from "../../../../../src/lib/hotels/hotelRoomOptions";
import { appFonts } from "../../theme/typography";
import type { HotelRoomDisplayPrice } from "./hotelDetailCurrency";

type HotelTheme = {
  dark: boolean;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  icon: string;
};

type GalleryItem = { url: string; index: number };
type GalleryRow =
  | { kind: "large"; items: [GalleryItem] }
  | { kind: "pair"; items: [GalleryItem, GalleryItem] };

export { canonicalHotelAddress, hotelStaySummary, meaningfulHotelCenterDistance } from "./nativeHotelDetailsModel";

export type PresentedHotelRoomOption = HotelRoomOption & {
  displayPrice: HotelRoomDisplayPrice | null;
};

export function NativeHotelGallery({
  name,
  initialImages,
  theme,
}: {
  name: string;
  initialImages: string[];
  theme: HotelTheme;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroWidth = viewportWidth;
  const heroHeight = Math.round(viewportWidth * 0.94);
  const viewerWidth = viewportWidth;
  const modalTop = Math.max(insets.top, 8);
  const modalBottom = Math.max(insets.bottom, 8);
  const galleryBackground = theme.dark ? "#000000" : "#FFFFFF";
  const galleryText = theme.dark ? "#FFFFFF" : "#0F172A";
  const galleryBorder = theme.dark ? "#27272A" : "#E2E8F0";
  const galleryPlaceholder = theme.dark ? "#18181B" : "#E7EBF2";
  const images = initialImages.filter(
    (url, index) =>
      Boolean(url) && initialImages.indexOf(url) === index && !failed.has(url),
  );
  const [activeUrl, setActiveUrl] = useState<string | null>(images[0] ?? null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const heroScroll = useRef<FlatList<string>>(null);
  const viewerScroll = useRef<FlatList<string>>(null);
  const activeIndex = Math.max(0, images.indexOf(activeUrl ?? ""));

  useEffect(() => {
    if (!activeUrl || !images.includes(activeUrl)) setActiveUrl(images[0] ?? null);
  }, [activeUrl, images]);

  useEffect(() => {
    if (!viewerOpen || !images.length) return;
    viewerScroll.current?.scrollToIndex({ index: activeIndex, animated: false });
  }, [activeIndex, images.length, viewerOpen, viewerWidth]);

  const setActiveImage = (index: number) => {
    const next = images[index];
    if (!next) return false;
    setActiveUrl(next);
    return true;
  };

  const scrollHeroTo = (index: number, animated: boolean) => {
    if (!images[index]) return;
    heroScroll.current?.scrollToIndex({ index, animated });
  };

  const openGallery = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollHeroTo(index, false);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setViewerOpen(false);
    setGalleryOpen(false);
  };

  const openViewer = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollHeroTo(index, false);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const fail = (url: string) => setFailed((current) => new Set(current).add(url));

  const galleryRows: GalleryRow[] = [];
  for (let index = 0, large = true; index < images.length; large = !large) {
    if (large || index === images.length - 1) {
      galleryRows.push({ kind: "large", items: [{ url: images[index], index }] });
      index += 1;
    } else {
      galleryRows.push({
        kind: "pair",
        items: [
          { url: images[index], index },
          { url: images[index + 1], index: index + 1 },
        ],
      });
      index += 2;
    }
  }

  if (!images.length)
    return (
      <View style={[s.unavailable, { height: heroHeight, backgroundColor: theme.surface }]}>
        <Text style={[s.unavailableText, { color: theme.textSecondary }]}>Property image unavailable</Text>
      </View>
    );

  const renderHero = ({ item: url, index }: { item: string; index: number }) => (
    <Pressable
      style={[s.hero, { width: heroWidth, height: heroHeight }]}
      accessibilityRole="button"
      accessibilityLabel={`Open photo gallery for ${name} from photo ${index + 1} of ${images.length}`}
      accessibilityHint={images.length > 1 ? "Swipe horizontally to preview photos, or tap to open all photos." : "Tap to open all photos."}
      onPress={() => openGallery(index)}
    >
      <Image source={{ uri: url }} resizeMode="cover" style={s.heroImage} accessible={false} onError={() => fail(url)} />
    </Pressable>
  );

  const renderViewerImage = ({ item: url, index }: { item: string; index: number }) => (
    <View style={[s.viewerPage, { width: viewerWidth, backgroundColor: galleryBackground }]}>
      <Image
        source={{ uri: url }}
        resizeMode="contain"
        style={s.viewerImage}
        accessibilityLabel={`${name} photo ${index + 1}`}
        onError={() => fail(url)}
      />
    </View>
  );

  return (
    <View style={s.gallery}>
      <View style={[s.heroFrame, { height: heroHeight }]}>
        <FlatList
          ref={heroScroll}
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(url) => url}
          renderItem={renderHero}
          getItemLayout={(_, index) => ({ length: heroWidth, offset: heroWidth * index, index })}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === "android"}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const measuredWidth = event.nativeEvent.layoutMeasurement.width || heroWidth;
            setActiveImage(Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / measuredWidth))));
          }}
        />
        <Text style={s.counter}>{activeIndex + 1} / {images.length}</Text>
      </View>

      <Modal
        visible={galleryOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={viewerOpen ? closeViewer : closeGallery}
      >
        <View
          accessibilityViewIsModal
          style={[
            s.galleryModal,
            {
              backgroundColor: galleryBackground,
              paddingTop: modalTop,
              paddingBottom: modalBottom,
            },
          ]}
        >
          <View style={[s.galleryHeader, { borderBottomColor: galleryBorder }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photo gallery"
              onPress={closeGallery}
              style={s.galleryHeaderAction}
            >
              <X color={galleryText} size={24} />
            </Pressable>
            <Text accessibilityRole="header" numberOfLines={1} style={[s.galleryTitle, { color: galleryText }]}>
              {name}
            </Text>
            <View accessible={false} style={s.galleryHeaderAction} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.galleryOverviewContent}
          >
            {galleryRows.map((row, rowIndex) =>
              row.kind === "large" ? (
                <Pressable
                  key={`large-${row.items[0].url}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open photo ${row.items[0].index + 1} of ${images.length}`}
                  onPress={() => openViewer(row.items[0].index)}
                  style={[s.galleryLargeFrame, { backgroundColor: galleryPlaceholder }]}
                >
                  <Image
                    source={{ uri: row.items[0].url }}
                    resizeMode="cover"
                    style={s.galleryOverviewImage}
                    onError={() => fail(row.items[0].url)}
                  />
                </Pressable>
              ) : (
                <View key={`pair-${rowIndex}`} style={s.galleryPairRow}>
                  {row.items.map((item) => (
                    <Pressable
                      key={item.url}
                      accessibilityRole="button"
                      accessibilityLabel={`Open photo ${item.index + 1} of ${images.length}`}
                      onPress={() => openViewer(item.index)}
                      style={[s.galleryPairFrame, { backgroundColor: galleryPlaceholder }]}
                    >
                      <Image
                        source={{ uri: item.url }}
                        resizeMode="cover"
                        style={s.galleryOverviewImage}
                        onError={() => fail(item.url)}
                      />
                    </Pressable>
                  ))}
                </View>
              ),
            )}
          </ScrollView>

          {viewerOpen ? (
            <View
              accessibilityViewIsModal
              style={[
                s.viewerOverlay,
                {
                  backgroundColor: galleryBackground,
                  paddingTop: modalTop,
                  paddingBottom: modalBottom,
                },
              ]}
            >
              <View style={[s.viewerHeader, { borderBottomColor: galleryBorder }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to photo gallery"
                  onPress={closeViewer}
                  style={s.galleryHeaderAction}
                >
                  <X color={galleryText} size={24} />
                </Pressable>
                <Text accessibilityRole="header" style={[s.viewerCounter, { color: galleryText }]}>
                  {activeIndex + 1} / {images.length}
                </Text>
                <View accessible={false} style={s.galleryHeaderAction} />
              </View>
              <FlatList
                ref={viewerScroll}
                style={s.viewerPager}
                horizontal
                pagingEnabled
                data={images}
                keyExtractor={(url) => url}
                renderItem={renderViewerImage}
                getItemLayout={(_, index) => ({ length: viewerWidth, offset: viewerWidth * index, index })}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews={Platform.OS === "android"}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const measuredWidth = event.nativeEvent.layoutMeasurement.width || viewerWidth;
                  const index = Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / measuredWidth)));
                  if (!setActiveImage(index)) return;
                  scrollHeroTo(index, false);
                }}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export function HotelRoomOptionsModal({ visible, onClose, options, theme, accentColor }: { visible: boolean; onClose: () => void; options: PresentedHotelRoomOption[]; theme: HotelTheme; accentColor: string; }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={[s.modal, { backgroundColor: theme.surface }]}>
          <View style={s.modalHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>Room options</Text>
              <Text style={[s.copy, { color: theme.textSecondary }]}>Indicative planning choices. Final prices, availability, and terms are confirmed before booking.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close room options" onPress={onClose} style={s.close}><X color={theme.icon} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={s.optionList}>
            {options.map((option) => (
              <View key={option.id} style={[s.option, { borderColor: theme.border }]}>
                <Text style={[s.optionName, { color: theme.textPrimary }]}>{option.name}</Text>
                <Text style={[s.copy, { color: theme.textSecondary }]}>{[option.bedConfiguration, option.mealPlan].filter(Boolean).join(" · ")}</Text>
                <Text accessibilityLabel={option.displayPrice ? `${option.displayPrice.total.accessibilityLabel} total` : "Price unavailable"} style={[s.optionPrice, { color: theme.textPrimary }]}>{option.displayPrice ? `${option.displayPrice.total.formatted} total` : "Price unavailable"}</Text>
                <Text accessibilityLabel={option.displayPrice ? `${option.displayPrice.nightly.accessibilityLabel} per night. ${option.cancellationInfo}` : `Price unavailable. ${option.cancellationInfo}`} style={[s.copy, { color: theme.textSecondary }]}>{option.displayPrice ? `${option.displayPrice.nightly.formatted} per night` : "Price unavailable"} · {option.cancellationInfo}</Text>
                <Text style={[s.planning, { color: accentColor }]}>Planning option · indicative price</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  gallery: { width: "100%", marginBottom: 0 },
  heroFrame: { width: "100%", overflow: "hidden", backgroundColor: "#DCE2EB" },
  hero: { backgroundColor: "#DCE2EB" },
  heroImage: { width: "100%", height: "100%" },
  counter: { position: "absolute", left: "50%", bottom: 15, minWidth: 48, transform: [{ translateX: -24 }], color: "white", backgroundColor: "rgba(0,0,0,.72)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4, fontSize: 13, lineHeight: 18, fontWeight: "800", fontFamily: appFonts.extraBold, textAlign: "center" },
  unavailable: { width: "100%", alignItems: "center", justifyContent: "center" },
  unavailableText: { fontSize: 13, lineHeight: 19, fontFamily: appFonts.regular },
  galleryModal: { flex: 1, position: "relative" },
  galleryHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  galleryHeaderAction: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  galleryTitle: { flex: 1, minWidth: 0, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "700", fontFamily: appFonts.bold },
  galleryOverviewContent: { gap: 8, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 24 },
  galleryLargeFrame: { width: "100%", height: 230, overflow: "hidden", borderRadius: 10 },
  galleryPairRow: { flexDirection: "row", gap: 8 },
  galleryPairFrame: { flex: 1, minWidth: 0, height: 170, overflow: "hidden", borderRadius: 10 },
  galleryOverviewImage: { width: "100%", height: "100%" },
  viewerOverlay: { ...StyleSheet.absoluteFillObject },
  viewerHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  viewerCounter: { flex: 1, textAlign: "center", fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  viewerPager: { flex: 1 },
  viewerPage: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  viewerImage: { width: "100%", height: "100%" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", justifyContent: "flex-end" },
  modal: { maxHeight: "82%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28 },
  modalHeading: { flexDirection: "row", gap: 12 },
  modalTitle: { fontSize: 21, lineHeight: 27, fontWeight: "900", fontFamily: appFonts.black, marginBottom: 4 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  optionList: { gap: 12, paddingTop: 18 },
  option: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  optionName: { fontSize: 15, fontWeight: "900", fontFamily: appFonts.black },
  optionPrice: { fontSize: 18, fontWeight: "900", fontFamily: appFonts.black, marginTop: 4 },
  copy: { fontSize: 12, lineHeight: 18, fontFamily: appFonts.regular },
  planning: { fontSize: 11, fontWeight: "800", fontFamily: appFonts.extraBold },
});