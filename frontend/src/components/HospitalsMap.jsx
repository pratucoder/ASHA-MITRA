import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Phone, ExternalLink, RefreshCw, ArrowLeft, Loader2, Stethoscope, Building2, Cross } from 'lucide-react';
import { getNearbyHospitalsAsync } from '../utils/hospitals';
import { useLanguage } from '../context/LanguageContext';

export default function HospitalsMap({ userCoords, userLocationName, onBack }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [mapError, setMapError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'clinic', 'hospital', 'doctors'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hospitalMarkersRef = useRef({});

  // Fallback coordinates (Katni region)
  const defaultLat = 23.8000;
  const defaultLng = 80.3500;
  
  const lat = userCoords ? userCoords.latitude : defaultLat;
  const lng = userCoords ? userCoords.longitude : defaultLng;

  // Load Leaflet JS & CSS dynamically
  useEffect(() => {
    let active = true;

    const loadLeaflet = async () => {
      if (!window.L) {
        // Load CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Load JS
        await new Promise((resolve, reject) => {
          if (document.getElementById('leaflet-js')) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.id = 'leaflet-js';
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
      console.error('Leaflet loading error:', err);
      if (active) setMapError('Failed to load Leaflet mapping engine.');
    });

    return () => {
      active = false;
    };
  }, []);

  // Fetch medical facilities (hospitals, clinics, doctors)
  const loadFacilities = () => {
    setLoading(true);
    getNearbyHospitalsAsync(userCoords?.latitude, userCoords?.longitude, userLocationName)
      .then(res => {
        setHospitals(res);
        if (res.length > 0) {
          setSelectedHospital(res[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching facilities:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFacilities();
  }, [userCoords, userLocationName]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (loading || !window.L || !mapContainerRef.current) return;

    const L = window.L;

    // Reset map instance if already initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true
    });
    mapInstanceRef.current = map;

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Create Markers Layer Group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Custom Pulsing User Location Marker (Blue SVG)
    const userMarkerIcon = L.divIcon({
      html: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30">
          <circle cx="15" cy="15" r="12" fill="#3B82F6" fill-opacity="0.25">
            <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="15" cy="15" r="6" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="2"/>
        </svg>
      `,
      className: 'user-map-marker-wrapper',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const userMarker = L.marker([lat, lng], { icon: userMarkerIcon }).addTo(map);
    userMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #0A2540; padding: 2px;">
        <b style="color: #1D4ED8; font-size: 13px;">📍 Your Current Location</b><br/>
        <span style="color: #64748B;">${userLocationName || 'Active GPS Center'}</span>
      </div>
    `);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, lat, lng]);

  // Filter facilities based on active tab
  const filteredHospitals = hospitals.filter(h => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'clinic') return h.type === 'clinic';
    if (activeFilter === 'hospital') return h.type === 'hospital';
    if (activeFilter === 'doctors') return h.type === 'doctors';
    return true;
  });

  // Update Markers on Leaflet Map whenever list or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    hospitalMarkersRef.current = {};

    // Helper to get custom colored SVG pin based on facility type
    const getMarkerHtml = (type) => {
      let pinColor = '#EF4444'; // Red for hospital
      let badgeLabel = '+';

      if (type === 'clinic') {
        pinColor = '#10B981'; // Green for clinic/PHC
        badgeLabel = 'Clinic';
      } else if (type === 'doctors') {
        pinColor = '#F59E0B'; // Amber for doctors
        badgeLabel = 'Doctor';
      }

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 34" width="30" height="38">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21c0-7.18-5.82-13-13-13z" fill="${pinColor}" stroke="#FFFFFF" stroke-width="1.5"/>
          <circle cx="13" cy="12" r="7.5" fill="#FFFFFF"/>
          <path d="M13 7.5v9M8.5 12h9" stroke="${pinColor}" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
      `;
    };

    const bounds = L.latLngBounds([[lat, lng]]);

    filteredHospitals.forEach(hosp => {
      const hLat = hosp.latitude;
      const hLng = hosp.longitude;
      if (hLat && hLng) {
        const customIcon = L.divIcon({
          html: getMarkerHtml(hosp.type),
          className: 'custom-facility-leaflet-marker',
          iconSize: [30, 38],
          iconAnchor: [15, 38],
          popupAnchor: [0, -38]
        });

        const marker = L.marker([hLat, hLng], { icon: customIcon }).addTo(markersLayer);

        let typeBadgeColor = 'background: #EF4444; color: #FFFFFF;';
        let typeText = 'Hospital';

        if (hosp.type === 'clinic') {
          typeBadgeColor = 'background: #10B981; color: #FFFFFF;';
          typeText = 'Clinic / PHC';
        } else if (hosp.type === 'doctors') {
          typeBadgeColor = 'background: #F59E0B; color: #FFFFFF;';
          typeText = 'Doctor Practice';
        }

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; padding: 4px; max-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; ${typeBadgeColor}">${typeText}</span>
              <span style="color: #E07A5F; font-weight: 800; font-size: 11px;">📍 ${hosp.distance} km</span>
            </div>
            <b style="color: #0A2540; font-size: 14px;">${hosp.name}</b><br/>
            <span style="color: #64748B; font-size: 12px;">${hosp.address}</span><br/>
            <div style="margin-top: 8px; pt: 6px; border-top: 1px solid #F1F5F9; display: flex; gap: 6px;">
              <a href="tel:${hosp.phone}" style="flex: 1; text-align: center; padding: 5px; background: #ECFDF5; color: #047857; font-weight: 700; border-radius: 6px; text-decoration: none; font-size: 11px;">📞 Call</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hosp.name + ' ' + hosp.address)}" target="_blank" rel="noreferrer" style="flex: 1; text-align: center; padding: 5px; background: #EFF6FF; color: #1D4ED8; font-weight: 700; border-radius: 6px; text-decoration: none; font-size: 11px;">🗺️ Route ↗</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedHospital(hosp);
        });

        hospitalMarkersRef.current[hosp.name] = marker;
        bounds.extend([hLat, hLng]);
      }
    });

    if (filteredHospitals.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredHospitals, lat, lng]);

  const handleFocusHospital = (hosp) => {
    setSelectedHospital(hosp);
    if (hosp.latitude && hosp.longitude && mapInstanceRef.current && window.L) {
      mapInstanceRef.current.flyTo([hosp.latitude, hosp.longitude], 15, { duration: 1.2 });
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
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-heading font-extrabold text-lg tracking-tight">{t('locate_healthcare_title')}</h2>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>{t('area')}: {userLocationName || t('active_gps_center')}</span>
        </div>
      </div>

      {/* Main Container Split Layout */}
      <div className="flex flex-grow flex-col lg:flex-row overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 z-50 bg-white flex flex-col justify-center items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#E07A5F] animate-spin" />
            <span className="text-slate-600 font-bold text-sm">{t('searching_facilities')}</span>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute inset-0 z-50 bg-white flex flex-col justify-center items-center p-6 text-center">
            <MapPin className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="font-bold text-lg text-slate-800">{t('map_error_title')}</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">{mapError}</p>
          </div>
        ) : null}

        {/* Left Side: Hospital & Clinic Sidebar List */}
        <div className="w-full lg:w-96 flex flex-col border-r border-slate-100 bg-[#FDFBF7] shrink-0 h-1/2 lg:h-full overflow-hidden">
          
          {/* Header & Refresh */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {t('facilities_found')} ({filteredHospitals.length})
            </span>
            <button 
              onClick={loadFacilities}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
              title={t('refresh_listings')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Tabs: All, Clinics, Hospitals, Doctors */}
          <div className="p-2.5 bg-slate-50/80 border-b border-slate-200/60 flex items-center gap-1 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'all' 
                  ? 'bg-[#0A2540] text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {t('all')} ({hospitals.length})
            </button>
            <button
              onClick={() => setActiveFilter('clinic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                activeFilter === 'clinic' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t('clinics_phc')}
            </button>
            <button
              onClick={() => setActiveFilter('hospital')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                activeFilter === 'hospital' 
                  ? 'bg-rose-600 text-white shadow-sm' 
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {t('hospitals')}
            </button>
            <button
              onClick={() => setActiveFilter('doctors')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                activeFilter === 'doctors' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200/80'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {t('doctors')}
            </button>
          </div>

          {/* Facility List Cards */}
          <div className="p-4 overflow-y-auto space-y-3 flex-grow">
            {filteredHospitals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {t('no_facilities_found')}
              </div>
            ) : (
              filteredHospitals.map(hosp => {
                const isSelected = selectedHospital?.name === hosp.name;
                const isClinic = hosp.type === 'clinic';
                const isDoctor = hosp.type === 'doctors';

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
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider mb-1 ${
                          isClinic 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isDoctor 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isClinic ? `🟢 ${t('clinic_phc')}` : isDoctor ? `🟡 ${t('doctor_clinic')}` : `🔴 ${t('hospital')}`}
                        </span>
                        <h4 className="font-extrabold text-[#0A2540] text-sm leading-snug">{hosp.name}</h4>
                      </div>
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
                        <span>{t('call')}</span>
                      </a>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-grow py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('directions')}</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Map Container */}
        <div className="flex-grow h-1/2 lg:h-full relative bg-slate-50">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>
      </div>
    </div>
  );
}
