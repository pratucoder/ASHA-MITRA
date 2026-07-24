import React, { useState } from 'react';
import { 
  Users, AlertCircle, ShieldCheck, MapPin, Search, X, 
  ChevronRight, Phone, MessageSquare, ExternalLink, Sparkles 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ANMDashboard({
  user,
  patients,
  triageHistory,
  onResolveTriage,
  setSelectedHistoryItem
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('All');

  // Filter history by search and village
  const filteredTriages = triageHistory.filter(t => {
    const matchesSearch = t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.symptoms.join(', ').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVillage = selectedVillage === 'All' ? true : t.village === selectedVillage;
    return matchesSearch && matchesVillage;
  });

  // Extract unique villages for filter
  const villages = ['All', ...new Set(triageHistory.map(t => t.village))];

  // Calculations
  const totalPatients = patients.length + 4; // Add some mock counts for other workers
  const pendingRedAlerts = triageHistory.filter(t => t.urgency === 'Red' && !t.resolved).length;
  const activeASHAs = 4; // Mock cluster count

  // Resolve helper
  const handleResolve = (e, triageId) => {
    e.stopPropagation(); // Avoid opening details modal
    onResolveTriage(triageId);
  };

  const openBlockchainExplorer = (e, item) => {
    e.stopPropagation();
    setSelectedHistoryItem({ ...item, showExplorer: true });
  };

  return (
    <div className="space-y-6 fade-in-view">
      <h1 className="font-heading text-3xl font-extrabold text-[#0A2540]">{t('namaste')}, {user.name} 👋</h1>
      <p className="text-slate-500 -mt-4 font-medium">{t('cluster_title')}</p>

      {/* Cluster Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0A2540] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('total_cluster_patients')}</span>
            <span className="text-2xl font-black text-[#0A2540]">{totalPatients}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 relative">
            {pendingRedAlerts > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600 animate-ping"></span>}
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('unresolved_red_alerts')}</span>
            <span className={`text-2xl font-black ${pendingRedAlerts > 0 ? 'text-red-600' : 'text-slate-500'}`}>
              {pendingRedAlerts}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('active_asha_workers')}</span>
            <span className="text-2xl font-black text-[#0A2540]">{activeASHAs}</span>
          </div>
        </div>
      </div>

      {/* RED Alerts Warning Board */}
      {triageHistory.filter(t => t.urgency === 'Red' && !t.resolved).length > 0 && (
        <div className="border border-red-200 bg-red-50/40 rounded-3xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider">{t('critical_alerts_title')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {triageHistory.filter(t => t.urgency === 'Red' && !t.resolved).map(alert => (
              <div 
                key={alert.id}
                onClick={() => setSelectedHistoryItem(alert)}
                className="bg-white border border-red-200 rounded-2xl p-4 flex flex-col justify-between hover:border-red-400 transition-all cursor-pointer shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black uppercase tracking-wider">
                      {t('critical_red')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{alert.date}</span>
                  </div>
                  <h4 className="font-bold text-[#0A2540] mt-2">{alert.patientName} ({alert.patientDetails})</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {t('village_label')}: {alert.village} · {t('asha_label')}: {alert.ashaName || 'Sunita Devi'}
                  </p>
                  <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100 font-semibold mt-3 italic">
                    "{alert.translation}"
                  </p>
                </div>
                
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button 
                    onClick={(e) => handleResolve(e, alert.id)}
                    className="flex-grow py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {t('resolve_alert')}
                  </button>
                  <a 
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hi, regarding patient ${alert.patientName} in ${alert.village} triaged RED: "${alert.translation}". Please confirm immediate transfer details.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('message_asha')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster Triage Feed Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="font-heading font-extrabold text-xl text-[#0A2540]">{t('triage_monitoring_feed')}</h2>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_patient_symptoms')}
                className="pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:border-[#E07A5F]"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none cursor-pointer"
              >
                {villages.map(v => (
                  <option key={v} value={v}>{v === 'All' ? t('all_villages') : v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredTriages.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white/50 text-slate-400">
            <p className="text-sm font-medium">{t('no_logs_match')}</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">{t('patient_details_col')}</th>
                    <th className="px-6 py-4">{t('triage_status_col')}</th>
                    <th className="px-6 py-4">{t('origin_village_col')}</th>
                    <th className="px-6 py-4">{t('polygon_verification_col')}</th>
                    <th className="px-6 py-4 text-right">{t('details_col')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTriages.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedHistoryItem(item)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#0A2540] block">{item.patientName}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{item.patientDetails}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider w-fit ${
                            item.urgency === 'Red' 
                              ? 'bg-red-100 text-red-800' 
                              : item.urgency === 'Yellow'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {(item.urgency === 'Red' ? t('red') : item.urgency === 'Yellow' ? t('yellow') : t('green'))} {t('alert_suffix')}
                          </span>
                          {item.urgency === 'Red' && (
                            <span className={`text-[9px] font-bold ${item.resolved ? 'text-green-600' : 'text-red-500 animate-pulse'}`}>
                              {item.resolved ? `✓ ${t('resolved')}` : `● ${t('unresolved')}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 block">{item.village}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{t('asha_label')}: {item.ashaName || 'Sunita Devi'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={(e) => openBlockchainExplorer(e, item)}
                          className="px-2.5 py-1 rounded bg-[#EBF4FF] text-blue-700 text-xs font-bold flex items-center gap-1 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                          {t('verify_on_chain')}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
