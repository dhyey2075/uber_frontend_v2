import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import { getVehicleIconUrl } from './vehicleAssets';

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY ?? '';
export const CARTO_TILE_URL = CARTO_API_KEY
  ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
  : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

export const DEFAULT_CENTER = [28.6139, 77.2090];

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SVG = {
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  car: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
  motorcycle: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>',
  auto: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h2"/><path d="M19 17h2"/><path d="M5 17h14v-5l-1.5-4.5H6.5L5 12v5z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>',
  pickup: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>',
  destination: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
};

const VEHICLE_IMG = (type) => {
  const url = getVehicleIconUrl(type);
  return `<img src="${url}" alt="${type}" class="map-marker-vehicle-img map-marker-vehicle-img--plain" />`;
};

const VEHICLE_ICON = {
  car: VEHICLE_IMG('car'),
  motorcycle: VEHICLE_IMG('motorcycle'),
  auto: VEHICLE_IMG('auto'),
};

function buildVehicleMarkerHtml({ iconHtml, label, labelClass, wrapperClass = '' }) {
  const labelBlock = label
    ? `<span class="map-marker-label ${labelClass}">${label}</span>`
    : '';
  return `<div class="map-marker-wrapper ${wrapperClass}">
    ${iconHtml}
    ${labelBlock}
  </div>`;
}

function buildMarkerHtml({ iconHtml, iconClass, label, labelClass, wrapperClass = '' }) {
  const labelBlock = label
    ? `<span class="map-marker-label ${labelClass}">${label}</span>`
    : '';
  return `<div class="map-marker-wrapper ${wrapperClass}">
    <div class="map-marker-icon ${iconClass}">${iconHtml}</div>
    ${labelBlock}
  </div>`;
}

function createDivIcon(html, width = 56, height = 56) {
  return L.divIcon({
    className: '',
    html,
    iconSize: [width, height],
    iconAnchor: [width / 2, height - 6],
  });
}

export const userMarkerIcon = (label = 'You') =>
  createDivIcon(
    buildMarkerHtml({
      iconHtml: SVG.user,
      iconClass: 'map-marker-icon--user',
      label,
      labelClass: 'map-marker-label--you',
    }),
    56,
    58
  );

export const captainMarkerIcon = (vehicleType = 'car', { searching = false } = {}) => {
  const iconHtml = VEHICLE_ICON[vehicleType] || VEHICLE_ICON.car;
  return createDivIcon(
    buildVehicleMarkerHtml({
      iconHtml,
      label: searching ? getVehicleLabel(vehicleType) : null,
      labelClass: 'map-marker-label--vehicle',
      wrapperClass: searching ? 'map-marker--searching' : '',
    }),
    48,
    searching ? 58 : 44
  );
};

export const pickupMarkerIcon = () =>
  createDivIcon(
    buildMarkerHtml({
      iconHtml: SVG.pickup,
      iconClass: 'map-marker-icon--pickup',
      label: 'Pickup',
      labelClass: 'map-marker-label--pickup',
    }),
    56,
    58
  );

export const destinationMarkerIcon = () =>
  createDivIcon(
    buildMarkerHtml({
      iconHtml: SVG.destination,
      iconClass: 'map-marker-icon--destination',
      label: 'Drop',
      labelClass: 'map-marker-label--drop',
    }),
    56,
    58
  );

export function getVehicleLabel(type) {
  return ({ car: 'Car', auto: 'Auto', motorcycle: 'Bike' }[type] || 'Vehicle');
}

// Legacy aliases
export const createMarkerIcon = (color, size = 20) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  try {
    return polyline.decode(encoded).map(([lat, lng]) => [lat, lng]);
  } catch {
    return [];
  }
}

function fromGeoJsonCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  return coordinates.map((coord) => [coord[1], coord[0]]);
}

function fromLegSteps(routeData) {
  if (!routeData?.legs) return [];
  const allCoordinates = [];
  routeData.legs.forEach((leg) => {
    leg.steps?.forEach((step) => {
      step.geometry?.coordinates?.forEach((coord) => {
        allCoordinates.push([coord[1], coord[0]]);
      });
    });
  });
  return allCoordinates;
}

export const parseRouteCoordinates = (routeData) => {
  if (!routeData) return [];

  if (routeData.geometry?.coordinates?.length) {
    const coords = fromGeoJsonCoordinates(routeData.geometry.coordinates);
    if (coords.length > 0) return coords;
  }

  const stepCoords = fromLegSteps(routeData);
  if (stepCoords.length > 0) return stepCoords;

  const encoded =
    routeData.overview_polyline?.points ||
    routeData.overview_polyline ||
    routeData.polyline?.points ||
    routeData.polyline;

  if (typeof encoded === 'string') {
    const decoded = decodePolyline(encoded);
    if (decoded.length > 0) return decoded;
  }

  return [];
};

export function getBoundsFromCoords(coordLists) {
  const flat = coordLists.flat().filter(Boolean);
  if (flat.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  flat.forEach((coord) => {
    const [lat, lng] = coord;
    if (lat == null || lng == null) return;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  if (!Number.isFinite(minLat)) return null;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function MapUpdater({ center, bounds, routeCoords }) {
  const map = useMap();

  useEffect(() => {
    const routeBounds = routeCoords?.length ? getBoundsFromCoords([routeCoords]) : null;
    const targetBounds = routeBounds || bounds;

    if (targetBounds && targetBounds.length === 2) {
      map.fitBounds(targetBounds, { padding: [50, 50], maxZoom: 16 });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, routeCoords, map]);

  return null;
}

export function resolveMapPhase({ showFare, searchingCaptain, acceptedRide, otpVerified }) {
  if (otpVerified && acceptedRide) return 'trip';
  if (acceptedRide) return 'approach';
  if (searchingCaptain) return 'searching';
  if (showFare) return 'preview';
  return 'idle';
}

export function normalizeGeocodeResponse(response) {
  if (!response) return null;
  if (response.lat != null && response.lng != null) {
    return { lat: response.lat, lng: response.lng };
  }
  if (response.coordinates?.lat != null && response.coordinates?.lng != null) {
    return { lat: response.coordinates.lat, lng: response.coordinates.lng };
  }
  return null;
}

export function coordsToLatLng(coords) {
  const normalized = normalizeGeocodeResponse(coords) || coords;
  if (!normalized?.lat || !normalized?.lng) return null;
  return [normalized.lat, normalized.lng];
}

export function resolveCaptainMapPhase({ acceptedRide, otpVerified }) {
  if (otpVerified && acceptedRide) return 'trip';
  if (acceptedRide) return 'approach';
  return 'idle';
}
