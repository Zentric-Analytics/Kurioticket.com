import MapView, { Marker } from "react-native-maps";
import type { NativeAppleCarMapProps } from "./NativeAppleCarMap.types";

export function NativeAppleCarMap({ latitude, longitude, locationLabel, interactive = false }: NativeAppleCarMapProps) {
  return <MapView style={{ flex: 1 }} initialRegion={{ latitude, longitude, latitudeDelta: 0.009, longitudeDelta: 0.016 }} scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={interactive} pitchEnabled={interactive} showsUserLocation={false} accessibilityLabel={`Map showing ${locationLabel}`}>
    <Marker coordinate={{ latitude, longitude }} title={locationLabel} />
  </MapView>;
}
