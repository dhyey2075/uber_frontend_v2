export const getVehicleLabel = (type) => ({
  car: 'Car',
  auto: 'Auto',
  motorcycle: 'Bike',
}[type] || type || 'Vehicle');

export const formatEta = (seconds, readable) => {
  if (readable) {
    const hourMinuteMatch = readable.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/i);
    if (hourMinuteMatch) {
      const hours = parseInt(hourMinuteMatch[1], 10);
      const minutes = parseInt(hourMinuteMatch[2] || '0', 10);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes} min`;
    }
    return readable;
  }
  if (seconds) return `${Math.max(1, Math.round(seconds / 60))} min`;
  return null;
};

export const formatDistance = (meters, readable) => {
  if (readable) {
    const km = parseFloat(readable);
    if (!Number.isNaN(km)) return `${km} km`;
    return readable;
  }
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters) return `${meters} m`;
  return null;
};

export const extractTripStats = (routeData) => {
  if (!routeData) return null;

  const leg = routeData.legs?.[0];
  const duration = routeData.duration ?? leg?.duration;
  const distance = routeData.distance ?? leg?.distance;
  const readableDuration = routeData.readable_duration ?? leg?.readable_duration;
  const readableDistance = routeData.readable_distance ?? leg?.readable_distance;

  const eta = formatEta(duration, readableDuration);
  const tripDistance = formatDistance(distance, readableDistance);

  if (!eta && !tripDistance) return null;

  return {
    eta,
    distance: tripDistance,
    durationSeconds: duration,
    distanceMeters: distance,
  };
};
