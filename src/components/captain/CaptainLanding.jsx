import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { socketManager } from '../../utils/socket';
import { useToast } from '../ui/use-toast';
import { DEFAULT_CENTER, resolveCaptainMapPhase, coordsToLatLng } from '../../utils/mapUtils';
import { useRouteFetcher } from '../../utils/useRouteFetcher';
import RideMap from '../map/RideMap';
import RideRequestSheet from './RideRequestSheet';
import ActiveRideSheet from './ActiveRideSheet';
import CaptainHomePanel from './CaptainHomePanel';

const DEFAULT_CENTER_COORDS = DEFAULT_CENTER;

export default function CaptainLanding() {
  const [captain, setCaptain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rideRequest, setRideRequest] = useState(null);
  const [processingRide, setProcessingRide] = useState(false);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [approachRoute, setApproachRoute] = useState([]);
  const [tripRoute, setTripRoute] = useState([]);
  const [tripStats, setTripStats] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [todayStats, setTodayStats] = useState({ earnings: 0, trips: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleRouteError = useCallback((message) => {
    toast({
      variant: 'destructive',
      title: 'Route unavailable',
      description: message || "Couldn't load route",
    });
  }, [toast]);

  const { fetchRoute, fetchRouteDebounced, fetchRouteImmediate, resetRouteFetcher } = useRouteFetcher({
    onRouteError: handleRouteError,
  });

  const fetchTodayStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const stats = await api.getCaptainTodayStats();
      setTodayStats({
        earnings: stats.earnings ?? 0,
        trips: stats.trips ?? 0,
      });
    } catch {
      // Keep previous values on error
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCaptain(null);
    setLoading(true);

    const fetchProfile = async () => {
      const token = localStorage.getItem('captain_token');
      if (!token) {
        navigate('/captain/signin', { replace: true });
        return;
      }

      try {
        const captainData = await api.getCaptainProfile();
        setCaptain(captainData);
        await fetchTodayStats();
      } catch {
        localStorage.removeItem('captain_token');
        localStorage.removeItem('token');
        navigate('/captain/signin', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchProfile, 150);

    return () => {
      clearTimeout(timer);
      socketManager.disconnect();
    };
  }, [navigate, location.pathname, fetchTodayStats]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCaptainLocation([position.coords.latitude, position.coords.longitude]);
        setLocationError(null);
      },
      () => {
        setLocationError('Enable location to go online and receive ride requests.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Reverse geocode current location for home panel
  useEffect(() => {
    if (!captainLocation) return undefined;

    let cancelled = false;
    const fetchAddress = async () => {
      try {
        const result = await api.getReverseGeocode(captainLocation[0], captainLocation[1]);
        if (!cancelled && result?.address) {
          setCurrentAddress(result.address);
        }
      } catch {
        if (!cancelled) setCurrentAddress(null);
      }
    };

    fetchAddress();
    return () => { cancelled = true; };
  }, [captainLocation]);

  const goOnline = useCallback(() => {
    if (!captain?._id) return false;

    if (!captainLocation) {
      toast({
        variant: 'destructive',
        title: 'Location required',
        description: locationError || 'Enable location access to go online.',
      });
      return false;
    }

    socketManager.connect(captain._id, 'captain');
    setIsOnline(true);
    setCaptain((prev) => (prev ? { ...prev, status: 'active' } : prev));

    // Emit location immediately so captain appears in search radius
    const socket = socketManager.getSocket();
    if (socket && captainLocation) {
      const emitLocation = () => {
        socket.emit('update-location-captain', {
          captainId: captain._id,
          location: { lat: captainLocation[0], lng: captainLocation[1] },
          captainSocketId: socket.id,
        });
      };
      if (socket.connected) {
        emitLocation();
      } else {
        socket.once('connect', emitLocation);
      }
    }

    toast({
      title: "You're online",
      description: 'You can now receive ride requests.',
    });
    return true;
  }, [captain, captainLocation, locationError, toast]);

  const goOffline = useCallback(() => {
    socketManager.disconnect();
    setIsOnline(false);
    setRideRequest(null);
    setCaptain((prev) => (prev ? { ...prev, status: 'inactive' } : prev));
    toast({
      title: "You're offline",
      description: 'You will not receive ride requests.',
    });
  }, [toast]);

  const handleToggleOnline = useCallback(() => {
    if (acceptedRide) {
      toast({
        variant: 'destructive',
        title: 'Active ride',
        description: 'Complete your current trip before going offline.',
      });
      return;
    }
    if (isOnline) {
      goOffline();
    } else {
      goOnline();
    }
  }, [isOnline, goOnline, goOffline, acceptedRide, toast]);

  const loadApproachRoute = useCallback(async (slat, slong, elat, elong, { immediate = false } = {}) => {
    const fetcher = immediate ? fetchRouteImmediate : fetchRouteDebounced;
    const result = await fetcher(
      slat,
      slong,
      elat,
      elong,
      immediate ? {} : { debounce: true, minMove: 30 }
    );
    if (result?.coordinates?.length) {
      setApproachRoute(result.coordinates);
      if (result.stats) setTripStats(result.stats);
    }
    return result;
  }, [fetchRouteDebounced, fetchRouteImmediate]);

  const loadTripRoute = useCallback(async (slat, slong, elat, elong) => {
    const result = await fetchRoute(slat, slong, elat, elong, { updateTripStats: true });
    if (result?.coordinates?.length) {
      setTripRoute(result.coordinates);
      if (result.stats) setTripStats(result.stats);
    }
  }, [fetchRoute]);

  const fetchPickupDestinationRoute = useCallback(async (ride) => {
    if (!ride) return;

    try {
      const pickupResponse = await api.getCoordinates(ride.pickup);
      const destResponse = await api.getCoordinates(ride.destination);
      const pickupPoint = coordsToLatLng(pickupResponse);
      const destPoint = coordsToLatLng(destResponse);

      if (pickupPoint && destPoint) {
        setPickupLocation(pickupPoint);
        setDestinationLocation(destPoint);

        if (captainLocation) {
          await loadTripRoute(
            captainLocation[0],
            captainLocation[1],
            destPoint[0],
            destPoint[1]
          );
        } else {
          await loadTripRoute(pickupPoint[0], pickupPoint[1], destPoint[0], destPoint[1]);
        }
      }
    } catch {
      // Route fetch failed silently; map still shows markers
    }
  }, [captainLocation, loadTripRoute]);

  const fetchPickupFromRide = useCallback(async (pickupAddress, captainCoords = null) => {
    try {
      const response = await api.getCoordinates(pickupAddress);
      const pickup = coordsToLatLng(response);
      if (!pickup) return;

      setPickupLocation(pickup);

      const origin = captainCoords || captainLocation;
      if (origin) {
        await loadApproachRoute(origin[0], origin[1], pickup[0], pickup[1], { immediate: true });
      }
    } catch {
      // Pickup geocode failed
    }
  }, [captainLocation, loadApproachRoute]);

  useEffect(() => {
    if (acceptedRide && captainLocation && pickupLocation && !otpVerified) {
      loadApproachRoute(
        captainLocation[0],
        captainLocation[1],
        pickupLocation[0],
        pickupLocation[1]
      );
    }
  }, [acceptedRide, captainLocation, pickupLocation, otpVerified, loadApproachRoute]);

  // Preload destination coords when ride is accepted
  useEffect(() => {
    if (!acceptedRide?.destination || destinationLocation) return undefined;

    let cancelled = false;
    const loadDestination = async () => {
      try {
        const response = await api.getCoordinates(acceptedRide.destination);
        const dest = coordsToLatLng(response);
        if (!cancelled && dest) {
          setDestinationLocation(dest);
        }
      } catch {
        // ignore
      }
    };

    loadDestination();
    return () => { cancelled = true; };
  }, [acceptedRide, destinationLocation]);

  const resetRideState = useCallback(() => {
    setAcceptedRide(null);
    setUserDetails(null);
    setOtpVerified(false);
    setOtp('');
    setApproachRoute([]);
    setTripRoute([]);
    setPickupLocation(null);
    setDestinationLocation(null);
    setTripStats(null);
    setRideCompleted(false);
    resetRouteFetcher();
  }, [resetRouteFetcher]);

  const handleVerifyOtp = async () => {
    if (!otp || !acceptedRide || verifyingOtp) return;

    setVerifyingOtp(true);
    try {
      const socket = socketManager.getSocket();
      if (socket?.connected) {
        socket.emit('otp-verify', {
          rideId: acceptedRide._id,
          otp,
          socketId: userDetails?.socketId || null,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to verify OTP. Please try again.',
      });
      setVerifyingOtp(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!acceptedRide || !otpVerified || !captain) return;

    try {
      const socket = socketManager.getSocket();
      if (socket?.connected) {
        socket.emit('end-ride', {
          rideId: acceptedRide._id,
          userSocketId: userDetails?.socketId || null,
          captainId: captain._id,
        });

        setRideCompleted(true);

        setTimeout(() => {
          resetRideState();
          fetchTodayStats();
        }, 2000);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete ride. Please try again.',
      });
    }
  };

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket?.connected || !acceptedRide) return undefined;

    const handleOtpResponse = (data) => {
      if (data.message === 'OTP Verified' && data.ride) {
        setOtpVerified(true);
        setAcceptedRide(data.ride);
        toast({
          title: 'OTP Verified',
          description: 'Ride has started. Navigate to destination.',
        });
        fetchPickupDestinationRoute(data.ride);
      } else if (data.message === 'Invalid OTP') {
        toast({
          variant: 'destructive',
          title: 'Invalid OTP',
          description: 'Please enter the correct OTP.',
        });
        setOtp('');
      }
      setVerifyingOtp(false);
    };

    socket.on('otp-verify-response', handleOtpResponse);
    return () => socket.off('otp-verify-response', handleOtpResponse);
  }, [acceptedRide, toast, fetchPickupDestinationRoute]);

  useEffect(() => {
    if (!isOnline) return undefined;

    let cleanup = null;
    let retryInterval = null;

    const setupListeners = () => {
      const socket = socketManager.getSocket();
      if (!socket?.connected) return false;

      const handleRideRequest = (data) => {
        if (data?.ride) {
          setRideRequest(data.ride);
        }
      };

      const handleRideCancel = (data) => {
        setRideRequest((currentRequest) => {
          if (currentRequest && currentRequest._id === data.ride._id) {
            toast({
              title: 'Ride Request Cancelled',
              description: 'This ride has been accepted by another captain.',
            });
            return null;
          }
          return currentRequest;
        });
      };

      socket.on('rideRequestToCaptain', handleRideRequest);
      socket.on('rideRequestCancelToCaptain', handleRideCancel);

      cleanup = () => {
        socket.off('rideRequestToCaptain', handleRideRequest);
        socket.off('rideRequestCancelToCaptain', handleRideCancel);
      };

      return true;
    };

    const handleSocketConnect = () => {
      if (setupListeners() && retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
      }
    };

    if (!setupListeners()) {
      retryInterval = setInterval(() => {
        if (setupListeners()) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }, 500);
    }

    window.addEventListener('socketConnected', handleSocketConnect);

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      window.removeEventListener('socketConnected', handleSocketConnect);
      if (cleanup) cleanup();
    };
  }, [toast, isOnline]);

  const handleAcceptRide = async () => {
    if (!rideRequest || !captain || processingRide) return;

    setProcessingRide(true);
    try {
      const response = await api.confirmRide(rideRequest, captain._id);
      const socket = socketManager.getSocket();

      if (socket?.connected) {
        if (captainLocation) {
          socket.emit('update-location-captain', {
            captainId: captain._id,
            location: { lat: captainLocation[0], lng: captainLocation[1] },
            captainSocketId: socket.id,
          });
        }

        socket.emit('rideAccepted', {
          userSocketId: null,
          ride: response.ride,
          captain: response.captain,
        });
      }

      setRideRequest(null);
      setAcceptedRide(response.ride);
      setUserDetails(response.user);

      if (response.ride.pickup) {
        fetchPickupFromRide(response.ride.pickup, captainLocation);
      }

      toast({
        title: 'Ride Accepted',
        description: 'You have successfully accepted the ride request.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to accept ride. Please try again.',
      });
    } finally {
      setProcessingRide(false);
    }
  };

  const handleDeclineRide = () => {
    setRideRequest(null);
    toast({
      title: 'Ride Request Dismissed',
      description: 'You have dismissed this ride request.',
    });
  };

  const handleLogout = () => {
    socketManager.disconnect();
    localStorage.removeItem('captain_token');
    localStorage.removeItem('token');
    setCaptain(null);
    navigate('/captain/signin', { replace: true });
  };

  useEffect(() => {
    if (otpVerified && acceptedRide && captainLocation && destinationLocation) {
      loadTripRoute(
        captainLocation[0],
        captainLocation[1],
        destinationLocation[0],
        destinationLocation[1]
      );
    }
  }, [otpVerified, acceptedRide, captainLocation, destinationLocation, loadTripRoute]);

  const mapPhase = resolveCaptainMapPhase({ acceptedRide, otpVerified });
  const captainVehicleType = captain?.vehicle?.vehicleType || 'car';
  const mapCenter =
    mapPhase === 'approach' && pickupLocation && captainLocation
      ? [
          (captainLocation[0] + pickupLocation[0]) / 2,
          (captainLocation[1] + pickupLocation[1]) / 2,
        ]
      : captainLocation || DEFAULT_CENTER_COORDS;

  const isIdle = !rideRequest && !acceptedRide;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-black animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full max-w-full relative flex flex-col bg-white overflow-hidden">
      {/* Header */}
      {captain && (
        <div className="shrink-0 relative z-[1000] bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
                {captain.fullname?.firstname?.[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {captain.fullname?.firstname} {captain.fullname?.lastname}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <p className="text-xs text-gray-500">
                    {isOnline ? "You're online" : "You're offline"}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Map + home panel (idle) or full map (active ride) */}
      <div className={`flex-1 min-h-0 flex flex-col ${isIdle ? '' : 'relative'}`}>
        <div className={`relative z-0 ${isIdle ? 'h-[60%] shrink-0' : 'flex-1 min-h-0'}`}>
          {captainLocation ? (
            <RideMap
              phase={mapPhase}
              perspective="captain"
              center={mapCenter}
              captainLocation={captainLocation}
              captainVehicleType={captainVehicleType}
              pickupCoords={pickupLocation}
              destCoords={destinationLocation}
              approachRoute={approachRoute}
              tripRoute={tripRoute}
              zoom={14}
            />
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center p-6">
              <div className="text-center max-w-xs">
                {locationError ? (
                  <>
                    <p className="text-gray-900 font-semibold mb-2">Location required</p>
                    <p className="text-gray-500 text-sm">{locationError}</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-10 h-10 text-black animate-spin mx-auto mb-3" />
                    <p className="text-gray-600">Getting your location...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Home panel — bottom 40% when idle */}
        {isIdle && captain && (
          <div className="h-[40%] shrink-0 relative z-[100]">
            <CaptainHomePanel
              captain={captain}
              isOnline={isOnline}
              onToggleOnline={handleToggleOnline}
              captainLocation={captainLocation}
              currentAddress={currentAddress}
              locationError={locationError}
              todayStats={todayStats}
              statsLoading={statsLoading}
            />
          </div>
        )}
      </div>

      {/* Ride flow overlays — ride request uses overlay; accepted ride uses overlay */}
      {(rideRequest || acceptedRide) && (
      <div className="absolute inset-0 z-[500] pointer-events-none flex flex-col justify-end overflow-hidden max-w-full">
        <RideRequestSheet
          rideRequest={rideRequest}
          processingRide={processingRide}
          onDecline={handleDeclineRide}
          onAccept={handleAcceptRide}
        />

        <ActiveRideSheet
          acceptedRide={acceptedRide}
          userDetails={userDetails}
          otp={otp}
          otpVerified={otpVerified}
          verifyingOtp={verifyingOtp}
          tripStats={tripStats}
          rideCompleted={rideCompleted}
          onOtpChange={setOtp}
          onVerifyOtp={handleVerifyOtp}
          onCompleteRide={handleCompleteRide}
        />
      </div>
      )}
    </div>
  );
}
