import React from 'react';
import { Mic, UserPlus, Users, ChevronRight, Home, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard({
  user,
  patientsCount,
  triagesTodayCount,
  redAlertsCount,
  totalTriagesCount,
  triageHistory,
  setCurrentView,
  setTriagePatient,
  setIsTriageModalOpen,
  setSelectedHistoryItem
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6 fade-in-view">
      <h1 className="font-heading text-3xl font-extrabold text-[#0A2540]">{t('namaste')}, {user.name.split(' ')[0]} 🙏</h1>
      {/* Voice Triage Call-to-Action Hero banner */}
      <div className="bg-[#0A2540] text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl border border-[#1a3857]">
        {/* Subtle background effects */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-[#E07A5F]/20 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              {t('online_sync')}
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold mb-2">{t('start_triage_title')}</h2>
            <p className="text-white/70 text-sm md:text-base max-w-lg leading-relaxed">
              {t('start_triage_desc')}
            </p>
          </div>
          <button 
            onClick={() => {
              setTriagePatient(null);
              setIsTriageModalOpen(true);
            }}
            className="px-6 py-4 rounded-2xl bg-[#E07A5F] hover:bg-[#D46A4F] text-white font-bold flex items-center justify-center gap-3 shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all text-base shrink-0"
          >
            <Mic className="w-5 h-5" />
            {t('start_voice_triage')}
          </button>
        </div>
      </div>

      {/* Dashboard Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => setCurrentView('add-patient')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 p-5 rounded-2xl shadow-soft cursor-pointer flex items-center gap-4 group transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#E07A5F] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0A2540]">{t('add_patient')}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{t('register_family')}</p>
          </div>
        </div>

        <div 
          onClick={() => setCurrentView('patients')}
          className="bg-white hover:bg-slate-50 border border-slate-200/80 p-5 rounded-2xl shadow-soft cursor-pointer flex items-center gap-4 group transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0A2540] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0A2540]">{patientsCount} {t('patient_count_label')}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{t('view_patient_list')}</p>
          </div>
        </div>
      </div>

      {/* Three Column Stats Row */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-soft text-center md:text-left">
          <span className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider block mb-1">{t('triages_today')}</span>
          <span className="text-2xl md:text-3xl font-black text-[#0A2540]">{triagesTodayCount}</span>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-soft text-center md:text-left">
          <span className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider block mb-1">{t('red_alerts')}</span>
          <span className="text-2xl md:text-3xl font-black text-red-600">{redAlertsCount}</span>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-soft text-center md:text-left">
          <span className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider block mb-1">{t('total_triages')}</span>
          <span className="text-2xl md:text-3xl font-black text-[#0A2540]">{totalTriagesCount}</span>
        </div>
      </div>

      {/* Recent Triages segment */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-heading font-extrabold text-xl text-[#0A2540]">{t('recent_triages')}</h2>
          <button 
            onClick={() => setCurrentView('history')}
            className="text-sm font-bold text-[#E07A5F] hover:underline flex items-center gap-1"
          >
            {t('view_all')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {triageHistory.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-white/50 text-slate-400">
            <p className="text-sm font-medium">{t('no_triages_yet')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {triageHistory.slice(0, 3).map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedHistoryItem(item)}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-[#E07A5F] cursor-pointer transition-all shadow-sm group"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    item.urgency === 'Red' 
                      ? 'bg-red-500 ring-4 ring-red-50' 
                      : item.urgency === 'Yellow'
                      ? 'bg-amber-500 ring-4 ring-amber-50'
                      : 'bg-green-500 ring-4 ring-green-50'
                  }`}></span>
                  <div>
                    <h4 className="font-bold text-[#0A2540] group-hover:text-[#E07A5F] transition-colors">{item.patientName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.date} · {t('language_spoken_col').split(' ')[0]}: {item.language}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    item.urgency === 'Red' 
                      ? 'bg-red-100 text-red-800' 
                      : item.urgency === 'Yellow'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.urgency}
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
