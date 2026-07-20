import {
  Car,
  Mail,
  MapPin,
  IndianRupee,
  Star,
  Users,
  Navigation,
} from 'lucide-react';
import { getVehicleLabel } from '../../utils/tripUtils';

export default function CaptainHomePanel({
  captain,
  isOnline,
  onToggleOnline,
  captainLocation,
  currentAddress,
  locationError,
  todayStats = { earnings: 0, trips: 0 },
  statsLoading = false,
}) {
  if (!captain) return null;

  const vehicle = captain.vehicle;

  return (
    <div className="h-full bg-white border-t border-gray-100 flex flex-col overflow-hidden max-w-full">
      <div className="flex justify-center pt-2 pb-1 shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-5 sm:px-5">
        {/* Online / Offline toggle */}
        <div className="flex items-center justify-between bg-[#EFEFEF] rounded-2xl p-4 mb-4">
          <div>
            <p className="text-base font-bold text-gray-900">
              {isOnline ? "You're online" : "You're offline"}
            </p>
            <p className="text-sm text-gray-500">
              {isOnline
                ? 'Receiving ride requests nearby'
                : 'Go online to start earning'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            onClick={onToggleOnline}
            className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 ${
              isOnline ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                isOnline ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Driver profile */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white font-bold text-xl shrink-0">
            {captain.fullname?.firstname?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {captain.fullname?.firstname} {captain.fullname?.lastname}
            </h2>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <Mail size={14} />
              <span className="truncate">{captain.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 rounded-full px-3 py-1.5 shrink-0">
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-900">4.9</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <IndianRupee className="w-5 h-5 mx-auto mb-1 text-gray-600" />
            <p className="text-lg font-bold text-gray-900">
              {statsLoading ? '—' : `₹${todayStats.earnings}`}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Today</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Navigation className="w-5 h-5 mx-auto mb-1 text-gray-600" />
            <p className="text-lg font-bold text-gray-900">
              {statsLoading ? '—' : todayStats.trips}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Trips</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
            <p className="text-lg font-bold text-gray-900">—</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Hours</p>
          </div>
        </div>

        {/* Vehicle info */}
        {vehicle && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Car size={18} className="text-gray-600" />
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Your vehicle
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getVehicleLabel(vehicle.vehicleType)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Plate</p>
                <p className="text-sm font-semibold text-gray-900">{vehicle.plate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Color</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{vehicle.color}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Capacity</p>
                <p className="text-sm font-semibold text-gray-900">
                  {vehicle.capacity} {vehicle.capacity === 1 ? 'seat' : 'seats'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current location */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-gray-600" />
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Current location
            </p>
          </div>
          {locationError ? (
            <p className="text-sm text-red-500">{locationError}</p>
          ) : currentAddress ? (
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{currentAddress}</p>
          ) : captainLocation ? (
            <p className="text-sm text-gray-500">
              {captainLocation[0].toFixed(5)}, {captainLocation[1].toFixed(5)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Getting location...</p>
          )}
        </div>
      </div>
    </div>
  );
}
