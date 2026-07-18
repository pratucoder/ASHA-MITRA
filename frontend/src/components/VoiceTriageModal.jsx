import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, AlertCircle, CheckCircle2, AlertTriangle, Sparkles, Languages, Clock, Volume2, MapPin, Phone, ExternalLink } from 'lucide-react';
import { generateSHA256, generateTxHash } from '../blockchain/crypto';
import { getNearbyHospitals, getNearbyHospitalsAsync } from '../utils/hospitals';

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी · Hindi' },
  { code: 'mr', name: 'मराठी · Marathi' },
  { code: 'ta', name: 'தமிழ் · Tamil' },
  { code: 'te', name: 'తెలుగు · Telugu' },
  { code: 'bn', name: 'বাংলা · Bengali' },
  { code: 'kn', name: 'ಕನ್ನಡ · Kannada' },
  { code: 'gu', name: 'ગુજરાતી · Gujarati' },
  { code: 'ml', name: 'മലയാളം · Malayalam' },
  { code: 'or', name: 'ଓଡ଼िଆ · Odia' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ · Punjabi' },
  { code: 'as', name: 'অসমীয়া · Assamese' },
  { code: 'ur', name: 'اُردُو · Urdu' }
];

const SYMPTOM_PRESETS = [
  {
    lang: 'hi',
    transcript: "बच्चे को तीन दिन से तेज बुखार है, सांस लेने में तकलीफ हो रही है और वो कुछ खा नहीं रहा है।",
    translation: "Child has high fever for three days, is having difficulty breathing, and is not eating anything.",
    urgency: 'Red',
    symptoms: ['High Fever (>102°F)', 'Respiratory Distress', 'Inability to Feed', 'Lethargy'],
    advice: 'Immediate referral to the Community Health Centre (CHC). Arrange transport. Administer paracetamol syrup if temperature is high, keep child hydrated.'
  },
  {
    lang: 'hi',
    transcript: "छाती में बहुत तेज दर्द हो रहा है, ऐसा लग रहा है जैसे कोई वजन रख दिया हो और बाएँ हाथ में दर्द जा रहा है। पसीना भी आ रहा है।",
    translation: "Experiencing severe chest pain, feeling like a heavy weight is on the chest, and pain is radiating to the left arm. Also sweating profusely.",
    urgency: 'Red',
    symptoms: ['Substernal Chest Pain', 'Left Arm Radiation', 'Diaphoresis (Sweating)'],
    advice: 'Emergency! Suspected cardiac event. Place patient in a comfortable sitting position. Give Aspirin 300mg to chew immediately. Arrange for immediate emergency transport to District Hospital.'
  },
  {
    lang: 'mr',
    transcript: "काल संध्याकाळपासून उलट्या आणि जुलाब होत आहेत. खूप अशक्तपणा जाणवत आहे आणि वारंवार तहान लागत आहे.",
    translation: "Having vomiting and loose motions since yesterday evening. Feeling very weak and frequently thirsty.",
    urgency: 'Yellow',
    symptoms: ['Acute Gastroenteritis', 'Moderate Dehydration', 'General Weakness'],
    advice: 'Give ORS solution continuously (1 glass after every loose stool). Check skin turgor and urine output. Refer to Sub-Centre or ANM if symptoms do not improve in 12 hours.'
  },
  {
    lang: 'en',
    transcript: "I have a mild sore throat and a slight runny nose since this morning. No fever or body aches.",
    translation: "I have a mild sore throat and a slight runny nose since this morning. No fever or body aches.",
    urgency: 'Green',
    symptoms: ['Mild Sore Throat', 'Mild Rhinorrhea'],
    advice: 'Advise warm saline gargles, steam inhalation, and plenty of warm fluids. Reassure the patient and monitor for development of fever. Local home care is sufficient.'
  },
  {
    lang: 'hi',
    transcript: "पैर में चोट लग गई है, हल्का खून बह रहा है और सूजन है। चलने में थोड़ी तकलीफ है पर पैर हिला पा रहा हूँ।",
    translation: "Injured my leg, there is mild bleeding and swelling. A bit of difficulty walking but able to move the leg.",
    urgency: 'Green',
    symptoms: ['Minor Wound', 'Mild Edema', 'Slight pain'],
    advice: 'Clean the wound with antiseptic solution. Apply clean bandage. Advise cold compress for swelling and rest. Monitor for any signs of infection.'
  },
  {
    lang: 'te',
    transcript: "గత రెండు రోజులుగా తీవ్రమైన దగ్గు మరియు జ్వరం ఉంది. నిద్రపోవడం కష్టంగా ఉంది.",
    translation: "Severe cough and fever for the past two days. It is difficult to sleep.",
    urgency: 'Yellow',
    symptoms: ['Severe Cough', 'Moderate Fever', 'Insomnia due to cough'],
    advice: 'Advise warm fluids and steam inhalation. Direct patient to visit ANM at Sub-Centre tomorrow for chest auscultation. Monitor for fast breathing.'
  }
];

