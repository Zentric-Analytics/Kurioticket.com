import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  AccessibilityInfo,
  ImageBackground,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { airports, type Airport } from "../flow/airportData";
import { FlowIcon, type FlowIconName } from "../flow/FlowIcon";
import { locationImageByCity } from "../flow/locationCatalogue";
import { FEATURED_DESTINATIONS, HERO_SLIDES, INTERESTS, QUICK_DESTINATIONS } from "./exploreData";
import {
  countries,
  destinationSections,
  exactExploreResult,
  exploreActionCardLayout,
  exploreBottomPadding,
  regions,
  searchExplore,
  shouldShowExploreFloatingAction,
  type DestinationGroup,
} from "./exploreModels";
import { navigateFromDestination, selectFromBrowser, type DestinationProduct } from "./exploreInteractionModels";
import { useSavedDestinations } from "../../storage/useSavedDestinations";

const NAVY = "#071A48";
const BLUE = "#0754F7";
const MUTED = "#66728F";
const BORDER = "#E5EAF3";
const SKY = "#EEF4FF";
const HEART = "#F04465";
const PAGE_MARGIN = 18;

type Tab = "Destinations" | "Inspiration" | "Compare";
type Browser = {
  title: string;
  subtitle: string;
  destinations?: readonly Airport[];
  groups?: DestinationGroup[];
} | null;

const airportFor = (city: string) => airports.find((airport) => airport.city === city);
const countLabel = (count: number) => `${count} destination${count === 1 ? "" : "s"}`;

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text accessibilityRole="header" style={styles.pageTitle}>Explore</Text>
        <Text style={styles.pageSubtitle}>Discover places from our current catalogue</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Price alerts"
        onPress={() => router.push("/price-alerts")}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <FlowIcon name="bell" color={NAVY} size={23} />
        <View style={styles.alertDot} />
      </Pressable>
    </View>
  );
}

