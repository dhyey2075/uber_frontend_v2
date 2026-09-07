import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CARTO_TILE_URL,
  DEFAULT_CENTER,
  MapUpdater,
  getBoundsFromCoords,
} from '../../utils/mapUtils';
import RouteLayer from './RouteLayer';
import {
  UserMarker,
  RiderMarker,
  CaptainMarker,
  PickupMarker,
  DestinationMarker,
  NearbyCaptainMarkers,
} from './MapMarkers';

/**
 * Shared ride map for user and captain apps.
 *
 * phase: 'preview' | 'searching' | 'approach' | 'trip' | 'idle'
 * perspective: 'user' | 'captain'
 */
export default function RideMap({
  phase = 'idle',
  perspective = 'user',
  center,
  userLocation,
  pickupCoords,
  destCoords,
  nearbyCaptains = [],
  captainLocation,
  captainVehicleType = 'car',
  previewRoute = [],
  approachRoute = [],
  tripRoute = [],
  zoom = 13,
  className = '',
}) {
  const mapCenter = center || userLocation || pickupCoords || DEFAULT_CENTER;

  const activeRoute =
    phase === 'trip'
      ? tripRoute
      : phase === 'approach'
        ? approachRoute
        : phase === 'preview'
          ? previewRoute
          : [];

  const tripCaptainPosition =
    phase === 'trip' && perspective === 'user'
      ? captainLocation || userLocation
      : captainLocation;

  const markerCoords = [
    ...(perspective === 'user' && phase !== 'trip' && userLocation ? [userLocation] : []),
    ...(pickupCoords && phase === 'preview' && perspective === 'user' ? [pickupCoords] : []),
    ...(pickupCoords && phase === 'approach' && perspective === 'captain' ? [pickupCoords] : []),
    ...(destCoords && (phase === 'preview' || phase === 'trip') ? [destCoords] : []),
    ...(tripCaptainPosition &&
    perspective === 'user' &&
    (phase === 'approach' || phase === 'trip')
      ? [tripCaptainPosition]
      : []),
    ...(captainLocation && perspective === 'captain' ? [captainLocation] : []),
    ...(nearbyCaptains || [])
      .filter((c) => c.location?.lat && c.location?.lng)
      .map((c) => [c.location.lat, c.location.lng]),
  ].filter(Boolean);

  const bounds =
    getBoundsFromCoords([markerCoords, activeRoute]) ||
    (pickupCoords && destCoords ? [pickupCoords, destCoords] : null);

  const showYouMarker = perspective === 'user' && userLocation && phase !== 'trip';
  const showCaptainSelf = perspective === 'captain' && captainLocation;
  const showNearbyCaptains = phase === 'searching' && perspective === 'user';
  const showAcceptedCaptain =
    (phase === 'approach' || phase === 'trip') && tripCaptainPosition && perspective === 'user';
  const showRider =
    perspective === 'captain' && phase === 'approach' && pickupCoords;
  const showPickup =
    pickupCoords &&
    perspective === 'user' &&
    phase === 'preview';
  const showDestination =
    destCoords &&
    ((perspective === 'user' && (phase === 'preview' || phase === 'trip')) ||
      (perspective === 'captain' && phase === 'trip'));

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
      className={className}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={CARTO_TILE_URL}
        className="grayscale"
      />

      <MapUpdater center={mapCenter} bounds={bounds} routeCoords={activeRoute} />

      {showYouMarker && <UserMarker position={userLocation} />}

      {showCaptainSelf && (
        <CaptainMarker
          position={captainLocation}
          vehicleType={captainVehicleType}
        />
      )}

      {showNearbyCaptains && <NearbyCaptainMarkers captains={nearbyCaptains} />}

      {showAcceptedCaptain && (
        <CaptainMarker position={tripCaptainPosition} vehicleType={captainVehicleType} />
      )}

      {showRider && <RiderMarker position={pickupCoords} />}

      {showPickup && <PickupMarker position={pickupCoords} />}

      {showDestination && <DestinationMarker position={destCoords} />}

      <RouteLayer coordinates={activeRoute} />
    </MapContainer>
  );
}
