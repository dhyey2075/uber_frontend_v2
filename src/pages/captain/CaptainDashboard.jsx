import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../utils/api';
import { socketManager } from '../../utils/socket';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BACKGROUND_IMAGE_URL } from '../../config/background';
import { useToast } from '../../components/ui/use-toast.jsx';
import { X, CheckCircle, XCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom captain marker icon (blue dot)
const createCaptainIcon = () => {
  return L.divIcon({
    className: 'captain-marker',
    html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Create custom user marker icon (person icon)
const createUserIcon = () => {
  return L.divIcon({
    className: 'user-marker',
    html: '<div style="background-color: #10b981; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">👤</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Component to update map center
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function CaptainDashboard() {
  const [captain, setCaptain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rideRequest, setRideRequest] = useState(null);
  const [processingRide, setProcessingRide] = useState(false);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [pickupDestinationRoute, setPickupDestinationRoute] = useState([]);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const backgroundStyle = BACKGROUND_IMAGE_URL 
    ? {
        backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };

  useEffect(() => {
    // Reset state when component mounts or location changes
    setCaptain(null);
    setLoading(true);

    const fetchProfile = async () => {
      // Get fresh token from localStorage
      const token = localStorage.getItem('captain_token');
      if (!token) {
        navigate('/captain/signin', { replace: true });
        return;
      }

      try {
        // Clear any cached data by ensuring fresh fetch
        const captainData = await api.getCaptainProfile();
        setCaptain(captainData);
        
        // Connect socket for captain and start location updates
        if (captainData._id) {
          socketManager.connect(captainData._id, 'captain');
        }
      } catch (err) {
        localStorage.removeItem('captain_token');
        localStorage.removeItem('token');
        navigate('/captain/signin', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure token is set before fetching
    const timer = setTimeout(() => {
      fetchProfile();
    }, 150);

    return () => {
      clearTimeout(timer);
      // Disconnect socket on unmount
      socketManager.disconnect();
    };
  }, [navigate, location.pathname]);

  const fetchUserLocationFromPickup = async (pickupAddress) => {
    try {
      const coords = await api.getCoordinates(pickupAddress);
      if (coords && coords.lat && coords.lng) {
        setUserLocation([coords.lat, coords.lng]);
        // Fetch route between captain and user
        if (captainLocation) {
          fetchRoute(captainLocation[0], captainLocation[1], coords.lat, coords.lng);
        }
      }
    } catch (err) {
      console.error('Error fetching user location:', err);
    }
  };

  const fetchRoute = async (slat, slong, elat, elong) => {
    try {
      const routeData = await api.getRoute(slat, slong, elat, elong);
      if (routeData.geometry && routeData.geometry.coordinates) {
        const coordinates = routeData.geometry.coordinates || [];
        const leafletCoords = coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(leafletCoords);
      } else if (routeData.legs) {
        const allCoordinates = [];
        routeData.legs.forEach(leg => {
          if (leg.steps) {
            leg.steps.forEach(step => {
              if (step.geometry && step.geometry.coordinates) {
                step.geometry.coordinates.forEach(coord => {
                  allCoordinates.push([coord[1], coord[0]]);
                });
              }
            });
          }
        });
        if (allCoordinates.length > 0) {
          setRouteCoordinates(allCoordinates);
        } else {
          setRouteCoordinates([[slat, slong], [elat, elong]]);
        }
      } else {
        setRouteCoordinates([[slat, slong], [elat, elong]]);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      setRouteCoordinates([[slat, slong], [elat, elong]]);
    }
  };

  const fetchPickupDestinationRoute = async () => {
    if (!acceptedRide) return;
    try {
      // Get coordinates for pickup and destination
      const pickupCoords = await api.getCoordinates(acceptedRide.pickup);
      const destCoords = await api.getCoordinates(acceptedRide.destination);
      
      if (pickupCoords && destCoords && pickupCoords.lat && destCoords.lat) {
        const routeData = await api.getRoute(
          pickupCoords.lat, pickupCoords.lng,
          destCoords.lat, destCoords.lng
        );
        
        if (routeData.geometry && routeData.geometry.coordinates) {
          const coordinates = routeData.geometry.coordinates || [];
          const leafletCoords = coordinates.map(coord => [coord[1], coord[0]]);
          setPickupDestinationRoute(leafletCoords);
        } else if (routeData.legs) {
          const allCoordinates = [];
          routeData.legs.forEach(leg => {
            if (leg.steps) {
              leg.steps.forEach(step => {
                if (step.geometry && step.geometry.coordinates) {
                  step.geometry.coordinates.forEach(coord => {
                    allCoordinates.push([coord[1], coord[0]]);
                  });
                }
              });
            }
          });
          if (allCoordinates.length > 0) {
            setPickupDestinationRoute(allCoordinates);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching pickup-destination route:', err);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !acceptedRide || verifyingOtp) return;
    
    setVerifyingOtp(true);
    try {
      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        socket.emit('otp-verify', {
          rideId: acceptedRide._id,
          otp: otp,
          socketId: userDetails?.socketId || null
        });
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
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
      if (socket && socket.connected) {
        socket.emit('end-ride', {
          rideId: acceptedRide._id,
          userSocketId: userDetails?.socketId || null,
          captainId: captain._id
        });
        
        toast({
          title: 'Ride Completed',
          description: 'Ride has been marked as completed.',
        });
        
        // Reset state after a delay
        setTimeout(() => {
          setAcceptedRide(null);
          setUserDetails(null);
          setOtpVerified(false);
          setOtp('');
          setRouteCoordinates([]);
          setPickupDestinationRoute([]);
        }, 2000);
      }
    } catch (err) {
      console.error('Error completing ride:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete ride. Please try again.',
      });
    }
  };

  // Listen for OTP verification response
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (socket && socket.connected && acceptedRide) {
      const handleOtpResponse = (data) => {
        if (data.message === 'OTP Verified' && data.ride) {
          setOtpVerified(true);
          setAcceptedRide(data.ride);
          toast({
            title: 'OTP Verified',
            description: 'Ride has started. Navigate to destination.',
          });
          // Fetch route between pickup and destination
          fetchPickupDestinationRoute();
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
      
      return () => {
        socket.off('otp-verify-response', handleOtpResponse);
      };
    }
  }, [acceptedRide, toast]);

  // Set up socket listeners for ride requests
  useEffect(() => {
    let cleanup = null;
    let retryInterval = null;

    const setupListeners = () => {
      const socket = socketManager.getSocket();
      console.log('Attempting to set up listeners, socket:', socket, 'connected:', socket?.connected);
      
      if (socket && socket.connected) {
        console.log('✅ Setting up ride request listeners on socket:', socket.id);
        
        // Listen for new ride requests
        const handleRideRequest = (data) => {
          console.log('🔔 Ride request received:', data);
          console.log('🔔 Full data object:', JSON.stringify(data, null, 2));
          // Check if ride is still pending (not accepted by another captain)
          if (data && data.ride) {
            // Accept even if status is not explicitly 'pending' (might be undefined)
            console.log('✅ Setting ride request state:', data.ride);
            setRideRequest(data.ride);
          } else {
            console.warn('⚠️ Invalid ride request data:', data);
          }
        };

        // Listen for ride request cancellations (when another captain accepts)
        const handleRideCancel = (data) => {
          console.log('❌ Ride request cancelled:', data);
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

        // Test listener to verify socket is working
        const testHandler = (data) => {
          console.log('🧪 Test event received:', data);
        };
        socket.on('test', testHandler);

        cleanup = () => {
          console.log('🧹 Cleaning up socket listeners');
          socket.off('rideRequestToCaptain', handleRideRequest);
          socket.off('rideRequestCancelToCaptain', handleRideCancel);
          socket.off('test', testHandler);
        };

        return true; // Successfully set up
      }
      return false; // Not ready yet
    };

    // Set up listeners when socket connects
    const handleSocketConnect = () => {
      console.log('🔌 Socket connected event received');
      if (setupListeners()) {
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }
    };

    // Try to set up listeners immediately
    if (!setupListeners()) {
      // If socket not ready, poll every 500ms until connected
      console.log('⏳ Socket not ready, starting polling...');
      retryInterval = setInterval(() => {
        if (setupListeners()) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
      }, 500);
    }
    
    // Also listen for socket connection event
    window.addEventListener('socketConnected', handleSocketConnect);

    return () => {
      console.log('🧹 Cleaning up ride request listeners effect');
      if (retryInterval) {
        clearInterval(retryInterval);
      }
      window.removeEventListener('socketConnected', handleSocketConnect);
      if (cleanup) {
        cleanup();
      }
    };
  }, [toast, captain]);

  const handleAcceptRide = async () => {
    if (!rideRequest || !captain || processingRide) return;

    setProcessingRide(true);
    try {
      // Confirm the ride via API
      const response = await api.confirmRide(rideRequest, captain._id);
      
      // Get socket instance
      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        // Get user socket ID from the ride (we need to fetch user to get socketId)
        // For now, emit the rideAccepted event - backend will handle user notification
        socket.emit('rideAccepted', {
          userSocketId: null, // Backend will fetch this from user model
          ride: response.ride,
          captain: response.captain,
        });
      }

      // Clear the ride request and set accepted ride
      setRideRequest(null);
      setAcceptedRide(response.ride);
      setUserDetails(response.user);
      
      // Get user location from ride pickup coordinates
      if (response.ride.pickup) {
        // We need to get coordinates from pickup address
        // For now, we'll get it from the ride or fetch it
        fetchUserLocationFromPickup(response.ride.pickup);
      }

      toast({
        title: 'Ride Accepted',
        description: 'You have successfully accepted the ride request.',
      });
    } catch (err) {
      console.error('Error accepting ride:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to accept ride. Please try again.',
      });
    } finally {
      setProcessingRide(false);
    }
  };

  const handleCancelRide = () => {
    setRideRequest(null);
    toast({
      title: 'Ride Request Dismissed',
      description: 'You have dismissed this ride request.',
    });
  };

  const handleLogout = async () => {
    try {
      // Disconnect socket before logout
      socketManager.disconnect();
      
      // Clear tokens
      localStorage.removeItem('captain_token');
      localStorage.removeItem('token');
      // Reset state
      setCaptain(null);
      // Navigate to sign in
      navigate('/captain/signin', { replace: true });
    } catch (err) {
      // Disconnect socket even if logout fails
      socketManager.disconnect();
      
      // Even if logout API fails, clear local storage
      localStorage.removeItem('captain_token');
      localStorage.removeItem('token');
      setCaptain(null);
      navigate('/captain/signin', { replace: true });
    }
  };

  if (loading) {
    return (
      <div 
        className="flex justify-center items-center min-h-screen p-2 sm:p-4 md:p-5 relative overflow-hidden"
        style={backgroundStyle}
      >
        <div className="absolute inset-0 bg-black/20 sm:bg-black/30"></div>
        <Card className="w-full max-w-md relative z-10 border-0 sm:border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-6">
            <p className="text-center text-white text-sm sm:text-base font-medium">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/20 sm:bg-black/30"></div>
      
      {/* Ride Request Modal */}
      {rideRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md relative border-0 border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl animate-in fade-in-0 zoom-in-95">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl sm:text-2xl text-white font-bold">New Ride Request</CardTitle>
                <button
                  onClick={handleCancelRide}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={processingRide}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <CardDescription className="text-white/90">
                You have received a new ride request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white/80 mb-1">Pickup Location</p>
                  <p className="text-base text-white font-medium">{rideRequest.pickup}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80 mb-1">Destination</p>
                  <p className="text-base text-white font-medium">{rideRequest.destination}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <div>
                    <p className="text-sm font-semibold text-white/80 mb-1">Vehicle Type</p>
                    <p className="text-base text-white font-medium capitalize">{rideRequest.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white/80 mb-1">Fare</p>
                    <p className="text-lg text-white font-bold">₹{rideRequest.fare}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelRide}
                  variant="outline"
                  className="flex-1 h-11 border-white/30 bg-white/10 hover:bg-white/20 text-white"
                  disabled={processingRide}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  onClick={handleAcceptRide}
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
                  disabled={processingRide}
                >
                  {processingRide ? (
                    'Processing...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Ride
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="relative z-10 h-screen flex flex-col">
        {/* Compact Captain Details at Top */}
        {captain && (
          <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm sm:text-base">
                  {captain.fullname?.firstname?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="text-white text-xs sm:text-sm font-semibold">
                    {captain.fullname?.firstname} {captain.fullname?.lastname}
                  </p>
                  <p className="text-white/80 text-xs">{captain.email}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                className="h-7 sm:h-8 text-xs sm:text-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map */}
          <div className={`absolute inset-4 rounded-lg overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-2xl ${
            acceptedRide ? 'bottom-[calc(35%+1rem)]' : 'bottom-4'
          }`}>
            {captainLocation ? (
              <MapContainer
                center={captainLocation}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                className="rounded-lg"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={
                  acceptedRide && userLocation 
                    ? userLocation 
                    : captainLocation
                } />
                
                {/* Captain marker (blue dot) */}
                {captainLocation && (
                  <Marker position={captainLocation} icon={createCaptainIcon()} />
                )}
                
                {/* User marker (person icon) - shown when ride is accepted */}
                {userLocation && acceptedRide && (
                  <Marker position={userLocation} icon={createUserIcon()} />
                )}
                
                {/* Route between captain and user (before OTP verification) */}
                {routeCoordinates.length > 0 && acceptedRide && !otpVerified && (
                  <Polyline
                    positions={routeCoordinates}
                    color="#3b82f6"
                    weight={4}
                    opacity={0.7}
                  />
                )}
                
                {/* Route between pickup and destination (after OTP verification) */}
                {pickupDestinationRoute.length > 0 && otpVerified && (
                  <Polyline
                    positions={pickupDestinationRoute}
                    color="#10b981"
                    weight={4}
                    opacity={0.7}
                  />
                )}
              </MapContainer>
            ) : (
              <div className="h-full w-full bg-white/5 flex items-center justify-center">
                <p className="text-white">Loading map...</p>
              </div>
            )}
          </div>

          {/* Accepted Ride Info - Shows user details and OTP input */}
          {acceptedRide && userDetails && (
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/10 backdrop-blur-xl border-t border-white/20 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h3 className="text-white text-lg sm:text-xl font-bold mb-4">Active Ride</h3>
                
                {/* User Details */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold text-sm mb-2">User Details</p>
                  <div className="space-y-2">
                    <p className="text-white text-sm">
                      <span className="font-medium">Name:</span> {userDetails.fullname?.firstname} {userDetails.fullname?.lastname}
                    </p>
                    <p className="text-white text-sm">
                      <span className="font-medium">Email:</span> {userDetails.email}
                    </p>
                    <div className="pt-2 border-t border-white/20">
                      <p className="text-white text-xs">
                        <span className="font-medium">Pickup:</span> {acceptedRide.pickup}
                      </p>
                      <p className="text-white text-xs">
                        <span className="font-medium">Destination:</span> {acceptedRide.destination}
                      </p>
                      <p className="text-white text-xs">
                        <span className="font-medium">Fare:</span> ₹{acceptedRide.fare}
                      </p>
                    </div>
                  </div>
                </div>

                {/* OTP Input - Only show if not verified */}
                {!otpVerified && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
                    <Label htmlFor="otp" className="text-white font-semibold text-sm mb-2 block">
                      Enter OTP to Start Ride
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 4-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="h-11 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-center text-2xl font-bold tracking-widest"
                        maxLength={4}
                        disabled={verifyingOtp}
                      />
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={otp.length !== 4 || verifyingOtp}
                        className="h-11 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* OTP Verified Message */}
                {otpVerified && (
                  <div className="space-y-3">
                    <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 rounded-lg p-4">
                      <p className="text-white font-semibold text-sm text-center">
                        ✓ OTP Verified - Ride Started
                      </p>
                      <p className="text-white/80 text-xs text-center mt-1">
                        Navigate to destination
                      </p>
                    </div>
                    
                    {/* Complete Ride Button */}
                    <Button
                      onClick={handleCompleteRide}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12"
                    >
                      Mark Trip as Completed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CaptainDashboard;

