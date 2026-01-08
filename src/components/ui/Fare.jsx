import React, { useState } from 'react';
import { User, CreditCard, ChevronDown, Calendar, ArrowRight, Loader2 } from 'lucide-react';

const Fare = ({ fare, setVehicleType, createRide, creatingRide, selectedVehicleType }) => {
    // Determine which vehicle is potentially "faster" or "cheaper" for UI tags.
    // For this mockup, we'll hardcode Auto as "Faster" as per the user image request, 
    // or we could logic it out. The user image shows Auto has a "Faster" tag.

    const vehicles = [
        {
            type: 'auto',
            name: 'Auto',
            icon: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=552/height=368/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy8xZGRiOGM1Ni0wMjA0LTRjZTQtODFjZS01NmExMWEwN2ZlOTgucG5n', // Placeholder or use Lucide if simple
            price: fare?.auto || 100,
            time: '2 min', // Mock or derived
            capacity: 3,
            description: 'Faster', // Tag
            tagColor: 'bg-blue-600 text-white',
        },
        {
            type: 'car',
            name: 'UberXL',
            icon: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=956/height=538/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy9iYWRmYjFkNi02YzJiLTQ1NTMtYjkyOS05ZmYzMmYwMmE1NWUucG5n',
            price: fare?.car || 200, // Assuming car mapped to XL for now, or add distinct keys
            time: '6 min',
            capacity: 4,
            description: null,
        },
        {
            type: 'car',
            name: 'Uber Go',
            // Utilizing car price for Go if not distinct, usually Go is cheaper than XL.
            // Reference.jsx only returns { car, motorcycle, auto }. 
            // We'll map 'car' to 'Uber Go' and maybe 'car'*1.5 to 'UberXL' for demo?
            // Or just use what we have.
            // Let's use 'car' for Uber Go and 'car' * 1.8 for UberXL for visuals.
            icon: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=956/height=538/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy85MDM0YzIwMC1jZTI5LTQ5ZjEtYmYzNS1lOWQyNTBlODIxN2EucG5n',
            price: fare?.car ? Math.round(fare.car * 0.8) : 159,
            time: '4 min',
            capacity: 4,
            description: null,
        },
        {
            type: 'motorcycle',
            name: 'Bike',
            icon: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=552/height=368/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy8yYzdmYTE5NC1jOTU0LTQ5YjItOWM2ZC1hM2I4NjAxMzcwZjUucG5n',
            price: fare?.motorcycle || 65,
            time: '3 min',
            capacity: 1,
            description: null,
        }
    ];

    // Sort so Auto is top as per image
    // Actually the image shows: Auto, UberXL, Uber Go, Bike.

    const [selected, setSelected] = useState(vehicles[0]);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white text-gray-900 z-[100] rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.3)] max-h-[50vh] flex flex-col pt-2">

            <div className="px-4 pb-2 text-center border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Choose a trip</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                {vehicles.map((v) => {
                    const isCreating = creatingRide && selectedVehicleType === v.type;
                    return (
                        <div
                            key={v.name}
                            onClick={() => !creatingRide && setSelected(v)}
                            className={`flex items-center justify-between p-3 mb-2 rounded-xl cursor-pointer border-2 transition-all ${
                                isCreating
                                    ? 'border-gray-900 bg-gray-50'
                                    : selected.name === v.name
                                    ? 'border-gray-900 bg-gray-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98]'
                            } ${creatingRide && !isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon Image Placeholder */}
                                <div className="w-16 flex justify-center relative">
                                    {isCreating ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-10 h-10 text-black animate-spin" />
                                        </div>
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
                                            <span>{v.time}</span> {/* In real app use ETA */}
                                            <span>•</span>
                                            <span>2 min away</span>
                                        </div>
                                        {v.description && (
                                            <div className={`mt-1 text-xs px-2 py-0.5 rounded w-fit flex items-center gap-1 ${v.tagColor || 'bg-blue-600 text-white'}`}>
                                                {/* Lightning icon usually goes here for "Faster" */}
                                                <span>⚡ {v.description}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {!isCreating && (
                            <div className="text-right">
                                <span className="text-lg font-bold text-gray-900">₹{v.price}</span>
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-white border-t border-gray-200 safe-area-bottom">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3 text-gray-900">
                        <div className="bg-blue-600 p-1.5 rounded-full"> {/* Cash icon wrapper placeholder */}
                            <CreditCard size={16} className="text-white" />
                        </div>
                        <span className="font-medium">Cash</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => createRide(selected.type)}
                        disabled={creatingRide}
                        className="flex-1 bg-black text-white font-bold text-lg py-3.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creatingRide ? 'Creating trip...' : `Choose ${selected.type}`}
                    </button>

                    <button className="bg-gray-100 p-3.5 rounded-xl text-gray-900 hover:bg-gray-200 transition-colors">
                        <Calendar size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Fare;
