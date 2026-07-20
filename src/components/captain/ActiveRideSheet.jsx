import { useState } from 'react';
import {
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  ChevronUp,
} from 'lucide-react';

export default function ActiveRideSheet({
  acceptedRide,
  userDetails,
  otp,
  otpVerified,
  verifyingOtp,
  tripStats,
  rideCompleted,
  onOtpChange,
  onVerifyOtp,
  onCompleteRide,
}) {
  const [expanded, setExpanded] = useState(true);

  if (!acceptedRide || !userDetails) return null;

  const toggleExpanded = () => setExpanded((prev) => !prev);

  if (rideCompleted) {
    return (
      <div className="pointer-events-auto absolute inset-0 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip completed</h2>
          <p className="text-gray-600">
            You earned ₹{acceptedRide.fare}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {otpVerified && (
        <div className="pointer-events-auto absolute top-20 left-4 right-4 flex justify-center">
          <div className="bg-black text-white rounded-full px-4 py-2.5 shadow-lg max-w-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
              <p className="text-sm font-semibold truncate">
                {tripStats?.eta ? `Reaching in ${tripStats.eta}` : 'Ride in progress'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`pointer-events-auto w-full max-w-full bg-white text-gray-900 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] overflow-hidden box-border transition-[max-height] duration-300 ease-in-out ${
          expanded ? 'max-h-[65vh]' : 'max-h-[5.75rem]'
        }`}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse trip panel' : 'Expand trip panel'}
          className="w-full text-left"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 pb-3 pt-1 sm:px-6 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold leading-tight truncate">
                {otpVerified ? 'On trip' : 'En route to pickup'}
              </h2>
              {!expanded && otpVerified && tripStats?.eta && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Reaching in {tripStats.eta} · ₹{acceptedRide.fare ?? '--'}
                </p>
              )}
              {!expanded && !otpVerified && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Tap to enter OTP
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">
                {otpVerified ? 'Started' : 'En route'}
              </span>
              <ChevronUp
                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </button>

        <div
          className={`overflow-y-auto overflow-x-hidden transition-opacity duration-300 ${
            expanded ? 'opacity-100 max-h-[calc(65vh-5.75rem)]' : 'opacity-0 max-h-0 pointer-events-none'
          }`}
        >
        <div className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
          {otpVerified && tripStats && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-0">
                <Clock className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                <p className="text-base font-bold truncate">{tripStats.eta || '--'}</p>
                <p className="text-[10px] text-gray-500">ETA</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-0">
                <Navigation className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                <p className="text-base font-bold truncate">{tripStats.distance || '--'}</p>
                <p className="text-[10px] text-gray-500">Distance</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center min-w-0">
                <IndianRupee className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                <p className="text-base font-bold truncate">{acceptedRide.fare ?? '--'}</p>
                <p className="text-[10px] text-gray-500">Fare</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Your rider</p>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                {userDetails.fullname?.firstname?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-black font-bold truncate">
                  {userDetails.fullname?.firstname || ''} {userDetails.fullname?.lastname || ''}
                </p>
                <p className="text-gray-500 text-sm truncate">{userDetails.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-3 mb-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-black mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 uppercase">Pickup</p>
                <p className="text-sm font-medium text-gray-900 break-words">{acceptedRide.pickup}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 uppercase">Drop-off</p>
                <p className="text-sm font-medium text-gray-900 break-words">{acceptedRide.destination}</p>
              </div>
            </div>
          </div>

          {!otpVerified && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Enter rider OTP to start trip
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  disabled={verifyingOtp}
                  className="w-full h-12 bg-[#EFEFEF] border-0 rounded-xl text-center text-xl font-bold tracking-[0.3em] text-gray-900 placeholder:text-gray-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-black box-border"
                />
                <button
                  type="button"
                  onClick={onVerifyOtp}
                  disabled={otp.length !== 4 || verifyingOtp}
                  className="w-full h-12 rounded-full bg-black text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <button
              type="button"
              onClick={onCompleteRide}
              className="w-full h-12 rounded-full bg-black text-white font-semibold hover:bg-gray-800 transition-colors"
            >
              Mark trip as completed
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
