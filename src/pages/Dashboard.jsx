import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Bike, Car, CarTaxiFront, UserRound } from 'lucide-react';
import { api } from '../utils/api';
import { socketManager } from '../utils/socket';
import { useToast } from '../components/ui/use-toast.jsx';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { BACKGROUND_IMAGE_URL } from '../config/background';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom car marker icon
const createCarIcon = () => {
  return L.divIcon({
    className: 'car-marker',
    html: '<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">🚗</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Create custom user marker icon (blue dot)
const createUserIcon = () => {
  return L.divIcon({
    className: 'user-marker',
    html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
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

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null); // 'pickup' or 'destination'
  const [fare, setFare] = useState(null);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pickupInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  const acceptedRideRef = useRef(null);
  const { toast } = useToast();
  const [creatingRide, setCreatingRide] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [captainDetails, setCaptainDetails] = useState(null);
  const [captainLocation, setCaptainLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [pickupDestinationRoute, setPickupDestinationRoute] = useState([]);
  const [otp, setOtp] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);

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
    // Skip if we already have an accepted ride (preserve state)
    if (acceptedRide) {
      return;
    }

    // Reset state when component mounts or location changes
    setUser(null);
    setLoading(true);

    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/user/signin', { replace: true });
        return;
      }

      try {
        const userData = await api.getProfile();
        setUser(userData);
        
        // Connect socket for user
        if (userData._id) {
          socketManager.connect(userData._id, 'user');
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('captain_token');
        navigate('/user/signin', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchProfile();
    }, 150);

    return () => {
      clearTimeout(timer);
      // Disconnect socket on unmount (only if no accepted ride)
      if (!acceptedRide) {
        socketManager.disconnect();
      }
    };
  }, [navigate, location.pathname]);

  // Set up socket listeners for ride acceptance and captain location updates
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (socket && socket.connected) {
      // Listen for ride acceptance
      const handleRideAccepted = (data) => {
        console.log('Ride accepted by captain:', data);
        if (data.ride && data.captain) {
          setAcceptedRide(data.ride);
          acceptedRideRef.current = data.ride; // Update ref
          setCaptainDetails(data.captain);
          setOtp(data.ride.otp);
          setFare(null); // Hide fare selection
          setFocusedInput(null); // Clear focused input
          
          // Get captain's current location
          if (data.captain.location && data.captain.location.lat && data.captain.location.lng) {
            setCaptainLocation([data.captain.location.lat, data.captain.location.lng]);
            // Fetch route between captain and user
            if (userLocation) {
              fetchRoute(data.captain.location.lat, data.captain.location.lng, userLocation[0], userLocation[1]);
            }
          }
          
          toast({
            title: 'Ride Accepted!',
            description: `${data.captain.fullname?.firstname} has accepted your ride request.`,
          });
        }
      };

      // Listen for captain location updates
      const handleCaptainLocationUpdate = (data) => {
        console.log('Captain location updated:', data);
        if (data.location && data.location.lat && data.location.lng) {
          setCaptainLocation([data.location.lat, data.location.lng]);
          // Update route if user location is available and OTP not verified
          if (userLocation && !otpVerified) {
            fetchRoute(data.location.lat, data.location.lng, userLocation[0], userLocation[1]);
          }
        }
      };

      // Listen for OTP verification
      const handleOtpVerified = (data) => {
        console.log('OTP verified:', data);
        if (data.message === 'OTP Verified' && data.ride) {
          setOtpVerified(true);
          setAcceptedRide(data.ride);
          // Fetch route between pickup and destination
          if (acceptedRide) {
            fetchPickupDestinationRoute();
          }
        }
      };

      socket.on('rideAcceptedToUser', handleRideAccepted);
      socket.on('captain-location-update', handleCaptainLocationUpdate);
      socket.on('otp-verify-response', handleOtpVerified);

      return () => {
        socket.off('rideAcceptedToUser', handleRideAccepted);
        socket.off('captain-location-update', handleCaptainLocationUpdate);
      };
    }
  }, [userLocation, toast]);

  useEffect(() => {
    // Only get geolocation if userLocation is not set
    // Don't reset pickup if ride is already accepted
    if (!userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            
            // Only set pickup if no ride is accepted (to preserve state)
            if (!acceptedRide) {
              try {
                const reverseGeocode = await api.getReverseGeocode(latitude, longitude);
                setPickup(reverseGeocode.address || `${latitude}, ${longitude}`);
                setPickupCoords({ lat: latitude, lng: longitude });
              } catch (err) {
                setPickup(`${latitude}, ${longitude}`);
                setPickupCoords({ lat: latitude, lng: longitude });
              }
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            // Default to a common location if geolocation fails
            if (!userLocation) {
              setUserLocation([28.6139, 77.2090]); // Delhi, India
            }
          }
        );
      } else {
        // Default location if geolocation is not supported
        if (!userLocation) {
          setUserLocation([28.6139, 77.2090]);
        }
      }
    }
  }, [acceptedRide]);

  // Debounce function for autocomplete - using useRef to persist across renders
  const pickupDebounceRef = useRef(null);
  const destinationDebounceRef = useRef(null);

  const handlePickupChange = (value) => {
    // Update input value immediately for better UX
    setPickup(value);
    
    // Clear existing timeout
    if (pickupDebounceRef.current) {
      clearTimeout(pickupDebounceRef.current);
    }
    
    // Clear suggestions if input is too short
    if (value.length < 3) {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      return;
    }
    
    // Debounce API call
    pickupDebounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await api.getAutoComplete(value, userLocation ? `${userLocation[0]},${userLocation[1]}` : null);
        setPickupSuggestions(suggestions.predictions || []);
        setShowPickupSuggestions(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      }
    }, 500); // 500ms debounce delay
  };

  const handleDestinationChange = (value) => {
    // Update input value immediately for better UX
    setDestination(value);
    
    // Clear existing timeout
    if (destinationDebounceRef.current) {
      clearTimeout(destinationDebounceRef.current);
    }
    
    // Clear suggestions if input is too short
    if (value.length < 3) {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
      return;
    }
    
    // Debounce API call
    destinationDebounceRef.current = setTimeout(async () => {
      try {
        const suggestions = await api.getAutoComplete(value, userLocation ? `${userLocation[0]},${userLocation[1]}` : null);
        setDestinationSuggestions(suggestions.predictions || []);
        setShowDestinationSuggestions(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
    }, 500); // 500ms debounce delay
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (pickupDebounceRef.current) {
        clearTimeout(pickupDebounceRef.current);
      }
      if (destinationDebounceRef.current) {
        clearTimeout(destinationDebounceRef.current);
      }
    };
  }, []);

  const handlePickupSelect = (suggestion) => {
    setPickup(`${suggestion.name}, ${suggestion.address}`);
    setPickupCoords(suggestion.coordinates);
    setPickupSuggestions([]);
    setShowPickupSuggestions(false);
    setFocusedInput(null);
    if (destination && destinationCoords) {
      calculateFare(`${suggestion.name}, ${suggestion.address}`, destination);
    }
  };

  const handleDestinationSelect = (suggestion) => {
    setDestination(`${suggestion.name}, ${suggestion.address}`);
    setDestinationCoords(suggestion.coordinates);
    setDestinationSuggestions([]);
    setShowDestinationSuggestions(false);
    setFocusedInput(null);
    if (pickup && pickupCoords) {
      calculateFare(pickup, `${suggestion.name}, ${suggestion.address}`);
    }
  };

  const calculateFare = async (pickupAddr, destAddr) => {
    if (!pickupAddr || !destAddr) return;
    
    setCalculatingFare(true);
    try {
      const fareData = await api.getFare(pickupAddr, destAddr);
      setFare(fareData);
    } catch (err) {
      console.error('Error calculating fare:', err);
      setFare(null);
    } finally {
      setCalculatingFare(false);
    }
  };

  const handleCalculateFare = () => {
    if (pickup && destination) {
      calculateFare(pickup, destination);
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

  const fetchRoute = async (slat, slong, elat, elong) => {
    try {
      const routeData = await api.getRoute(slat, slong, elat, elong);
      // Backend returns route data from OLA Maps API
      if (routeData.geometry && routeData.geometry.coordinates) {
        // If geometry coordinates are available
        const coordinates = routeData.geometry.coordinates || [];
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const leafletCoords = coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(leafletCoords);
      } else if (routeData.legs) {
        // Extract coordinates from legs
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
          // Fallback: create a simple straight line between points
          setRouteCoordinates([[slat, slong], [elat, elong]]);
        }
      } else {
        // Fallback: create a simple straight line between points
        setRouteCoordinates([[slat, slong], [elat, elong]]);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      // Fallback: create a simple straight line between points
      setRouteCoordinates([[slat, slong], [elat, elong]]);
    }
  };

  const handleVehicleSelect = async (vehicleType) => {
    if (!pickup || !destination || creatingRide) return;

    setSelectedVehicleType(vehicleType);
    setCreatingRide(true);

    try {
      // Create ride and get nearby captains
      const response = await api.createRide(pickup, destination, vehicleType);
      const { ride, captains } = response;

      // Store current ride
      setCurrentRide(ride);

      // Get socket instance
      const socket = socketManager.getSocket();
      
      if (!socket || !socket.connected) {
        throw new Error('Socket not connected. Please refresh the page.');
      }

      // Send ride request to all nearby captains
      if (captains && captains.length > 0) {
        captains.forEach((captain) => {
          if (captain.socketId) {
            socket.emit('rideRequest', {
              captainSocketId: captain.socketId,
              ride: ride,
            });
          }
        });

        toast({
          title: 'Ride Request Sent',
          description: `Ride request sent to ${captains.length} nearby ${captains.length === 1 ? 'captain' : 'captains'}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'No Captains Available',
          description: 'No captains found in the nearby area. Please try again later.',
        });
      }
    } catch (err) {
      console.error('Error creating ride:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create ride. Please try again.',
      });
      setSelectedVehicleType(null);
    } finally {
      setCreatingRide(false);
    }
  };

  const handlePickupFocus = () => {
    setFocusedInput('pickup');
    setShowPickupSuggestions(pickupSuggestions.length > 0);
  };

  const handleDestinationFocus = () => {
    setFocusedInput('destination');
    setShowDestinationSuggestions(destinationSuggestions.length > 0);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestions
    setTimeout(() => {
      setFocusedInput(null);
      setShowPickupSuggestions(false);
      setShowDestinationSuggestions(false);
    }, 200);
  };

  const handleLogout = async () => {
    try {
      // Disconnect socket before logout
      socketManager.disconnect();
      
      localStorage.removeItem('token');
      localStorage.removeItem('captain_token');
      setUser(null);
      navigate('/user/signin', { replace: true });
    } catch (err) {
      // Disconnect socket even if logout fails
      socketManager.disconnect();
      
      localStorage.removeItem('token');
      localStorage.removeItem('captain_token');
      setUser(null);
      navigate('/user/signin', { replace: true });
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
      
      <div className="relative z-10 h-screen flex flex-col">
        {/* Compact User Details at Top */}
        {user && (
          <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-xl border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm sm:text-base">
                  {user.fullname?.firstname?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white text-xs sm:text-sm font-semibold">
                    {user.fullname?.firstname} {user.fullname?.lastname}
                  </p>
                  <p className="text-white/80 text-xs">{user.email}</p>
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
          {/* Map - Adjusts to leave space for inputs and fare */}
          <div 
            className={`absolute transition-all duration-300 ${
              acceptedRide
                ? 'bottom-[calc(35%+1rem)]' // Leave space for accepted ride info
                : fare 
                  ? 'bottom-[calc(35%+180px)]' // Leave space for fare (35%) + input card (~180px)
                  : focusedInput 
                    ? 'top-[120px]' // Leave space for focused input at top
                    : 'bottom-[200px]' // Leave space for input card at bottom
            } left-4 right-4 top-4`}
          >
            <div className="h-full w-full rounded-lg overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-2xl">
              {userLocation ? (
                <MapContainer
                  center={userLocation}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                  className="rounded-lg"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={acceptedRide && captainLocation ? captainLocation : userLocation} />
                  
                  {/* User marker (blue dot) */}
                  {userLocation && (
                    <Marker position={userLocation} icon={createUserIcon()} />
                  )}
                  
                  {/* Captain marker (car icon) */}
                  {captainLocation && acceptedRide && (
                    <Marker position={captainLocation} icon={createCarIcon()} />
                  )}
                  
                  {/* Route polyline between captain and user */}
                  {routeCoordinates.length > 0 && acceptedRide && (
                    <Polyline
                      positions={routeCoordinates}
                      color="#3b82f6"
                      weight={4}
                      opacity={0.7}
                    />
                  )}
                  
                  {/* Pickup and destination markers (only show if ride not accepted) */}
                  {!acceptedRide && pickupCoords && (
                    <Marker position={[pickupCoords.lat, pickupCoords.lng]} />
                  )}
                  {!acceptedRide && destinationCoords && (
                    <Marker position={[destinationCoords.lat, destinationCoords.lng]} />
                  )}
                </MapContainer>
              ) : (
                <div className="h-full w-full bg-white/5 flex items-center justify-center">
                  <p className="text-white">Loading map...</p>
                </div>
              )}
            </div>
          </div>

          {/* Search Inputs Overlay - Appears at top when focused (hide when ride is accepted) */}
          {focusedInput && !acceptedRide && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/20 p-3 sm:p-4">
              {focusedInput === 'pickup' ? (
                <div className="space-y-2">
                  <Label htmlFor="pickup-overlay" className="text-white text-sm">Pickup Location</Label>
                  <div className="relative">
                    <Input
                      id="pickup-overlay"
                      ref={pickupInputRef}
                      type="text"
                      placeholder="Enter pickup location"
                      value={pickup}
                      onChange={(e) => handlePickupChange(e.target.value)}
                      onFocus={handlePickupFocus}
                      onBlur={handleInputBlur}
                      className="h-10 sm:h-11 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      autoFocus
                    />
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white/20 backdrop-blur-xl border border-white/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {pickupSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handlePickupSelect(suggestion)}
                            className="w-full text-left px-4 py-2 hover:bg-white/30 text-white text-sm border-b border-white/10 last:border-0"
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-xs text-white/80">{suggestion.address}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="destination-overlay" className="text-white text-sm">Destination</Label>
                  <div className="relative">
                    <Input
                      id="destination-overlay"
                      ref={destinationInputRef}
                      type="text"
                      placeholder="Enter destination"
                      value={destination}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      onFocus={handleDestinationFocus}
                      onBlur={handleInputBlur}
                      className="h-10 sm:h-11 bg-white/20 border-white/30 text-white placeholder:text-white/60"
                      autoFocus
                    />
                    {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white/20 backdrop-blur-xl border border-white/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {destinationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleDestinationSelect(suggestion)}
                            className="w-full text-left px-4 py-2 hover:bg-white/30 text-white text-sm border-b border-white/10 last:border-0"
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-xs text-white/80">{suggestion.address}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Inputs - Bottom overlay when not focused (hide when ride is accepted) */}
          {!focusedInput && !acceptedRide && (
            <div className={`absolute z-40 left-4 right-4 transition-all duration-300 ${
              fare ? 'bottom-[calc(35%+1rem)]' : 'bottom-4'
            }`}>
              <Card className="border-0 border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pickup" className="text-white text-xs sm:text-sm">Pickup Location</Label>
                    <Input
                      id="pickup"
                      type="text"
                      placeholder="Enter pickup location"
                      value={pickup}
                      onChange={(e) => handlePickupChange(e.target.value)}
                      onFocus={handlePickupFocus}
                      className="h-9 sm:h-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="text-white text-xs sm:text-sm">Destination</Label>
                    <Input
                      id="destination"
                      type="text"
                      placeholder="Enter destination"
                      value={destination}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      onFocus={handleDestinationFocus}
                      className="h-9 sm:h-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleCalculateFare}
                    disabled={!pickup || !destination || calculatingFare}
                    className="w-full h-9 sm:h-10 text-sm"
                  >
                    {calculatingFare ? 'Calculating...' : 'Calculate Fare'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Accepted Ride Info - Shows captain details and OTP */}
          {acceptedRide && captainDetails && (
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/10 backdrop-blur-xl border-t border-white/20 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h3 className="text-white text-lg sm:text-xl font-bold mb-4">Ride Accepted!</h3>
                
                {/* Captain Details */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 mb-4">
                  <p className="text-white font-semibold text-sm mb-2">Captain Details</p>
                  <div className="space-y-2">
                    <p className="text-white text-sm">
                      <span className="font-medium">Name:</span> {captainDetails.fullname?.firstname} {captainDetails.fullname?.lastname}
                    </p>
                    <p className="text-white text-sm">
                      <span className="font-medium">Vehicle:</span> {captainDetails.vehicle?.vehicleType} - {captainDetails.vehicle?.color} ({captainDetails.vehicle?.plate})
                    </p>
                  </div>
                </div>

                {/* OTP Display */}
                {otp && !otpVerified && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4">
                    <p className="text-white font-semibold text-sm mb-2">Your OTP</p>
                    <div className="flex items-center justify-center">
                      <div className="text-4xl font-bold text-white tracking-widest bg-white/20 px-6 py-4 rounded-lg">
                        {otp}
                      </div>
                    </div>
                    <p className="text-white/80 text-xs text-center mt-2">Share this OTP with your captain when they arrive</p>
                  </div>
                )}

                {/* OTP Verified Message */}
                {otpVerified && (
                  <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 rounded-lg p-4">
                    <p className="text-white font-semibold text-sm text-center">
                      ✓ OTP Verified - Ride Started
                    </p>
                    <p className="text-white/80 text-xs text-center mt-1">
                      Your captain is navigating to destination
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fare Display - 35% of screen at bottom */}
          {fare && !acceptedRide && (
            <div className="absolute bottom-0 left-0 right-0 h-[35%] z-30 bg-white/10 backdrop-blur-xl border-t border-white/20 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h3 className="text-white text-lg sm:text-xl font-bold mb-4">Select Your Ride</h3>
                <div className="space-y-3">
                  {/* Motorcycle Option */}
                  <button
                    onClick={() => handleVehicleSelect('motorcycle')}
                    disabled={creatingRide}
                    className={`w-full backdrop-blur-md border rounded-lg p-4 transition-all ${
                      selectedVehicleType === 'motorcycle'
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/10 hover:bg-white/20 border-white/20'
                    } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <Bike className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm sm:text-base">Motorcycle</p>
                          <p className="text-white/80 text-xs">{fare.distance} • {fare.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg sm:text-xl">₹{fare.motorcycle}</p>
                      </div>
                    </div>
                  </button>

                  {/* Car Option */}
                  <button
                    onClick={() => handleVehicleSelect('car')}
                    disabled={creatingRide}
                    className={`w-full backdrop-blur-md border rounded-lg p-4 transition-all ${
                      selectedVehicleType === 'car'
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/10 hover:bg-white/20 border-white/20'
                    } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <Car className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm sm:text-base">Car</p>
                          <p className="text-white/80 text-xs">{fare.distance} • {fare.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg sm:text-xl">₹{fare.car}</p>
                      </div>
                    </div>
                  </button>

                  {/* Auto Option */}
                  <button
                    onClick={() => handleVehicleSelect('auto')}
                    disabled={creatingRide}
                    className={`w-full backdrop-blur-md border rounded-lg p-4 transition-all ${
                      selectedVehicleType === 'auto'
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/10 hover:bg-white/20 border-white/20'
                    } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <CarTaxiFront className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm sm:text-base">Auto</p>
                          <p className="text-white/80 text-xs">{fare.distance} • {fare.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg sm:text-xl">₹{fare.auto}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
