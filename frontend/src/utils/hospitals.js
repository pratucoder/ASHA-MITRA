// Coordinates of all graph nodes (for fallback coordinate lookup)
export const NODE_COORDINATES = {
  'Rampur': { latitude: 23.8000, longitude: 80.3500 },
  'Piparia': { latitude: 23.8200, longitude: 80.3700 },
  'Katni': { latitude: 23.8343, longitude: 80.3892 },
  'Pimpri': { latitude: 23.7800, longitude: 80.3200 },
  'Vikas Nagar': { latitude: 23.8100, longitude: 80.3600 },
  'Katni District Hospital': { latitude: 23.8370, longitude: 80.4000 },
  'Rampur Primary Health Centre (PHC)': { latitude: 23.8050, longitude: 80.3450 },
  'Piparia Rural Health Clinic': { latitude: 23.8180, longitude: 80.3650 },
  'Apex Multispeciality Hospital': { latitude: 23.8280, longitude: 80.3800 },
  'Jabalpur Tertiary Referral Hospital': { latitude: 23.1681, longitude: 79.9338 },
  'Vikas Nagar Wellness Clinic': { latitude: 23.8120, longitude: 80.3580 },
  'Pimpri Sub-Health Centre': { latitude: 23.7840, longitude: 80.3250 },
  'Dr. Sharma Family Clinic': { latitude: 23.8250, longitude: 80.3750 }
};

// Regional hospitals and clinic profiles (including small clinics, PHCs, CHCs, doctors)
export const REGIONAL_HOSPITALS = [
  {
    id: 'hosp-1',
    name: 'Katni District Hospital',
    phone: '+91 76222 22001',
    address: 'Near Railway Station, Katni, MP',
    type: 'hospital'
  },
  {
    id: 'hosp-2',
    name: 'Rampur Primary Health Centre (PHC)',
    phone: '+91 76222 23045',
    address: 'Main Road, Rampur Sector 2, MP',
    type: 'clinic'
  },
  {
    id: 'hosp-3',
    name: 'Piparia Rural Health Clinic',
    phone: '+91 76222 24590',
    address: 'Piparia Junction Road, MP',
    type: 'clinic'
  },
  {
    id: 'hosp-4',
    name: 'Apex Multispeciality Hospital',
    phone: '+91 98765 00107',
    address: 'Civil Lines, Katni Region, MP',
    type: 'hospital'
  },
  {
    id: 'hosp-5',
    name: 'Vikas Nagar Wellness Clinic',
    phone: '+91 98261 44321',
    address: 'Block B, Vikas Nagar, Katni, MP',
    type: 'clinic'
  },
  {
    id: 'hosp-6',
    name: 'Pimpri Sub-Health Centre',
    phone: '+91 76222 29810',
    address: 'Village Square, Pimpri, MP',
    type: 'clinic'
  },
  {
    id: 'hosp-7',
    name: 'Dr. Sharma Family Clinic',
    phone: '+91 94251 11200',
    address: 'Station Road, Katni, MP',
    type: 'doctors'
  },
  {
    id: 'hosp-8',
    name: 'Jabalpur Tertiary Referral Hospital',
    phone: '+91 76126 20042',
    address: 'Medical College Campus, Jabalpur, MP',
    type: 'hospital'
  }
];

/**
 * Calculates the straight line distance between two points in km using the Haversine formula
 */
export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds nearby hospitals based on direct coordinates straight-line distance
 */
export function getNearbyHospitals(lat, lng, villageName) {
  let startLat = 23.8000;
  let startLng = 80.3500; // Rampur coordinates

  if (lat && lng) {
    startLat = lat;
    startLng = lng;
  } else {
    const cleanVillage = (villageName || '').toLowerCase().trim();
    let matchedNode = null;
    for (const nodeName in NODE_COORDINATES) {
      if (nodeName.toLowerCase() === cleanVillage || cleanVillage.includes(nodeName.toLowerCase())) {
        matchedNode = nodeName;
        break;
      }
    }
    if (matchedNode) {
      startLat = NODE_COORDINATES[matchedNode].latitude;
      startLng = NODE_COORDINATES[matchedNode].longitude;
    } else {
      startLat = NODE_COORDINATES['Rampur'].latitude;
      startLng = NODE_COORDINATES['Rampur'].longitude;
    }
  }

  const results = REGIONAL_HOSPITALS.map(hosp => {
    const coords = NODE_COORDINATES[hosp.name] || { latitude: 23.8000, longitude: 80.3500 };
    const dist = getHaversineDistance(startLat, startLng, coords.latitude, coords.longitude);
    return {
      ...hosp,
      distance: parseFloat(dist.toFixed(1)),
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  });

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Dynamically registers coordinates for custom villages
 */
export function registerDynamicVillage(villageName, latitude, longitude) {
  if (!villageName) return;
  const cleanName = villageName.trim();
  NODE_COORDINATES[cleanName] = { latitude, longitude };
}

/**
 * Reverse geocodes latitude/longitude coordinates into a human-readable area name
 */
export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'ASHA-Saathi-Triage-Companion-Agent'
      }
    });
    if (!response.ok) throw new Error('Nominatim reverse geocode request failed');
    const data = await response.json();
    const addr = data.address || {};
    const area = addr.village || addr.town || addr.suburb || addr.city_district || addr.city || addr.county || addr.state_district || 'Regional Cluster';
    return area;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

/**
 * Fetch real-world nearby hospitals, clinics, PHCs, CHCs, dispensaries and doctors from OpenStreetMap Overpass API
 */
/**
 * Fetch real-world nearby hospitals, clinics, PHCs, CHCs, dispensaries and doctors from OpenStreetMap Overpass API
 */
