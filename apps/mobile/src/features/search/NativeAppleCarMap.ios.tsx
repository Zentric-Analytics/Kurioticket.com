import MapView, { Marker } from "react-native-maps";
import type { NativeAppleCarMapProps } from "./NativeAppleCarMap.types";

const CAR_FULL_MAP_ATTRIBUTION_INSETS = {
  top: 0,
  right: 12,
  bottom: 8,
  left: 0,
};

export function NativeAppleCarMap({
  latitude,
  longitude,
  locationLabel,
  interactive = false,
}: NativeAppleCarMapProps) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.009,
        longitudeDelta: 0.016,
      }}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      showsUserLocation={false}
      legalLabelInsets={
        interactive ? CAR_FULL_MAP_ATTRIBUTION_INSETS : undefined
      }
      accessibilityLabel={`Map showing ${locationLabel}`}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        title={locationLabel}
      />
    </MapView>
  );
}
