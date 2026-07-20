import React, { useEffect, useState } from 'react';
import { User, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { buildFareVehicleOptions, FARE_SKELETON_COUNT } from '../../utils/vehicleAssets';

function FareRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 mb-2 rounded-xl border-2 border-gray-100 bg-white animate-pulse">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-16 h-10 bg-gray-200 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-3.5 bg-gray-100 rounded w-32" />
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-12 shrink-0" />
    </div>
  );
}

const Fare = ({ fare, loadingFare, createRide, creatingRide, selectedVehicleType }) => {
  const vehicles = buildFareVehicleOptions(fare);
  const [selected, setSelected] = useState(vehicles[0]);

  useEffect(() => {
    if (!loadingFare && fare) {
      setSelected(buildFareVehicleOptions(fare)[0]);
    }
  }, [loadingFare, fare]);

  const isReady = !loadingFare && fare;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white text-gray-900 z-[100] rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] max-h-[50vh] flex flex-col pt-2">
      <div className="px-4 pb-2 text-center border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Choose a trip</h3>
        {loadingFare && (
          <p className="text-xs text-gray-500 mt-1">Calculating fares for your route...</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loadingFare ? (
          Array.from({ length: FARE_SKELETON_COUNT }).map((_, index) => (
            <FareRowSkeleton key={index} />
          ))
        ) : (
          vehicles.map((v) => {
            const isCreating = creatingRide && selectedVehicleType === v.type;
            return (
              <div
                key={v.id}
                onClick={() => !creatingRide && setSelected(v)}
                className={`flex items-center justify-between p-3 mb-2 rounded-xl cursor-pointer border-2 transition-all ${
                  isCreating
                    ? 'border-gray-900 bg-gray-50'
                    : selected.id === v.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98]'
                } ${creatingRide && !isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 flex justify-center relative">
                    {isCreating ? (
                      <Loader2 className="w-10 h-10 text-black animate-spin" />
                    ) : (
                      <img src={v.icon} alt={v.name} className="h-10 object-contain" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{v.name}</span>
                      {!isCreating && (
                        <div className="flex items-center gap-0.5 text-gray-600 text-xs">
                          <User size={10} fill="currentColor" />
                          <span>{v.capacity}</span>
                        </div>
                      )}
                    </div>
                    {isCreating ? (
                      <span className="text-sm text-gray-600 font-medium">Creating trip...</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{v.time}</span>
                          {fare?.distance && (
                            <>
                              <span>•</span>
                              <span>{fare.distance}</span>
                            </>
                          )}
                        </div>
                        {v.description && (
                          <div className={`mt-1 text-xs px-2 py-0.5 rounded w-fit flex items-center gap-1 ${v.tagColor || 'bg-blue-600 text-white'}`}>
                            <span>⚡ {v.description}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!isCreating && (
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {v.price != null ? `₹${v.price}` : '--'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3 text-gray-900">
            <div className="bg-blue-600 p-1.5 rounded-full">
              <CreditCard size={16} className="text-white" />
            </div>
            <span className="font-medium">Cash</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => createRide(selected.type)}
            disabled={creatingRide || loadingFare || !isReady}
            className="flex-1 bg-black text-white font-bold text-lg py-3.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingRide ? 'Creating trip...' : loadingFare ? 'Calculating fare...' : `Choose ${selected.type}`}
          </button>

          <button
            type="button"
            disabled={loadingFare}
            className="bg-gray-100 p-3.5 rounded-xl text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Calendar size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Fare;
