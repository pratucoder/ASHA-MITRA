import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Home, Users, History as HistoryIcon, LogOut, ChevronRight, X, AlertCircle, CheckCircle2, AlertTriangle, Sparkles, ExternalLink, Phone, MapPin
} from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Patients from './components/Patients';
import AddPatient from './components/AddPatient';
import History from './components/History';
import ANMDashboard from './components/ANMDashboard';
import VoiceTriageModal from './components/VoiceTriageModal';
import HospitalsMap from './components/HospitalsMap';
import { getNearbyHospitals, registerDynamicVillage, reverseGeocode } from './utils/hospitals';
import './App.css';

// Seed initial history data for ANM Supervisor cluster view
const SEED_TRIAGES = [
  {
    id: 'mock-triage-1',
    patientId: 'mock-p-1',
    patientName: 'Karan Mehra',
    patientDetails: '3 years · Male',
    village: 'Piparia',
    ashaName: 'Kiran Bai',
    date: '20 Jun 2026, 02:30 PM',
    language: 'Hindi',
    transcript: "बच्चे का शरीर पीला पड़ गया है और बहुत कमजोर लग रहा है, सांस तेज चल रही है।",
    translation: "Child's body has turned pale and looks very weak, breathing is fast.",
    urgency: 'Red',
    symptoms: ['Severe Pallor', 'Fast Breathing (Tachypnea)', 'Severe Lethargy'],
    advice: 'Immediate referral for suspected severe anemia. Transfer to District Hospital.',
    resolved: false,
    txHash: '0x356efbfa8a36b9442a8b9ee4db5a528659104bf765cf21ab01e9871fc35f0f3a',
    blockNumber: 48102938,
    dataHash: '439a3f2b4c10ef9ba820cde8392cfbc8c91a0b3f8db1c98de3e498c8cde72fa8'
  },
  {
    id: 'mock-triage-2',
    patientId: 'mock-p-2',
    patientName: 'Radha Bai',
    patientDetails: '27 years · Female',
    village: 'Katni',
    ashaName: 'Geeta Verma',
    date: '21 Jun 2026, 09:15 AM',
    language: 'Hindi',
    transcript: "कल रात से बहुत तेज पेट में दर्द हो रहा है और बुखार भी है।",
    translation: "Experiencing severe abdominal pain since last night along with fever.",
    urgency: 'Yellow',
    symptoms: ['Severe Abdominal Pain', 'Moderate Fever'],
    advice: 'Refer to PHC within 24 hours. Keep patient NPO (no oral intake) until evaluated.',
    resolved: false,
    txHash: '0xa41efbda8a36b9442a8b9ee4db5a528659104bf765cf21ab01e9871fc35f0e34',
    blockNumber: 48103102,
    dataHash: '5e9a3f2b4c10ef9ba820cde8392cfbc8c91a0b3f8db1c98de3e498c8cde72fb9'
  }
];