function SearchBar({ inputRef, query, onChange, onSubmit }: {
  inputRef: RefObject<TextInput | null>;
  query: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <FlowIcon name="search" color={focused ? BLUE : NAVY} size={21} />
      <TextInput
        ref={inputRef}
        accessibilityLabel="Explore search"
        accessibilityHint="Search destinations, countries or interests"
        value={query}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        placeholder="Search destinations, countries or interests"
        placeholderTextColor="#7B849F"
        style={styles.searchInput}
      />
      {query ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear Explore search"
          onPress={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          style={styles.clearButton}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {(["Destinations", "Inspiration", "Compare"] as const).map((item) => {
        const selected = tab === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(item)}
            style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{item}</Text>
            {selected ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeader({ title, count, action, onAction }: {
  title: string;
  count?: number;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingCopy}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        {typeof count === "number" ? <Text style={styles.sectionCount}>{countLabel(count)}</Text> : null}
      </View>
      {onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action ?? "Browse"}</Text>
          <FlowIcon name="chevron" color={BLUE} size={15} />
        </Pressable>
      ) : null}
    </View>
  );
}

function HeartButton({ city, saved, onPress, compact = false }: {
  city: string;
  saved: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${saved ? "Remove" : "Save"} ${city}`}
      accessibilityState={{ selected: saved }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [compact ? styles.smallHeart : styles.heart, pressed && styles.pressed]}
    >
      <FlowIcon name="heart" color={saved ? HEART : NAVY} size={compact ? 18 : 23} />
    </Pressable>
  );
}

function PhotoDestinationCard({ airport, saved, onSelect, onToggle, label }: {
  airport: Airport;
  saved: boolean;
  onSelect: () => void;
  onToggle: () => void;
  label?: string;
}) {
  const image = locationImageByCity(airport.city);
  return (
    <View style={styles.photoCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open actions for ${airport.city}, ${airport.country}, ${airport.code}`}
        onPress={onSelect}
        style={({ pressed }) => [styles.photoCardMain, pressed && styles.cardPressed]}
      >
        {image ? (
          <ImageBackground source={image} resizeMode="cover" style={styles.photoCardImage}>
            <View style={styles.photoShade} />
            {label ? <View style={styles.photoLabel}><Text style={styles.photoLabelText}>{label}</Text></View> : null}
          </ImageBackground>
        ) : (
          <View style={[styles.photoCardImage, styles.photoFallback]}>
            <View style={styles.fallbackOrb} />
            <FlowIcon name="compass" color="white" size={38} />
            <Text style={styles.fallbackCode}>{airport.code}</Text>
          </View>
        )}
        <View style={styles.photoInfo}>
          <View style={styles.photoCopy}>
            <Text numberOfLines={1} style={styles.photoTitle}>{airport.city}</Text>
            <Text numberOfLines={1} style={styles.photoMeta}>{airport.country} · {airport.code}</Text>
          </View>
          <View style={styles.roundArrow}><FlowIcon name="chevron" color={NAVY} size={18} /></View>
        </View>
      </Pressable>
      <HeartButton city={airport.city} saved={saved} onPress={onToggle} />
    </View>
  );
}

function SavedCard({ airport, onSelect, onToggle }: {
  airport: Airport;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const image = locationImageByCity(airport.city);
  return (
    <View style={styles.savedCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open actions for saved destination ${airport.city}`}
        onPress={onSelect}
        style={({ pressed }) => [styles.savedCardMain, pressed && styles.cardPressed]}
      >
        {image ? (
          <ImageBackground source={image} resizeMode="cover" style={styles.savedImage} />
        ) : (
          <View style={[styles.savedImage, styles.savedFallback]}>
            <FlowIcon name="compass" color="white" size={25} />
            <Text style={styles.savedFallbackCode}>{airport.code}</Text>
          </View>
        )}
        <View style={styles.savedInfo}>
          <Text numberOfLines={1} style={styles.savedTitle}>{airport.city}</Text>
          <Text numberOfLines={1} style={styles.savedMeta}>{airport.country} · {airport.code}</Text>
        </View>
      </Pressable>
      <View style={styles.savedHeartPosition}>
        <HeartButton city={airport.city} saved onPress={onToggle} compact />
      </View>
    </View>
  );
}

function DiscoveryShortcut({ icon, title, onPress }: {
  icon: FlowIconName;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.discoveryShortcut, pressed && styles.cardPressed]}
    >
      <View style={styles.discoveryIcon}><FlowIcon name={icon} color={BLUE} size={20} /></View>
      <Text numberOfLines={1} style={styles.discoveryTitle}>{title}</Text>
    </Pressable>
  );
}

function ExploreActionCard({ icon, title, copy, width, onPress }: {
  icon: FlowIconName;
  title: string;
  copy: string;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${copy}`}
      onPress={onPress}
      style={({ pressed }) => [styles.exploreActionCard, { width }, pressed && styles.cardPressed]}
    >
      <View style={styles.exploreActionIcon}><FlowIcon name={icon} color={BLUE} size={21} /></View>
      <View style={styles.exploreActionCopy}>
        <Text style={styles.exploreActionTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.exploreActionMeta}>{copy}</Text>
      </View>
      <FlowIcon name="chevron" color={NAVY} size={16} />
    </Pressable>
  );
}

function ResultRow({ airport, saved, interest, onSelect, onToggle }: {
  airport: Airport;
  saved: boolean;
  interest?: string;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={styles.resultCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open actions for ${airport.city}, ${airport.country}, ${airport.code}`}
        onPress={onSelect}
        style={styles.resultMain}
      >
        <View style={styles.resultIcon}><FlowIcon name="location" color={BLUE} size={20} /></View>
        <View style={styles.resultCopy}>
          {interest ? <Text style={styles.interestMatch}>Interest match: {interest}</Text> : null}
          <Text style={styles.resultTitle}>{airport.city}</Text>
          <Text style={styles.resultMeta}>{airport.country} · {airport.code}</Text>
        </View>
      </Pressable>
      <HeartButton city={airport.city} saved={saved} onPress={onToggle} compact />
    </View>
  );
}

function EmptySavedState() {
  return (
    <View style={styles.emptySaved}>
      <View style={styles.emptySavedIcon}><FlowIcon name="heart" color={MUTED} size={24} /></View>
      <View style={styles.emptySavedCopy}>
        <Text style={styles.emptySavedTitle}>No saved destinations yet</Text>
        <Text style={styles.emptySavedText}>Tap a heart to keep a destination close at hand.</Text>
      </View>
    </View>
  );
}

function DestinationsTab({
  width,
  savedIds,
  savedAirports,
  onSelect,
  onToggle,
  onBrowse,
  onShowInspiration,
}: {
  width: number;
  savedIds: ReadonlySet<string>;
  savedAirports: Airport[];
  onSelect: (airport: Airport) => void;
  onToggle: (code: string) => void;
  onBrowse: (browser: NonNullable<Browser>) => void;
  onShowInspiration: () => void;
}) {
  const sections = destinationSections();
  const actionLayout = exploreActionCardLayout(width);
  const featured = FEATURED_DESTINATIONS[0]?.airport ?? airports[0]!;
  const allBrowser = {
    title: "All destinations",
    subtitle: "Destinations in our current airport catalogue.",
    destinations: airports,
  } satisfies NonNullable<Browser>;

  return (
    <View style={styles.tabContent}>
      <View style={styles.discoveryGrid}>
        <DiscoveryShortcut icon="globe" title="Countries" onPress={() => onBrowse({
          title: "Browse countries",
          subtitle: "Countries represented in our current catalogue.",
          groups: countries(),
        })} />
        <DiscoveryShortcut icon="map" title="Regions" onPress={() => onBrowse({
          title: "Browse regions",
          subtitle: "Product-maintained groupings for the current catalogue.",
          groups: regions(),
        })} />
        <DiscoveryShortcut icon="compass" title="Interests" onPress={onShowInspiration} />
        <DiscoveryShortcut icon="heart" title="Saved" onPress={() => onBrowse({
          title: "Saved destinations",
          subtitle: savedAirports.length ? "Destinations saved on this device." : "Saved destinations will appear here after you tap a heart.",
          destinations: savedAirports,
        })} />
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Featured destination" action="Browse all" onAction={() => onBrowse(allBrowser)} />
        <PhotoDestinationCard
          airport={featured}
          saved={savedIds.has(featured.code)}
          onSelect={() => onSelect(featured)}
          onToggle={() => onToggle(featured.code)}
          label="Featured"
        />
      </View>

      {sections.map((section) => (
        <View key={section.name} style={styles.sectionBlock}>
          <SectionHeader
            title={section.name}
            count={section.destinations.length}
            onAction={() => onBrowse({
              title: section.name,
              subtitle: `${countLabel(section.destinations.length)} in this maintained catalogue grouping.`,
              destinations: section.destinations,
            })}
          />
          <PhotoDestinationCard
            airport={section.lead}
            saved={savedIds.has(section.lead.code)}
            onSelect={() => onSelect(section.lead)}
            onToggle={() => onToggle(section.lead.code)}
          />
        </View>
      ))}

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Saved destinations"
          action={savedAirports.length ? "See all" : undefined}
          onAction={savedAirports.length ? () => onBrowse({
            title: "Saved destinations",
            subtitle: "Destinations saved on this device.",
            destinations: savedAirports,
          }) : undefined}
        />
        {savedAirports.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRow}>
            {savedAirports.map((airport) => (
              <SavedCard
                key={airport.code}
                airport={airport}
                onSelect={() => onSelect(airport)}
                onToggle={() => onToggle(airport.code)}
              />
            ))}
          </ScrollView>
        ) : <EmptySavedState />}
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Quick destinations" />
        <View style={styles.quickGrid}>
          {QUICK_DESTINATIONS.map(([city]) => {
            const airport = airportFor(city);
            return airport ? (
              <Pressable
                key={city}
                accessibilityRole="button"
                accessibilityLabel={`Open actions for ${city}`}
                onPress={() => onSelect(airport)}
                style={({ pressed }) => [styles.quickChip, pressed && styles.cardPressed]}
              >
                <View style={styles.quickIcon}><FlowIcon name="location" color={BLUE} size={17} /></View>
                <Text numberOfLines={1} style={styles.quickText}>{city}</Text>
              </Pressable>
            ) : null;
          })}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Explore more" />
        <View style={[styles.exploreActionGrid, { gap: actionLayout.gap }]}>
          <ExploreActionCard icon="globe" title="Browse countries" copy="View destinations by country." width={actionLayout.cardWidth} onPress={() => onBrowse({
            title: "Browse countries",
            subtitle: "Countries represented in our current catalogue.",
            groups: countries(),
          })} />
          <ExploreActionCard icon="map" title="Browse regions" copy="Open maintained regional groups." width={actionLayout.cardWidth} onPress={() => onBrowse({
            title: "Browse regions",
            subtitle: "Product-maintained groupings for the current catalogue.",
            groups: regions(),
          })} />
          <ExploreActionCard icon="flight" title="Search flights" copy="Start a validated flight search." width={actionLayout.cardWidth} onPress={() => router.push("/flights")} />
          <ExploreActionCard icon="hotel" title="Search hotels" copy="Find stays for your destination." width={actionLayout.cardWidth} onPress={() => router.push("/hotels")} />
        </View>
      </View>
    </View>
  );
}

function InspirationTab({ width, onSelect }: { width: number; onSelect: (airport: Airport) => void }) {
  const [active, setActive] = useState(0);
  const heroWidth = Math.max(260, width - PAGE_MARGIN * 2);
  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(event.nativeEvent.contentOffset.x / heroWidth));
  };
  return (
    <View style={styles.tabContent}>
      <View style={styles.inspirationIntro}>
        <Text style={styles.eyebrow}>INSPIRATION</Text>
        <Text accessibilityRole="header" style={styles.inspirationTitle}>Ideas for your next trip</Text>
        <Text style={styles.inspirationCopy}>Choose a maintained theme to open a matching catalogue destination.</Text>
      </View>
      <View style={styles.heroShell} accessibilityLabel={`Inspiration slide ${active + 1} of ${HERO_SLIDES.length}`}>
        <ScrollView horizontal pagingEnabled decelerationRate="fast" showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onEnd}>
          {HERO_SLIDES.map((slide, index) => (
            <Pressable
              key={slide.id}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${slide.destination}, ${slide.label}`}
              onPress={() => {
                const airport = airportFor(slide.destination);
                if (airport) onSelect(airport);
              }}
              style={({ pressed }) => [{ width: heroWidth }, pressed && styles.cardPressed]}
            >
              <ImageBackground source={slide.image} resizeMode="cover" style={styles.hero} imageStyle={styles.heroRadius}>
                <View style={styles.heroShade} />
                <View style={styles.heroIndex}><Text style={styles.heroIndexText}>{index + 1}/{HERO_SLIDES.length}</Text></View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroLabel}>{slide.label}</Text>
                  <Text style={styles.heroTitle}>{slide.destination}</Text>
                  <View style={styles.heroCta}>
                    <Text style={styles.heroCtaText}>Explore {slide.destination}</Text>
                    <FlowIcon name="chevron" color={NAVY} size={16} />
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {HERO_SLIDES.map((slide, index) => <View key={slide.id} style={[styles.dot, index === active && styles.dotActive]} />)}
        </View>
      </View>
      <View style={styles.sectionBlock}>
        <SectionHeader title="Explore by interest" />
        <View style={styles.interestGrid}>
          {INTERESTS.map((item, index) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, mapped to ${item.destination}`}
              onPress={() => {
                const airport = airportFor(item.destination);
                if (airport) onSelect(airport);
              }}
              style={({ pressed }) => [styles.interestCard, pressed && styles.cardPressed]}
            >
              <View style={[styles.interestIcon, index % 3 === 1 && styles.interestIconPurple, index % 3 === 2 && styles.interestIconGreen]}>
                <FlowIcon name={item.icon} color={BLUE} size={21} />
              </View>
              <Text style={styles.interestTitle}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.interestMeta}>{item.destination}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function CompareTab() {
  const actions = [
    { icon: "flight" as const, title: "Flights", copy: "Compare provider-backed flight options.", route: "/flights", tone: styles.compareBlue },
    { icon: "hotel" as const, title: "Hotels", copy: "Search stays for your destination.", route: "/hotels", tone: styles.comparePurple },
    { icon: "car" as const, title: "Rental cars", copy: "Search available rental-car options.", route: "/cars", tone: styles.compareGreen },
    { icon: "bell" as const, title: "Price alerts", copy: "Track a valid live flight search.", route: "/price-alerts", tone: styles.compareOrange },
  ];
  return (
    <View style={styles.tabContent}>
      <View style={styles.compareIntro}>
        <Text style={styles.compareEyebrow}>TRAVEL TOOLS</Text>
        <Text accessibilityRole="header" style={styles.compareHeading}>Compare travel options</Text>
        <Text style={styles.compareIntroText}>Choose a product to continue with a validated search or price-tracking journey.</Text>
      </View>
      <View style={styles.compareList}>
        {actions.map((action) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={`${action.title}. ${action.copy}`}
            onPress={() => router.push(action.route as never)}
            style={({ pressed }) => [styles.compareCard, pressed && styles.cardPressed]}
          >
            <View style={[styles.compareIcon, action.tone]}><FlowIcon name={action.icon} color={BLUE} size={27} /></View>
            <View style={styles.compareCopy}>
              <Text style={styles.compareTitle}>{action.title}</Text>
              <Text style={styles.compareMeta}>{action.copy}</Text>
            </View>
            <FlowIcon name="chevron" color={NAVY} size={18} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SheetAction({ icon, label, onPress }: { icon: FlowIconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}>
      <View style={styles.sheetActionIcon}><FlowIcon name={icon} color={NAVY} size={22} /></View>
      <Text style={styles.sheetActionText}>{label}</Text>
      <FlowIcon name="chevron" color={NAVY} size={17} />
    </Pressable>
  );
}

function DestinationAction({ airport, saved, onToggle, onClose }: {
  airport: Airport | null;
  saved: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const navigating = useRef(false);
  useEffect(() => { navigating.current = false; }, [airport]);
  const navigate = (product: DestinationProduct) => {
    if (!airport) return;
    navigateFromDestination(airport, product, onClose, (route, destination) => {
      router.push({ pathname: `/${route}`, params: { destination } });
    }, navigating);
  };
  const image = airport ? locationImageByCity(airport.city) : undefined;
  return (
    <Modal visible={Boolean(airport)} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetPressable} onPress={(event) => event.stopPropagation()}>
          <SafeAreaView edges={["bottom"]} style={styles.sheet} accessibilityLabel="Destination actions">
            <View style={styles.sheetHandle} />
            {airport ? (
              <>
                {image ? (
                  <ImageBackground source={image} resizeMode="cover" style={styles.sheetImage} imageStyle={styles.sheetImageRadius}>
                    <View style={styles.sheetImageShade} />
                    <HeartButton city={airport.city} saved={saved} onPress={onToggle} />
                  </ImageBackground>
                ) : null}
                <View style={styles.sheetHeading}>
                  <Text accessibilityRole="header" numberOfLines={2} style={styles.sheetTitle}>{airport.city}</Text>
                  <Text style={styles.sheetMeta}>{airport.country} · {airport.code}</Text>
                </View>
                <View style={styles.sheetActions}>
                  <SheetAction icon="heart" label={saved ? "Remove from saved destinations" : "Save destination"} onPress={onToggle} />
                  <SheetAction icon="flight" label="Search flights" onPress={() => navigate("flights")} />
                  <SheetAction icon="hotel" label="Search hotels" onPress={() => navigate("hotels")} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close destination actions" onPress={onClose} style={styles.sheetClose}>
                  <Text style={styles.sheetCloseText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BrowserModal({ browser, saved, close, select, toggle }: {
  browser: Browser;
  saved: ReadonlySet<string>;
  close: () => void;
  select: (airport: Airport) => void;
  toggle: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const dismiss = () => {
    setExpanded(null);
    close();
  };
  useEffect(() => { if (!browser) setExpanded(null); }, [browser]);
  const choose = (airport: Airport) => selectFromBrowser(airport, dismiss, select, (open) => requestAnimationFrame(open));
  const empty = Boolean(browser?.destinations && browser.destinations.length === 0);
  return (
    <Modal visible={Boolean(browser)} animationType="slide" onRequestClose={dismiss} accessibilityViewIsModal>
      <SafeAreaView style={styles.browser}>
        <View style={styles.browserTopLine} />
        <View style={styles.browserHeader}>
          <View style={styles.browserHeading}>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.browserTitle}>{browser?.title}</Text>
            <Text style={styles.browserSubtitle}>{browser?.subtitle}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close browser" onPress={dismiss} style={styles.browserClose}>
            <Text style={styles.browserCloseText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.browserList}>
          {empty ? (
            <View style={styles.browserEmpty}>
              <View style={styles.browserEmptyIcon}><FlowIcon name="heart" color={MUTED} size={26} /></View>
              <Text style={styles.browserEmptyTitle}>Nothing here yet</Text>
              <Text style={styles.browserEmptyText}>Save a destination from Explore and it will appear here.</Text>
            </View>
          ) : null}
          {browser?.destinations?.map((airport) => (
            <ResultRow key={airport.code} airport={airport} saved={saved.has(airport.code)} onSelect={() => choose(airport)} onToggle={() => toggle(airport.code)} />
          ))}
          {browser?.groups?.map((group) => {
            const open = expanded === group.name;
            return (
              <View key={group.name} style={styles.browserGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${group.name}, ${countLabel(group.destinations.length)}`}
                  accessibilityState={{ expanded: open }}
                  onPress={() => setExpanded(open ? null : group.name)}
                  style={({ pressed }) => [styles.groupHeader, pressed && styles.pressed]}
                >
                  <View style={styles.groupCopy}>
                    <Text style={styles.groupTitle}>{group.name}</Text>
                    <Text style={styles.groupMeta}>{countLabel(group.destinations.length)}</Text>
                  </View>
                  <View style={[styles.groupChevron, open && styles.groupChevronOpen]}><FlowIcon name="chevron" color={NAVY} size={18} /></View>
                </Pressable>
                {open ? (
                  <View style={styles.groupDestinations}>
                    {group.destinations.map((airport) => (
                      <ResultRow key={airport.code} airport={airport} saved={saved.has(airport.code)} onSelect={() => choose(airport)} onToggle={() => toggle(airport.code)} />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function ExploreScreen() {
  const [tab, setTab] = useState<Tab>("Destinations");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Airport | null>(null);
  const [browser, setBrowser] = useState<Browser>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { savedIds, toggle } = useSavedDestinations();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const results = useMemo(() => searchExplore(query), [query]);
  const savedAirports = airports.filter((airport) => savedIds.has(airport.code));
  const queryActive = Boolean(query.trim());
  const modalOpen = Boolean(browser || selected);
  const showFloatingAction = shouldShowExploreFloatingAction({ tab, queryActive, keyboardVisible, modalOpen });

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (queryActive) void AccessibilityInfo.announceForAccessibility(`${results.length} ${results.length === 1 ? "result" : "results"}`);
  }, [queryActive, results.length]);

  const select = (airport: Airport) => {
    Keyboard.dismiss();
    input.current?.blur();
    setSelected(airport);
  };
  const handleToggle = (code: string) => { void toggle(code); };
  const submit = () => {
    const exact = exactExploreResult(results);
    if (exact) select(exact);
  };
  const openAll = () => setBrowser({
    title: "All destinations",
    subtitle: "Destinations in our current airport catalogue.",
    destinations: airports,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.page, { paddingBottom: exploreBottomPadding(65, insets.bottom) + (showFloatingAction ? 66 : 8) }]}
      >
        <Header />
        <SearchBar inputRef={input} query={query} onChange={setQuery} onSubmit={submit} />
        {queryActive ? (
          <View accessibilityLiveRegion="polite" accessibilityLabel={`${results.length} Explore results`} style={styles.searchResults}>
            <SectionHeader title={`${results.length} result${results.length === 1 ? "" : "s"}`} />
            {results.length ? results.map((result) => (
              <ResultRow
                key={result.airport.code}
                airport={result.airport}
                interest={result.match === "interest" ? result.interest : undefined}
                saved={savedIds.has(result.airport.code)}
                onSelect={() => select(result.airport)}
                onToggle={() => handleToggle(result.airport.code)}
              />
            )) : (
              <View style={styles.noResults}>
                <View style={styles.noResultsIcon}><FlowIcon name="search" color={MUTED} size={26} /></View>
                <Text style={styles.noResultsTitle}>No matching destinations</Text>
                <Text style={styles.noResultsText}>Try a city, airport code, country or maintained interest.</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Tabs tab={tab} onChange={setTab} />
            {tab === "Destinations" ? (
              <DestinationsTab
                width={width}
                savedIds={savedIds}
                savedAirports={savedAirports}
                onSelect={select}
                onToggle={handleToggle}
                onBrowse={setBrowser}
                onShowInspiration={() => setTab("Inspiration")}
              />
            ) : null}
            {tab === "Inspiration" ? <InspirationTab width={width} onSelect={select} /> : null}
            {tab === "Compare" ? <CompareTab /> : null}
          </>
        )}
      </ScrollView>
      {showFloatingAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse all destinations"
          onPress={openAll}
          style={({ pressed }) => [styles.floatingBrowse, { bottom: 76 + Math.max(insets.bottom, 8) }, pressed && styles.floatingPressed]}
        >
          <FlowIcon name="globe" color="white" size={20} />
          <Text style={styles.floatingText}>Browse all</Text>
        </Pressable>
      ) : null}
      <BrowserModal browser={browser} saved={savedIds} close={() => setBrowser(null)} select={select} toggle={handleToggle} />
      <DestinationAction
        airport={selected}
        saved={Boolean(selected && savedIds.has(selected.code))}
        onToggle={() => { if (selected) handleToggle(selected.code); }}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: "#17315E",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9FD" },
  page: { paddingHorizontal: PAGE_MARGIN, gap: 18 },
  pressed: { opacity: 0.72 },
  cardPressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },

  header: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, gap: 2 },
  pageTitle: { color: NAVY, fontSize: 31, lineHeight: 38, fontWeight: "900", letterSpacing: -0.6 },
  pageSubtitle: { color: MUTED, fontSize: 12.5, lineHeight: 18 },
  headerButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "white", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER, ...shadow },
  alertDot: { position: "absolute", top: 9, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF4A3D", borderWidth: 1.5, borderColor: "white" },

  search: { minHeight: 56, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 9, ...shadow },
  searchFocused: { borderColor: BLUE, shadowOpacity: 0.13 },
  searchInput: { flex: 1, minHeight: 54, color: NAVY, fontSize: 13.5 },
  clearButton: { minHeight: 44, justifyContent: "center", paddingLeft: 4 },
  clearText: { color: BLUE, fontWeight: "800", fontSize: 12.5 },

  tabs: { minHeight: 54, borderRadius: 17, padding: 5, flexDirection: "row", gap: 5, backgroundColor: "#EDF1F8", borderWidth: 1, borderColor: "#E7EBF3" },
  tab: { flex: 1, minHeight: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", position: "relative" },
  tabActive: { backgroundColor: "white", ...shadow },
  tabText: { color: MUTED, fontSize: 12.5, fontWeight: "700" },
  tabTextActive: { color: NAVY, fontWeight: "900" },
  tabIndicator: { position: "absolute", bottom: 5, width: 16, height: 2.5, borderRadius: 2, backgroundColor: BLUE },

  tabContent: { gap: 28 },
  sectionBlock: { gap: 12 },
  sectionHeader: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12 },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: NAVY, fontSize: 21, lineHeight: 27, fontWeight: "900", letterSpacing: -0.25 },
  sectionCount: { color: MUTED, fontSize: 12.5, lineHeight: 17 },
  sectionAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 1, paddingLeft: 10 },
  sectionActionText: { color: BLUE, fontSize: 12.5, fontWeight: "800" },

  discoveryGrid: { flexDirection: "row", gap: 10 },
  discoveryShortcut: { flex: 1, minWidth: 0, minHeight: 78, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 7, ...shadow },
  discoveryIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  discoveryTitle: { color: NAVY, fontSize: 10.5, fontWeight: "800", maxWidth: "100%" },

  photoCard: { position: "relative", borderRadius: 22, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, overflow: "hidden", ...shadow },
  photoCardMain: { backgroundColor: "white" },
  photoCardImage: { height: 186, justifyContent: "flex-end", overflow: "hidden" },
  photoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3, 15, 42, 0.12)" },
  photoLabel: { position: "absolute", left: 14, top: 14, minHeight: 29, borderRadius: 15, backgroundColor: "rgba(7, 26, 72, 0.86)", justifyContent: "center", paddingHorizontal: 12 },
  photoLabelText: { color: "white", fontSize: 11.5, fontWeight: "800" },
  photoFallback: { backgroundColor: "#2352A3", alignItems: "center", justifyContent: "center", gap: 8 },
  fallbackOrb: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,.08)", top: -70, right: -30 },
  fallbackCode: { color: "white", fontSize: 27, fontWeight: "900", letterSpacing: 3 },
  photoInfo: { minHeight: 76, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 12, gap: 12, backgroundColor: "white" },
  photoCopy: { flex: 1, gap: 3 },
  photoTitle: { color: NAVY, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  photoMeta: { color: MUTED, fontSize: 12.5 },
  roundArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F3F6FB", alignItems: "center", justifyContent: "center" },
  heart: { position: "absolute", top: 14, right: 14, width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,.96)", alignItems: "center", justifyContent: "center", ...shadow },
  smallHeart: { width: 38, height: 38, borderRadius: 19, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },

  savedRow: { gap: 12, paddingRight: 4 },
  savedCard: { width: 150, borderRadius: 17, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, overflow: "hidden", position: "relative", ...shadow },
  savedCardMain: { backgroundColor: "white" },
  savedImage: { height: 92 },
  savedFallback: { backgroundColor: "#2453A3", alignItems: "center", justifyContent: "center", gap: 4 },
  savedFallbackCode: { color: "white", fontSize: 15, fontWeight: "900", letterSpacing: 2 },
  savedInfo: { minHeight: 60, padding: 11, gap: 3 },
  savedTitle: { color: NAVY, fontSize: 14, fontWeight: "900" },
  savedMeta: { color: MUTED, fontSize: 10.5 },
  savedHeartPosition: { position: "absolute", top: 8, right: 8 },
  emptySaved: { borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  emptySavedIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#F3F5F9", alignItems: "center", justifyContent: "center" },
  emptySavedCopy: { flex: 1, gap: 4 },
  emptySavedTitle: { color: NAVY, fontSize: 14, fontWeight: "900" },
  emptySavedText: { color: MUTED, fontSize: 12, lineHeight: 17 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickChip: { width: "48%", minHeight: 50, flexGrow: 1, borderRadius: 15, borderWidth: 1, borderColor: BORDER, backgroundColor: "white", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 9, ...shadow },
  quickIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  quickText: { flex: 1, color: NAVY, fontSize: 12.5, fontWeight: "800" },

  exploreActionGrid: { flexDirection: "row", flexWrap: "wrap" },
  exploreActionCard: { minHeight: 108, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, padding: 14, gap: 10, ...shadow },
  exploreActionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  exploreActionCopy: { flex: 1, gap: 3 },
  exploreActionTitle: { color: NAVY, fontSize: 13.5, fontWeight: "900" },
  exploreActionMeta: { color: MUTED, fontSize: 10.5, lineHeight: 15 },

  searchResults: { gap: 10 },
  resultCard: { minHeight: 72, borderRadius: 17, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", padding: 10, gap: 8, ...shadow },
  resultMain: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 11 },
  resultIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  resultCopy: { flex: 1, gap: 2 },
  resultTitle: { color: NAVY, fontSize: 14.5, fontWeight: "900" },
  resultMeta: { color: MUTED, fontSize: 11.5 },
  interestMatch: { color: BLUE, fontSize: 10.5, fontWeight: "800" },
  noResults: { minHeight: 240, borderRadius: 20, backgroundColor: "white", alignItems: "center", justifyContent: "center", padding: 28, gap: 9, borderWidth: 1, borderColor: BORDER },
  noResultsIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#F2F4F8", alignItems: "center", justifyContent: "center" },
  noResultsTitle: { color: NAVY, fontSize: 17, fontWeight: "900" },
  noResultsText: { color: MUTED, fontSize: 12.5, lineHeight: 18, textAlign: "center" },

  inspirationIntro: { gap: 5 },
  eyebrow: { color: BLUE, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.6 },
  inspirationTitle: { color: NAVY, fontSize: 23, lineHeight: 29, fontWeight: "900", letterSpacing: -0.3 },
  inspirationCopy: { color: MUTED, fontSize: 12.5, lineHeight: 18 },
  heroShell: { gap: 12 },
  hero: { height: 340, justifyContent: "flex-end", padding: 18 },
  heroRadius: { borderRadius: 22 },
  heroShade: { ...StyleSheet.absoluteFillObject, borderRadius: 22, backgroundColor: "rgba(3, 15, 42, 0.26)" },
  heroIndex: { position: "absolute", top: 14, right: 14, minHeight: 28, borderRadius: 14, backgroundColor: "rgba(7,26,72,.78)", justifyContent: "center", paddingHorizontal: 10 },
  heroIndexText: { color: "white", fontSize: 10.5, fontWeight: "800" },
  heroCopy: { gap: 5 },
  heroLabel: { color: "white", fontSize: 14, fontWeight: "800" },
  heroTitle: { color: "white", fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.6 },
  heroCta: { alignSelf: "flex-start", minHeight: 42, borderRadius: 21, backgroundColor: "white", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 15, marginTop: 7 },
  heroCtaText: { color: NAVY, fontSize: 12, fontWeight: "900" },
  dots: { minHeight: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C8D0DE" },
  dotActive: { width: 20, backgroundColor: NAVY },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  interestCard: { width: "48%", minHeight: 122, flexGrow: 1, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, padding: 14, gap: 7, ...shadow },
  interestIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  interestIconPurple: { backgroundColor: "#F2ECFF" },
  interestIconGreen: { backgroundColor: "#E9F8F1" },
  interestTitle: { color: NAVY, fontSize: 13.5, fontWeight: "900" },
  interestMeta: { color: MUTED, fontSize: 11.5 },

  compareIntro: { borderRadius: 22, backgroundColor: NAVY, padding: 20, gap: 6 },
  compareEyebrow: { color: "#8FB7FF", fontSize: 10.5, fontWeight: "900", letterSpacing: 1.5 },
  compareHeading: { color: "white", fontSize: 24, lineHeight: 30, fontWeight: "900" },
  compareIntroText: { color: "#D9E5FF", fontSize: 12.5, lineHeight: 18 },
  compareList: { gap: 12 },
  compareCard: { minHeight: 110, borderRadius: 19, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, flexDirection: "row", alignItems: "center", padding: 15, gap: 13, ...shadow },
  compareIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  compareBlue: { backgroundColor: "#E7F0FF" },
  comparePurple: { backgroundColor: "#F1E8FF" },
  compareGreen: { backgroundColor: "#E3F6ED" },
  compareOrange: { backgroundColor: "#FFF0DE" },
  compareCopy: { flex: 1, gap: 4 },
  compareTitle: { color: NAVY, fontSize: 15.5, fontWeight: "900" },
  compareMeta: { color: MUTED, fontSize: 12, lineHeight: 17 },

  floatingBrowse: { position: "absolute", alignSelf: "center", minHeight: 52, borderRadius: 26, backgroundColor: NAVY, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24, shadowColor: NAVY, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  floatingPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  floatingText: { color: "white", fontSize: 13, fontWeight: "900" },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2, 10, 28, 0.48)" },
  sheetPressable: { width: "100%" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#F8FAFE", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 14 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#C9D0DC", alignSelf: "center" },
  sheetImage: { height: 180, borderRadius: 20, overflow: "hidden" },
  sheetImageRadius: { borderRadius: 20 },
  sheetImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,15,42,.1)" },
  sheetHeading: { gap: 3, paddingHorizontal: 4 },
  sheetTitle: { color: NAVY, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.5 },
  sheetMeta: { color: BLUE, fontSize: 13.5, fontWeight: "800" },
  sheetActions: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER, backgroundColor: "white" },
  sheetAction: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  sheetActionIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: SKY, alignItems: "center", justifyContent: "center" },
  sheetActionText: { flex: 1, color: NAVY, fontSize: 14, fontWeight: "800" },
  sheetClose: { minHeight: 54, borderRadius: 17, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  sheetCloseText: { color: NAVY, fontSize: 14, fontWeight: "800" },

  browser: { flex: 1, backgroundColor: "#F7F9FD" },
  browserTopLine: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#C9D0DC", alignSelf: "center", marginTop: 8 },
  browserHeader: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: "rgba(255,255,255,.96)" },
  browserHeading: { flex: 1, gap: 4 },
  browserTitle: { color: NAVY, fontSize: 25, lineHeight: 30, fontWeight: "900", letterSpacing: -0.4 },
  browserSubtitle: { color: MUTED, fontSize: 12, lineHeight: 17 },
  browserClose: { minWidth: 48, minHeight: 44, alignItems: "center", justifyContent: "center" },
  browserCloseText: { color: BLUE, fontSize: 13, fontWeight: "900" },
  browserList: { padding: 16, gap: 10, paddingBottom: 36 },
  browserGroup: { borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: BORDER, overflow: "hidden", ...shadow },
  groupHeader: { minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 12 },
  groupCopy: { flex: 1, gap: 3 },
  groupTitle: { color: NAVY, fontSize: 15, fontWeight: "900" },
  groupMeta: { color: MUTED, fontSize: 11.5 },
  groupChevron: { transform: [{ rotate: "90deg" }] },
  groupChevronOpen: { transform: [{ rotate: "-90deg" }] },
  groupDestinations: { padding: 10, gap: 8, backgroundColor: "#F9FAFD", borderTopWidth: 1, borderTopColor: BORDER },
  browserEmpty: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 9, padding: 28 },
  browserEmptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#EEF1F6", alignItems: "center", justifyContent: "center" },
  browserEmptyTitle: { color: NAVY, fontSize: 17, fontWeight: "900" },
  browserEmptyText: { color: MUTED, fontSize: 12.5, lineHeight: 18, textAlign: "center" },
});
