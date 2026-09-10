import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RideMap from '../map/RideMap'
import { resolveMapPhase } from '../../utils/mapUtils'
import { useRouteFetcher } from '../../utils/useRouteFetcher'
import { getVehicleLabel } from '../../utils/tripUtils'
import {
    Car,
    CarFront,
    Utensils,
    Clock,
    Search,
    ChevronDown,
    Bike,
    Calendar,
    House,
    LayoutGrid,
    FileText,
    User,
    ArrowRight,
    MapPin,
    Key,
    Loader2,
    Navigation,
    IndianRupee
} from 'lucide-react'
import LocationSearch from './LocationSearch'
import Fare from './Fare'
import { api } from '../../utils/api'
import { socketManager } from '../../utils/socket'
import { clearAllTokens } from '../../utils/auth'
import { useToast } from '../ui/use-toast'

const UserLanding = () => {
    const [activeTab, setActiveTab] = useState('Rides')
    const [isSearching, setIsSearching] = useState(false)
    const [showFare, setShowFare] = useState(false)
    const [fare, setFare] = useState(null)
    const [calculatingFare, setCalculatingFare] = useState(false)
    const [pickup, setPickup] = useState(null)
    const [destination, setDestination] = useState(null)
    // Coords for map markers
    const [pickupCoords, setPickupCoords] = useState(null)
    const [destCoords, setDestCoords] = useState(null)
    const [previewRoute, setPreviewRoute] = useState([])
    const [approachRoute, setApproachRoute] = useState([])
    const [tripRoute, setTripRoute] = useState([])
    const [creatingRide, setCreatingRide] = useState(false)
    const [selectedVehicleType, setSelectedVehicleType] = useState(null)
    const [currentRide, setCurrentRide] = useState(null)
    const [searchingCaptain, setSearchingCaptain] = useState(false)
    const [acceptedRide, setAcceptedRide] = useState(null)
    const [captainDetails, setCaptainDetails] = useState(null)
    const [captainLocation, setCaptainLocation] = useState(null)
    const [userLocation, setUserLocation] = useState(null)
    const [otp, setOtp] = useState(null)
    const [otpVerified, setOtpVerified] = useState(false)
    const [nearbyCaptains, setNearbyCaptains] = useState([])
    const [rideCompleted, setRideCompleted] = useState(false)
    const [currentUserLocation, setCurrentUserLocation] = useState(null)
    const [tripStats, setTripStats] = useState(null)
    const [user, setUser] = useState(null)
    const navigate = useNavigate()
    const { toast } = useToast()
    const acceptedRideRef = useRef(null)
    const locationUpdateIntervalRef = useRef(null)
    const pickupCoordsRef = useRef(pickupCoords)
    const destCoordsRef = useRef(destCoords)
    const userLocationRef = useRef(userLocation)
    const otpVerifiedRef = useRef(otpVerified)
    const lastTripLocationRef = useRef(null)
    const captainLocationRef = useRef(captainLocation)

    captainLocationRef.current = captainLocation

    const handleRouteError = useCallback((message) => {
        toast({
            variant: 'destructive',
            title: 'Route unavailable',
            description: message || "Couldn't load route",
        })
    }, [toast])

    const { fetchRoute, fetchRouteDebounced, fetchRouteImmediate, resetRouteFetcher } = useRouteFetcher({
        onRouteError: handleRouteError,
    })

    const nearbyCaptainsRef = useRef(nearbyCaptains)
    nearbyCaptainsRef.current = nearbyCaptains

    pickupCoordsRef.current = pickupCoords
    destCoordsRef.current = destCoords
    userLocationRef.current = userLocation
    otpVerifiedRef.current = otpVerified

    const resetRideState = () => {
        setAcceptedRide(null)
        acceptedRideRef.current = null
        setCaptainDetails(null)
        setCaptainLocation(null)
        setOtp(null)
        setOtpVerified(false)
        setRideCompleted(false)
        setSearchingCaptain(false)
        setCreatingRide(false)
        setCurrentRide(null)
        setPreviewRoute([])
        setApproachRoute([])
        setTripRoute([])
        setNearbyCaptains([])
        resetRouteFetcher()
        lastTripLocationRef.current = null
        setSelectedVehicleType(null)
        setShowFare(false)
        setFare(null)
        setCalculatingFare(false)
        setPickup(null)
        setDestination(null)
        setPickupCoords(null)
        setDestCoords(null)
        setTripStats(null)
    }

    const suggestions = [
        { icon: CarFront, label: 'Ride', promo: false },
        { icon: Bike, label: '2-Wheels', promo: false },
        { icon: Key, label: 'Rental Cars', promo: true },
        { icon: Calendar, label: 'Reserve', promo: false },
    ]

    const loadApproachRoute = useCallback(async (slat, slong, elat, elong, { immediate = false } = {}) => {
        const fetcher = immediate ? fetchRouteImmediate : fetchRouteDebounced
        const result = await fetcher(slat, slong, elat, elong, immediate ? {} : { debounce: true, minMove: 30 })
        if (result?.coordinates?.length) {
            setApproachRoute(result.coordinates)
        }
        return result
    }, [fetchRouteDebounced, fetchRouteImmediate])

    const resolveCaptainCoords = useCallback((captain) => {
        if (captain?.location?.lat && captain?.location?.lng) {
            return [captain.location.lat, captain.location.lng]
        }
        const cached = nearbyCaptainsRef.current.find((c) => c._id === captain?._id)
        if (cached?.location?.lat && cached?.location?.lng) {
            return [cached.location.lat, cached.location.lng]
        }
        return null
    }, [])

    const getApproachTarget = useCallback(() => {
        return pickupCoordsRef.current || userLocationRef.current
    }, [])

    const loadTripRoute = useCallback(async (slat, slong, elat, elong) => {
        const result = await fetchRoute(slat, slong, elat, elong, { updateTripStats: true, debounce: true, minMove: 50 })
        if (result?.coordinates?.length) {
            setTripRoute(result.coordinates)
            if (result.stats) setTripStats(result.stats)
        }
    }, [fetchRoute])

    const loadPreviewRoute = useCallback(async (slat, slong, elat, elong) => {
        const result = await fetchRoute(slat, slong, elat, elong)
        if (result?.coordinates?.length) {
            setPreviewRoute(result.coordinates)
        }
    }, [fetchRoute])

    // Keep socket connected for the full dashboard session
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userData = await api.getProfile();
                setUser(userData);
                if (userData._id) {
                    socketManager.connect(userData._id, 'user');
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchProfile();

        return () => {
            socketManager.disconnect();
        };
    }, []);

    // Socket event listeners
    useEffect(() => {
        let cleanup = null;
        let retryInterval = null;

        const setupListeners = () => {
            const socket = socketManager.getSocket();
            if (!socket?.connected) {
                return false;
            }

            const handleRideAccepted = async (data) => {
                console.log('Ride accepted by captain:', data);
                if (data.ride && data.captain) {
                    setSearchingCaptain(false);
                    setCreatingRide(false);
                    setAcceptedRide(data.ride);
                    acceptedRideRef.current = data.ride;
                    setCaptainDetails(data.captain);
                    setOtp(data.ride.otp);
                    setFare(null);
                    setNearbyCaptains([]);
                    setPreviewRoute([]);
                    setApproachRoute([]);

                    const captainCoords = resolveCaptainCoords(data.captain);
                    if (captainCoords) {
                        setCaptainLocation(captainCoords);
                        const target = getApproachTarget();
                        if (target) {
                            await loadApproachRoute(
                                captainCoords[0],
                                captainCoords[1],
                                target[0],
                                target[1],
                                { immediate: true }
                            );
                        }
                    }

                    toast({
                        title: 'Ride Accepted!',
                        description: `${data.captain.fullname?.firstname} has accepted your ride request.`,
                    });
                }
            };

            const handleCaptainLocationUpdate = async (data) => {
                if (data.location?.lat && data.location?.lng) {
                    const captainLoc = [data.location.lat, data.location.lng];
                    setCaptainLocation(captainLoc);

                    if (!otpVerifiedRef.current) {
                        const pickup = pickupCoordsRef.current;
                        const userLoc = userLocationRef.current;
                        if (pickup) {
                            await loadApproachRoute(data.location.lat, data.location.lng, pickup[0], pickup[1]);
                        } else if (userLoc) {
                            await loadApproachRoute(data.location.lat, data.location.lng, userLoc[0], userLoc[1]);
                        }
                    } else {
                        const destination = destCoordsRef.current;
                        if (destination) {
                            await loadTripRoute(
                                data.location.lat,
                                data.location.lng,
                                destination[0],
                                destination[1]
                            );
                        }
                    }
                }
            };

            const handleOtpVerified = async (data) => {
                console.log('OTP verified:', data);
                if (data.message === 'OTP Verified' && data.ride) {
                    setOtpVerified(true);
                    setAcceptedRide(data.ride);
                    setApproachRoute([]);
                    setTripRoute([]);

                    toast({
                        title: 'Ride Started',
                        description: 'Your captain verified the OTP. Enjoy your trip!',
                    });

                    const destination = destCoordsRef.current;
                    if (destination) {
                        const origin =
                            captainLocationRef.current ||
                            pickupCoordsRef.current ||
                            userLocationRef.current;
                        if (origin) {
                            await loadTripRoute(origin[0], origin[1], destination[0], destination[1]);
                        }
                    }
                }
            };

            const handleRideCompleted = (data) => {
                console.log('Ride completed:', data);
                setRideCompleted(true);
                toast({
                    title: 'Ride Completed!',
                    description: 'Your trip has ended. Thanks for riding with us.',
                });
                setTimeout(() => {
                    resetRideState();
                }, 2500);
            };

            socket.on('rideAcceptedToUser', handleRideAccepted);
            socket.on('captain-location-update', handleCaptainLocationUpdate);
            socket.on('otp-verify-response', handleOtpVerified);
            socket.on('end-ride-to-user', handleRideCompleted);

            cleanup = () => {
                socket.off('rideAcceptedToUser', handleRideAccepted);
                socket.off('captain-location-update', handleCaptainLocationUpdate);
                socket.off('otp-verify-response', handleOtpVerified);
                socket.off('end-ride-to-user', handleRideCompleted);
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
            if (retryInterval) {
                clearInterval(retryInterval);
            }
            window.removeEventListener('socketConnected', handleSocketConnect);
            if (cleanup) {
                cleanup();
            }
        };
    }, [toast, loadApproachRoute, loadTripRoute, resetRideState, resolveCaptainCoords, getApproachTarget]);

    // Keep approach route in sync when captain moves toward pickup
    useEffect(() => {
        if (!acceptedRide || otpVerified || !captainLocation) return undefined;

        const target = pickupCoords || userLocation;
        if (!target) return undefined;

        loadApproachRoute(
            captainLocation[0],
            captainLocation[1],
            target[0],
            target[1]
        );

        return undefined;
    }, [acceptedRide, otpVerified, captainLocation, pickupCoords, userLocation, loadApproachRoute]);

    // Get user location
    useEffect(() => {
        if (!userLocation) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserLocation([latitude, longitude]);
                        setCurrentUserLocation([latitude, longitude]);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        setUserLocation([28.6139, 77.2090]);
                        setCurrentUserLocation([28.6139, 77.2090]);
                    }
                );
            } else {
                setUserLocation([28.6139, 77.2090]);
                setCurrentUserLocation([28.6139, 77.2090]);
            }
        }
    }, []);

    // Keep trip route in sync from captain location once ride has started
    useEffect(() => {
        if (!otpVerified || !acceptedRide || !destCoords || !captainLocation) return undefined;

        loadTripRoute(
            captainLocation[0],
            captainLocation[1],
            destCoords[0],
            destCoords[1]
        );

        return undefined;
    }, [otpVerified, acceptedRide, destCoords, captainLocation, loadTripRoute]);

    const handleSearchComplete = async (pickupAddr, destAddr, pickupDesc, destDesc) => {
        setPickup(pickupAddr);
        setDestination(destAddr);
        setIsSearching(false);
        setShowFare(true);
        setFare(null);
        setCalculatingFare(true);

        try {
            let pCoords = pickupDesc && pickupDesc.coordinates ? pickupDesc.coordinates : null;
            let dCoords = destDesc && destDesc.coordinates ? destDesc.coordinates : null;

            // Fetch coordinates if missing
            if (!pCoords) {
                try {
                    const res = await api.getCoordinates(pickupAddr);
                    if (res && res.lat && res.lng) pCoords = { lat: res.lat, lng: res.lng };
                    else if (res && res.coordinates) pCoords = res.coordinates; // Handle potential structure
                } catch (e) { console.error("Failed to fetch pickup coords", e); }
            }

            if (!dCoords) {
                try {
                    const res = await api.getCoordinates(destAddr);
                    if (res && res.lat && res.lng) dCoords = { lat: res.lat, lng: res.lng };
                    else if (res && res.coordinates) dCoords = res.coordinates;
                } catch (e) { console.error("Failed to fetch dest coords", e); }
            }

            // Calculate Fare
            if (pickupAddr && destAddr) {
                const fareData = await api.getFare(pickupAddr, destAddr);
                setFare(fareData);
            }

            if (pCoords && dCoords && pCoords.lat && pCoords.lng && dCoords.lat && dCoords.lng) {
                setPickupCoords([pCoords.lat, pCoords.lng]);
                setDestCoords([dCoords.lat, dCoords.lng]);
                await loadPreviewRoute(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng);
            } else {
                console.error("Missing coordinates for route", pCoords, dCoords);
            }
        } catch (error) {
            console.error("Error fetching trip details", error);
        } finally {
            setCalculatingFare(false);
        }
    }

    const handleLogout = () => {
        socketManager.disconnect();
        clearAllTokens();
        window.dispatchEvent(new Event('tokenChange'));
        navigate('/user/signin', { replace: true });
    };

    const handleCreateRide = async (vehicleType) => {
        if (!pickup || !destination || creatingRide) return;

        setSelectedVehicleType(vehicleType);
        setCreatingRide(true);

        try {
            const response = await api.createRide(pickup, destination, vehicleType);
            const { ride, captains } = response;

            setCurrentRide(ride);
            setCreatingRide(false);
            setSearchingCaptain(true);

            const socket = socketManager.getSocket();

            if (!socket || !socket.connected) {
                throw new Error('Socket not connected. Please refresh the page.');
            }

            if (captains && captains.length > 0) {
                // Store nearby captains with their locations
                const captainsWithLocations = captains.filter(c => c.location && c.location.lat && c.location.lng);
                setNearbyCaptains(captainsWithLocations);

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
                setSearchingCaptain(false);
                toast({
                    variant: 'destructive',
                    title: 'No Captains Available',
                    description: 'No captains found in the nearby area. Please try again later.',
                });
            }
        } catch (err) {
            console.error('Error creating ride:', err);
            setCreatingRide(false);
            setSearchingCaptain(false);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to create ride. Please try again.',
            });
            setSelectedVehicleType(null);
        }
    };

    if (isSearching) {
        return (
            <LocationSearch
                onBack={() => setIsSearching(false)}
                onComplete={handleSearchComplete}
            />
        )
    }

    if (showFare) {
        const mapPhase = resolveMapPhase({ showFare, searchingCaptain, acceptedRide, otpVerified });
        const displayUserLocation =
            (acceptedRide && !otpVerified && pickupCoords) ||
            (!otpVerified && userLocation) ||
            pickupCoords;
        const mapCenter =
            otpVerified && (captainLocation || pickupCoords)
                ? captainLocation || pickupCoords
                : pickupCoords || displayUserLocation;
        const captainVehicleType =
            captainDetails?.vehicle?.vehicleType ||
            acceptedRide?.type ||
            selectedVehicleType ||
            'car';

        return (
            <div className="h-screen w-full relative">
                {/* Header / Back Button for Map View */}
                <div className="absolute top-4 left-4 z-[40]">
                    <button
                        onClick={() => { setShowFare(false); setFare(null); }}
                        className="bg-white p-2 rounded-full shadow-md text-black"
                    >
                        <ArrowRight className="rotate-180" size={24} />
                    </button>
                </div>

                <div className="h-full w-full bg-gray-200 relative z-0">
                    <RideMap
                        phase={mapPhase}
                        perspective="user"
                        center={mapCenter}
                        userLocation={otpVerified ? undefined : displayUserLocation}
                        pickupCoords={pickupCoords}
                        destCoords={destCoords}
                        nearbyCaptains={nearbyCaptains}
                        captainLocation={captainLocation}
                        captainVehicleType={captainVehicleType}
                        previewRoute={previewRoute}
                        approachRoute={approachRoute}
                        tripRoute={tripRoute}
                    />
                </div>

                {/* Fare Bottom Sheet - Always show when showFare is true */}
                {!searchingCaptain && !acceptedRide && (
                    <Fare
                        fare={fare}
                        loadingFare={calculatingFare}
                        createRide={handleCreateRide}
                        creatingRide={creatingRide}
                        selectedVehicleType={selectedVehicleType}
                    />
                )}

                {/* Searching Captain State */}
                {searchingCaptain && !acceptedRide && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white text-gray-900 z-[100] rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] p-6">
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-12 h-12 text-black animate-spin mb-4" />
                            <h3 className="text-xl font-bold mb-2">Searching captain nearby</h3>
                            <p className="text-gray-600 text-sm">Please wait while we find a captain for you...</p>
                        </div>
                    </div>
                )}

                {/* Accepted Ride Info - Only show when OTP not verified */}
                {acceptedRide && !otpVerified && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white text-gray-900 z-[100] rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] max-h-[50vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Your ride</h2>
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    En route
                                </span>
                            </div>

                            {/* Captain Card */}
                            {captainDetails && (
                                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold">
                                                {captainDetails.fullname?.firstname?.[0]?.toUpperCase() || 'C'}
                                            </div>
                                            <div>
                                                <p className="text-black font-bold">
                                                    {captainDetails.fullname?.firstname || ''} {captainDetails.fullname?.lastname || ''}
                                                </p>
                                                <p className="text-gray-500 text-sm">
                                                    {captainDetails.vehicle?.vehicleType || 'Vehicle'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-black font-bold text-lg">
                                                {captainDetails.vehicle?.plate || 'N/A'}
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                {captainDetails.vehicle?.color || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {!captainDetails && (
                                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                    <p className="text-gray-600 text-center">Loading captain details...</p>
                                </div>
                            )}

                            {/* OTP Display */}
                            {otp && (
                                <div className="bg-black text-white rounded-xl p-6 text-center mb-4">
                                    <p className="text-sm mb-2 text-gray-300">Your OTP</p>
                                    <p className="text-5xl font-bold tracking-widest">{otp}</p>
                                    <p className="text-xs mt-2 text-gray-400">Share this code with your driver</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Trip in progress panel */}
                {otpVerified && acceptedRide && !rideCompleted && (
                    <>
                        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white z-[100] rounded-full px-5 py-2.5 shadow-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <p className="text-sm font-semibold">
                                    {tripStats?.eta ? `Reaching in ${tripStats.eta}` : 'Ride in progress'}
                                </p>
                            </div>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 bg-white text-gray-900 z-[100] rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] max-h-[55vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-2xl font-bold">On trip</h2>
                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                        Started
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <Clock className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                                        <p className="text-xl font-bold">{tripStats?.eta || '--'}</p>
                                        <p className="text-xs text-gray-500">ETA</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <Navigation className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                                        <p className="text-xl font-bold">{tripStats?.distance || '--'}</p>
                                        <p className="text-xs text-gray-500">Distance</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <IndianRupee className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                                        <p className="text-xl font-bold">{acceptedRide.fare ?? '--'}</p>
                                        <p className="text-xs text-gray-500">Fare</p>
                                    </div>
                                </div>

                                {captainDetails && (
                                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Your driver</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                    {captainDetails.fullname?.firstname?.[0]?.toUpperCase() || 'C'}
                                                </div>
                                                <div>
                                                    <p className="text-black font-bold">
                                                        {captainDetails.fullname?.firstname || ''} {captainDetails.fullname?.lastname || ''}
                                                    </p>
                                                    <p className="text-gray-500 text-sm capitalize">
                                                        {getVehicleLabel(captainDetails.vehicle?.vehicleType || acceptedRide.type)}
                                                        {captainDetails.vehicle?.color ? ` · ${captainDetails.vehicle.color}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-black font-bold text-lg">
                                                    {captainDetails.vehicle?.plate || 'N/A'}
                                                </p>
                                                <p className="text-gray-500 text-sm">License plate</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 border-t border-gray-100 pt-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-3 h-3 rounded-full bg-black mt-1.5 shrink-0"></div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Pickup</p>
                                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                                {acceptedRide.pickup || pickup || 'Pickup location'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Drop-off</p>
                                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                                {acceptedRide.destination || destination || 'Destination'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Ride completed overlay */}
                {rideCompleted && (
                    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✓</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Completed</h2>
                            <p className="text-gray-600">Thanks for riding with us!</p>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white pb-24 text-gray-900">
            {/* Header + Tabs */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    {user ? (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm">
                                {user.fullname?.firstname?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user.fullname?.firstname} {user.fullname?.lastname}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-9" />
                    )}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="shrink-0 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                    >
                        Logout
                    </button>
                </div>
                <div className="flex w-full">
                    <button
                        onClick={() => setActiveTab('Rides')}
                        className={`flex-1 flex flex-col items-center justify-center py-3 relative ${activeTab === 'Rides' ? 'text-black' : 'text-gray-500'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Car size={24} fill={activeTab === 'Rides' ? 'currentColor' : 'none'} strokeWidth={activeTab === 'Rides' ? 0 : 2} />
                            <span className="text-lg font-medium">Rides</span>
                        </div>
                        {activeTab === 'Rides' && (
                            <div className="absolute bottom-0 w-24 h-0.5 bg-black rounded-t-full" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('Eats')}
                        className={`flex-1 flex flex-col items-center justify-center py-3 relative ${activeTab === 'Eats' ? 'text-black' : 'text-gray-500'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Utensils size={24} fill={activeTab === 'Eats' ? 'currentColor' : 'none'} strokeWidth={activeTab === 'Eats' ? 0 : 2} />
                            <span className="text-lg font-medium">Eats</span>
                        </div>
                        {activeTab === 'Eats' && (
                            <div className="absolute bottom-0 w-24 h-0.5 bg-black rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Search Bar */}
                <div className="relative" onClick={() => setIsSearching(true)}>
                    <div className="bg-[#EFEFEF] rounded-full p-3 pl-12 pr-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-200 transition-colors">
                        <span className="text-xl font-bold text-gray-900">Where to?</span>

                        <div className="bg-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm">
                            <Clock size={16} className="text-black fill-current" />
                            <span className="text-sm font-medium">Now</span>
                            <ChevronDown size={14} strokeWidth={3} />
                        </div>
                    </div>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900" size={24} strokeWidth={3} />
                </div>

                {/* Recent Destinations */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4 border-b border-gray-50/50 pb-2">
                        <div className="bg-gray-200/50 p-2 rounded-full">
                            <Clock size={20} className="text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">Ironhack GmbH</h3>
                            <p className="text-gray-500 text-sm">Storkower Str. 132, Berlin</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-200/50 p-2 rounded-full">
                            <Clock size={20} className="text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">Ironhack GmbH</h3>
                            <p className="text-gray-500 text-sm">Storkower Str. 132, Berlin</p>
                        </div>
                    </div>
                </div>

                {/* Suggestions */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-gray-900">Suggestions</h2>
                        <Link to="#" className="text-gray-900 text-sm font-medium">See All</Link>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {suggestions.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2">
                                <div className="w-full aspect-square bg-[#EFEFEF] rounded-xl flex items-center justify-center relative hover:bg-gray-200 transition-colors cursor-pointer">
                                    {item.promo && (
                                        <div className="absolute -top-2 bg-[#F6F6F6] text-[#048848] text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm border border-gray-100">
                                            Promo
                                        </div>
                                    )}
                                    <item.icon size={32} className="text-black" strokeWidth={1.5} />
                                </div>
                                <span className="text-xs font-medium text-gray-900 text-center leading-tight">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Easy Car Rentals Banner */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold text-gray-900">Easy car rentals</h2>
                    </div>

                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                        <div className="min-w-[85%] bg-[#E8F0F5] rounded-xl p-4 relative h-40 overflow-hidden flex-shrink-0">
                            <div className="w-full h-full relative z-10 flex flex-col justify-between">
                                <div className="max-w-[60%]">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Rent a car and go &rarr;</h3>
                                    <p className="text-sm text-gray-500 leading-tight">Rent for your next business trip</p>
                                </div>
                            </div>

                            {/* Illustration Placeholder */}
                            <div className="absolute inset-0 w-full h-full pointer-events-none">
                                <div className="w-full h-full relative">
                                    {/* Using a simple colored circle and icon as placeholder for the man driving */}
                                    <img
                                        src="https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/d00e4776371683.5c67861304197.png"
                                        alt="Car Rental"
                                        className="w-full h-full object-cover object-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="min-w-[85%] bg-[#F5E8E8] rounded-xl p-4 relative h-40 overflow-hidden flex-shrink-0">
                            <div className="w-full h-full relative z-10 flex flex-col justify-between">
                                <div className="max-w-[60%]">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Choose your ride &rarr;</h3>
                                    <p className="text-sm text-gray-500 leading-tight">Easily compare types</p>
                                </div>
                            </div>
                            <div className="absolute right-0 bottom-0 w-40 h-full bg-gradient-to-l from-orange-100 to-transparent"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-between items-end z-50">
                <Link to="#" className="flex flex-col items-center gap-1 text-black">
                    <House size={24} fill="currentColor" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link to="#" className="flex flex-col items-center gap-1 text-gray-500">
                    <LayoutGrid size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Services</span>
                </Link>

                <Link to="#" className="flex flex-col items-center gap-1 text-gray-500">
                    <FileText size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Activity</span>
                </Link>

                <Link to="#" className="flex flex-col items-center gap-1 text-gray-500">
                    <User size={24} strokeWidth={2} />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
            </div>
        </div>
    )
}

export default UserLanding