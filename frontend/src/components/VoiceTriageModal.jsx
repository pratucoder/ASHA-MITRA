import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, AlertCircle, CheckCircle2, AlertTriangle, Languages, Clock, Volume2, MapPin, Phone, ExternalLink, Sparkles } from 'lucide-react';
import { generateSHA256, generateTxHash } from '../blockchain/crypto';
import { getNearbyHospitals, getNearbyHospitalsAsync } from '../utils/hospitals';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config';

const INDIAN_LANGUAGES = [
  { code: 'hi', sarvamCode: 'hi-IN', name: 'हिन्दी · Hindi' },
  { code: 'en', sarvamCode: 'en-IN', name: 'English · English' },
  { code: 'mr', sarvamCode: 'mr-IN', name: 'मराठी · Marathi' }
];

const SYMPTOM_PRESETS = [
  {
    lang: 'hi',
    title: 'Infant High Fever & Respiratory Distress (Hindi)',
    transcript: "बच्चे को तीन दिन से तेज बुखार है, सांस लेने में तकलीफ हो रही है और वो कुछ खा नहीं रहा है।",
    translation: "Child has high fever for three days, is having difficulty breathing, and is not eating anything.",
    urgency: 'Red',
    symptoms: ['High Fever (>102°F)', 'Respiratory Distress', 'Inability to Feed', 'Lethargy'],
    advice: 'Immediate referral to the Community Health Centre (CHC). Arrange transport. Administer paracetamol syrup if temperature is high, keep child hydrated.'
  },
  {
    lang: 'hi',
    title: 'Severe Chest Pain & Sweating (Hindi)',
    transcript: "छाती में बहुत तेज दर्द हो रहा है, ऐसा लग रहा है जैसे कोई वजन रख दिया हो और बाएँ हाथ में दर्द जा रहा है। पसीना भी आ रहा है।",
    translation: "Experiencing severe chest pain, feeling like a heavy weight is on the chest, and pain is radiating to the left arm. Also sweating profusely.",
    urgency: 'Red',
    symptoms: ['Substernal Chest Pain', 'Left Arm Radiation', 'Diaphoresis (Sweating)'],
    advice: 'Emergency! Suspected cardiac event. Place patient in a comfortable sitting position. Give Aspirin 300mg to chew immediately. Arrange for immediate emergency transport to District Hospital.'
  },
  {
    lang: 'mr',
    title: 'Vomiting & Dehydration (Marathi)',
    transcript: "काल संध्याकाळपासून उलट्या आणि जुलाब होत आहेत. खूप अशक्तपणा जाणवत आहे आणि वारंवार तहान लागत आहे।",
    translation: "Having vomiting and loose motions since yesterday evening. Feeling very weak and frequently thirsty.",
    urgency: 'Yellow',
    symptoms: ['Acute Gastroenteritis', 'Moderate Dehydration', 'General Weakness'],
    advice: 'Give ORS solution continuously (1 glass after every loose stool). Check skin turgor and urine output. Refer to Sub-Centre or ANM if symptoms do not improve in 12 hours.'
  },
  {
    lang: 'en',
    title: 'Mild Sore Throat & Cold (English)',
    transcript: "I have a mild sore throat and a slight runny nose since this morning. No fever or body aches.",
    translation: "I have a mild sore throat and a slight runny nose since this morning. No fever or body aches.",
    urgency: 'Green',
    symptoms: ['Mild Sore Throat', 'Mild Rhinorrhea'],
    advice: 'Advise warm saline gargles, steam inhalation, and plenty of warm fluids. Reassure the patient and monitor for development of fever. Local home care is sufficient.'
  }
];

