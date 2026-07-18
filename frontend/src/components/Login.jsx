import React, { useState } from 'react';
import { Activity, Phone, Lock, ArrowRight, Globe, ChevronDown, MapPin, Check, User } from 'lucide-react';
import { reverseGeocode } from '../utils/hospitals';

export default function Login({
  phone,
  setPhone,
  password,
  setPassword,
  loading,
  error,
  handleLogin,
  fillDemo,
  selectedLanguage,
  setSelectedLanguage,
  handleRegister
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('ASHA Worker');
  const [regLocation, setRegLocation] = useState('');
  const [regCoords, setRegCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const handleFetchGPS = () => {
    setGpsLoading(true);
    setRegError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setRegCoords({ latitude, longitude });
          
          // Reverse geocode to get the human-readable area name automatically
          const areaName = await reverseGeocode(latitude, longitude);
          if (areaName) {
            setRegLocation(areaName);
          }
          
          setGpsLoading(false);
        },
        (error) => {
          console.error("GPS Fetch error: ", error);
          setRegError('Failed to capture GPS coordinates. Please allow location permissions.');
          setGpsLoading(false);
        },
        { timeout: 8000 }
      );
    } else {
      setRegError('Geolocation not supported by this browser.');
      setGpsLoading(false);
    }
  };

  const handleRegSubmit = (e) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regPhone || !regPassword || !regLocation) {
      setRegError('Please fill out all required fields.');
      return;
    }
    handleRegister({
      name: regName,
      phone: regPhone,
      password: regPassword,
      role: regRole === 'ASHA Worker' ? 'ASHA Worker' : 'ANM Supervisor',
      location: regLocation,
      coordinates: regCoords
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-[#FDFBF7] fade-in-view">
      {/* Left pane (Hero Branding) */}
      <div className="lg:w-1/2 bg-[#0A2540] text-white relative overflow-hidden p-8 lg:p-16 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#E07A5F]/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#0A2540] text-white flex items-center justify-center shadow-soft relative overflow-hidden border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <Activity className="w-6 h-6 text-[#E07A5F] relative z-10" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#E07A5F] rounded-full"></span>
            </div>
            <div className="leading-tight">
              <div className="font-heading font-extrabold text-2xl text-white">ASHA Saathi</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#E07A5F] font-bold">AI Triage Companion</div>
            </div>
          </div>
        </div>
        
        <div className="relative max-w-md my-12 lg:my-0">
          <div className="text-xs tracking-[0.25em] uppercase text-[#E07A5F] font-bold mb-4">For India's Frontline</div>
          <h2 className="font-heading text-4xl lg:text-5xl font-extrabold leading-tight">
            Speak. Triage. <span className="text-[#E07A5F]">Save lives.</span>
          </h2>
          <p className="mt-6 text-white/70 text-lg leading-relaxed">
            AI-powered voice triage in 12 Indian languages — built for ASHA workers in rural India. Works offline, syncs when online.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-white/60">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span>System online · Voice & AI ready</span>
          </div>
        </div>
        
        <div className="relative text-xs text-white/40 tracking-wider">
          © ASHA Saathi · Anchored on Polygon
        </div>
      </div>
      
      {/* Right pane (Interactive Form) */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-[#FDFBF7] dotted-bg">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-slate-100 shadow-xl">
          <div className="flex justify-end mb-6">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-white font-medium text-[#0A2540] focus:outline-none focus:border-[#E07A5F] cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <option value="en">English · English</option>
                <option value="hi">हिन्दी · Hindi</option>
                <option value="mr">मराठी · Marathi</option>
                <option value="ta">தமிழ் · Tamil</option>
                <option value="te">తెలుగు · Telugu</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          {!isRegistering ? (
            /* SIGN IN VIEW */
            <>
              <div className="mb-8">
                <div className="text-xs tracking-[0.2em] uppercase text-[#E07A5F] font-bold mb-2">Welcome back</div>
                <h1 className="font-heading text-3xl font-extrabold text-[#0A2540]">Sign in to continue</h1>
                <p className="text-slate-600 mt-2">Use your registered phone number and password.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-2">Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-h-[56px] pl-12 pr-4 rounded-xl border-2 border-slate-200 bg-white text-lg focus:border-[#0A2540] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="9999900001" 
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[56px] pl-12 pr-4 rounded-xl border-2 border-slate-200 bg-white text-lg focus:border-[#0A2540] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="••••••••" 
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full min-h-[56px] rounded-2xl bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold text-lg shadow-soft flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-3">Demo accounts (tap to fill)</div>
                <div className="grid gap-2">
                  <button onClick={() => fillDemo('9999900001', 'password123')} type="button" className="w-full text-left text-sm px-4 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex justify-between items-center transition-colors">
                    <span><b className="font-semibold text-[#0A2540]">Sunita Devi</b> <span className="text-slate-500">· ASHA · Rampur</span></span>
                    <span className="text-slate-500 font-mono text-xs font-semibold">9999900001</span>
                  </button>
                  <button onClick={() => fillDemo('9999900003', 'password123')} type="button" className="w-full text-left text-sm px-4 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex justify-between items-center transition-colors">
                    <span><b className="font-semibold text-[#0A2540]">Dr. Anjali Sharma</b> <span className="text-slate-500">· ANM</span></span>
                    <span className="text-slate-500 font-mono text-xs font-semibold">9999900003</span>
                  </button>
                </div>
                <div className="mt-4 text-xs text-slate-500 text-center">
                  New here? <button onClick={() => setIsRegistering(true)} className="text-[#E07A5F] font-semibold hover:underline bg-transparent border-none cursor-pointer">Register as ASHA / ANM</button>
                </div>
              </div>
            </>
          ) : (
            /* REGISTER VIEW */
            <>
              <div className="mb-6">
                <div className="text-xs tracking-[0.2em] uppercase text-[#E07A5F] font-bold mb-2">Create an account</div>
                <h1 className="font-heading text-2xl font-extrabold text-[#0A2540]">ASHA / ANM Register</h1>
                <p className="text-slate-600 mt-1 text-sm">Register your workspace details and lock GPS.</p>
              </div>

              {regError && (
                <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {regError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleRegSubmit}>
                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#E07A5F] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="e.g. Geeta Verma" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-1">Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#E07A5F] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="e.g. 9999900004" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#E07A5F] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-1">Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full min-h-[48px] px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-[#0A2540] focus:border-[#E07A5F] focus:outline-none cursor-pointer"
                    >
                      <option value="ASHA Worker">ASHA Worker</option>
                      <option value="ANM Supervisor">ANM Supervisor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-1">Assigned Village</label>
                    <input 
                      type="text"
                      required
                      value={regLocation}
                      onChange={(e) => setRegLocation(e.target.value)}
                      className="w-full min-h-[48px] px-3 rounded-xl border border-slate-200 bg-white text-sm focus:border-[#E07A5F] focus:outline-none transition-colors placeholder:text-slate-300 font-medium text-[#0A2540]" 
                      placeholder="e.g. Shivpur" 
                    />
                  </div>
                </div>

                {/* GPS LOCK BLOCK */}
                <div className="pt-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Real-time Location Anchor</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchGPS}
                      disabled={gpsLoading}
                      className={`flex-grow min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-sm transition-all ${
                        regCoords 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-[#0A2540]'
                      }`}
                    >
                      {gpsLoading ? (
                        <div className="w-4 h-4 border-2 border-[#0A2540] border-t-transparent rounded-full animate-spin"></div>
                      ) : regCoords ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-[#E07A5F]" />
                      )}
                      {gpsLoading ? 'Fetching Coordinate...' : regCoords ? 'GPS Location Locked' : 'Fetch GPS Home Location'}
                    </button>
                  </div>
                  {regCoords && (
                    <div className="mt-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-500 text-center">
                      Locked: Lat {regCoords.latitude.toFixed(4)}, Lng {regCoords.longitude.toFixed(4)}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="w-full min-h-[50px] mt-4 rounded-2xl bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  Create Account & Login
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
              
              <div className="mt-4 text-xs text-slate-500 text-center">
                Already registered? <button onClick={() => setIsRegistering(false)} className="text-[#E07A5F] font-semibold hover:underline bg-transparent border-none cursor-pointer">Sign in to your account</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
