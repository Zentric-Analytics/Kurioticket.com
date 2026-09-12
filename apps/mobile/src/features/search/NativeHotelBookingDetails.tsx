import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Award,
  Bed,
  ChevronRight,
  Laptop,
  Sparkles,
  UtensilsCrossed,
  Wifi,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import {
  buildHotelAmenityPresentation,
  type HotelAmenityPresentationItem,
} from "../../../../../src/components/results/hotelAmenityPresentation";
import type { HotelResult } from "../../api/travelApi";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { nativeHotelAmenityLabel } from "./hotelAmenityLabel";
import { NativeHotelLocationSection } from "./NativeHotelLocationSection";
import { NativeRelatedHotelsSection } from "./NativeHotelDecisionSections";
import type { NativeRelatedHotel } from "./nativeHotelRelatedHotelsModel";
import {
  buildNativeHotelAboutCopy,
  buildNativeHotelAmenityGroups,
} from "./nativeHotelBookingDetailsModel";

type Theme = {
  dark: boolean;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  icon: string;
};

type HotelDetailsStatus = "loading" | "ready" | "error";

function amenityIconFor(item: HotelAmenityPresentationItem): LucideIcon {
  if (item.iconKey === "wifi") return Wifi;
  if (item.iconKey === "restaurant") return UtensilsCrossed;
  if (item.iconKey === "workspace") return Laptop;
  if (item.iconKey === "bar" || item.iconKey === "lounge") return Wine;
  if (item.iconKey === "quietRooms" || item.iconKey === "airConditioning") return Bed;
  return Sparkles;
}

