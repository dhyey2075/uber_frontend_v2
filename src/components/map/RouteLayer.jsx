import { Polyline } from 'react-leaflet';

export default function RouteLayer({ coordinates }) {
  if (!coordinates || coordinates.length < 2) return null;

  return (
    <>
      <Polyline
        positions={coordinates}
        color="#ffffff"
        weight={7}
        opacity={0.4}
        smoothFactor={1}
      />
      <Polyline
        positions={coordinates}
        color="#111111"
        weight={5}
        opacity={0.9}
        smoothFactor={1}
      />
    </>
  );
}
