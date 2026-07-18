import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Phone, ExternalLink, RefreshCw, Compass, ArrowLeft, Loader2 } from 'lucide-react';
import { NODE_COORDINATES, getNearbyHospitalsAsync } from '../utils/hospitals';

export default function HospitalsMap({ userCoords, userLocationName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [mapError, setMapError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hospitalMarkersRef = useRef({});

  // Fallback coordinates (Katni region)
  const defaultLat = 23.8000;
  const defaultLng = 80.3500;
  
  const lat = userCoords ? userCoords.latitude : defaultLat;
  const lng = userCoords ? userCoords.longitude : defaultLng;

  // Load Leaflet assets
  useEffect(() => {
    let active = true;

    const loadLeaflet = async () => {
      if (!window.L) {
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load JS
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (active) {
        setLoading(false);
      }
    };

    loadLeaflet().catch(err => {
      console.error(err);
      if (active) setMapError('Failed to load map library.');
    });

    return () => {
      active = false;
    };
  }, []);

  // Fetch hospitals
  const loadHospitals = () => {
    getNearbyHospitalsAsync(userCoords?.latitude, userCoords?.longitude, userLocationName)
      .then(res => {
        setHospitals(res);
        if (res.length > 0) {
          setSelectedHospital(res[0]);
        }
      });
  };

  useEffect(() => {
    if (loading) return;
    loadHospitals();
  }, [loading, userCoords, userLocationName]);

  // Initialize Map
  useEffect(() => {
    if (loading || !window.L || !mapContainerRef.current) return;

    const L = window.L;

    // Reset map instance if already exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
    mapInstanceRef.current = map;

    // Setup Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Setup Markers Layer
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // User location icon (pulsing blue center marker using inline SVG)
    const userMarkerIcon = L.divIcon({
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
          <circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.25">
            <animate attributeName="r" values="6;11;6" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="12" cy="12" r="6" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="2"/>
        </svg>
      `,
      className: 'user-map-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const userMarker = L.marker([lat, lng], { icon: userMarkerIcon })
      .addTo(map);
    userMarker.bindPopup(`<b>Your Location</b><br>${userLocationName || 'Active GPS Center'}`).openPopup();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, lat, lng]);

  // Update Markers when hospitals change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !window.L) return;

    const L = window.L;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    hospitalMarkersRef.current = {};

    // Helper function to return custom inline SVG HTML for different marker types with a clear "+" symbol
    const getMarkerHtml = (type) => {
      let pinColor = '#EF4444'; // Red for hospital
      let crossColor = '#EF4444';
      
      if (type === 'clinic') {
        pinColor = '#10B981'; // Green for clinic
        crossColor = '#10B981';
      } else if (type === 'doctors') {
        pinColor = '#F59E0B'; // Gold/Amber for doctors
        crossColor = '#F59E0B';
      }

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" width="30" height="38">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12z" fill="${pinColor}" stroke="#FFFFFF" stroke-width="1.5"/>
          <circle cx="12" cy="11" r="7" fill="#FFFFFF"/>
          <path d="M12 7v8M8 11h8" stroke="${crossColor}" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      `;
    };

    hospitals.forEach(hosp => {
      const hLat = hosp.latitude;
      const hLng = hosp.longitude;
      if (hLat && hLng) {
        const customIcon = L.divIcon({
          html: getMarkerHtml(hosp.type),
          className: 'custom-leaflet-marker-wrapper',
          iconSize: [30, 38],
          iconAnchor: [15, 38],
          popupAnchor: [0, -38]
        });

        const marker = L.marker([hLat, hLng], { icon: customIcon })
          .addTo(markersLayer);
        
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 2px;">
            <b style="color: #0A2540; font-size: 14px;">${hosp.name}</b><br>
            <span style="color: #64748B;">${hosp.address}</span><br>
            <span style="color: #E07A5F; font-weight: 800; font-size: 11px; display: inline-block; margin-top: 4px;">📍 ${hosp.distance} km away</span>
          </div>
        `);

        marker.on('click', () => {
          setSelectedHospital(hosp);
        });

        hospitalMarkersRef.current[hosp.name] = marker;
      }
    });

    // Auto-pan to show all elements if hospitals exist
    if (hospitals.length > 0) {
      const bounds = L.latLngBounds([[lat, lng]]);
      hospitals.forEach(hosp => {
        if (hosp.latitude && hosp.longitude) {
          bounds.extend([hosp.latitude, hosp.longitude]);
        }
      });
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hospitals, lat, lng]);

  const handleFocusHospital = (hosp) => {
    setSelectedHospital(hosp);
    if (hosp.latitude && hosp.longitude && mapInstanceRef.current && window.L) {
      mapInstanceRef.current.setView([hosp.latitude, hosp.longitude], 15, { animate: true });
      const marker = hospitalMarkersRef.current[hosp.name];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-[#0A2540] text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-heading font-extrabold text-lg">Locate Nearby Hospitals</h2>
            <p className="text-xs text-white/70">Real-time GPS proximity tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-semibold">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Area: {userLocationName || 'Active GPS Center'}</span>
        </div>
      </div>

      {/* Main Container Split Layout */}
      <div className="flex flex-grow flex-col lg:flex-row overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 z-50 bg-white flex flex-col justify-center items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#E07A5F] animate-spin" />
            <span className="text-slate-600 font-bold text-sm">Loading map tiles and layers...</span>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute inset-0 z-50 bg-white flex flex-col justify-center items-center p-6 text-center">
            <MapPin className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="font-bold text-lg text-slate-800">Map Loading Error</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">{mapError}</p>
          </div>
        ) : null}

        {/* Left Side: Hospital List */}
        <div className="w-full lg:w-96 flex flex-col border-r border-slate-100 bg-[#FDFBF7] shrink-0 h-1/2 lg:h-full overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Nearest Facilities ({hospitals.length})
            </span>
            <button 
              onClick={loadHospitals}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
              title="Refresh Listings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3 flex-grow">
            {hospitals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No hospitals found within 15km radius.
              </div>
            ) : (
              hospitals.map(hosp => {
                const isSelected = selectedHospital?.name === hosp.name;
                return (
                  <div 
                    key={hosp.id}
                    onClick={() => handleFocusHospital(hosp)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-white border-[#E07A5F] shadow-md ring-1 ring-[#E07A5F]/20' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-[#0A2540] text-sm leading-snug">{hosp.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                        isSelected ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {hosp.distance} km
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{hosp.address}</p>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                      <a 
                        href={`tel:${hosp.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-grow py-2 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-grow py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Map Container */}
        <div className="flex-grow h-1/2 lg:h-full relative bg-slate-50">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>
      </div>
    </div>
  );
}
