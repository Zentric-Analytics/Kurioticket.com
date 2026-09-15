import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MapPin, X } from "lucide-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { colors } from "../../theme/tokens";
import { appFonts } from "../../theme/typography";
import { NativeAppleCarMap } from "./NativeAppleCarMap";
import { NativeAppleCarLookAroundPreview } from "./NativeAppleCarLookAroundPreview";
import type { NativeAppleCarLookAroundStatus } from "./NativeAppleCarLookAroundPreview";
import type { NativeAppleCarMapProps } from "./NativeAppleCarMap.types";
import { nativeCarStreetViewEmbedUrl } from "./nativeCarDetailsModel";

export type NativeCarMapTheme = {
  surface: string;
  border: string;
  textPrimary: string;
  icon: string;
};

type NativeCarFullMapModalProps = {
  visible: boolean;
  pickupLocation: string;
  trustedMapCoordinates: Pick<
    NativeAppleCarMapProps,
    "latitude" | "longitude"
  > | null;
  embedUrl: string | null;
  theme: NativeCarMapTheme;
  onClose: () => void;
};

type FullMapView = "map" | "streetview" | "lookaround";
const STREET_VIEW_SETTLE_MS = 900;

export function NativeCarFullMapModal({
  visible,
  pickupLocation,
  trustedMapCoordinates,
  embedUrl,
  theme,
  onClose,
}: NativeCarFullMapModalProps) {
  const [view, setView] = useState<FullMapView>("map");
  const [fullMapFailed, setFullMapFailed] = useState(false);
  const [fullMapAttempt, setFullMapAttempt] = useState(0);
  const [streetViewFailed, setStreetViewFailed] = useState(false);
  const [streetViewPreviewFailed, setStreetViewPreviewFailed] = useState(false);
  const [streetViewLoading, setStreetViewLoading] = useState(true);
  const [streetViewAttempt, setStreetViewAttempt] = useState(0);
  const [lookAroundStatus, setLookAroundStatus] =
    useState<NativeAppleCarLookAroundStatus>("loading");
  const streetViewReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Google Street View remains an Android-only experience. iOS never constructs or renders it.
  const streetViewUrl =
    Platform.OS === "ios"
      ? null
      : nativeCarStreetViewEmbedUrl(embedUrl, trustedMapCoordinates);
  const handleLookAroundStatus = useCallback(
    (status: NativeAppleCarLookAroundStatus) => setLookAroundStatus(status),
    [],
  );

  const clearStreetViewReadyTimer = () => {
    if (!streetViewReadyTimer.current) return;
    clearTimeout(streetViewReadyTimer.current);
    streetViewReadyTimer.current = null;
  };
  const resetModalState = () => {
    clearStreetViewReadyTimer();
    setView("map");
    setFullMapFailed(false);
    setStreetViewFailed(false);
    setStreetViewPreviewFailed(false);
    setStreetViewLoading(true);
    setLookAroundStatus("loading");
  };
  useEffect(() => {
    if (visible) resetModalState();
  }, [visible, pickupLocation, streetViewUrl]);
  useEffect(() => () => clearStreetViewReadyTimer(), []);

  const retryFullMap = () => {
    setFullMapFailed(false);
    setFullMapAttempt((attempt) => attempt + 1);
  };
  const closeFullMap = () => {
    resetModalState();
    onClose();
  };
  const showStreetView = () => {
    if (!streetViewUrl) return;
    clearStreetViewReadyTimer();
    setStreetViewFailed(false);
    setStreetViewLoading(true);
    setView("streetview");
  };
  const showLookAround = () => {
    if (
      Platform.OS !== "ios" ||
      !trustedMapCoordinates ||
      lookAroundStatus !== "ready"
    )
      return;
    setLookAroundStatus("loading");
    setView("lookaround");
  };
  const showMap = () => {
    clearStreetViewReadyTimer();
    setLookAroundStatus("loading");
    setView("map");
  };
  const settleStreetView = () => {
    clearStreetViewReadyTimer();
    streetViewReadyTimer.current = setTimeout(() => {
      setStreetViewLoading(false);
      streetViewReadyTimer.current = null;
    }, STREET_VIEW_SETTLE_MS);
  };
  const failStreetView = () => {
    clearStreetViewReadyTimer();
    setStreetViewLoading(false);
    setStreetViewFailed(true);
  };
  const retryStreetView = () => {
    clearStreetViewReadyTimer();
    setStreetViewFailed(false);
    setStreetViewLoading(true);
    setStreetViewAttempt((attempt) => attempt + 1);
  };

  const mapSurface =
    Platform.OS === "ios" ? (
      trustedMapCoordinates ? (
        visible && (
          <NativeAppleCarMap
            key={`${pickupLocation}:${trustedMapCoordinates.latitude}:${trustedMapCoordinates.longitude}`}
            {...trustedMapCoordinates}
            locationLabel={pickupLocation}
            interactive
          />
        )
      ) : (
        <MapFallback label="Map unavailable" theme={theme} />
      )
    ) : embedUrl && !fullMapFailed ? (
      <WebView
        key={`${pickupLocation}:full-map:${fullMapAttempt}`}
        source={{ uri: embedUrl }}
        onError={() => setFullMapFailed(true)}
        onHttpError={() => setFullMapFailed(true)}
        style={styles.fullMapWebView}
      />
    ) : (
      <MapFallback
        label="Map unavailable"
        theme={theme}
        onRetry={embedUrl ? retryFullMap : undefined}
      />
    );

  const closeCurrentSurface = view === "lookaround" ? showMap : closeFullMap;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={closeCurrentSurface}
    >
      <SafeAreaProvider>
        <SafeAreaView
          edges={["top", "bottom", "left", "right"]}
          accessibilityViewIsModal
          style={[styles.fullMapScreen, { backgroundColor: theme.surface }]}
        >
          <View style={styles.fullMapBody}>
            {view === "map" ? (
              mapSurface
            ) : view === "lookaround" &&
              Platform.OS === "ios" &&
              trustedMapCoordinates ? (
              <View style={styles.lookAroundFullScreen}>
                <NativeAppleCarLookAroundPreview
                  key={`${pickupLocation}:look-around-full:${trustedMapCoordinates.latitude}:${trustedMapCoordinates.longitude}`}
                  {...trustedMapCoordinates}
                  locationLabel={pickupLocation}
                  presentationMode="viewController"
                  style={styles.lookAroundFullScreenNative}
                  onStatusChange={handleLookAroundStatus}
                />
                {lookAroundStatus === "loading" ? (
                  <View
                    pointerEvents="none"
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading Cars Look Around"
                    style={[
                      styles.lookAroundStatusOverlay,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.blue} />
                  </View>
                ) : null}
                {lookAroundStatus === "unavailable" ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.lookAroundStatusOverlay,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <MapPin accessible={false} size={28} color={theme.icon} />
                    <Text
                      style={[
                        styles.fullMapUnavailable,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Look Around unavailable for this area
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : streetViewUrl && !streetViewFailed ? (
              <View style={styles.streetViewFrame}>
                <WebView
                  key={`${pickupLocation}:streetview:${streetViewAttempt}`}
                  source={{ uri: streetViewUrl }}
                  onLoadStart={() => {
                    clearStreetViewReadyTimer();
                    setStreetViewLoading(true);
                  }}
                  onLoadEnd={settleStreetView}
                  onError={failStreetView}
                  onHttpError={failStreetView}
                  style={styles.fullMapWebView}
                />
                {streetViewLoading ? (
                  <View
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading Cars Street View"
                    style={[
                      styles.streetViewLoading,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.blue} />
                  </View>
                ) : null}
              </View>
            ) : (
              <MapFallback
                label="Street View unavailable for this area"
                theme={theme}
                onRetry={streetViewUrl ? retryStreetView : undefined}
              />
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                view === "lookaround" ? "Close Look Around" : "Close map"
              }
              onPress={closeCurrentSurface}
              style={({ pressed }) => [
                styles.floatingClose,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <X
                accessible={false}
                size={21}
                strokeWidth={2.2}
                color={theme.textPrimary}
              />
            </Pressable>

            {Platform.OS === "ios" &&
            view === "map" &&
            visible &&
            trustedMapCoordinates ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open Look Around near ${pickupLocation}`}
                accessibilityHint="Shows Apple Look Around inside Kurioticket"
                disabled={lookAroundStatus !== "ready"}
                onPress={showLookAround}
                style={[
                  styles.lookAroundPreview,
                  lookAroundStatus !== "ready" &&
                    styles.lookAroundPreviewHidden,
                ]}
              >
                <View pointerEvents="none" style={styles.lookAroundPreviewNative}>
                  <NativeAppleCarLookAroundPreview
                    {...trustedMapCoordinates}
                    locationLabel={pickupLocation}
                    style={styles.lookAroundPreviewNative}
                    onStatusChange={handleLookAroundStatus}
                  />
                </View>
              </Pressable>
            ) : null}

            {view === "map" && streetViewUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open Street View near ${pickupLocation}`}
                accessibilityHint="Shows street-level imagery near the pickup search area"
                onPress={showStreetView}
                style={({ pressed }) => [
                  styles.streetViewPreview,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  pointerEvents="none"
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  style={styles.streetViewPreviewMedia}
                >
                  {!streetViewPreviewFailed ? (
                    <WebView
                      source={{ uri: streetViewUrl }}
                      scrollEnabled={false}
                      onError={() => setStreetViewPreviewFailed(true)}
                      onHttpError={() => setStreetViewPreviewFailed(true)}
                      style={styles.streetViewPreviewWebView}
                    />
                  ) : (
                    <View
                      style={[
                        styles.streetViewPreviewFallback,
                        { backgroundColor: theme.surface },
                      ]}
                    >
                      <MapPin accessible={false} size={20} color={theme.icon} />
                    </View>
                  )}
                </View>
              </Pressable>
            ) : null}

            {view === "streetview" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to map"
                onPress={showMap}
                style={({ pressed }) => [
                  styles.mapPreviewButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <MapPin accessible={false} size={22} color={colors.blue} />
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function MapFallback({
  label,
  theme,
  onRetry,
}: {
  label: string;
  theme: NativeCarMapTheme;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.fullMapFallback, { backgroundColor: theme.surface }]}>
      <MapPin accessible={false} size={28} color={theme.icon} />
      <Text style={[styles.fullMapUnavailable, { color: theme.textPrimary }]}>
        {label}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Try loading ${label.toLowerCase()} again`}
          onPress={onRetry}
          style={styles.fullMapRetry}
        >
          <Text style={styles.fullMapRetryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullMapScreen: { flex: 1 },
  fullMapBody: { flex: 1, minHeight: 0, position: "relative" },
  fullMapWebView: { flex: 1 },
  streetViewFrame: { flex: 1, overflow: "hidden" },
  streetViewLoading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingClose: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 5,
  },
  lookAroundPreview: {
    position: "absolute",
    left: 16,
    bottom: 18,
    zIndex: 7,
    width: 126,
    height: 94,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  lookAroundPreviewHidden: { opacity: 0 },
  lookAroundPreviewNative: { flex: 1 },
  lookAroundFullScreen: { flex: 1, position: "relative", overflow: "hidden" },
  lookAroundFullScreenNative: { flex: 1 },
  lookAroundStatusOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  streetViewPreview: {
    position: "absolute",
    left: 16,
    bottom: 18,
    zIndex: 7,
    width: 126,
    height: 94,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  streetViewPreviewMedia: { flex: 1, overflow: "hidden" },
  streetViewPreviewWebView: {
    position: "absolute",
    left: -56,
    top: -8,
    width: 240,
    height: 220,
  },
  streetViewPreviewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPreviewButton: {
    position: "absolute",
    left: 16,
    bottom: 18,
    zIndex: 7,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fullMapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  fullMapUnavailable: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
    textAlign: "center",
  },
  fullMapRetry: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    paddingHorizontal: 18,
  },
  fullMapRetryText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    fontFamily: appFonts.semibold,
  },
  pressed: { opacity: 0.74 },
});
