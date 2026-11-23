import MapView, { Marker } from "react-native-maps";
import type { NativeAppleHotelMapProps } from "./NativeAppleHotelMap.types";

export function NativeAppleHotelMap({ latitude, longitude, hotelName, interactive = false, legalLabelInsets }: NativeAppleHotelMapProps) {
  return <MapView style={{ flex: 1 }} initialRegion={{ latitude, longitude, latitudeDelta: 0.009, longitudeDelta: 0.016 }} scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={interactive} pitchEnabled={interactive} showsUserLocation={false} legalLabelInsets={legalLabelInsets} accessibilityLabel={`Map showing ${hotelName}`}>
    <Marker coordinate={{ latitude, longitude }} title={hotelName} />
  </MapView>;
}
