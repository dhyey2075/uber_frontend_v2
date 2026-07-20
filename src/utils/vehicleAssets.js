export const VEHICLE_ICON_URLS = {
  auto: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=552/height=368/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy8xZGRiOGM1Ni0wMjA0LTRjZTQtODFjZS01NmExMWEwN2ZlOTgucG5n',
  car: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=956/height=538/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy85MDM0YzIwMC1jZTI5LTQ5ZjEtYmYzNS1lOWQyNTBlODIxN2EucG5n',
  carXl: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=956/height=538/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy9iYWRmYjFkNi02YzJiLTQ1NTMtYjkyOS05ZmYzMmYwMmE1NWUucG5n',
  motorcycle: 'https://cn-geo1.uber.com/image-proc/crop/resizecrop/udam/format=auto/width=552/height=368/srcb64=aHR0cHM6Ly90Yi1zdGF0aWMudWJlci5jb20vcHJvZC91ZGFtLWFzc2V0cy8yYzdmYTE5NC1jOTU0LTQ5YjItOWM2ZC1hM2I4NjAxMzcwZjUucG5n',
};

export function getVehicleIconUrl(vehicleType) {
  return VEHICLE_ICON_URLS[vehicleType] || VEHICLE_ICON_URLS.car;
}

export function buildFareVehicleOptions(fare) {
  const tripTime = fare?.time || '--';
  return [
    {
      id: 'auto',
      type: 'auto',
      name: 'Auto',
      icon: VEHICLE_ICON_URLS.auto,
      price: fare?.auto,
      time: tripTime,
      capacity: 3,
      description: 'Faster',
      tagColor: 'bg-blue-600 text-white',
    },
    {
      id: 'car-xl',
      type: 'car',
      name: 'UberXL',
      icon: VEHICLE_ICON_URLS.carXl,
      price: fare?.car != null ? Math.round(fare.car * 1.2) : null,
      time: tripTime,
      capacity: 4,
      description: null,
    },
    {
      id: 'car-go',
      type: 'car',
      name: 'Uber Go',
      icon: VEHICLE_ICON_URLS.car,
      price: fare?.car != null ? Math.round(fare.car * 0.85) : null,
      time: tripTime,
      capacity: 4,
      description: null,
    },
    {
      id: 'motorcycle',
      type: 'motorcycle',
      name: 'Bike',
      icon: VEHICLE_ICON_URLS.motorcycle,
      price: fare?.motorcycle,
      time: tripTime,
      capacity: 1,
      description: null,
    },
  ];
}

export const FARE_SKELETON_COUNT = 4;
