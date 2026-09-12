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
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
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
  const heroWidth = viewportWidth;
  const heroHeight = Math.round(viewportWidth * 0.94);
  const viewerInsetTop = Math.max(insets.top, 12);
  const viewerInsetRight = Math.max(insets.right, 12);
  const viewerInsetBottom = Math.max(insets.bottom, 12);
  const viewerInsetLeft = Math.max(insets.left, 12);
  const viewerWidth = viewportWidth - viewerInsetLeft - viewerInsetRight;
  const images = initialImages.filter(
    (url, index) =>
      Boolean(url) && initialImages.indexOf(url) === index && !failed.has(url),
  );
  const [activeUrl, setActiveUrl] = useState<string | null>(images[0] ?? null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const scroll = useRef<FlatList<string>>(null);
  const viewerScroll = useRef<FlatList<string>>(null);
  const viewerThumbnails = useRef<ScrollView>(null);
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
  const scrollInlineTo = (index: number, animated: boolean) => {
    if (!images[index]) return;
    scroll.current?.scrollToIndex({ index, animated });
  };
  const scrollViewerTo = (index: number, animated: boolean) => {
    if (!images[index]) return;
    viewerScroll.current?.scrollToIndex({ index, animated });
  };
  const keepViewerThumbnailVisible = (index: number) =>
    viewerThumbnails.current?.scrollTo({
      x: Math.max(0, index * 104 - viewerWidth / 2 + 48),
      animated: true,
    });
  const chooseInViewer = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollViewerTo(index, true);
    scrollInlineTo(index, false);
    keepViewerThumbnailVisible(index);
  };
  const moveInViewer = (delta: number) => chooseInViewer((activeIndex + delta + images.length) % images.length);
  const openViewer = (index: number) => {
    if (!setActiveImage(index)) return;
    scrollInlineTo(index, false);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
  const fail = (url: string) => setFailed((current) => new Set(current).add(url));
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
      accessibilityLabel={`Open photo ${index + 1} of ${images.length} for ${name}`}
      accessibilityHint={images.length > 1 ? "Swipe horizontally to view more photos." : undefined}
      onPress={() => openViewer(index)}
    >
      <Image source={{ uri: url }} resizeMode="cover" style={s.heroImage} accessible={false} onError={() => fail(url)} />
    </Pressable>
  );
  const renderViewerImage = ({ item: url, index }: { item: string; index: number }) => (
    <View style={[s.viewerPage, { width: viewerWidth }]}>
      <Image source={{ uri: url }} resizeMode="contain" style={s.viewerImage} accessibilityLabel={`${name} photo ${index + 1}`} onError={() => fail(url)} />
    </View>
  );
  return (
    <View style={s.gallery}>
      <View style={[s.heroFrame, { height: heroHeight }]}>
        <FlatList
          ref={scroll}
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
      <Modal visible={viewerOpen} animationType="fade" transparent presentationStyle="overFullScreen" onRequestClose={closeViewer} onShow={() => { scrollViewerTo(activeIndex, false); keepViewerThumbnailVisible(activeIndex); }}>
        <View accessibilityViewIsModal style={[s.viewerBackdrop, { paddingTop: viewerInsetTop, paddingRight: viewerInsetRight, paddingBottom: viewerInsetBottom, paddingLeft: viewerInsetLeft }]}>
          <View style={s.viewerDialog}>
            <View style={s.viewerHeader}>
              <Text accessibilityRole="header" numberOfLines={1} style={s.viewerTitle}>Photos for {name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close photo viewer" onPress={closeViewer} style={s.viewerClose}><X color="#0F172A" size={20} /></Pressable>
            </View>
            <View style={s.viewerStage}>
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
                  scrollInlineTo(index, false);
                  keepViewerThumbnailVisible(index);
                }}
              />
              {images.length > 1 ? <><Pressable accessibilityRole="button" accessibilityLabel="Previous photo" onPress={() => moveInViewer(-1)} style={[s.viewerArrow, s.viewerLeft]}><ChevronLeft color="#0F172A" size={24} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Next photo" onPress={() => moveInViewer(1)} style={[s.viewerArrow, s.viewerRight]}><ChevronRight color="#0F172A" size={24} /></Pressable></> : null}
              <Text style={s.viewerCounter}>{activeIndex + 1} of {images.length} photos</Text>
            </View>
            {images.length > 1 ? (
              <ScrollView ref={viewerThumbnails} style={s.viewerThumbnailScroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.viewerThumbnailStrip}>
                {images.map((url, index) => (
                  <Pressable key={url} accessibilityRole="button" accessibilityLabel={`Show photo ${index + 1}`} accessibilityState={{ selected: activeIndex === index }} onPress={() => chooseInViewer(index)} style={[s.viewerThumbnailFrame, activeIndex === index && s.viewerThumbnailActive, activeIndex === index && { borderColor: accentColor }]}>
                    <Image source={{ uri: url }} resizeMode="cover" style={s.viewerThumbnail} onError={() => fail(url)} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
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
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(2,6,23,.90)", alignItems: "stretch", justifyContent: "center" },
  viewerDialog: { flex: 1, minHeight: 0, width: "100%", borderRadius: 16, overflow: "hidden", backgroundColor: "#020617" },
  viewerHeader: { flexDirection: "row", flexShrink: 0, alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 8, paddingVertical: 8 },
  viewerTitle: { flex: 1, minWidth: 0, color: "white", fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  viewerClose: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" },
  viewerStage: { flex: 1, minHeight: 0, position: "relative" },
  viewerPager: { flex: 1 },
  viewerPage: { flex: 1, height: "100%" },
  viewerImage: { width: "100%", height: "100%" },
  viewerArrow: { position: "absolute", top: "50%", marginTop: -24, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.9)", borderWidth: 1, borderColor: "rgba(255,255,255,.55)" },
  viewerLeft: { left: 4 },
  viewerRight: { right: 4 },
  viewerCounter: { position: "absolute", alignSelf: "center", bottom: 8, color: "white", backgroundColor: "rgba(2,6,23,.8)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, fontSize: 12, lineHeight: 16, fontWeight: "600", fontFamily: appFonts.semibold },
  viewerThumbnailScroller: { flexGrow: 0, flexShrink: 0 },
  viewerThumbnailStrip: { gap: 8, paddingHorizontal: 8, paddingVertical: 12 },
  viewerThumbnailFrame: { width: 96, height: 64, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,.4)" },
  viewerThumbnailActive: { borderWidth: 3 },
  viewerThumbnail: { width: "100%", height: "100%" },
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