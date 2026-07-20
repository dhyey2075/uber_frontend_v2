import { Loader2, MapPin } from 'lucide-react';
import { getVehicleLabel } from '../../utils/tripUtils';

export default function RideRequestSheet({
  rideRequest,
  processingRide,
  onDecline,
  onAccept,
}) {
  if (!rideRequest) return null;

  return (
    <div className="pointer-events-auto w-full max-w-full bg-white text-gray-900 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] overflow-x-hidden box-border max-h-[70vh] overflow-y-auto">
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="px-4 pb-5 pt-1 sm:px-6 sm:pb-6">
        <h2 className="text-lg font-bold mb-1">New ride request</h2>
        <p className="text-gray-500 text-sm mb-4">A rider nearby needs a trip</p>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[#EFEFEF] rounded-full flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pickup</p>
              <p className="text-sm font-medium text-gray-900 break-words">{rideRequest.pickup}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[#EFEFEF] rounded-full flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Destination</p>
              <p className="text-sm font-medium text-gray-900 break-words">{rideRequest.destination}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50 rounded-xl p-3">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Vehicle</p>
            <p className="text-sm font-bold capitalize truncate">
              {getVehicleLabel(rideRequest.type)}
            </p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-[10px] text-gray-500 uppercase">Fare</p>
            <p className="text-lg font-bold">₹{rideRequest.fare}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDecline}
            disabled={processingRide}
            className="flex-1 min-w-0 h-12 rounded-full border-2 border-black text-black text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={processingRide}
            className="flex-1 min-w-0 h-12 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {processingRide ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Accepting...</span>
              </>
            ) : (
              'Accept'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