export async function fetchNearbyHospitalsOverpass(lat, lng) {
  const query = `[out:json][timeout:20];
(
  nwr["amenity"="hospital"](around:25000,${lat},${lng});
  nwr["amenity"="clinic"](around:25000,${lat},${lng});
  nwr["amenity"="doctors"](around:25000,${lat},${lng});
  nwr["healthcare"="clinic"](around:25000,${lat},${lng});
  nwr["healthcare"="centre"](around:25000,${lat},${lng});
  nwr["healthcare"="doctor"](around:25000,${lat},${lng});
  nwr["healthcare"="hospital"](around:25000,${lat},${lng});
  nwr["healthcare"="dispensary"](around:25000,${lat},${lng});
);
out center;`;

  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.private.coffee/api/interpreter?data=${encodeURIComponent(query)}`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.elements) return data.elements;
      }
    } catch (err) {
      console.warn(`Overpass endpoint request failed (${url}):`, err.message);
    }
  }

  console.error("All Overpass API mirrors failed to return facilities.");
  return [];
}

/**
 * Async version of nearby medical facilities finder.
 * Resolves real clinics, PHCs, CHCs, and hospitals near GPS coordinates from Overpass API.
 */
export async function getNearbyHospitalsAsync(lat, lng, villageName) {
  let startLat = 23.8000;
  let startLng = 80.3500; // default Katni/Rampur
  const hasGps = Boolean(lat && lng);

  let fetchedList = [];

  if (hasGps) {
    startLat = lat;
    startLng = lng;

    const elements = await fetchNearbyHospitalsOverpass(lat, lng);
    
    if (elements && elements.length > 0) {
      elements.forEach(elem => {
        const tags = elem.tags || {};
        const elemLat = elem.lat || elem.center?.lat;
        const elemLng = elem.lon || elem.center?.lon;

        if (!elemLat || !elemLng) return;

        let typeCategory = 'hospital';
        let typeLabel = 'Hospital';

        const amenity = (tags.amenity || '').toLowerCase();
        const healthcare = (tags.healthcare || '').toLowerCase();

        if (amenity === 'clinic' || healthcare === 'clinic' || healthcare === 'centre' || healthcare === 'dispensary') {
          typeCategory = 'clinic';
          typeLabel = 'Clinic / PHC';
        } else if (amenity === 'doctors' || healthcare === 'doctor') {
          typeCategory = 'doctors';
          typeLabel = 'Doctor Clinic';
        } else {
          typeCategory = 'hospital';
          typeLabel = 'Hospital';
        }

        const rawName = tags.name || tags['name:en'] || tags['official_name'];
        const name = rawName || `Local ${typeLabel} (${tags.operator || tags['addr:suburb'] || 'Health Unit'})`;
        const phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || '+91 99999 00000';
        const address = tags['addr:full'] || tags['addr:street'] || tags['addr:suburb'] || tags['addr:city'] || `${typeLabel} Facility`;

        NODE_COORDINATES[name] = { latitude: elemLat, longitude: elemLng };

        fetchedList.push({
          id: `overpass-${elem.type}-${elem.id}`,
          name,
          phone,
          address,
          type: typeCategory,
          latitude: elemLat,
          longitude: elemLng
        });
      });
    }
  } else {
    const cleanVillage = (villageName || '').toLowerCase().trim();
    let matchedNode = null;
    for (const nodeName in NODE_COORDINATES) {
      if (nodeName.toLowerCase() === cleanVillage || cleanVillage.includes(nodeName.toLowerCase())) {
        matchedNode = nodeName;
        break;
      }
    }
    if (matchedNode) {
      startLat = NODE_COORDINATES[matchedNode].latitude;
      startLng = NODE_COORDINATES[matchedNode].longitude;
    } else {
      startLat = NODE_COORDINATES['Rampur'].latitude;
      startLng = NODE_COORDINATES['Rampur'].longitude;
    }
  }

  // Deduplicate and process facility map
  const combinedMap = new Map();

  // If live GPS results were fetched, use them as primary dataset
  if (fetchedList.length > 0) {
    fetchedList.forEach(item => {
      combinedMap.set(item.name.toLowerCase(), item);
    });

    // Only include fallback regional hospitals if they are actually nearby (<= 30km)
    REGIONAL_HOSPITALS.forEach(hosp => {
      const coords = NODE_COORDINATES[hosp.name] || { latitude: 23.8000, longitude: 80.3500 };
      const dist = getHaversineDistance(startLat, startLng, coords.latitude, coords.longitude);
      if (dist <= 30) {
        combinedMap.set(hosp.name.toLowerCase(), {
          ...hosp,
          latitude: coords.latitude,
          longitude: coords.longitude
        });
      }
    });
  } else {
    // If live GPS search returned empty or offline, use regional list
    REGIONAL_HOSPITALS.forEach(hosp => {
      const coords = NODE_COORDINATES[hosp.name] || { latitude: 23.8000, longitude: 80.3500 };
      combinedMap.set(hosp.name.toLowerCase(), {
        ...hosp,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
    });
  }

  // Calculate exact distances from user coordinates
  let results = Array.from(combinedMap.values()).map(hosp => {
    const dist = getHaversineDistance(startLat, startLng, hosp.latitude, hosp.longitude);
    return {
      ...hosp,
      distance: parseFloat(dist.toFixed(1))
    };
  });

  // Sort by distance ascending
  results.sort((a, b) => a.distance - b.distance);

  // If user GPS is active, strictly filter out any facilities further than 35km radius
  if (hasGps) {
    const nearbyOnly = results.filter(h => h.distance <= 35);
    if (nearbyOnly.length > 0) {
      results = nearbyOnly;
    }
  }

  // Return top 60 nearest facilities to prevent map overcrowding
  return results.slice(0, 60);
}
