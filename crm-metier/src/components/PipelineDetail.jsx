import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Building2, 
  MapPin, 
  Hash, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  History, 
  Phone,
  ArrowLeft,
  Mail,
  Send,
  StickyNote,
  Activity,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Star,
  Trophy,
  PartyPopper,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import nafMapping from '../data/naf_mapping.json';

const STATUS_STEPS = [
  { id: 'Nouveau', label: 'Nouveau' },
  { id: 'RAP', label: 'RAP' },
  { id: 'Proposition', label: 'Proposition' },
  { id: 'Signé', label: 'Signé' },
  { id: 'PEC', label: 'PEC' },
  { id: 'Gagné', label: 'Gagné' },
  { id: 'ORGANISÉ', label: 'ORGANISÉ' },
];

const RDV_STATUS_OPTIONS = []; // Will use dynamic columns

const PipelineDetail = ({ lead, onClose, onUpdateStatus, user, onUpdateLead, source = 'Pipeline', pipelineColumns = [] }) => {

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [tempRevenue, setTempRevenue] = useState(lead.ca_signe_ht || 0);

  useEffect(() => {
    if (lead?.id) fetchHistory();
  }, [lead?.id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('crm_observations_history')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from('crm_observations_history').insert([{
      lead_id: lead.id,
      observation_text: newNote,
      created_by: user?.name || user?.email || 'Système'
    }]);
    if (!error) {
      setNewNote('');
      fetchHistory();
    }
  };

  const getCurrentStatus = () => {
    if (lead.suivi_formation === 'ORGANISÉE') return 'ORGANISÉ';
    if (lead.status === 'SIGNE' && lead.pec === 'OUI') return 'Gagné';
    if (lead.pec === 'OUI' && lead.status !== 'SIGNE') return 'PEC';
    if (lead.status === 'SIGNE' && lead.pec !== 'OUI') return 'Signé';
    if (lead.proposition === 'OUI' && lead.status !== 'SIGNE') return 'Proposition';
    if (lead.status_rdv === 'Perdu' || lead.status === 'PERDU') return 'Perdu';
    if (lead.status === 'RAPPEL') return 'RAP';
    if (lead.status === 'RDV') return 'Nouveau';
    return 'Nouveau';
  };

  const currentStatusId = getCurrentStatus();

  const handleStatusChange = (status) => {
    if (status === 'Gagné' && currentStatusId !== 'Gagné') {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    onUpdateStatus(lead.id, status);
  };

  const handleFieldUpdate = async (field, value) => {
    if (onUpdateLead) {
      await onUpdateLead(lead.id, { [field]: value });
    }
  };

  const getAutomatedLibelle = () => {
    if (lead.libelle_activite) return lead.libelle_activite;
    const nafValue = lead.code_naf || lead.secteur;
    if (nafValue) {
      const cleanNaf = String(nafValue).toUpperCase().replace(/[^A-Z0-9]/g, '');
      let desc = nafMapping[cleanNaf];
      if (!desc && cleanNaf.length === 4) {
        const matches = Object.keys(nafMapping).filter(k => k.startsWith(cleanNaf));
        if (matches.length === 1) desc = nafMapping[matches[0]];
      }
      return desc || null;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      
      {/* Celebration Animation Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-card/90 backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl border-4 border-green-500/20 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <Trophy className="w-24 h-24 text-yellow-500 animate-bounce" />
                <PartyPopper className="w-12 h-12 text-green-500 absolute -top-4 -right-4 animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-4xl font-black text-navy uppercase tracking-tighter text-center">
                  Gagné !
                </h2>
                <p className="text-sm font-bold text-navy/40 uppercase tracking-widest text-center max-w-[250px]">
                  Félicitations pour cette nouvelle signature
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <div className="h-14 bg-card border-b border-navy/5 flex items-center justify-between px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-navy/5 rounded-lg transition-all text-navy/40">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-navy/30 uppercase tracking-widest">{source} /</span>
            <span className="text-xs font-bold text-navy">Opportunité de {lead.nom_entreprise}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-navy/5 rounded-lg transition-all text-navy/40">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Form & Info */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-card border-r border-navy/5 relative">
          
          {/* Status Progress Bar */}
          <div className="p-6 bg-card border-b border-navy/5 sticky top-0 z-[60] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleStatusChange('Gagné')}
                className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                  currentStatusId === 'Gagné' 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-navy/5 text-navy/40 hover:bg-green-500 hover:text-white'
                }`}
              >
                Gagné
              </button>
              <button 
                onClick={() => handleStatusChange('Perdu')}
                className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                  currentStatusId === 'Perdu'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                    : 'bg-navy/5 text-navy/40 hover:bg-red-500 hover:text-white'
                }`}
              >
                Perdu
              </button>
            </div>

            <div className="flex items-center overflow-hidden border border-navy/5 rounded-lg bg-navy/[0.02]">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = step.id === currentStatusId;
                const isPassed = STATUS_STEPS.findIndex(s => s.id === currentStatusId) > idx;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStatusChange(step.id)}
                    className={`relative h-10 px-6 flex items-center justify-center transition-all min-w-[120px] ${
                      isActive 
                        ? 'bg-primary text-white shadow-inner' 
                        : isPassed
                          ? 'bg-primary/10 text-primary'
                          : 'bg-card text-navy/30 hover:text-navy/60'
                    } ${idx !== 0 ? 'border-l border-navy/5' : ''}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">{step.label}</span>
                    {isActive && (
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rotate-45 z-10 border-t border-r border-background/20" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-10 space-y-12 relative">
            {/* Gagné Ribbon */}
            {currentStatusId === 'Gagné' && (
              <div className="absolute top-10 right-[-40px] rotate-45 bg-green-500 text-white py-2 px-20 shadow-xl z-20 pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">GAGNÉ</span>
              </div>
            )}
            
            {/* Header Info */}
            <div className="space-y-6">
              <h1 className="text-4xl font-black text-navy leading-tight">
                Opportunité de {lead.nom_entreprise}
              </h1>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-2 group/revenu">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em]">Revenu attendu</span>
                    {!isEditingRevenue && <Pencil onClick={() => { setTempRevenue(lead.ca_signe_ht || 0); setIsEditingRevenue(true); }} className="w-2.5 h-2.5 text-navy/10 opacity-0 group-hover/revenu:opacity-100 transition-all cursor-pointer hover:text-primary" />}
                  </div>
                  <div className="flex items-end gap-2">
                    {isEditingRevenue ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                        <input 
                          autoFocus
                          type="number"
                          value={tempRevenue}
                          onChange={e => setTempRevenue(e.target.value)}
                          onBlur={() => { handleFieldUpdate('ca_signe_ht', parseFloat(tempRevenue)); setIsEditingRevenue(false); }}
                          onKeyDown={e => e.key === 'Enter' && (handleFieldUpdate('ca_signe_ht', parseFloat(tempRevenue)), setIsEditingRevenue(false))}
                          className="text-2xl font-black text-navy bg-navy/5 border-none rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 w-40"
                        />
                        <span className="text-xl font-black text-navy/20">€</span>
                      </div>
                    ) : (
                      <span 
                        onClick={() => { setTempRevenue(lead.ca_signe_ht || 0); setIsEditingRevenue(true); }}
                        className="text-2xl font-black text-navy cursor-pointer hover:text-primary transition-colors"
                      >
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(lead.ca_signe_ht || 0)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-navy/30 uppercase tracking-[0.2em]">Probabilité</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-navy">{currentStatusId === 'Gagné' ? '100' : '50'},00 %</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-x-20 gap-y-8">
              <div className="space-y-6">
                <EditableRow label="Contact" value={lead.nom_entreprise} icon={User} onSave={(val) => handleFieldUpdate('nom_entreprise', val)} />
                <EditableRow label="E-mail" value={lead.email} icon={Mail} onSave={(val) => handleFieldUpdate('email', val)} />
                <EditableRow label="Téléphone" value={lead.tel || lead.mobile} icon={Phone} onSave={(val) => handleFieldUpdate('tel', val)} />
                <div className="h-px bg-navy/[0.03] my-4" />
                <InfoRow label="N° SIRET" value={lead.siret} icon={Hash} isMono />
                <InfoRow label="Code NAF" value={lead.code_naf} icon={Briefcase} isMono />
              </div>
              <div className="space-y-6">
                <EditableRow label="FUNBOOSTER" value={lead.funebooster} icon={User} onSave={(val) => handleFieldUpdate('funebooster', val)} />
                <EditableRow label="DATE DE RDV" value={lead.date_rdv} icon={Calendar} onSave={(val) => handleFieldUpdate('date_rdv', val)} />
                <EditableRow label="HEURE DE RDV" value={lead.heure_rdv} icon={Clock} onSave={(val) => handleFieldUpdate('heure_rdv', val)} />
                <div className="flex items-start gap-4">
                  <span className="w-32 text-[10px] font-black text-navy/30 uppercase tracking-widest shrink-0 pt-1">Statut Projet</span>
                  <select 
                    value={lead.status_rdv || ''} 
                    onChange={(e) => handleFieldUpdate('status_rdv', e.target.value)}
                    className="bg-navy/[0.02] border border-navy/10 rounded-lg px-2 py-1 text-sm font-bold text-navy focus:outline-none focus:border-primary/30 transition-all"
                  >
                    <option className="bg-card text-navy" value="">— CHOISIR —</option>
                    {pipelineColumns.map(opt => (
                      <option className="bg-card text-navy" key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <InfoRow label="Étiquettes" value={lead.status} />
                <div className="h-px bg-navy/[0.03] my-4" />
                <InfoRow label="Secteur" value={lead.secteur_activite} icon={Building2} />
                <InfoRow label="Libellé Act." value={getAutomatedLibelle()} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Activity/History Log */}
        <div className="w-[450px] bg-background flex flex-col shrink-0">
          <div className="h-14 border-b border-navy/5 flex items-center px-6 gap-4 shrink-0 bg-card">
            <button className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b-2 border-primary h-full px-2">Envoyer message</button>
          </div>

          {/* Activity Composer */}
          <div className="p-6 bg-card border-b border-navy/5">
            <div className="relative">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Écrire un message..."
                className="w-full h-24 p-4 bg-navy/[0.02] border border-navy/10 rounded-xl text-sm focus:outline-none focus:border-primary/30 transition-all resize-none"
              />
              <button 
                onClick={addNote}
                className="absolute bottom-4 right-4 p-2 bg-primary text-white rounded-lg shadow-lg hover:scale-105 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {history.map((item, idx) => (
              <div key={item.id} className="flex gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-card border border-navy/10 flex items-center justify-center text-[11px] font-black text-navy/40 shrink-0 shadow-sm">
                  {item.created_by?.charAt(0) || 'L'}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-navy uppercase tracking-wider">{item.created_by}</span>
                    <span className="text-[10px] text-navy/20 italic">{new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="p-3 bg-card border border-navy/5 rounded-xl shadow-sm text-xs text-navy/70 leading-relaxed">
                    {item.observation_text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon, isMono }) => (
  <div className="flex items-start gap-4">
    <span className="w-32 text-[10px] font-black text-navy/30 uppercase tracking-widest shrink-0 pt-1">{label}</span>
    <div className="flex items-center gap-2 min-w-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-navy/20" />}
      <span className={`font-bold text-navy truncate ${isMono ? 'font-mono text-sm tracking-tighter' : 'text-[13px]'}`}>
        {value || '—'}
      </span>
    </div>
  </div>
);

const EditableRow = ({ label, value, icon: Icon, onSave, isMono }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleSave = () => {
    if (tempValue !== value) onSave(tempValue);
    setIsEditing(false);
  };

  return (
    <div className="flex items-start gap-4 group/row">
      <span className="w-32 text-[10px] font-black text-navy/30 uppercase tracking-widest shrink-0 pt-1">{label}</span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-navy/20 group-hover/row:text-primary transition-colors" />}
        {isEditing ? (
          <input 
            autoFocus
            type="text"
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-navy/[0.03] border-none rounded-md px-2 py-0.5 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="flex-1 flex items-center justify-between gap-2 cursor-pointer group/inner"
          >
            <span className={`font-bold text-navy truncate ${isMono ? 'font-mono text-sm tracking-tighter' : 'text-[13px]'}`}>
              {value || '—'}
            </span>
            <Pencil className="w-3 h-3 text-navy/10 opacity-0 group-hover/row:opacity-100 transition-all" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineDetail;
