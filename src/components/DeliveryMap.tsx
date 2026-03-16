import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";

type Props = {
  driverLocation: { lat: number; lng: number };
  storeLocation: { lat: number; lng: number };
  customerLocation: { lat: number; lng: number };
};

export default function DeliveryMap({
  driverLocation,
  storeLocation,
  customerLocation,
}: Props) {

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_KEY,
  });

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      zoom={13}
      center={driverLocation}
      mapContainerStyle={{
        width: "100%",
        height: "300px",
        borderRadius: "20px",
      }}
    >
      <Marker position={storeLocation} />
      <Marker position={driverLocation} />
      <Marker position={customerLocation} />

      <Polyline
        path={[storeLocation, driverLocation, customerLocation]}
        options={{
          strokeColor: "#2563eb",
          strokeOpacity: 1,
          strokeWeight: 4,
        }}
      />
    </GoogleMap>
  );
}