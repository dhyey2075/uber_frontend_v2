import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Bike, Car, CarTaxiFront, Menu, X, MapPin, Navigation } from 'lucide-react';
import { api } from '../utils/api';
import { socketManager } from '../utils/socket';
import { useToast } from '../components/ui/use-toast.jsx';
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
        html: '<div style="background-color: #000; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">🚗</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
};

// Create custom user marker icon (black dot)
const createUserIcon = () => {
    return L.divIcon({
        className: 'user-marker',
        html: '<div style="background-color: #000; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
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
    const [fare, setFare] = useState(null);
    const [calculatingFare, setCalculatingFare] = useState(false);
    const [pickupCoords, setPickupCoords] = useState(null);
    const [destinationCoords, setDestinationCoords] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const pickupDebounceRef = useRef(null);
    const destinationDebounceRef = useRef(null);
    const acceptedRideRef = useRef(null);
    const { toast } = useToast();
    const [creatingRide, setCreatingRide] = useState(false);
    const [selectedVehicleType, setSelectedVehicleType] = useState(null);
    const [currentRide, setCurrentRide] = useState(null);
    const [acceptedRide, setAcceptedRide] = useState(null);
    const [captainDetails, setCaptainDetails] = useState(null);
    const [captainLocation, setCaptainLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [otp, setOtp] = useState(null);
    const [otpVerified, setOtpVerified] = useState(false);

    useEffect(() => {
        if (acceptedRide) return;

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
            if (!acceptedRide) {
                socketManager.disconnect();
            }
        };
    }, [navigate, location.pathname]);

    useEffect(() => {
        const socket = socketManager.getSocket();
        if (socket && socket.connected) {
            const handleRideAccepted = (data) => {
                console.log('Ride accepted by captain:', data);
                if (data.ride && data.captain) {
                    setAcceptedRide(data.ride);
                    acceptedRideRef.current = data.ride;
                    setCaptainDetails(data.captain);
                    setOtp(data.ride.otp);
                    setFare(null);

                    if (data.captain.location && data.captain.location.lat && data.captain.location.lng) {
                        setCaptainLocation([data.captain.location.lat, data.captain.location.lng]);
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

            const handleCaptainLocationUpdate = (data) => {
                console.log('Captain location updated:', data);
                if (data.location && data.location.lat && data.location.lng) {
                    setCaptainLocation([data.location.lat, data.location.lng]);
                    if (userLocation && !otpVerified) {
                        fetchRoute(data.location.lat, data.location.lng, userLocation[0], userLocation[1]);
                    }
                }
            };

            const handleOtpVerified = (data) => {
                console.log('OTP verified:', data);
                if (data.message === 'OTP Verified' && data.ride) {
                    setOtpVerified(true);
                    setAcceptedRide(data.ride);
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
        if (!userLocation) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserLocation([latitude, longitude]);

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
                        if (!userLocation) {
                            setUserLocation([28.6139, 77.2090]);
                        }
                    }
                );
            } else {
                if (!userLocation) {
                    setUserLocation([28.6139, 77.2090]);
                }
            }
        }
    }, [acceptedRide]);

    const handlePickupChange = (value) => {
        setPickup(value);

        if (pickupDebounceRef.current) {
            clearTimeout(pickupDebounceRef.current);
        }

        if (value.length < 3) {
            setPickupSuggestions([]);
            setShowPickupSuggestions(false);
            return;
        }

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
        }, 500);
    };

    const handleDestinationChange = (value) => {
        setDestination(value);

        if (destinationDebounceRef.current) {
            clearTimeout(destinationDebounceRef.current);
        }

        if (value.length < 3) {
            setDestinationSuggestions([]);
            setShowDestinationSuggestions(false);
            return;
        }

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
        }, 500);
    };

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
        if (destination && destinationCoords) {
            calculateFare(`${suggestion.name}, ${suggestion.address}`, destination);
        }
    };

    const handleDestinationSelect = (suggestion) => {
        setDestination(`${suggestion.name}, ${suggestion.address}`);
        setDestinationCoords(suggestion.coordinates);
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
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

    const handleVehicleSelect = async (vehicleType) => {
        if (!pickup || !destination || creatingRide) return;

        setSelectedVehicleType(vehicleType);
        setCreatingRide(true);

        try {
            const response = await api.createRide(pickup, destination, vehicleType);
            const { ride, captains } = response;

            setCurrentRide(ride);

            const socket = socketManager.getSocket();

            if (!socket || !socket.connected) {
                throw new Error('Socket not connected. Please refresh the page.');
            }

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

    const handleLogout = async () => {
        try {
            socketManager.disconnect();
            localStorage.removeItem('token');
            localStorage.removeItem('captain_token');
            setUser(null);
            navigate('/user/signin', { replace: true });
        } catch (err) {
            socketManager.disconnect();
            localStorage.removeItem('token');
            localStorage.removeItem('captain_token');
            setUser(null);
            navigate('/user/signin', { replace: true });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-white">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <h1 className="text-2xl font-bold text-black">Uber</h1>
                </div>
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-semibold text-black">
                                {user.fullname?.firstname} {user.fullname?.lastname}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                            {user.fullname?.firstname?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                )}
            </div>

            {/* Side Menu */}
            {showMenu && (
                <div className="absolute top-[57px] left-0 w-64 bg-white border-r border-gray-200 h-[calc(100vh-57px)] z-40 shadow-lg">
                    <div className="p-4 space-y-4">
                        <div className="pb-4 border-b border-gray-200">
                            <p className="text-lg font-semibold text-black">
                                {user?.fullname?.firstname} {user?.fullname?.lastname}
                            </p>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
                            Your Trips
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
                            Payment
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
                            Settings
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
                            Help
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors font-semibold"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 relative">
                {/* Map */}
                <div className={`absolute inset-0 ${fare || acceptedRide ? 'bottom-[45%]' : 'bottom-0'} transition-all duration-300`}>
                    {userLocation ? (
                        <MapContainer
                            center={userLocation}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapUpdater center={acceptedRide && captainLocation ? captainLocation : userLocation} />

                            {userLocation && (
                                <Marker position={userLocation} icon={createUserIcon()} />
                            )}

                            {captainLocation && acceptedRide && (
                                <Marker position={captainLocation} icon={createCarIcon()} />
                            )}

                            {routeCoordinates.length > 0 && acceptedRide && (
                                <Polyline
                                    positions={routeCoordinates}
                                    color="#000"
                                    weight={4}
                                    opacity={0.7}
                                />
                            )}

                            {!acceptedRide && pickupCoords && (
                                <Marker position={[pickupCoords.lat, pickupCoords.lng]} />
                            )}
                            {!acceptedRide && destinationCoords && (
                                <Marker position={[destinationCoords.lat, destinationCoords.lng]} />
                            )}
                        </MapContainer>
                    ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-500">Loading map...</p>
                        </div>
                    )}
                </div>

                {/* Bottom Panel - Location Inputs */}
                {!fare && !acceptedRide && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-30">
                        <h2 className="text-2xl font-bold text-black mb-6">Where to?</h2>

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <div className="w-3 h-3 bg-black rounded-full"></div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Pickup location"
                                    value={pickup}
                                    onChange={(e) => handlePickupChange(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {pickupSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handlePickupSelect(suggestion)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                                            >
                                                <div className="font-medium text-black">{suggestion.name}</div>
                                                <div className="text-xs text-gray-500">{suggestion.address}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <MapPin className="w-5 h-5 text-black" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Where to?"
                                    value={destination}
                                    onChange={(e) => handleDestinationChange(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {destinationSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleDestinationSelect(suggestion)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                                            >
                                                <div className="font-medium text-black">{suggestion.name}</div>
                                                <div className="text-xs text-gray-500">{suggestion.address}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => calculateFare(pickup, destination)}
                                disabled={!pickup || !destination || calculatingFare}
                                className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {calculatingFare ? 'Calculating...' : 'See prices'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Fare Selection */}
                {fare && !acceptedRide && (
                    <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-white rounded-t-3xl shadow-2xl overflow-y-auto z-30">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-black mb-6">Choose a ride</h2>
                            <div className="space-y-3">
                                {/* UberX / Car */}
                                <button
                                    onClick={() => handleVehicleSelect('car')}
                                    disabled={creatingRide}
                                    className={`w-full border-2 rounded-xl p-4 transition-all ${selectedVehicleType === 'car'
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Car className="w-8 h-8 text-black" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-black font-bold text-lg">UberX</p>
                                                <p className="text-gray-500 text-sm">{fare.time} • Affordable rides</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-black font-bold text-xl">₹{fare.car}</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Uber Moto / Motorcycle */}
                                <button
                                    onClick={() => handleVehicleSelect('motorcycle')}
                                    disabled={creatingRide}
                                    className={`w-full border-2 rounded-xl p-4 transition-all ${selectedVehicleType === 'motorcycle'
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Bike className="w-8 h-8 text-black" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-black font-bold text-lg">Uber Moto</p>
                                                <p className="text-gray-500 text-sm">{fare.time} • Quick rides</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-black font-bold text-xl">₹{fare.motorcycle}</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Uber Auto */}
                                <button
                                    onClick={() => handleVehicleSelect('auto')}
                                    disabled={creatingRide}
                                    className={`w-full border-2 rounded-xl p-4 transition-all ${selectedVehicleType === 'auto'
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        } ${creatingRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <CarTaxiFront className="w-8 h-8 text-black" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-black font-bold text-lg">Uber Auto</p>
                                                <p className="text-gray-500 text-sm">{fare.time} • Budget rides</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-black font-bold text-xl">₹{fare.auto}</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Accepted Ride Info */}
                {acceptedRide && captainDetails && (
                    <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-white rounded-t-3xl shadow-2xl overflow-y-auto z-30">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-black">Your ride</h2>
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    En route
                                </span>
                            </div>

                            {/* Captain Card */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">
                                            {captainDetails.fullname?.firstname?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-black font-bold">
                                                {captainDetails.fullname?.firstname} {captainDetails.fullname?.lastname}
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                {captainDetails.vehicle?.vehicleType}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-black font-bold text-lg">
                                            {captainDetails.vehicle?.plate}
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                            {captainDetails.vehicle?.color}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* OTP Display */}
                            {otp && !otpVerified && (
                                <div className="bg-black text-white rounded-xl p-6 text-center mb-4">
                                    <p className="text-sm mb-2 text-gray-300">Your OTP</p>
                                    <p className="text-5xl font-bold tracking-widest">{otp}</p>
                                    <p className="text-xs mt-2 text-gray-400">Share this code with your driver</p>
                                </div>
                            )}

                            {/* OTP Verified */}
                            {otpVerified && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                    <p className="text-green-700 font-semibold">
                                        ✓ Ride Started
                                    </p>
                                    <p className="text-green-600 text-sm mt-1">
                                        Heading to your destination
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;