export default function VoiceTriageModal({ isOpen, onClose, patient, onSaveTriage, userCoords }) {
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [triageStep, setTriageStep] = useState('idle'); // idle, recording, analyzing, completed, anchoring
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(null);
  
  // Simulated triage results
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [urgency, setUrgency] = useState('Green'); // Green, Yellow, Red
  const [symptoms, setSymptoms] = useState([]);
  const [advice, setAdvice] = useState('');

  // Added states for manual input and verification
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'manual'
  const [verificationStep, setVerificationStep] = useState(false);
  const [editableSymptoms, setEditableSymptoms] = useState([]);

  // Hashing & Anchoring variables
  const [anchoringLogs, setAnchoringLogs] = useState('');
  const [calculatedHash, setCalculatedHash] = useState('');

  // Geolocation & Hospital Proximity Recommendations
  const [gpsState, setGpsState] = useState('idle'); // idle, loading, success, error
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setTriageStep('idle');
      setRecordingSeconds(0);
      setSelectedPreset(null);
      setTranscript('');
      setTranslation('');
      setAnchoringLogs('');
      setCalculatedHash('');
      setSelectedHospital(null);
      setGpsState('idle');
      setNearbyHospitals([]);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    if (triageStep === 'completed' && urgency === 'Red') {
      setSelectedHospital(null);
      if (userCoords) {
        setGpsState('success');
        getNearbyHospitalsAsync(userCoords.latitude, userCoords.longitude, patient?.village).then(sortedHosp => {
          if (active) {
            setNearbyHospitals(sortedHosp);
          }
        });
      } else {
        setGpsState('loading');
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              if (active) setGpsState('success');
              getNearbyHospitalsAsync(latitude, longitude, patient?.village).then(sortedHosp => {
                if (active) {
                  setNearbyHospitals(sortedHosp);
                }
              });
            },
            (error) => {
              console.warn("Geolocation failed, falling back to village mapping:", error);
              if (active) setGpsState('error');
              getNearbyHospitalsAsync(null, null, patient?.village).then(sortedHosp => {
                if (active) {
                  setNearbyHospitals(sortedHosp);
                }
              });
            },
            { timeout: 5000 }
          );
        } else {
          setGpsState('error');
          getNearbyHospitalsAsync(null, null, patient?.village).then(sortedHosp => {
            if (active) {
              setNearbyHospitals(sortedHosp);
            }
          });
        }
      }
    }
    return () => {
      active = false;
    };
  }, [triageStep, urgency, patient?.village, userCoords]);

  const handleSelectHospital = (hosp) => {
    setSelectedHospital(hosp);
    const referralSuffix = `\n\n[Referral Destination: ${hosp.name} (Contact: ${hosp.phone})]`;
    setAdvice(prev => {
      const cleanAdvice = prev.split('\n\n[Referral Destination:')[0];
      return cleanAdvice + referralSuffix;
    });
  };

  const startRecording = () => {
    setTriageStep('recording');
    setRecordingSeconds(0);
    
    const languagePresets = SYMPTOM_PRESETS.filter(p => p.lang === selectedLanguage);
    const chosenPreset = languagePresets.length > 0 
      ? languagePresets[Math.floor(Math.random() * languagePresets.length)]
      : SYMPTOM_PRESETS[Math.floor(Math.random() * SYMPTOM_PRESETS.length)];
      
    setSelectedPreset(chosenPreset);

    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 6) {
          clearInterval(timerRef.current);
          stopRecording(chosenPreset);
          return 6;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = (presetToUse) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTriageStep('analyzing');

    setTimeout(() => {
      const finalPreset = presetToUse || selectedPreset || SYMPTOM_PRESETS[0];
      setTranscript(finalPreset.transcript);
      setTranslation(finalPreset.translation);
      setUrgency(finalPreset.urgency);
      setSymptoms(finalPreset.symptoms);
      setAdvice(finalPreset.advice);
      // Initialize editableSymptoms for verification
      setEditableSymptoms(finalPreset.symptoms);
      setVerificationStep(false);
      setTriageStep('completed');
    }, 2000);
  };

  // Pre-calculate SHA-256 and trigger simulated on-chain mining
  const handleStartAnchoring = async () => {
    setTriageStep('anchoring');
    
    // 1. Calculate record hash
    const rawDataString = `${patient?.id || 'walkin'}-${urgency}-${transcript}-${translation}-${Date.now()}`;
    const dataHash = await generateSHA256(rawDataString);
    setCalculatedHash(dataHash);

    setAnchoringLogs('Calculating record cryptographic SHA-256 hash...');
    
    setTimeout(() => {
      setAnchoringLogs('Broadcasting hash to Polygon Amoy Testnet RPC...');
    }, 800);

    setTimeout(() => {
      setAnchoringLogs('Transaction pending... Waiting for block confirmation...');
    }, 1600);

    setTimeout(() => {
      const tx = generateTxHash();
      const block = Math.floor(Math.random() * 2000000) + 48000000;
      
      onSaveTriage({
        patientId: patient?.id,
        patientName: patient?.name || 'Walk-in Patient',
        patientDetails: patient ? `${patient.age} years · ${patient.gender}` : 'Unknown details',
        village: patient?.village || 'Rampur',
        date: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        language: INDIAN_LANGUAGES.find(l => l.code === (selectedPreset?.lang || selectedLanguage))?.name || 'Hindi',
        transcript,
        translation,
        urgency,
        symptoms,
        advice,
        // Blockchain anchoring details
        txHash: tx,
        blockNumber: block,
        dataHash: dataHash,
        anchoredAt: new Date().toISOString()
      });
      onClose();
    }, 2800);
  };

  const getWhatsAppText = () => {
    const alertSymbol = urgency === 'Red' ? '🚨 RED ALERT' : urgency === 'Yellow' ? '⚠️ YELLOW ALERT' : '✅ GREEN STATUS';
    const text = 
      `*ASHA Saathi Clinical Referral Slip*\n` +
      `----------------------------------------\n` +
      `*Patient Name:* ${patient?.name || 'Walk-in Patient'}\n` +
      `*Profile:* ${patient ? `${patient.age}y · ${patient.gender}` : 'Not registered'}\n` +
      `*Village:* ${patient?.village || 'Rampur'}\n` +
      `*Urgency Level:* ${alertSymbol}\n\n` +
      `*Spoken symptoms:* "${transcript}"\n\n` +
      `*English Summary:* "${translation}"\n\n` +
      `*Recommended Actions:* ${advice}\n` +
      `----------------------------------------\n` +
      `*Status:* Authenticated by ASHA worker\n` +
      `*Hash (Polygon):* ${calculatedHash ? calculatedHash.substring(0, 16) + '...' : 'Will be anchored upon saving'}`;
    return encodeURIComponent(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0A2540] text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#E07A5F]" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg">AI Voice Triage</h3>
              <p className="text-xs text-white/70">
                Patient: <span className="font-bold text-[#E07A5F]">{patient?.name || 'New Triage'}</span>
                {patient && ` (${patient.age}y · ${patient.gender})`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={triageStep === 'anchoring'}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Input Mode Tabs */}
      <div className="flex space-x-2 mb-4 px-6 mt-4">
        <button
          onClick={() => setInputMode('voice')}
          className={`px-4 py-2 rounded ${inputMode === 'voice' ? 'bg-[#E07A5F] text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Voice Input
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`px-4 py-2 rounded ${inputMode === 'manual' ? 'bg-[#E07A5F] text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Manual Input
        </button>
      </div>

        {/* Scrollable Content Container */}
        <div className="p-6 overflow-y-auto flex-grow">
          {triageStep === 'idle' && (
            <>
              {/* Voice Input UI */}
              {inputMode === 'voice' && (
                <div className="text-center py-8">
                  <div className="max-w-md mx-auto mb-8">
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-3 text-left">1. Select Spoken Language</label>
                    <div className="relative">
                      <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="w-full min-h-[56px] pl-12 pr-10 rounded-2xl border-2 border-slate-200 bg-white text-lg font-semibold text-[#0A2540] focus:border-[#E07A5F] focus:outline-none cursor-pointer hover:bg-slate-50 transition-all">
                        {INDIAN_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center my-6">
                    <button onClick={startRecording} className="w-24 h-24 rounded-full bg-[#E07A5F] hover:bg-[#D46A4F] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group relative">
                      <div className="absolute inset-0 rounded-full bg-[#E07A5F] opacity-20 animate-ping group-hover:opacity-30"></div>
                      <Mic className="w-10 h-10" />
                    </button>
                    <h4 className="font-heading font-extrabold text-[#0A2540] text-xl mt-6">Start Voice Triage</h4>
                    <p className="text-slate-500 mt-2 max-w-sm">Click the microphone, then instruct the patient to describe their symptoms in their native tongue.</p>
                  </div>
                  <div className="bg-[#FDFBF7] border border-slate-200 rounded-2xl p-4 mt-6 max-w-md mx-auto text-left">
                    <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Instructions</h5>
                    <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>Hold the phone within 1 foot of the patient's mouth.</li>
                      <li>Ensure background noise is minimized.</li>
                      <li>Our AI automatically translates regional dialects to clinical English.</li>
                    </ul>
                  </div>
                </div>
              )}
              {/* Manual Input UI */}
              {inputMode === 'manual' && (
                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Spoken Voice (Original)</label>
                    <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={3} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">English Translation (AI)</label>
                    <textarea value={translation} onChange={e => setTranslation(e.target.value)} rows={3} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Urgency Level</label>
                    <select value={urgency} onChange={e => setUrgency(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]">
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Red">Red</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Symptoms (one per line)</label>
                    <textarea value={symptoms.join('\n')} onChange={e => setSymptoms(e.target.value.split('\n').filter(s => s.trim() !== ''))} rows={4} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Advice / Recommendations</label>
                    <textarea value={advice} onChange={e => setAdvice(e.target.value)} rows={3} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                  </div>
                  <button onClick={() => { setVerificationStep(false); setEditableSymptoms(symptoms); setTriageStep('completed'); }} className="mt-2 px-4 py-2 bg-[#0A2540] text-white rounded hover:bg-[#123152]">Submit Manual Entry</button>
                </div>
              )}
            </>
          )}

          {triageStep === 'recording' && (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold text-xs tracking-wider uppercase mb-6 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                Recording patient voice...
              </div>

              <div className="flex items-center justify-center gap-1.5 h-20 mb-8 w-full max-w-xs">
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-1" style={{ height: '40px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-2" style={{ height: '70px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-3" style={{ height: '50px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-4" style={{ height: '90px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-5" style={{ height: '60px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-6" style={{ height: '35px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-2" style={{ height: '75px' }}></div>
                <div className="w-3 rounded-full bg-[#E07A5F] animate-wave-4" style={{ height: '45px' }}></div>
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold font-mono text-[#0A2540] mb-8">
                <Clock className="w-6 h-6 text-[#E07A5F]" />
                00:0{recordingSeconds}
              </div>

              <button 
                onClick={() => stopRecording(null)}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-3 transition-colors shadow-md"
              >
                <MicOff className="w-5 h-5" />
                Stop & Analyze
              </button>

              <p className="text-xs text-slate-400 mt-6 italic">
                Simulating voice input for preset matching...
              </p>
            </div>
          )}

          {triageStep === 'analyzing' && (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#E07A5F]/20 border-t-[#E07A5F] rounded-full animate-spin mb-6"></div>
              <h4 className="font-heading font-extrabold text-[#0A2540] text-xl">ASHA Saathi AI Triage at Work</h4>
              <p className="text-slate-500 mt-2 max-w-sm">
                Transcribing regional audio, translating to English, and applying diagnostic protocols...
              </p>
            </div>
          )}

          {triageStep === 'completed' && (
            <div className="space-y-6 fade-in-view text-left">
                {/* Verify Symptoms Button */}
                {verificationStep ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Edit Symptoms (one per line)</label>
                    <textarea value={editableSymptoms.join('\n')} onChange={e => setEditableSymptoms(e.target.value.split('\n').filter(s => s.trim() !== ''))} rows={4} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                    <button onClick={() => { setVerificationStep(false); setSymptoms(editableSymptoms); }} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Done Editing</button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVerificationStep(true);
                      setEditableSymptoms(symptoms);
                    }}
                    className="mt-4 px-4 py-2 bg-[#0A2540] text-white rounded hover:bg-[#123152]"
                  >
                    Verify & Edit Symptoms
                  </button>
                )}
              {/* Urgency Classification Header */}
              <div className={`p-5 rounded-2xl flex items-start gap-4 border ${
                urgency === 'Red' 
                  ? 'bg-red-50/70 border-red-200 text-red-900' 
                  : urgency === 'Yellow'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-green-50/70 border-green-200 text-green-900'
              }`}>
                {urgency === 'Red' && <AlertCircle className="w-8 h-8 text-red-600 shrink-0" />}
                {urgency === 'Yellow' && <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />}
                {urgency === 'Green' && <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />}
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider opacity-60">AI Urgency Level</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      urgency === 'Red' 
                        ? 'bg-red-600 text-white' 
                        : urgency === 'Yellow'
                        ? 'bg-amber-500 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {urgency} Alert
                    </span>
                  </div>
                  <h4 className="font-heading font-extrabold text-lg mt-1">
                    {urgency === 'Red' 
                      ? 'Immediate Referral Needed' 
                      : urgency === 'Yellow'
                      ? 'ANM Assessment Required'
                      : 'Home Care & Monitoring'}
                  </h4>
                  <p className="text-sm mt-1 opacity-80">{advice}</p>
                </div>
              </div>

              {/* Nearby Emergency Hospitals Card */}
              {urgency === 'Red' && (
                <div className="bg-[#FFF5F5] border border-red-200/80 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-red-100 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-600 animate-bounce" />
                      <h4 className="font-heading font-extrabold text-[#0A2540] text-sm md:text-base">🚨 Emergency Nearby Hospitals</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm border ${
                      gpsState === 'loading' 
                        ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse' 
                        : gpsState === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        gpsState === 'loading' 
                          ? 'bg-amber-500 animate-ping' 
                          : gpsState === 'success' 
                          ? 'bg-green-500' 
                          : 'bg-slate-400'
                      }`}></span>
                      {gpsState === 'loading' ? 'Locating GPS...' : gpsState === 'success' ? 'GPS Active' : 'Village Fallback'}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {nearbyHospitals.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">Locating regional medical services...</div>
                    ) : (
                      nearbyHospitals.map((hosp, idx) => {
                        const isSelected = selectedHospital?.id === hosp.id;
                        return (
                          <div key={hosp.id} className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left ${
                            isSelected 
                              ? 'border-red-500 bg-red-50/30 shadow-sm' 
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#0A2540] text-sm">{hosp.name}</span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded">
                                    Nearest
                                  </span>
                                )}
                              </div>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                {hosp.distance} km away
                              </span>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-start md:self-center">
                              <a 
                                href={`tel:${hosp.phone}`}
                                className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-all border border-green-200 flex items-center justify-center gap-1 text-xs font-bold animate-pulse hover:animate-none"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call ER</span>
                              </a>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1 text-xs font-bold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Map</span>
                              </a>
                              <button
                                onClick={() => handleSelectHospital(hosp)}
                                className={`px-2.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1 border ${
                                  isSelected 
                                    ? 'bg-red-600 border-red-600 text-white shadow-sm' 
                                    : 'bg-white hover:bg-slate-50 text-[#0A2540] border-slate-200 shadow-sm'
                                }`}
                              >
                                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                                {isSelected ? 'Referral Selected' : 'Select for Referral'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Transcripts Card */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-extrabold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    Transcripts & Translation
                  </span>
                  <span className="text-xs bg-[#0A2540] text-white px-2 py-0.5 rounded font-medium">
                    Language: {INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name.split(' · ')[0]}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Spoken Voice (Original)</h5>
                    <p className="text-slate-800 font-medium italic text-base leading-relaxed">"{transcript}"</p>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">English Translation (AI)</h5>
                    <p className="text-slate-800 font-medium text-base leading-relaxed">"{translation}"</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Referral Action Button */}
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="font-bold text-[#0A2540] text-sm">Need to alert health staff?</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Send a prefilled referral slip instantly to ANM/PHC via WhatsApp.</p>
                </div>
                <a 
                  href={`https://api.whatsapp.com/send?text=${getWhatsAppText()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.807-9.804.002-2.62-1.01-5.086-2.853-6.93C16.38 1.986 13.916.965 11.299.965c-5.405 0-9.807 4.398-9.81 9.808-.002 1.902.502 3.754 1.457 5.36L1.848 22.24l6.32-1.656z" />
                  </svg>
                  Share Referral Slip
                </a>
              </div>

              {/* Detected Symptoms */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Extracted Symptoms ({symptoms.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom, idx) => (
                    <span 
                      key={idx} 
                      className="px-3.5 py-1.5 bg-[#FDFBF7] border border-slate-200 text-[#0A2540] text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        urgency === 'Red' 
                          ? 'bg-red-500' 
                          : urgency === 'Yellow'
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}></span>
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {triageStep === 'anchoring' && (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#0A2540]/10 border-t-[#E07A5F] rounded-full animate-spin mb-6"></div>
              <h4 className="font-heading font-extrabold text-[#0A2540] text-xl">Anchoring on Polygon Blockchain</h4>
              <p className="text-slate-500 mt-2 max-w-sm text-sm">
                Generating hash and registering block transaction...
              </p>
              {anchoringLogs && (
                <div className="mt-6 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 max-w-md animate-pulse">
                  {anchoringLogs}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            disabled={triageStep === 'anchoring'}
            className="px-5 py-3 text-slate-600 hover:text-slate-800 font-bold text-sm transition-colors rounded-xl hover:bg-slate-100 disabled:opacity-30"
          >
            Cancel
          </button>
          {triageStep === 'completed' ? (
            <button 
              onClick={handleStartAnchoring}
              className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Save & Anchor on Polygon
            </button>
          ) : (
            triageStep === 'idle' && (
              <button 
                onClick={startRecording}
                className="px-6 py-3 bg-[#0A2540] hover:bg-[#123152] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Record Now
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
