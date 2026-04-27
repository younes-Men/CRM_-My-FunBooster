import React, { useState, useEffect } from 'react';
import { X, Clock, User, Building2, MapPin, Hash, Briefcase, Calendar, MessageSquare, History, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import nafMapping from '../data/naf_mapping.json';

const formatNaf = (val) => {
  if (!val) return val;
  const clean = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 5) {
    return `${clean.substring(0, 2)}.${clean.substring(2, 4)}${clean.substring(4)}`;
  }
  if (clean.length === 4) {
    const matches = Object.keys(nafMapping).filter(k => k.startsWith(clean));
    if (matches.length === 1) {
      const full = matches[0];
      return `${full.substring(0, 2)}.${full.substring(2, 4)}${full.substring(4)}`;
    }
    return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  }
  return val;
};

const LeadDetailPanel = ({ leadId, lead, onClose, userName }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper for automated NAF label
  const getAutomatedLibelle = () => {
    if (lead.libelle_activite) return lead.libelle_activite;
    const nafValue = lead.code_naf || lead.secteur;
    if (nafValue) {
      const cleanNaf = String(nafValue).toUpperCase().replace(/[^A-Z0-9]/g, '');
      let desc = nafMapping[cleanNaf];
      
      // Fuzzy match if incomplete (4 digits)
      if (!desc && cleanNaf.length === 4) {
        const matches = Object.keys(nafMapping).filter(k => k.startsWith(cleanNaf));
        if (matches.length === 1) desc = nafMapping[matches[0]];
      }
      
      return desc || null;
    }
    return null;
  };

  useEffect(() => {
    if (leadId) {
      fetchHistory();
    }
  }, [leadId]);

  const fetchHistory = async () => {
    console.log(`[History] Récupération de l'historique pour le lead ID: ${leadId}...`);
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_observations_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[History] Erreur lors de la récupération:', error);
    } else {
      console.log(`[History] ${data?.length || 0} entrées d'historique trouvées.`);
      setHistory(data || []);
    }
    setLoading(false);
  };

  if (!lead) return null;

  const formatDate = (d, t) => {
    if (!d) return '—';
    const datePart = new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    
    if (!t || t === '-' || t === ':') return datePart;

    // Format time as HHhMM
    const [h, m] = t.split(/[:hH]/);
    const timePart = `${(h || '00').padStart(2, '0')}h${(m || '00').substring(0, 2).padStart(2, '0')}`;
    
    return `${datePart} à ${timePart}`;
  };

  return (
    <>
      {/* Backdrop (Optimized: No blur for better performance) */}
      <div 
        className="fixed inset-0 bg-navy/50 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Side Panel (Optimized: Hardware acceleration enabled) */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white shadow-2xl z-[101] animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden border-l border-navy/5 will-change-transform transform-gpu">
        
        {/* Header */}
        <div className="p-8 border-b border-navy/5 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-navy tracking-tight font-outfit uppercase">
              Détails du Lead
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">ID: {lead.id}</span>
              <div className="w-1 h-1 rounded-full bg-navy/10" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Dossier Complet</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-navy/5 text-navy/40 hover:bg-navy hover:text-white transition-all group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content (Optimized scroll) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 overscroll-contain">
          <div className="space-y-10">
            
            {/* Info Section: Company */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">Informations Entreprise</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5">
                <InfoItem label="Raison Sociale" value={lead.nom_entreprise} icon={Building2} />
                <InfoItem label="N° SIRET" value={lead.siret} icon={Hash} isMono />
                <InfoItem label="Secteur" value={lead.secteur_activite} icon={Briefcase} />
                <InfoItem label="Libellé" value={getAutomatedLibelle()} />
                <InfoItem label="Opco" value={lead.nom_opco} />
                <InfoItem label="NAF" value={lead.code_naf || lead.secteur} isMono />
              </div>
            </section>

            {/* Info Section: Contact & Location */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-navy/5 text-navy shadow-sm ring-1 ring-navy/5">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">Contact & Localisation</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5 text-sm">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Adresse Complète</span>
                  <p className="text-navy font-bold">{lead.adresse || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-navy/5">
                  <InfoItem label="Code Postal" value={lead.code_postal} />
                  <InfoItem label="Département" value={lead.code_departement} />
                  <div className="col-span-full h-px bg-navy/5 my-2" />
                  <InfoItem label="Téléphone Fixe" value={lead.tel} icon={Phone} />
                  <InfoItem label="Mobile" value={lead.mobile} icon={Phone} />
                </div>
              </div>
            </section>

            {/* Info Section: Status & Dates */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600 shadow-sm ring-1 ring-green-500/5">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">État du Dossier</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-navy/[0.02] p-6 rounded-3xl border border-navy/5">
                <InfoItem label="Statut Actuel" value={lead.status} />
                <InfoItem label="Statut RDV" value={lead.status_rdv} />
                <InfoItem label="FUNEBOOSTER" value={lead.funebooster} icon={User} />
                <InfoItem label="Date RDV" value={formatDate(lead.date_rdv, lead.heure_rdv)} />
                <InfoItem label="Type RDV" value={lead.type_rdv} />
              </div>
            </section>

            {/* History Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-navy text-white shadow-lg ring-1 ring-navy/5">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest">Historique des Observations</h3>
                </div>
                <div className="px-3 py-1 rounded-full bg-navy/5 text-[10px] font-bold text-navy/40 uppercase tracking-widest">
                  {history.length} entrées
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-3 p-6 text-navy/20 animate-pulse bg-navy/[0.02] rounded-3xl border border-navy/5">
                    <History className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Chargement de l'historique...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-navy/[0.02] rounded-3xl border border-dashed border-navy/10 gap-3 grayscale opacity-40">
                    <MessageSquare className="w-8 h-8 text-navy" />
                    <span className="text-[10px] font-bold text-navy uppercase tracking-widest">Aucun historique disponible</span>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-navy/[0.04]">
                    {history.map((item, idx) => (
                      <div key={item.id} className="relative group">
                        <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-navy/[0.04] group-hover:ring-primary/20 group-hover:bg-primary transition-all shadow-sm" />
                        <div className="flex flex-col gap-2 p-5 bg-white border border-navy/5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                {item.created_by?.substring(0, 1) || '?'}
                              </div>
                              <span className="text-[10px] font-black text-navy uppercase tracking-widest">{item.created_by}</span>
                            </div>
                            <span className="text-[9px] font-bold text-navy/30 uppercase tracking-tighter italic">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-navy/80 font-medium leading-relaxed">
                            {item.observation_text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-navy/5 bg-navy/[0.01]">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-navy text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-navy/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-navy/20"
          >
            Fermer le Panel
          </button>
        </div>
      </div>
    </>
  );
};

const InfoItem = ({ label, value, icon: Icon, isMono }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-navy/20" />}
      <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-navy font-bold break-words leading-snug ${isMono ? 'font-mono tracking-tighter text-sm' : 'text-[13px]'}`}>
      {value || '—'}
    </span>
  </div>
);

export default LeadDetailPanel;
