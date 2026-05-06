import React, { useState, useEffect } from 'react';
import { X, Clock, User, Building2, MapPin, Hash, Briefcase, Calendar, MessageSquare, History, Phone, Save, Check } from 'lucide-react';
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

const LeadDetailPanel = ({ leadId, lead: initialLead, onClose, userName, permissions, userRole, onUpdate }) => {
  const [lead, setLead] = useState(initialLead);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  const isAdmin = userRole === 'admin' || (permissions?.leads_columns && permissions.leads_columns.includes('all'));

  const isVisible = (key) => {
    if (!permissions?.leads_columns) return true;
    if (permissions.leads_columns.includes('all')) return true;
    return permissions.leads_columns.includes(key);
  };

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

  const handleEditToggle = () => {
    if (isEditing) {
      setEditValues({});
    } else {
      setEditValues({ ...lead });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('crm_leads')
      .update(editValues)
      .eq('id', leadId);

    if (error) {
      alert("Erreur lors de la mise à jour : " + error.message);
    } else {
      setLead(editValues);
      setIsEditing(false);
      if (onUpdate) onUpdate(leadId, editValues);
    }
    setLoading(false);
  };

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
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={isEditing ? handleSave : handleEditToggle}
                className={`p-3 rounded-2xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                  isEditing 
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-navy/5 text-navy hover:bg-navy hover:text-white'
                }`}
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isEditing ? 'Enregistrer' : 'Modifier'}
              </button>
            )}
            {isEditing && (
              <button 
                onClick={handleEditToggle}
                className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-3 rounded-2xl bg-navy/5 text-navy/40 hover:bg-navy hover:text-white transition-all group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
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
                {isVisible('nom_entreprise') && (
                  <InfoItem 
                    label="Raison Sociale" 
                    value={isEditing ? editValues.nom_entreprise : lead.nom_entreprise} 
                    icon={Building2} 
                    isEditing={isEditing}
                    name="nom_entreprise"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('siret') && (
                  <InfoItem 
                    label="N° SIRET" 
                    value={isEditing ? editValues.siret : lead.siret} 
                    icon={Hash} 
                    isMono 
                    isEditing={isEditing}
                    name="siret"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('secteur_activite') && (
                  <InfoItem 
                    label="Secteur" 
                    value={isEditing ? editValues.secteur_activite : lead.secteur_activite} 
                    icon={Briefcase} 
                    isEditing={isEditing}
                    name="secteur_activite"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('libelle_activite') && (
                  <InfoItem 
                    label="Libellé" 
                    value={isEditing ? editValues.libelle_activite : getAutomatedLibelle()} 
                    isEditing={isEditing}
                    name="libelle_activite"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('nom_opco') && (
                  <InfoItem 
                    label="Opco" 
                    value={isEditing ? editValues.nom_opco : lead.nom_opco} 
                    isEditing={isEditing}
                    name="nom_opco"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('code_naf') && (
                  <InfoItem 
                    label="NAF" 
                    value={isEditing ? editValues.code_naf : (lead.code_naf || lead.secteur)} 
                    isMono 
                    isEditing={isEditing}
                    name="code_naf"
                    onChange={handleInputChange}
                  />
                )}
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
                {isVisible('adresse') && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Adresse Complète</span>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editValues.adresse || ''}
                        onChange={(e) => handleInputChange('adresse', e.target.value)}
                        className="bg-white border border-navy/10 rounded-lg px-3 py-2 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                      />
                    ) : (
                      <p className="text-navy font-bold">{lead.adresse || '—'}</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-navy/5">
                  {isVisible('code_postal') && (
                    <InfoItem 
                      label="Code Postal" 
                      value={isEditing ? editValues.code_postal : lead.code_postal} 
                      isEditing={isEditing}
                      name="code_postal"
                      onChange={handleInputChange}
                    />
                  )}
                  {isVisible('code_departement') && (
                    <InfoItem 
                      label="Département" 
                      value={isEditing ? editValues.code_departement : lead.code_departement} 
                      isEditing={isEditing}
                      name="code_departement"
                      onChange={handleInputChange}
                    />
                  )}
                  {(isVisible('tel') || isVisible('mobile')) && <div className="col-span-full h-px bg-navy/5 my-2" />}
                  {isVisible('tel') && (
                    <InfoItem 
                      label="Téléphone Fixe" 
                      value={isEditing ? editValues.tel : lead.tel} 
                      icon={Phone} 
                      isEditing={isEditing}
                      name="tel"
                      onChange={handleInputChange}
                    />
                  )}
                  {isVisible('mobile') && (
                    <InfoItem 
                      label="Mobile" 
                      value={isEditing ? editValues.mobile : lead.mobile} 
                      icon={Phone} 
                      isEditing={isEditing}
                      name="mobile"
                      onChange={handleInputChange}
                    />
                  )}
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
                {isVisible('status') && (
                  <InfoItem 
                    label="Statut Actuel" 
                    value={isEditing ? editValues.status : lead.status} 
                    isEditing={isEditing}
                    name="status"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('status_rdv') && (
                  <InfoItem 
                    label="Statut RDV" 
                    value={isEditing ? editValues.status_rdv : lead.status_rdv} 
                    isEditing={isEditing}
                    name="status_rdv"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('funebooster') && (
                  <InfoItem 
                    label="FUNEBOOSTER" 
                    value={isEditing ? editValues.funebooster : lead.funebooster} 
                    icon={User} 
                    isEditing={isEditing}
                    name="funebooster"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('date_rdv') && (
                  <InfoItem 
                    label="Date RDV" 
                    value={isEditing ? editValues.date_rdv : formatDate(lead.date_rdv, lead.heure_rdv)} 
                    isEditing={isEditing}
                    name="date_rdv"
                    type="date"
                    onChange={handleInputChange}
                  />
                )}
                {isVisible('type_rdv') && (
                  <InfoItem 
                    label="Type RDV" 
                    value={isEditing ? editValues.type_rdv : lead.type_rdv} 
                    isEditing={isEditing}
                    name="type_rdv"
                    onChange={handleInputChange}
                  />
                )}
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

const InfoItem = ({ label, value, icon: Icon, isMono, isEditing, onChange, name, type = 'text' }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-navy/20" />}
      <span className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">{label}</span>
    </div>
    {isEditing ? (
      <input 
        type={type}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        className="bg-white border border-navy/10 rounded-lg px-2 py-1.5 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
      />
    ) : (
      <span className={`text-navy font-bold break-words leading-snug ${isMono ? 'font-mono tracking-tighter text-sm' : 'text-[13px]'}`}>
        {value || '—'}
      </span>
    )}
  </div>
);

export default LeadDetailPanel;