function App() {
  // Authentication & User state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('asha_user');
    return saved ? JSON.parse(saved) : null;
  });

  // User Real-time Geolocation Coordinates
  const [userCoords, setUserCoords] = useState(null);
  const [userLocationName, setUserLocationName] = useState('Locating...');

  // Registered ASHA/ANM workers state
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem('asha_registered_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Global UI State
  const [currentView, setCurrentView] = useState('home'); // home, patients, add-patient, history
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [toast, setToast] = useState(null);

  // Data State with LocalStorage persistence
  const [patients, setPatients] = useState(() => {
    const saved = localStorage.getItem('asha_patients');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'ABC DEF', age: 29, gender: 'Female', village: 'Pimpri', phone: '123456789', notes: 'Pregnancy term: 3 months. Needs routine check-ups.' }
    ];
  });

  const [triageHistory, setTriageHistory] = useState(() => {
    const saved = localStorage.getItem('asha_triage_history');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return SEED_TRIAGES; // Seed data initially so supervisor dashboards have content
  });

  // Search & Modal State
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null); // Detail modal for triage
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triagePatient, setTriagePatient] = useState(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('asha_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('asha_triage_history', JSON.stringify(triageHistory));
  }, [triageHistory]);

  const lastGeocodedCoordsRef = useRef(null);

  // Request browser location permission & continuously geocode to human-readable area name
  useEffect(() => {
    let watchId = null;
    if (user) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserCoords({ latitude, longitude });
            console.log("Real-time location updated:", latitude, longitude);

            // Fetch human-readable village/city name when coordinates change significantly (~100m)
            const shiftThreshold = 0.001;
            const lastCoords = lastGeocodedCoordsRef.current;
            if (!lastCoords || 
                Math.abs(latitude - lastCoords.latitude) > shiftThreshold || 
                Math.abs(longitude - lastCoords.longitude) > shiftThreshold) {
              
              lastGeocodedCoordsRef.current = { latitude, longitude };
              reverseGeocode(latitude, longitude).then(areaName => {
                if (areaName) {
                  setUserLocationName(areaName);
                  // Register the resolved area name dynamically into ROAD_GRAPH
                  registerDynamicVillage(areaName, latitude, longitude);
                }
              });
            }
          },
          (error) => {
            console.warn("Real-time location watch error:", error);
            if (user.coordinates) {
              setUserCoords(user.coordinates);
              setUserLocationName(user.location || 'Locked Location');
            }
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );
      } else if (user.coordinates) {
        setUserCoords(user.coordinates);
        setUserLocationName(user.location || 'Locked Location');
      }
    } else {
      setUserCoords(null);
      setUserLocationName('Locating...');
      lastGeocodedCoordsRef.current = null;
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);

  // Restore dynamic villages on mount
  useEffect(() => {
    const savedVillages = JSON.parse(localStorage.getItem('asha_dynamic_villages') || '[]');
    savedVillages.forEach(v => {
      registerDynamicVillage(v.name, v.lat, v.lng);
    });
  }, []);

  const handleRegister = (newUserData) => {
    const newUser = {
      id: Date.now(),
      ...newUserData
    };

    // Register custom village in Dijkstra graph
    if (newUserData.coordinates) {
      registerDynamicVillage(newUserData.location, newUserData.coordinates.latitude, newUserData.coordinates.longitude);
      
      const savedVillages = JSON.parse(localStorage.getItem('asha_dynamic_villages') || '[]');
      if (!savedVillages.find(v => v.name.toLowerCase() === newUserData.location.toLowerCase())) {
        savedVillages.push({
          name: newUserData.location,
          lat: newUserData.coordinates.latitude,
          lng: newUserData.coordinates.longitude
        });
        localStorage.setItem('asha_dynamic_villages', JSON.stringify(savedVillages));
      }
    }

    setRegisteredUsers(prev => {
      const updated = [newUser, ...prev];
      localStorage.setItem('asha_registered_users', JSON.stringify(updated));
      return updated;
    });

    // Automatically login the registered user
    setUser(newUser);
    localStorage.setItem('token', 'mock-offline-token-' + newUser.id);
    localStorage.setItem('asha_user', JSON.stringify(newUser));
    if (newUser.coordinates) {
      setUserCoords(newUser.coordinates);
    }
    showToast('Registered and logged in!', 'success');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fillDemo = (demoPhone, demoPass) => {
    setPhone(demoPhone);
    setPassword(demoPass);
    setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Please enter both phone number and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('asha_user', JSON.stringify(data.user));
      showToast('Logged in successfully!');
    } catch (err) {
      // Fallback Offline/Demo Auth
      const mockUsers = [
        { id: 1, phone: '9999900001', password: 'password123', name: 'Sunita Devi', role: 'ASHA Worker', location: 'Rampur' },
        { id: 2, phone: '9999900003', password: 'password123', name: 'Dr. Anjali Sharma', role: 'ANM Supervisor', location: 'District Hospital' },
        ...registeredUsers
      ];
 
      const foundUser = mockUsers.find(u => u.phone === phone && u.password === password);
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('token', 'mock-offline-token-' + foundUser.id);
        localStorage.setItem('asha_user', JSON.stringify(foundUser));
        if (foundUser.coordinates) {
          setUserCoords(foundUser.coordinates);
        }
        showToast('Logged in (Offline Mode)', 'success');
      } else {
        setError('Invalid phone number or password. Try demo accounts!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPhone('');
    setPassword('');
    localStorage.removeItem('token');
    localStorage.removeItem('asha_user');
    showToast('Signed out successfully.');
  };

  const handleAddPatient = (patientData, andStartTriage) => {
    const createdPatient = {
      id: Date.now().toString(),
      ...patientData,
      village: patientData.village || 'Rampur',
      phone: patientData.phone || 'Not provided'
    };

    setPatients(prev => [createdPatient, ...prev]);
    showToast('Patient registered successfully!');

    if (andStartTriage) {
      setTriagePatient(createdPatient);
      setIsTriageModalOpen(true);
    } else {
      setCurrentView('patients');
    }
  };

  const handleSaveTriage = (triageData) => {
    const newTriageRecord = {
      id: Date.now().toString(),
      ashaName: user.name,
      resolved: false,
      ...triageData
    };
    setTriageHistory(prev => [newTriageRecord, ...prev]);
    showToast('Triage assessment compiled and saved!');
    setCurrentView('history');
  };

  const handleResolveTriage = (triageId) => {
    setTriageHistory(prev => prev.map(t => t.id === triageId ? { ...t, resolved: true } : t));
    showToast('Critical triage alert acknowledged & resolved.');
  };

  // Stats Counters (specific to worker "Sunita Devi" vs All)
  const isASHA = user?.role === 'ASHA Worker' || user?.role === 'ASHA';
  const displayHistory = isASHA 
    ? triageHistory.filter(t => t.ashaName === user.name) 
    : triageHistory;

  const triagesTodayCount = displayHistory.length;
  const redAlertsCount = displayHistory.filter(t => t.urgency === 'Red' && !t.resolved).length;
  const totalTriagesCount = displayHistory.length;

  if (!user) {
    return (
      <Login 
        phone={phone}
        setPhone={setPhone}
        password={password}
        setPassword={setPassword}
        loading={loading}
        error={error}
        handleLogin={handleLogin}
        fillDemo={fillDemo}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        handleRegister={handleRegister}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FDFBF7] dotted-bg font-sans text-slate-800">
      
      {/* Toast Alert Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 transform translate-y-0 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Responsive Sidebar for desktop layout */}
      <aside className="hidden md:flex md:w-64 bg-[#0A2540] text-white flex-col justify-between shrink-0 h-screen sticky top-0 p-5 z-20 shadow-xl">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
              <Activity className="w-5 h-5 text-[#E07A5F]" />
            </div>
            <div>
              <div className="font-heading font-black text-lg text-white">ASHA Saathi</div>
              <div className="text-[8px] tracking-[0.15em] uppercase text-[#E07A5F] font-bold">AI Triage Companion</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {isASHA ? (
              <>
                <button 
                  onClick={() => setCurrentView('home')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    currentView === 'home' 
                      ? 'bg-[#123152] text-white shadow-inner font-bold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Home className="w-5 h-5" />
                    Home
                  </span>
                  {currentView === 'home' && <ChevronRight className="w-4 h-4 text-[#E07A5F]" />}
                </button>

                <button 
                  onClick={() => setCurrentView('patients')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    currentView === 'patients' || currentView === 'add-patient'
                      ? 'bg-[#123152] text-white shadow-inner font-bold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    Patients
                  </span>
                  {(currentView === 'patients' || currentView === 'add-patient') && <ChevronRight className="w-4 h-4 text-[#E07A5F]" />}
                </button>

                <button 
                  onClick={() => setCurrentView('history')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    currentView === 'history' 
                      ? 'bg-[#123152] text-white shadow-inner font-bold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5" />
                    History
                  </span>
                  {currentView === 'history' && <ChevronRight className="w-4 h-4 text-[#E07A5F]" />}
                </button>

                <button 
                  onClick={() => setCurrentView('map')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    currentView === 'map' 
                      ? 'bg-[#123152] text-white shadow-inner font-bold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#E07A5F]" />
                    Locate Hospitals
                  </span>
                  {currentView === 'map' && <ChevronRight className="w-4 h-4 text-[#E07A5F]" />}
                </button>
              </>
            ) : (
              /* ANM Supervisor Sidebar Layout (Single Main Board view) */
              <button 
                onClick={() => setCurrentView('home')}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all bg-[#123152] text-white font-bold`}
              >
                <span className="flex items-center gap-3">
                  <Home className="w-5 h-5" />
                  Cluster Dashboard
                </span>
                <ChevronRight className="w-4 h-4 text-[#E07A5F]" />
              </button>
            )}
          </nav>
        </div>

        {/* User Card at Sidebar Bottom */}
        <div className="space-y-3 pt-4 border-t border-white/10 shrink-0">
          <div>
            <div className="font-bold text-sm text-white">{user.name}</div>
            <div className="text-[10px] uppercase text-[#E07A5F] font-extrabold tracking-wider">{user.role} · {user.location}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 text-[#E07A5F]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header (Sticky) */}
      <header className="md:hidden bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#E07A5F]" />
          <span className="font-heading font-extrabold text-md">ASHA Saathi</span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-xs font-bold text-slate-300 block">{user.name}</span>
          <span className="text-[9px] uppercase text-[#E07A5F] font-black">{user.location}</span>
        </div>
      </header>

      {/* Responsive Workspace Content Area */}
      <main className="flex-grow p-4 md:p-8 overflow-y-auto max-h-screen pb-24 md:pb-8">
        
        {/* Breadcrumb Workspace Segment */}
        <div className="mb-2">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[#E07A5F]">ASHA WORKSPACE</span>
        </div>

        {isASHA ? (
          /* ASHA Worker Render Mode */
          <>
            {currentView === 'home' && (
              <Dashboard 
                user={user}
                patientsCount={patients.length}
                triagesTodayCount={triagesTodayCount}
                redAlertsCount={redAlertsCount}
                totalTriagesCount={totalTriagesCount}
                triageHistory={displayHistory}
                setCurrentView={setCurrentView}
                setTriagePatient={setTriagePatient}
                setIsTriageModalOpen={setIsTriageModalOpen}
                setSelectedHistoryItem={setSelectedHistoryItem}
              />
            )}

            {currentView === 'patients' && (
              <Patients 
                patients={patients}
                setCurrentView={setCurrentView}
                setTriagePatient={setTriagePatient}
                setIsTriageModalOpen={setIsTriageModalOpen}
              />
            )}

            {currentView === 'add-patient' && (
              <AddPatient 
                handleAddPatient={handleAddPatient}
              />
            )}

            {currentView === 'history' && (
              <History 
                triageHistory={displayHistory}
                setSelectedHistoryItem={setSelectedHistoryItem}
              />
            )}

            {currentView === 'map' && (
              <HospitalsMap 
                userCoords={userCoords}
                userLocationName={userLocationName}
                onBack={() => setCurrentView('home')}
              />
            )}
          </>
        ) : (
          /* ANM Supervisor Render Mode */
          <ANMDashboard 
            user={user}
            patients={patients}
            triageHistory={triageHistory}
            onResolveTriage={handleResolveTriage}
            setSelectedHistoryItem={setSelectedHistoryItem}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Tab Bar Navigation (ASHA Workers only) */}
      {isASHA && (
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A2540] text-white border-t border-white/5 flex items-center justify-around py-2.5 px-3 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]">
          <button 
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              currentView === 'home' ? 'text-[#E07A5F]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Home</span>
          </button>

          <button 
            onClick={() => setCurrentView('patients')}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              currentView === 'patients' || currentView === 'add-patient' ? 'text-[#E07A5F]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Patients</span>
          </button>

          <button 
            onClick={() => setCurrentView('history')}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              currentView === 'history' ? 'text-[#E07A5F]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HistoryIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">History</span>
          </button>

          <button 
            onClick={() => setCurrentView('map')}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              currentView === 'map' ? 'text-[#E07A5F]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Map</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Logout</span>
          </button>
        </footer>
      )}

      {/* ANM Mobile Sticky Bottom Log Out Bar */}
      {!isASHA && (
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A2540] text-white border-t border-white/5 flex items-center justify-around py-2.5 px-3 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.15)]">
          <button 
            onClick={() => setCurrentView('home')}
            className="flex flex-col items-center justify-center p-1.5 text-[#E07A5F]"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Dashboard</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Logout</span>
          </button>
        </footer>
      )}

      {/* Voice Triage Session Modal Overlay component */}
      <VoiceTriageModal 
        isOpen={isTriageModalOpen}
        onClose={() => {
          setIsTriageModalOpen(false);
          setTriagePatient(null);
        }}
        patient={triagePatient}
        onSaveTriage={handleSaveTriage}
        userCoords={userCoords}
      />

      {/* Triage Detail Inspector Dialog */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#0A2540] text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-heading font-extrabold text-lg">
                  {selectedHistoryItem.showExplorer ? 'Polygonscan Verification Explorer' : 'Triage Details'}
                </h3>
                <p className="text-xs text-white/70">Patient: <span className="font-semibold">{selectedHistoryItem.patientName}</span></p>
              </div>
              <button 
                onClick={() => setSelectedHistoryItem(null)} 
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {selectedHistoryItem.showExplorer ? (
                /* CUSTOM POLYGONSCAN SIMULATION CARD VIEW */
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                      Polygon Amoy Network
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-black uppercase rounded">
                      Secured
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Transaction Hash</span>
                      <span className="break-all text-slate-800 font-semibold select-all">{selectedHistoryItem.txHash}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Block Confirmation</span>
                        <span className="text-slate-800 font-bold">#{selectedHistoryItem.blockNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Confirmations</span>
                        <span className="text-green-600 font-bold">128+ Blocks</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">SHA-256 Data Root Hash</span>
                      <span className="break-all text-slate-800 font-semibold select-all">{selectedHistoryItem.dataHash}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Transaction Cost</span>
                        <span className="text-slate-700 font-bold">0.000342 MATIC</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Transaction Status</span>
                        <span className="text-green-600 font-bold">✓ Success</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Anonymized Actor Address</span>
                      <span className="text-slate-700">ASHA-WORKER-ID-{selectedHistoryItem.ashaName === 'Kiran Bai' ? '8803' : selectedHistoryItem.ashaName === 'Geeta Verma' ? '6419' : '9901'}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FDFBF7] border border-slate-200 rounded-2xl text-xs text-slate-500">
                    <p className="leading-relaxed">
                      💡 <b>How it works:</b> ASHA Saathi hashes the clinical triage outcome to protect patient privacy and submits this hash on-chain. This provides an immutable legal record of the assessment timestamp and severity, protecting frontline workers from claims of negligence or tampered history.
                    </p>
                  </div>
                </div>
              ) : (
                /* REGULAR TRIAGE DETAIL VIEW WITH ATTACHED BLOCKCHAIN EXPLORER TRIGGER */
                <div className="text-left space-y-5">
                  {/* Alert Level Box */}
                  <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                    selectedHistoryItem.urgency === 'Red' 
                      ? 'bg-red-50 border-red-200 text-red-900' 
                      : selectedHistoryItem.urgency === 'Yellow'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-green-50 border-green-200 text-green-900'
                  }`}>
                    {selectedHistoryItem.urgency === 'Red' && <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />}
                    {selectedHistoryItem.urgency === 'Yellow' && <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
                    {selectedHistoryItem.urgency === 'Green' && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />}
                    
                     <div>
                      <h4 className="font-bold text-sm">
                        {selectedHistoryItem.urgency} Urgency Classification
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">{selectedHistoryItem.advice}</p>
                    </div>
                  </div>

                  {/* Nearby Emergency Hospitals */}
                  {selectedHistoryItem.urgency === 'Red' && (
                    <div className="bg-[#FFF5F5] border border-red-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                        <MapPin className="w-4 h-4 text-red-600 animate-bounce" />
                        <h5 className="font-bold text-[#0A2540] text-xs uppercase tracking-wider">Nearby Emergency Services</h5>
                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold ml-auto">
                          Village: {selectedHistoryItem.village}
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {getNearbyHospitals(null, null, selectedHistoryItem.village).map((hosp, idx) => (
                          <div key={hosp.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs text-left">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#0A2540]">{hosp.name}</span>
                                {idx === 0 && (
                                  <span className="bg-red-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.2 rounded">
                                    Nearest
                                  </span>
                                )}
                              </div>
                              <span className="inline-block bg-slate-50 border border-slate-100 px-1 py-0.2 rounded text-[9px] text-slate-500 font-bold">
                                {hosp.distance} km away
                              </span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <a 
                                href={`tel:${hosp.phone}`}
                                className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 flex items-center justify-center gap-1 font-bold text-[10px]"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 flex items-center justify-center gap-1 font-bold text-[10px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Map</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blockchain anchoring panel link */}
                  {selectedHistoryItem.txHash && (
                    <div className="bg-[#EBF4FF] border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-bold text-blue-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                          On-Chain Anchored Triage
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Tx: {selectedHistoryItem.txHash.substring(0, 16)}...</span>
                      </div>
                      <button 
                        onClick={() => setSelectedHistoryItem(prev => ({ ...prev, showExplorer: true }))}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                      >
                        Verify Receipts
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Patient Profile Snapshot */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">Patient</span>
                      <span className="font-semibold text-slate-800">{selectedHistoryItem.patientName} ({selectedHistoryItem.patientDetails})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">Village Location</span>
                      <span className="font-semibold text-slate-800">{selectedHistoryItem.village}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">Language</span>
                      <span className="font-semibold text-slate-800">{selectedHistoryItem.language}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">Triage Date</span>
                      <span className="font-semibold text-slate-800">{selectedHistoryItem.date}</span>
                    </div>
                  </div>

                  {/* Transcripts */}
                  <div className="space-y-3">
                    <div className="border-l-2 border-slate-200 pl-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Spoken Audio Transcript</h5>
                      <p className="text-sm font-medium text-slate-700 italic mt-0.5">"{selectedHistoryItem.transcript}"</p>
                    </div>
                    <div className="border-l-2 border-[#E07A5F] pl-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">English Clinical Translation</h5>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">"{selectedHistoryItem.translation}"</p>
                    </div>
                  </div>

                  {/* Extracted Symptoms */}
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Detected Symptoms</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHistoryItem.symptoms && selectedHistoryItem.symptoms.map((s, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-[#0A2540] font-semibold rounded-md border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between shrink-0">
              {selectedHistoryItem.showExplorer ? (
                /* Return to triage detail details from explorer */
                <button 
                  onClick={() => setSelectedHistoryItem(prev => ({ ...prev, showExplorer: false }))}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Back to Details
                </button>
              ) : (
                <div />
              )}
              
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className="px-5 py-2.5 bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