export default function VoiceTriageModal({ isOpen, onClose, patient, onSaveTriage, userCoords }) {
  const { t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [triageStep, setTriageStep] = useState('idle'); // idle, recording, analyzing, completed, anchoring
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [speechNotice, setSpeechNotice] = useState('');
  
  // Real-time voice triage states
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [urgency, setUrgency] = useState('Green'); // Green, Yellow, Red
  const [symptoms, setSymptoms] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [advice, setAdvice] = useState('');
  const [sttProvider, setSttProvider] = useState(''); // 'OpenRouter (gemini-2.5-flash)', 'Sarvam AI STT', 'Web Speech API', etc.

  // Added states for manual input and verification
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'manual'
  const [manualText, setManualText] = useState('');
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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const recordedBase64Ref = useRef('');
  const transcriptRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      setTriageStep('idle');
      setRecordingSeconds(0);
      setSelectedPreset(null);
      setTranscript('');
      transcriptRef.current = '';
      setTranslation('');
      setManualText('');
      setKeywords([]);
      setAnchoringLogs('');
      setCalculatedHash('');
      setSelectedHospital(null);
      setGpsState('idle');
      setNearbyHospitals([]);
      setSttProvider('');
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch(e){}
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch(e){}
      }
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

  // Helper to extract clinical symptoms and urgency from speech transcript
  const analyzeClinicalText = (text, lang) => {
    const lower = text.toLowerCase();
    let detectedUrgency = 'Green';
    let detectedSymptoms = [];
    let detectedAdvice = '';
    let englishTranslation = text;

    const words = text.split(/[\s,।.]+/).map(w => w.trim()).filter(w => w.length > 2);
    const detectedKeywords = Array.from(new Set(words)).slice(0, 5);

    if (lower.includes('chest pain') || lower.includes('छाती') || lower.includes('दर्द') || lower.includes('सांस') || lower.includes('तेज बुखार') || lower.includes('अशक्तपणा') || lower.includes('blood') || lower.includes('खून')) {
      if (lower.includes('chest') || lower.includes('छाती') || lower.includes('heart') || (lower.includes('सांस') && lower.includes('तकलीफ'))) {
        detectedUrgency = 'Red';
        detectedSymptoms = ['Severe Respiratory/Chest Distress', 'High Risk Symptoms'];
        detectedAdvice = 'Immediate referral to District Hospital / CHC. Arrange emergency ambulance transport. Administer first-aid stabilization.';
        englishTranslation = lang === 'hi' ? 'Severe chest pain / breathing difficulty reported by patient.' : lang === 'mr' ? 'Severe chest pain and difficulty breathing.' : text;
      } else if (lower.includes('बुखार') || lower.includes('fever') || lower.includes('ताप') || lower.includes('vomiting') || lower.includes('उलट्या')) {
        detectedUrgency = 'Yellow';
        detectedSymptoms = ['Acute Fever / Dehydration', 'Moderate Distress'];
        detectedAdvice = 'Refer to Sub-Centre or ANM within 12 hours. Administer ORS and fever medication as per guidelines.';
        englishTranslation = lang === 'hi' ? 'High fever and weakness reported over multiple days.' : lang === 'mr' ? 'Vomiting and weakness since yesterday.' : text;
      }
    } else {
      detectedUrgency = 'Green';
      detectedSymptoms = ['Mild Symptoms', 'Local Care Suitable'];
      detectedAdvice = 'Advise warm saline gargles, rest, and fluid intake. Monitor symptoms locally.';
    }

    return {
      urgency: detectedUrgency,
      symptoms: detectedSymptoms,
      keywords: detectedKeywords,
      advice: detectedAdvice,
      translation: englishTranslation
    };
  };

  const startRecording = async () => {
    // 1. INSTANT UI FEEDBACK: Immediately enter recording state
    setTriageStep('recording');
    setRecordingSeconds(0);
    setTranscript('');
    transcriptRef.current = '';
    setTranslation('');
    setSttProvider('');
    setSpeechNotice('');
    audioChunksRef.current = [];

    // Timer for display
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    // 2. Start Web Speech API for real-time live preview text
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'mr' ? 'mr-IN' : 'en-IN';
        recognition.onresult = (event) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText) {
            setTranscript(currentText);
            transcriptRef.current = currentText;
          }
        };
        recognition.onerror = (err) => {
          console.warn("Web Speech API notice:", err.error);
        };
        try {
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          console.warn("SpeechRecognition start notice:", e);
        }
      }
    } catch (err) {
      console.warn("Web Speech API not available:", err);
    }

    // 3. Acquire Microphone Stream safely for MediaRecorder (Sarvam AI STT)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? { mimeType: 'audio/webm;codecs=opus' }
          : MediaRecorder.isTypeSupported('audio/webm')
          ? { mimeType: 'audio/webm' }
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? { mimeType: 'audio/mp4' }
          : {};

        const mediaRecorder = new MediaRecorder(mediaStream, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(200);
      }
    } catch (err) {
      console.error("Microphone getUserMedia error:", err);
      if (!transcriptRef.current) {
        const errName = err.name || 'MicrophoneError';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setTriageStep('idle');
          setSpeechNotice("⚠️ Microphone permission denied by browser. Please allow microphone access in site settings.");
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          setTriageStep('idle');
          setSpeechNotice("⚠️ Microphone is currently in use by another app or hardware system. Please close other voice apps.");
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTriageStep('analyzing');

    // Stop WebSpeech preview
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch(e){}
    }

    const capturedText = (transcriptRef.current || transcript || '').trim();

    // Stop MediaRecorder and process audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        // Stop audio stream tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }

        // If we already have the real-time transcript from Web Speech API, use it instantly!
        if (capturedText) {
          setSttProvider('Web Speech API (Real-time)');
          finishTriageAnalysis(capturedText);
        } else {
          // Fallback: process the recorded audio blob with Sarvam STT API
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size > 0) {
            await processSarvamSTT(audioBlob);
          } else {
            setTriageStep('idle');
            setSpeechNotice("⚠️ Microphone captured 0 bytes of audio. Please speak clearly into your mic.");
          }
        }
      };
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("MediaRecorder stop notice:", e);
      }
    } else {
      // Fallback analysis if MediaRecorder didn't capture chunks
      if (capturedText) {
        setSttProvider('Web Speech API (Real-time)');
        finishTriageAnalysis(capturedText);
      } else {
        setTriageStep('idle');
        setSpeechNotice("⚠️ Microphone capture failed to start. Please check microphone hardware permissions and try again.");
      }
    }
  };

  const processSarvamSTT = async (audioBlob) => {
    try {
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      recordedBase64Ref.current = base64Audio;

      const response = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          languageCode: selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'mr' ? 'mr-IN' : 'en-IN'
        })
      });

      const data = await response.json();

      if (response.ok && data.transcript && data.transcript.trim()) {
        setSpeechNotice('');
        setSttProvider('Sarvam AI Speech-to-Text');
        setTranscript(data.transcript);
        transcriptRef.current = data.transcript;
        finishTriageAnalysis(data.transcript);
      } else {
        // Fallback to Web Speech API text if captured from live microphone
        const textToUse = (transcriptRef.current || transcript || '').trim();
        if (textToUse) {
          setSpeechNotice('');
          setSttProvider('Web Speech API');
          finishTriageAnalysis(textToUse);
        } else {
          setTriageStep('idle');
          const detail = data.error || "No speech detected";
          setSpeechNotice(`⚠️ Sarvam STT: ${detail}. Please speak clearly into your mic and try again.`);
        }
      }
    } catch (err) {
      console.warn("Sarvam STT backend request error:", err);
      const textToUse = (transcriptRef.current || transcript || '').trim();
      if (textToUse) {
        setSpeechNotice('');
        setSttProvider('Web Speech API');
        finishTriageAnalysis(textToUse);
      } else {
        setTriageStep('idle');
        setSpeechNotice("⚠️ Speech-to-text service unavailable. Please check your mic connection and try again.");
      }
    }
  };

  const getLanguagePresetText = () => {
    return '';
  };

  const finishTriageAnalysis = async (finalText) => {
    const textToAnalyze = (finalText || transcriptRef.current || transcript || '').trim();
    if (!textToAnalyze) {
      setTriageStep('idle');
      setSpeechNotice("⚠️ No speech text was received. Please record again or type symptoms manually.");
      return;
    }
    setSpeechNotice('');

    setTranscript(textToAnalyze);
    transcriptRef.current = textToAnalyze;

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze,
          language: selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'mr' ? 'mr-IN' : 'en-IN'
        })
      });

      const data = await res.json();
      if (res.ok && data) {
        setUrgency(data.urgency || 'Green');
        setSymptoms(data.symptoms || []);
        setKeywords(data.keywords || []);
        setAdvice(data.advice || '');
        setTranslation(data.translation || textToAnalyze);
        setEditableSymptoms(data.symptoms || []);
        if (data.provider) setSttProvider(data.provider);
      } else {
        const fallback = analyzeClinicalText(textToAnalyze, selectedLanguage);
        setUrgency(fallback.urgency);
        setSymptoms(fallback.symptoms);
        setKeywords(fallback.keywords || []);
        setAdvice(fallback.advice);
        setTranslation(fallback.translation);
        setEditableSymptoms(fallback.symptoms);
      }
    } catch (err) {
      console.warn("Backend OpenRouter LLM call error, using local fallback:", err);
      const fallback = analyzeClinicalText(textToAnalyze, selectedLanguage);
      setUrgency(fallback.urgency);
      setSymptoms(fallback.symptoms);
      setKeywords(fallback.keywords || []);
      setAdvice(fallback.advice);
      setTranslation(fallback.translation);
      setEditableSymptoms(fallback.symptoms);
    }

    setVerificationStep(false);
    setTriageStep('completed');
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
        language: INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'Hindi',
        transcript,
        translation,
        urgency,
        keywords,
        symptoms: editableSymptoms.length > 0 ? editableSymptoms : symptoms,
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
      `*Spoken Voice:* "${transcript}"\n` +
      `*Key Words:* ${keywords.length > 0 ? keywords.join(', ') : 'N/A'}\n` +
      `*Extracted Symptoms:* ${(editableSymptoms.length > 0 ? editableSymptoms : symptoms).join(', ')}\n\n` +
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
              <h3 className="font-heading font-extrabold text-lg">{t('ai_voice_triage')}</h3>
              <p className="text-xs text-white/70">
                {t('patient')}: <span className="font-bold text-[#E07A5F]">{patient?.name || t('new_triage')}</span>
                {patient && ` (${patient.age}y · ${patient.gender === 'Female' ? t('female').toLowerCase() : patient.gender === 'Male' ? t('male').toLowerCase() : t('other').toLowerCase()})`}
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
          {t('voice_input')}
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`px-4 py-2 rounded ${inputMode === 'manual' ? 'bg-[#E07A5F] text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          {t('manual_input')}
        </button>
      </div>

        {/* Scrollable Content Container */}
        <div className="p-6 overflow-y-auto flex-grow">
          {triageStep === 'idle' && (
            <>
              {/* Voice Input UI */}
              {inputMode === 'voice' && (
                <div className="text-center py-6">
                  {speechNotice && (
                    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 text-left max-w-md mx-auto flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 font-semibold leading-relaxed">
                        {speechNotice}
                      </div>
                    </div>
                  )}

                  <div className="max-w-md mx-auto mb-6">
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-2.5 text-left">{t('select_spoken_lang')}</label>
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
                    <h4 className="font-heading font-extrabold text-[#0A2540] text-xl mt-5">{t('start_voice_triage')}</h4>
                    <p className="text-slate-500 mt-2 text-xs max-w-sm">{t('mic_hint_desc')}</p>
                  </div>

                  <div className="bg-[#FDFBF7] border border-slate-200 rounded-2xl p-4 mt-6 max-w-md mx-auto text-left">
                    <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">{t('mic_recording')}</h5>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>{t('mic_tip_1')}</li>
                      <li>{t('mic_tip_2')}</li>
                      <li>{t('mic_tip_3')}</li>
                    </ul>
                  </div>
                </div>
              )}
              {/* Manual Input UI */}
              {inputMode === 'manual' && (
                <div className="space-y-5 max-w-md mx-auto py-4 text-left">
                  <div>
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-2">{t('select_language')}</label>
                    <select 
                      value={selectedLanguage} 
                      onChange={(e) => setSelectedLanguage(e.target.value)} 
                      className="w-full p-3 rounded-xl border border-slate-300 bg-white font-semibold text-[#0A2540] focus:border-[#E07A5F] focus:outline-none cursor-pointer"
                    >
                      {INDIAN_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold tracking-wider uppercase text-slate-500 block mb-2">
                      {t('type_description')}
                    </label>
                    <textarea 
                      value={manualText} 
                      onChange={e => setManualText(e.target.value)} 
                      rows={4} 
                      placeholder={t('manual_placeholder')} 
                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm focus:border-[#E07A5F] focus:ring-1 focus:ring-[#E07A5F] text-slate-800 text-sm font-medium" 
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      {t('manual_hint')}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      const trimmed = manualText.trim();
                      if (!trimmed) {
                        alert("Please enter patient symptom description first.");
                        return;
                      }
                      setTriageStep('analyzing');
                      finishTriageAnalysis(trimmed);
                    }} 
                    className="w-full py-3.5 bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('analyze_btn')}
                  </button>
                </div>
              )}
            </>
          )}

          {triageStep === 'recording' && (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full font-bold text-xs tracking-wider uppercase mb-6 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                {t('recording_voice')}
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
                {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
              </div>

              <div className="flex items-center gap-3 w-full max-w-sm justify-center mb-4">
                <button 
                  onClick={() => stopRecording()}
                  className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-colors shadow-md text-sm active:scale-95"
                >
                  <MicOff className="w-4 h-4" />
                  {t('stop_analyze')}
                </button>
              </div>

              {transcript && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-md w-full mb-4 text-xs font-mono text-slate-700 text-left">
                  <span className="font-bold text-[#E07A5F]">{t('live_preview')}: </span>"{transcript}"
                </div>
              )}

              <p className="text-xs text-slate-400 mt-2 italic">
                {t('capturing_mic')}
              </p>
            </div>
          )}

          {triageStep === 'analyzing' && (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-[#E07A5F]/20 border-t-[#E07A5F] rounded-full animate-spin mb-6"></div>
              <h4 className="font-heading font-extrabold text-[#0A2540] text-xl">{t('ai_at_work')}</h4>
              <p className="text-slate-500 mt-2 max-w-sm">
                {t('ai_work_desc')}
              </p>
            </div>
          )}

          {triageStep === 'completed' && (
            <div className="space-y-6 fade-in-view text-left">
              {/* Verify Symptoms Button */}
                {verificationStep ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">{t('edit_symptoms_label')}</label>
                    <textarea value={editableSymptoms.join('\n')} onChange={e => setEditableSymptoms(e.target.value.split('\n').filter(s => s.trim() !== ''))} rows={4} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[#E07A5F] focus:ring-[#E07A5F]" />
                    <button onClick={() => { setVerificationStep(false); setSymptoms(editableSymptoms); }} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">{t('done_editing')}</button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVerificationStep(true);
                      setEditableSymptoms(symptoms);
                    }}
                    className="mt-4 px-4 py-2 bg-[#0A2540] text-white rounded hover:bg-[#123152]"
                  >
                    {t('verify_edit_symptoms')}
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
                    <span className="text-xs uppercase font-extrabold tracking-wider opacity-60">{t('ai_urgency_level')}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      urgency === 'Red' 
                        ? 'bg-red-600 text-white' 
                        : urgency === 'Yellow'
                        ? 'bg-amber-500 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {(urgency === 'Red' ? t('red') : urgency === 'Yellow' ? t('yellow') : t('green'))} {t('alert_suffix')}
                    </span>
                  </div>
                  <h4 className="font-heading font-extrabold text-lg mt-1">
                    {urgency === 'Red' 
                      ? t('immediate_referral') 
                      : urgency === 'Yellow'
                      ? t('anm_assessment')
                      : t('home_care')}
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
                      <h4 className="font-heading font-extrabold text-[#0A2540] text-sm md:text-base">🚨 {t('nearby_emergency')}</h4>
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
                      {gpsState === 'loading' ? t('gps_fetching') : gpsState === 'success' ? t('gps_success') : t('village_fallback')}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {nearbyHospitals.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400">{t('hospital_rec_desc')}</div>
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
                                    {t('nearest')}
                                  </span>
                                )}
                              </div>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                {hosp.distance} {t('km_away')}
                              </span>
                            </div>

                            <div className="flex gap-1.5 shrink-0 self-start md:self-center">
                              <a 
                                href={`tel:${hosp.phone}`}
                                className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-all border border-green-200 flex items-center justify-center gap-1 text-xs font-bold animate-pulse hover:animate-none"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{t('call_er')}</span>
                              </a>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hosp.name + ' ' + hosp.address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1 text-xs font-bold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{t('map')}</span>
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
                                {isSelected ? t('referral_selected') : t('select_for_referral')}
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
                    {t('spoken_transcript')} & {t('english_translation')}
                  </span>
                  <span className="text-xs bg-[#0A2540] text-white px-2 py-0.5 rounded font-medium">
                    {t('language_label_summary')}: {INDIAN_LANGUAGES.find(l => l.code === selectedLanguage)?.name.split(' · ')[0]}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{t('spoken_transcript')} ({t('original')})</h5>
                    <p className="text-slate-800 font-medium italic text-base leading-relaxed">"{transcript}"</p>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">{t('english_translation')} (AI)</h5>
                    <p className="text-slate-800 font-medium text-base leading-relaxed">"{translation}"</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Referral Action Button */}
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="font-bold text-[#0A2540] text-sm">{t('alert_health_staff')}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t('alert_health_staff_desc')}</p>
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
                  {t('share_referral')}
                </a>
              </div>

              {/* Extracted Key Words */}
              {keywords && keywords.length > 0 && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                  <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {t('extracted_keywords')} ({keywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, idx) => (
                      <span 
                        key={idx} 
                        className="px-3 py-1 bg-white border border-indigo-200 text-indigo-950 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1"
                      >
                        <span className="text-indigo-500">🔑</span> {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Symptoms */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">{t('extracted_symptoms')} ({symptoms.length})</h4>
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
              <h4 className="font-heading font-extrabold text-[#0A2540] text-xl">{t('anchoring_polygon')}</h4>
              <p className="text-slate-500 mt-2 max-w-sm text-sm">
                {t('anchoring_polygon_desc')}
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
            {t('cancel')}
          </button>
          {triageStep === 'completed' ? (
            <button 
              onClick={handleStartAnchoring}
              className="px-6 py-3 bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {t('save_anchor')}
            </button>
          ) : (
            triageStep === 'idle' && (
              <button 
                onClick={startRecording}
                className="px-6 py-3 bg-[#0A2540] hover:bg-[#123152] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                {t('record_now')}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