export function NativeHotelBookingDetails({
  result,
  property,
  detailsStatus,
  classification,
  relatedHotels,
  theme,
  onViewHotel,
}: {
  result: HotelResult;
  property: PublicHotelPropertyDetails | null;
  detailsStatus: HotelDetailsStatus;
  classification: number | null;
  relatedHotels: NativeRelatedHotel[];
  theme: Theme;
  onViewHotel: (item: NativeRelatedHotel) => void;
}) {
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const accent = theme.dark ? "#8FB5FF" : colors.blue;
  const amenityItems = buildHotelAmenityPresentation(
    result.amenities,
    result.amenities.length,
  ).map((item) => ({ ...item, label: nativeHotelAmenityLabel(item) }));
  const popularAmenities = amenityItems.slice(0, 4);
  const amenityGroups = buildNativeHotelAmenityGroups(amenityItems);
  const aboutCopy = property
    ? buildNativeHotelAboutCopy({
        name: result.name,
        property,
        classification,
      })
    : detailsStatus === "loading"
      ? ""
      : "A property description is not available yet.";

  return (
    <>
      <View style={s.section}>
        <Text accessibilityRole="header" style={[s.heading, { color: theme.textPrimary }]}>About this hotel</Text>
        {aboutCopy ? (
          <Text style={[s.description, { color: theme.textSecondary }]}>{aboutCopy}</Text>
        ) : null}
      </View>

      <SectionDivider color={theme.border} />

      <View style={s.section}>
        <Text accessibilityRole="header" style={[s.heading, { color: theme.textPrimary }]}>Popular amenities</Text>
        {popularAmenities.length ? (
          <View style={s.rowList}>
            {popularAmenities.map((item) => {
              const Icon = amenityIconFor(item);
              return (
                <View key={item.key} style={s.amenityRow}>
                  <Icon accessible={false} size={19} color={accent} />
                  <Text style={[s.rowText, { color: theme.textSecondary }]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        ) : detailsStatus !== "loading" ? (
          <Text style={[s.fallback, { color: theme.textSecondary }]}>Property highlights are not available yet.</Text>
        ) : null}
        {amenityItems.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all amenities"
            onPress={() => setAmenitiesOpen(true)}
            style={({ pressed }) => [
              s.seeAllRow,
              { borderTopColor: theme.border },
              pressed && s.pressed,
            ]}
          >
            <Text style={[s.seeAllText, { color: accent }]}>See all amenities</Text>
            <ChevronRight accessible={false} size={20} color={accent} />
          </Pressable>
        ) : null}
      </View>

      <SectionDivider color={theme.border} />

      {property || detailsStatus !== "loading" ? (
        <NativeHotelLocationSection
          hotelId={result.id}
          hotelName={result.name}
          propertyDetails={property}
          theme={theme}
        />
      ) : null}

      <SectionDivider color={theme.border} />

      <View style={s.section}>
        <Text accessibilityRole="header" style={[s.heading, { color: theme.textPrimary }]}>Room &amp; comfort</Text>
        <View style={s.rowList}>
          {[property?.roomSummary, property?.bedSummary]
            .filter((value): value is string => Boolean(value?.trim()))
            .map((value) => (
              <View key={value} style={s.infoRow}>
                <Bed accessible={false} size={18} color={theme.icon} />
                <Text style={[s.rowText, { color: theme.textSecondary }]}>{value}</Text>
              </View>
            ))}
          {detailsStatus !== "loading" && !property?.roomSummary && !property?.bedSummary ? (
            <Text style={[s.rowText, { color: theme.textSecondary }]}>Room details are confirmed when you choose a room.</Text>
          ) : null}
        </View>
      </View>

      <SectionDivider color={theme.border} />

      <View style={s.section}>
        <Text accessibilityRole="header" style={[s.heading, { color: theme.textPrimary }]}>Hotel information</Text>
        <View style={s.rowList}>
          {property?.propertyType ? (
            <View style={s.infoRow}>
              <Award accessible={false} size={18} color={theme.icon} />
              <Text style={[s.rowText, { color: theme.textSecondary }]}>{property.propertyType}</Text>
            </View>
          ) : null}
          <View style={s.infoRow}>
            <Award accessible={false} size={18} color={theme.icon} />
            <Text style={[s.rowText, { color: theme.textSecondary }]}>
              {classification ? `${classification}-star classification` : "Hotel classification is not available."}
            </Text>
          </View>
        </View>
      </View>

      <SectionDivider color={theme.border} />

      <View style={s.section}>
        <Text accessibilityRole="header" style={[s.heading, { color: theme.textPrimary }]}>Accessibility</Text>
        {property?.accessibility?.length ? (
          <View style={s.accessibilityList}>
            {property.accessibility.map((detail) => (
              <View key={detail} style={s.accessibilityRow}>
                <Text accessible={false} style={[s.bullet, { color: accent }]}>•</Text>
                <Text style={[s.accessibilityText, { color: theme.textSecondary }]}>{detail}</Text>
              </View>
            ))}
          </View>
        ) : detailsStatus !== "loading" ? (
          <Text style={[s.description, { color: theme.textSecondary }]}>Specific accessibility features should be confirmed before booking.</Text>
        ) : null}
      </View>

      <SectionDivider color={theme.border} />

      <NativeRelatedHotelsSection
        city={property?.city}
        hotels={relatedHotels}
        theme={theme}
        onViewHotel={onViewHotel}
      />

      <Modal
        visible={amenitiesOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAmenitiesOpen(false)}
      >
        <View style={s.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close all amenities"
            style={StyleSheet.absoluteFill}
            onPress={() => setAmenitiesOpen(false)}
          />
          <SafeAreaView edges={["bottom"]} style={[s.sheet, { backgroundColor: theme.surface }]}>
            <View style={[s.sheetHeader, { borderBottomColor: theme.border }]}>
              <Text accessibilityRole="header" style={[s.sheetTitle, { color: theme.textPrimary }]}>All amenities</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close all amenities"
                onPress={() => setAmenitiesOpen(false)}
                style={s.closeButton}
              >
                <X size={21} color={theme.icon} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.sheetScroll}
            >
              {amenityGroups.map((group, groupIndex) => (
                <View
                  key={group.title}
                  style={groupIndex ? s.amenityGroupSpaced : undefined}
                >
                  <Text style={[s.groupTitle, { color: theme.textPrimary }]}>{group.title}</Text>
                  <View style={s.groupRows}>
                    {group.items.map((item) => {
                      const Icon = amenityIconFor(item);
                      return (
                        <View key={item.key} style={s.sheetAmenityRow}>
                          <Icon accessible={false} size={19} color={accent} />
                          <Text style={[s.sheetAmenityText, { color: theme.textSecondary }]}>{item.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function SectionDivider({ color }: { color: string }) {
  return <View accessible={false} style={[s.divider, { backgroundColor: color }]} />;
}

const s = StyleSheet.create({
  section: { paddingVertical: 4 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700", fontFamily: appFonts.bold, letterSpacing: -0.25 },
  description: { marginTop: 8, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
  fallback: { marginTop: 6, fontSize: 13, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  rowList: { marginTop: 8, gap: 8 },
  amenityRow: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 10 },
  infoRow: { minHeight: 24, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
  seeAllRow: { minHeight: 44, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAllText: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontFamily: appFonts.semibold },
  pressed: { opacity: 0.58 },
  accessibilityList: { marginTop: 8, gap: 6 },
  accessibilityRow: { flexDirection: "row", alignItems: "flex-start" },
  bullet: { width: 20, fontSize: 14, lineHeight: 24 },
  accessibilityText: { flex: 1, fontSize: 13, lineHeight: 22, fontWeight: "400", fontFamily: appFonts.regular },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,6,23,.42)" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  sheetHeader: { minHeight: 58, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700", fontFamily: appFonts.bold },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetScroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  amenityGroupSpaced: { marginTop: 20 },
  groupTitle: { fontSize: 15, lineHeight: 21, fontWeight: "700", fontFamily: appFonts.bold },
  groupRows: { marginTop: 8, gap: 9 },
  sheetAmenityRow: { minHeight: 26, flexDirection: "row", alignItems: "center", gap: 10 },
  sheetAmenityText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "400", fontFamily: appFonts.regular },
});