import { useCallback, useRef } from 'react';
import { api } from './api';
import { parseRouteCoordinates } from './mapUtils';
import { extractTripStats } from './tripUtils';

const DEBOUNCE_MS = 3000;
const MIN_MOVE_METERS = 30;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordsKey(slat, slong, elat, elong) {
  return `${slat.toFixed(4)},${slong.toFixed(4)}->${elat.toFixed(4)},${elong.toFixed(4)}`;
}

export function useRouteFetcher({ onRouteError } = {}) {
  const lastFetchRef = useRef({ key: null, time: 0, start: null });
  const pendingTimerRef = useRef(null);

  const fetchRouteImmediate = useCallback(
    async (slat, slong, elat, elong, { updateTripStats = false } = {}) => {
      const routeData = await api.getRoute(slat, slong, elat, elong);
      const coordinates = parseRouteCoordinates(routeData);

      if (coordinates.length === 0) {
        onRouteError?.('Could not load route');
        return { coordinates: [], stats: null, routeData: null };
      }

      const stats = updateTripStats ? extractTripStats(routeData) : null;
      lastFetchRef.current = {
        key: coordsKey(slat, slong, elat, elong),
        time: Date.now(),
        start: [slat, slong],
      };

      return { coordinates, stats, routeData };
    },
    [onRouteError]
  );

  const shouldSkipFetch = useCallback((slat, slong, elat, elong, minMove = MIN_MOVE_METERS) => {
    const key = coordsKey(slat, slong, elat, elong);
    const now = Date.now();
    const last = lastFetchRef.current;

    if (last.key === key && now - last.time < DEBOUNCE_MS) {
      return true;
    }

    if (last.start && minMove > 0) {
      const moved = haversineMeters(last.start[0], last.start[1], slat, slong);
      if (moved < minMove && now - last.time < DEBOUNCE_MS * 2) {
        return true;
      }
    }

    return false;
  }, []);

  const fetchRoute = useCallback(
    async (slat, slong, elat, elong, options = {}) => {
      const { debounce = false, minMove = MIN_MOVE_METERS, ...rest } = options;

      if (debounce && shouldSkipFetch(slat, slong, elat, elong, minMove)) {
        return null;
      }

      try {
        return await fetchRouteImmediate(slat, slong, elat, elong, rest);
      } catch (err) {
        onRouteError?.(err.message || 'Could not load route');
        return { coordinates: [], stats: null, routeData: null };
      }
    },
    [fetchRouteImmediate, onRouteError, shouldSkipFetch]
  );

  const fetchRouteDebounced = useCallback(
    (slat, slong, elat, elong, options = {}) =>
      new Promise((resolve) => {
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
        }

        pendingTimerRef.current = setTimeout(async () => {
          const result = await fetchRoute(slat, slong, elat, elong, {
            ...options,
            debounce: true,
          });
          resolve(result);
        }, 300);
      }),
    [fetchRoute]
  );

  const resetRouteFetcher = useCallback(() => {
    lastFetchRef.current = { key: null, time: 0, start: null };
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  return {
    fetchRoute,
    fetchRouteDebounced,
    fetchRouteImmediate,
    resetRouteFetcher,
  };
}
