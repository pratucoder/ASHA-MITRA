// Coordinates of all graph nodes (for fallback coordinate lookup)
export const NODE_COORDINATES = {
  'Rampur': { latitude: 23.8000, longitude: 80.3500 },
  'Piparia': { latitude: 23.8200, longitude: 80.3700 },
  'Katni': { latitude: 23.8343, longitude: 80.3892 },
  'Pimpri': { latitude: 23.7800, longitude: 80.3200 },
  'Vikas Nagar': { latitude: 23.8100, longitude: 80.3600 },
  'Katni District Hospital': { latitude: 23.8370, longitude: 80.4000 },
  'Rampur CHC': { latitude: 23.8050, longitude: 80.3450 },
  'Piparia Rural Hospital': { latitude: 23.8180, longitude: 80.3650 },
  'Apex Multispeciality Hospital': { latitude: 23.8280, longitude: 80.3800 },
  'Jabalpur Tertiary Referral Hospital': { latitude: 23.1681, longitude: 79.9338 }
};

// Main hospital profiles
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
    name: 'Rampur CHC',
    phone: '+91 76222 23045',
    address: 'Main Road, Rampur Sector 2, MP',
    type: 'hospital'
  },
  {
    id: 'hosp-3',
    name: 'Piparia Rural Hospital',
    phone: '+91 76222 24590',
    address: 'Piparia Junction Road, MP',
    type: 'hospital'
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
  console.log(`Registered dynamic coordinates for "${cleanName}":`, latitude, longitude);
}

/**
 * Reverse geocodes latitude/longitude coordinates into a human-readable area/town/village name
 * using OpenStreetMap's Nominatim API.
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
    // Extract local area description (village, town, suburb, city, etc.)
    const area = addr.village || addr.town || addr.suburb || addr.city_district || addr.city || addr.county || addr.state_district || 'Regional Cluster';
    return area;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return null;
  }
}

/**
 * Fetch real-world nearby hospitals, clinics, and doctors from OpenStreetMap Overpass API
 */
export async function fetchNearbyHospitalsOverpass(lat, lng) {
  try {
    const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:15000,${lat},${lng});node["amenity"="clinic"](around:15000,${lat},${lng});node["amenity"="doctors"](around:15000,${lat},${lng}););out;`;
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Overpass API query failed');
    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error("Failed to fetch real hospitals/clinics from Overpass:", error);
    return [];
  }
}

/**
 * Async version of nearby hospitals finder.
 * Resolves real hospitals near GPS coordinates from Overpass API, otherwise falls back.
 */
export async function getNearbyHospitalsAsync(lat, lng, villageName) {
  let startLat = 23.8000;
  let startLng = 80.3500; // default

  if (lat && lng) {
    startLat = lat;
    startLng = lng;

    const elements = await fetchNearbyHospitalsOverpass(lat, lng);
    
    if (elements && elements.length > 0) {
      elements.slice(0, 15).forEach(elem => {
        const tags = elem.tags || {};
        const typeLabel = tags.amenity === 'clinic' ? 'Clinic' : tags.amenity === 'doctors' ? 'Doctors Clinic' : 'Hospital';
        const name = tags.name || `Local ${typeLabel} (${tags.operator || 'Medical Unit'})`;
        const phone = tags.phone || tags['contact:phone'] || '+91 99999 00000';
        const address = tags['addr:street'] || tags['addr:suburb'] || tags['addr:city'] || `${typeLabel} Services`;

        NODE_COORDINATES[name] = { latitude: elem.lat, longitude: elem.lon };

        const exists = REGIONAL_HOSPITALS.find(h => h.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          REGIONAL_HOSPITALS.push({
            id: `overpass-${elem.id}`,
            name,
            phone,
            address,
            type: tags.amenity || 'hospital'
          });
        }
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

  const hasLocalHospitals = results.some(h => h.distance < 60);
  const finalResults = hasLocalHospitals 
    ? results.filter(h => h.distance < 100)
    : results;

  return finalResults.sort((a, b) => a.distance - b.distance);
}
