import { Marker } from 'react-leaflet';
import {
  userMarkerIcon,
  captainMarkerIcon,
  pickupMarkerIcon,
  destinationMarkerIcon,
} from '../../utils/mapUtils';

export function UserMarker({ position, label = 'You' }) {
  if (!position) return null;
  return <Marker position={position} icon={userMarkerIcon(label)} zIndexOffset={600} />;
}

export function RiderMarker({ position }) {
  return <UserMarker position={position} label="Rider" />;
}

export function CaptainMarker({ position, vehicleType = 'car', searching = false }) {
  if (!position) return null;
  return (
    <Marker
      position={position}
      icon={captainMarkerIcon(vehicleType, { searching })}
      zIndexOffset={500}
    />
  );
}

export function PickupMarker({ position }) {
  if (!position) return null;
  return <Marker position={position} icon={pickupMarkerIcon()} zIndexOffset={400} />;
}

export function DestinationMarker({ position }) {
  if (!position) return null;
  return <Marker position={position} icon={destinationMarkerIcon()} zIndexOffset={400} />;
}

export function NearbyCaptainMarkers({ captains = [] }) {
  return captains.map((captain, index) => {
    if (!captain.location?.lat || !captain.location?.lng) return null;
    const vehicleType = captain.vehicle?.vehicleType || 'car';
    return (
      <CaptainMarker
        key={captain._id || index}
        position={[captain.location.lat, captain.location.lng]}
        vehicleType={vehicleType}
        searching
      />
    );
  });
}
